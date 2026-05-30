import React, { useCallback, useState, useEffect } from 'react';
import { useGanttStore } from '@/store';
import { DragMode } from '@/model/types';
import { loadTemplates, Template } from '@/services/storageService';

interface ToolbarProps {
  onImportExcel: () => void;
  onExportExcel: () => void;
  onExportImage: () => void;
  onDateRange: () => void;
  onSaveTemplate?: () => void;
  onLoadTemplate?: (templateId: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onImportExcel, onExportExcel, onExportImage, onDateRange, onSaveTemplate, onLoadTemplate }) => {
  const dragMode = useGanttStore((s) => s.interaction.dragMode);
  const setDragMode = useGanttStore((s) => s.setDragMode);
  const addSwimlane = useGanttStore((s) => s.addSwimlane);
  const viewStartDate = useGanttStore((s) => s.timeConfig.viewStartDate);
  const viewEndDate = useGanttStore((s) => s.timeConfig.viewEndDate);
  const headerFontSizes = useGanttStore((s) => s.headerFontSizes);
  const setHeaderFontSizes = useGanttStore((s) => s.setHeaderFontSizes);
  const rowHeight = useGanttStore((s) => s.rowHeight);
  const setRowHeight = useGanttStore((s) => s.setRowHeight);
  const fitViewToContent = useGanttStore((s) => s.fitViewToContent);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (showTemplateDropdown) {
      loadTemplateList();
    }
  }, [showTemplateDropdown]);

  const loadTemplateList = async () => {
    setLoadingTemplates(true);
    try {
      const list = await loadTemplates();
      setTemplates(list);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleZoomIn = useCallback(() => {
    const state = useGanttStore.getState();
    const { viewStartDate: vs, viewEndDate: ve } = state.timeConfig;
    const days = (new Date(ve).getTime() - new Date(vs).getTime()) / 86400000;
    const mid = new Date(vs + 'T00:00:00');
    mid.setDate(mid.getDate() + days / 2);
    const newDays = Math.max(7, days * 0.7);
    const half = newDays / 2;
    const s = new Date(mid);
    s.setDate(s.getDate() - half);
    const e = new Date(mid);
    e.setDate(e.getDate() + half);
    state.setViewRange(s.toISOString().slice(0, 10), e.toISOString().slice(0, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    const state = useGanttStore.getState();
    const { viewStartDate: vs, viewEndDate: ve } = state.timeConfig;
    const days = (new Date(ve).getTime() - new Date(vs).getTime()) / 86400000;
    const mid = new Date(vs + 'T00:00:00');
    mid.setDate(mid.getDate() + days / 2);
    const newDays = days * 1.4;
    const half = newDays / 2;
    const s = new Date(mid);
    s.setDate(s.getDate() - half);
    const e = new Date(mid);
    e.setDate(e.getDate() + half);
    state.setViewRange(s.toISOString().slice(0, 10), e.toISOString().slice(0, 10));
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    if (onLoadTemplate) {
      onLoadTemplate(templateId);
    }
    setShowTemplateDropdown(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <button
          className={`toolbar__btn ${dragMode === DragMode.Idle ? 'active' : ''}`}
          onClick={() => setDragMode(DragMode.Idle)}
          title="选择 (S)"
        >
          ↖
        </button>
        <button
          className={`toolbar__btn ${dragMode === DragMode.Create ? 'active' : ''}`}
          onClick={() => setDragMode(DragMode.Create)}
          title="创建条形 (B)"
        >
          ▬
        </button>
        <button
          className={`toolbar__btn ${dragMode === DragMode.CreateMilestone ? 'active' : ''}`}
          onClick={() => setDragMode(DragMode.CreateMilestone)}
          title="创建里程碑 (M)"
        >
          ◆
        </button>
        <button
          className={`toolbar__btn ${dragMode === DragMode.Link ? 'active' : ''}`}
          onClick={() => setDragMode(DragMode.Link)}
          title="创建依赖 (L)"
        >
          ↗
        </button>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <button className="toolbar__btn" onClick={handleZoomOut} title="缩小">−</button>
        <button
          className="toolbar__btn toolbar__btn--text toolbar__btn--date"
          onClick={onDateRange}
          title="选择时间范围 (双击时间轴)"
        >
          {viewStartDate} ~ {viewEndDate}
        </button>
        <button className="toolbar__btn" onClick={handleZoomIn} title="放大">+</button>
        <button className="toolbar__btn toolbar__btn--text" onClick={fitViewToContent} title="适应内容">
          ⟲
        </button>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <span className="toolbar__mode-label">年</span>
        <select className="toolbar__font-select" value={headerFontSizes[0] ?? 13} onChange={(e) => setHeaderFontSizes(0, Number(e.target.value))}>
          {[9,10,11,12,14,16,18,20].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <span className="toolbar__mode-label">月</span>
        <select className="toolbar__font-select" value={headerFontSizes[1] ?? 11} onChange={(e) => setHeaderFontSizes(1, Number(e.target.value))}>
          {[9,10,11,12,14,16].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <span className="toolbar__mode-label">周</span>
        <select className="toolbar__font-select" value={headerFontSizes[2] ?? 10} onChange={(e) => setHeaderFontSizes(2, Number(e.target.value))}>
          {[9,10,11,12,14,16].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <button className="toolbar__btn toolbar__btn--text" onClick={() => addSwimlane('新泳道')} title="添加泳道">
          +泳道
        </button>
        
        <div className="toolbar__template-dropdown">
          <button
            className="toolbar__btn toolbar__btn--text"
            onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
            title="选择模板"
            style={{ color: '#3b82f6' }}
          >
            📋 模板{templates.length > 0 && `(${templates.length})`}
          </button>
          
          {showTemplateDropdown && (
            <div className="toolbar__template-menu">
              {loadingTemplates ? (
                <div className="toolbar__template-loading">加载中...</div>
              ) : templates.length === 0 ? (
                <div className="toolbar__template-empty">
                  <div>暂无模板</div>
                  <div className="toolbar__template-hint">点击"保存模板"创建一个</div>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="toolbar__template-item"
                    onClick={() => handleSelectTemplate(template.id)}
                  >
                    <div className="toolbar__template-name">{template.name}</div>
                    <div className="toolbar__template-date">
                      {formatDate(template.createdAt)}
                      {template.updatedAt !== template.createdAt && <span> · 更新: {formatDate(template.updatedAt)}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {onSaveTemplate && (
          <button className="toolbar__btn toolbar__btn--text" onClick={onSaveTemplate} title="保存为模板" style={{ color: '#67c23a' }}>
            💾 保存
          </button>
        )}
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <span className="toolbar__mode-label">行高</span>
        <input type="range" min={30} max={80} value={rowHeight} onChange={(e) => setRowHeight(Number(e.target.value))} className="toolbar__row-slider" />
        <span className="toolbar__row-value">{rowHeight}px</span>
      </div>

      <div className="toolbar__spacer" />

      <div className="toolbar__group">
        <button className="toolbar__btn toolbar__btn--text toolbar__btn--action" onClick={onImportExcel} title="从 Excel 导入任务 (Ctrl+I)">
          📥 导入
        </button>
        <button className="toolbar__btn toolbar__btn--text toolbar__btn--action" onClick={onExportExcel} title="导出到 Excel 文件">
          📤 导出
        </button>
        <button className="toolbar__btn toolbar__btn--text toolbar__btn--action toolbar__btn--primary-outline" onClick={onExportImage} title="导出图片 (Ctrl+E)">
          🖼 图片
        </button>
      </div>

      {showTemplateDropdown && (
        <div className="toolbar__dropdown-backdrop" onClick={() => setShowTemplateDropdown(false)} />
      )}
    </div>
  );
};

export default Toolbar;
