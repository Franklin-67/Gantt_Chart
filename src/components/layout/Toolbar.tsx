import React, { useCallback } from 'react';
import { useGanttStore } from '@/store';
import { DragMode } from '@/model/types';

interface ToolbarProps {
  onImportExcel: () => void;
  onExportExcel: () => void;
  onExportImage: () => void;
  onDateRange: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onImportExcel, onExportExcel, onExportImage, onDateRange }) => {
  const dragMode = useGanttStore((s) => s.interaction.dragMode);
  const setDragMode = useGanttStore((s) => s.setDragMode);
  const addSwimlane = useGanttStore((s) => s.addSwimlane);
  const viewStartDate = useGanttStore((s) => s.timeConfig.viewStartDate);
  const viewEndDate = useGanttStore((s) => s.timeConfig.viewEndDate);
  const headerFontSizes = useGanttStore((s) => s.headerFontSizes);
  const setHeaderFontSizes = useGanttStore((s) => s.setHeaderFontSizes);

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
          className="toolbar__btn toolbar__btn--text"
          onClick={onDateRange}
          title="选择时间范围 (双击时间轴)"
          style={{ minWidth: 140, fontSize: 10 }}
        >
          {viewStartDate} ~ {viewEndDate}
        </button>
        <button className="toolbar__btn" onClick={handleZoomIn} title="放大">+</button>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <span className="toolbar__mode-label" title="年字体">年</span>
        <select
          className="toolbar__font-select"
          value={headerFontSizes[0] ?? 13}
          onChange={(e) => setHeaderFontSizes(0, Number(e.target.value))}
        >
          {[9,10,11,12,14,16,18,20].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <span className="toolbar__mode-label" title="月字体">月</span>
        <select
          className="toolbar__font-select"
          value={headerFontSizes[1] ?? 11}
          onChange={(e) => setHeaderFontSizes(1, Number(e.target.value))}
        >
          {[9,10,11,12,14,16].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <span className="toolbar__mode-label" title="周字体">周</span>
        <select
          className="toolbar__font-select"
          value={headerFontSizes[2] ?? 10}
          onChange={(e) => setHeaderFontSizes(2, Number(e.target.value))}
        >
          {[9,10,11,12,14,16].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <button
          className="toolbar__btn toolbar__btn--text"
          onClick={() => addSwimlane('新泳道')}
          title="添加泳道"
        >
          + 泳道
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <div className="toolbar__group">
        <button
          className="toolbar__btn toolbar__btn--text"
          onClick={onImportExcel}
          title="从 Excel 导入任务 (Ctrl+I)"
        >
          导入 Excel
        </button>
        <button
          className="toolbar__btn toolbar__btn--text"
          onClick={onExportExcel}
          title="导出到 Excel 文件"
        >
          导出 Excel
        </button>
        <button
          className="toolbar__btn toolbar__btn--text toolbar__btn--primary-outline"
          onClick={onExportImage}
          title="导出图片 (Ctrl+E)"
        >
          导出图片
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
