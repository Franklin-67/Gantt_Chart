import React, { useEffect, useState } from 'react';
import TaskPaneShell from '@/components/layout/TaskPaneShell';
import TemplateDialog from '@/components/dialogs/TemplateDialog';
import { useGanttStore } from '@/store';
import { setupAutoSave, stopAutoSave, saveProject, loadProject, loadTemplates } from '@/services/storageService';
import { getEnvironmentInfo, getData } from '@/services/storageManager';

const App: React.FC = () => {
  const timeConfig = useGanttStore((s) => s.timeConfig);
  const addSwimlane = useGanttStore((s) => s.addSwimlane);
  const addTask = useGanttStore((s) => s.addTask);
  const addMilestone = useGanttStore((s) => s.addMilestone);
  const addDependency = useGanttStore((s) => s.addDependency);
  const reset = useGanttStore((s) => s.reset);

  const [showStartup, setShowStartup] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateCount, setTemplateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [envInfo, setEnvInfo] = useState<string>('');
  const [storageDebug, setStorageDebug] = useState<string>('');

  useEffect(() => {
    // Initialize and check templates on mount
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setLoading(true);
    try {
      // 收集环境信息
      setEnvInfo(getEnvironmentInfo());

      // 直接读三层存储，确认数据在哪一层
      const fromStorage = await getData('gantt-templates');
      const rawLocal = localStorage.getItem('gantt-templates');
      let nlPath = 'undefined';
      try { nlPath = (globalThis as any).NL_PATH || 'undefined'; } catch {}
      // 测试 localStorage 读写
      const testKey = '__storage_test__';
      const testVal = Date.now().toString();
      localStorage.setItem(testKey, testVal);
      const testRead = localStorage.getItem(testKey);
      const testOk = testRead === testVal;
      setStorageDebug(JSON.stringify({
        '当前URL': location.href,
        'localStorage读写测试': testOk ? 'OK' : 'FAIL',
        'gantt-templates读取': fromStorage ? `${fromStorage.length} chars` : 'null',
        'NL_PATH': nlPath,
      }, null, 2));

      // Check for saved templates
      const templates = await loadTemplates();
      setTemplateCount(templates.length);
      console.log('Found', templates.length, 'templates');
    } catch (err) {
      console.error('Failed to check templates:', err);
      setTemplateCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleStartFresh = () => {
    reset();
    setShowStartup(false);
    setupAutoSave();
  };

  const handleOpenTemplateDialog = () => {
    setShowTemplateDialog(true);
  };

  const handleLoadTemplateComplete = () => {
    setShowStartup(false);
    setShowTemplateDialog(false);
    setupAutoSave();
  };

  const handleRefreshTemplates = async () => {
    const templates = await loadTemplates();
    setTemplateCount(templates.length);
  };

  // Save on window close (Neutralino event)
  useEffect(() => {
    let saved = false;
    const handleClose = () => {
      if (!saved) {
        saveProject();
        saved = true;
      }
    };

    const onBroadcast = (evt: any) => {
      if (evt?.detail === 'app:before-close') handleClose();
    };
    window.addEventListener('app:before-close', onBroadcast);

    if (!showStartup) {
      const store = useGanttStore.getState();

      async function restoreOrInit() {
        try {
          const loaded = await loadProject();
          if (loaded) {
            setupAutoSave();
            return;
          }
        } catch { /* fall through to demo */ }

        if (store.swimlanes.length === 0) {
          initDemoData(addSwimlane, addTask, addMilestone, addDependency);
        }
        setupAutoSave();
      }

      restoreOrInit();
    }

    return () => {
      if (!showStartup) {
        stopAutoSave();
      }
      window.removeEventListener('app:before-close', onBroadcast);
    };
  }, [showStartup]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fa',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        <div style={{
          fontSize: '24px',
          color: '#303133'
        }}>
          加载中...
        </div>
      </div>
    );
  }

  if (showStartup) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fa',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '40px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h1 style={{ 
            margin: '0 0 30px 0', 
            fontSize: '28px', 
            fontWeight: '600',
            color: '#303133'
          }}>
            📊 甘特图编辑器
          </h1>

          <p style={{ 
            color: '#606266', 
            marginBottom: '30px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            选择一个选项开始：
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button
              onClick={handleOpenTemplateDialog}
              style={{
                padding: '15px 30px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              📋 {templateCount > 0 ? `加载模板 (${templateCount}个可用)` : '选择模板'}
            </button>

            <button
              onClick={handleStartFresh}
              style={{
                padding: '15px 30px',
                backgroundColor: '#fff',
                color: '#303133',
                border: '1px solid #dcdfe6',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#dcdfe6';
                e.currentTarget.style.color = '#303133';
              }}
            >
              ➕ 新建空白项目
            </button>

            <button
              onClick={handleStartFresh}
              style={{
                padding: '15px 30px',
                backgroundColor: '#f5f7fa',
                color: '#606266',
                border: '1px solid #e4e7ed',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#ebeef5';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f7fa';
              }}
            >
              📝 加载示例数据
            </button>
          </div>

          <div style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #ebeef5',
            fontSize: '12px',
            color: '#909399'
          }}>
            上次关闭的内容会自动保存
          </div>
        </div>

        {/* 调试面板 */}
        <div style={{
          marginTop: '20px',
          backgroundColor: '#1e1e1e',
          color: '#4ec9b0',
          borderRadius: '8px',
          padding: '15px',
          maxWidth: '500px',
          width: '100%',
          fontSize: '11px',
          fontFamily: 'Consolas, monospace',
          textAlign: 'left',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          <div style={{ color: '#dcdcaa', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
            [Storage Debug]
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#4ec9b0', fontSize: '10px' }}>
            {envInfo || '加载中...'}
          </pre>
          <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '8px' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#ce9178', fontSize: '10px' }}>
              {storageDebug || '等待检测...'}
            </pre>
          </div>
        </div>

        {showTemplateDialog && (
          <TemplateDialog
            onClose={() => {
              setShowTemplateDialog(false);
              // Refresh template count when dialog closes
              handleRefreshTemplates();
            }}
            onLoadTemplate={handleLoadTemplateComplete}
          />
        )}
      </div>
    );
  }

  if (!timeConfig) {
    return <div className="loading">Loading Gantt Chart...</div>;
  }

  return <TaskPaneShell />;
};

function initDemoData(
  addSwimlane: (name: string, parentId?: string) => string,
  addTask: (data: any) => string,
  addMilestone: (data: any) => string,
  addDependency: (fromId: string, toId: string) => string,
) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  function d(day: number, monthOffset = 0): string {
    const date = new Date(y, m + monthOffset, day);
    return date.toISOString().slice(0, 10);
  }

  const designId = addSwimlane('设计');
  const devId = addSwimlane('开发');
  const testId = addSwimlane('测试');

  const t1 = addTask({ name: '需求分析', swimlaneId: designId, startDate: d(1), endDate: d(10), color: '#4A90D9', progress: 100 });
  const t2 = addTask({ name: 'UI 设计', swimlaneId: designId, startDate: d(8), endDate: d(20), color: '#9B59B6', progress: 60 });
  addMilestone({ name: '设计评审', swimlaneId: designId, date: d(20), color: '#E74C3C' });

  const t3 = addTask({ name: '后端开发', swimlaneId: devId, startDate: d(15), endDate: d(10, 1), color: '#5CB85C', progress: 30 });
  const t4 = addTask({ name: '前端开发', swimlaneId: devId, startDate: d(20), endDate: d(15, 1), color: '#F0AD4E', progress: 0 });
  addMilestone({ name: '迭代发布', swimlaneId: devId, date: d(10, 1), color: '#E74C3C' });

  const t5 = addTask({ name: '集成测试', swimlaneId: testId, startDate: d(10, 1), endDate: d(25, 1), color: '#1ABC9C', progress: 0 });
  addTask({ name: '性能测试', swimlaneId: testId, startDate: d(20, 1), endDate: d(5, 2), color: '#3498DB', progress: 0 });

  addDependency(t1, t2);
  addDependency(t2, t3);
  addDependency(t2, t4);
  addDependency(t3, t5);
  addDependency(t4, t5);
}

export default App;
