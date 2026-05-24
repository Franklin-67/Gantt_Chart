import React, { useEffect } from 'react';
import TaskPaneShell from '@/components/layout/TaskPaneShell';
import { useGanttStore } from '@/store';
import { setupAutoSave, stopAutoSave } from '@/services/storageService';

const App: React.FC = () => {
  const timeConfig = useGanttStore((s) => s.timeConfig);
  const addSwimlane = useGanttStore((s) => s.addSwimlane);
  const addTask = useGanttStore((s) => s.addTask);
  const addMilestone = useGanttStore((s) => s.addMilestone);
  const addDependency = useGanttStore((s) => s.addDependency);

  useEffect(() => {
    const store = useGanttStore.getState();

    async function restoreOrInit() {
      const api = (window as any).electronAPI;
      if (api?.loadData) {
        try {
          const data = await api.loadData('gantt-project');
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.swimlanes) {
              parsed.swimlanes.forEach((s: any) => {
                const existing = store.swimlanes.find((x) => x.id === s.id);
                if (!existing) store.addSwimlane(s.name, s.parentId, s.id);
              });
            }
            if (parsed.tasks) {
              Object.values(parsed.tasks).forEach((t: any) => {
                store.addTask({
                  id: t.id, name: t.name, swimlaneId: t.swimlaneId,
                  startDate: t.startDate, endDate: t.endDate,
                  color: t.color, progress: t.progress,
                });
              });
            }
            if (parsed.milestones) {
              Object.values(parsed.milestones).forEach((m: any) => {
                store.addMilestone({
                  id: m.id, name: m.name, swimlaneId: m.swimlaneId,
                  date: m.date, color: m.color,
                });
              });
            }
            if (parsed.dependencies) {
              parsed.dependencies.forEach((d: any) => {
                store.addDependency(d.fromItemId, d.toItemId, d.type);
              });
            }
            setupAutoSave();
            return;
          }
        } catch { /* fall through to demo */ }
      }

      if (store.swimlanes.length === 0) {
        initDemoData(addSwimlane, addTask, addMilestone, addDependency);
      }
      setupAutoSave();
    }

    restoreOrInit();
    return () => stopAutoSave();
  }, []);

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
