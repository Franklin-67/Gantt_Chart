import React, { useCallback } from 'react';
import { useGanttStore } from '@/store';
import { GanttTask, Milestone, Swimlane } from '@/model/types';
import { DEFAULT_COLORS } from '@/model/defaults';

const PropertyPanel: React.FC = () => {
  const selectedIds = useGanttStore((s) => s.selection.selectedIds);
  const selectedSL = useGanttStore((s) => s.selectedSwimlaneId);

  // Read item data through selectors so panel re-renders on every data change
  const item = useGanttStore((s) => {
    if (selectedIds.length > 0) return s.getItemById(selectedIds[0]);
    return undefined;
  });
  const swimlane = useGanttStore((s) => {
    if (selectedSL) return s.swimlanes.find((sl) => sl.id === selectedSL);
    return undefined;
  });

  const updateTask = useGanttStore((s) => s.updateTask);
  const updateMilestone = useGanttStore((s) => s.updateMilestone);
  const updateSwimlane = useGanttStore((s) => s.updateSwimlane);
  const deleteSwimlane = useGanttStore((s) => s.deleteSwimlane);
  const clearSelection = useGanttStore((s) => s.clearSelection);
  const selectSwimlane = useGanttStore((s) => s.selectSwimlane);
  const deleteTasks = useGanttStore((s) => s.deleteTasks);
  const deleteMilestones = useGanttStore((s) => s.deleteMilestones);
  const dependencies = useGanttStore((s) => s.dependencies);
  const removeDependency = useGanttStore((s) => s.removeDependency);
  const tasks = useGanttStore((s) => s.tasks);
  const milestones = useGanttStore((s) => s.milestones);

  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      deleteTasks(selectedIds);
      deleteMilestones(selectedIds);
      clearSelection();
    } else if (selectedSL) {
      deleteSwimlane(selectedSL);
      selectSwimlane(null);
    }
  }, [selectedIds, selectedSL, deleteTasks, deleteMilestones, deleteSwimlane, clearSelection, selectSwimlane]);

  // Swimlane editing
  if (swimlane) {
    return (
      <div className="property-panel">
        <div className="property-panel__title">泳道属性</div>

        <div className="property-group">
          <label className="property-group__label">名称</label>
          <input
            className="property-group__input"
            value={swimlane.name}
            onChange={(e) => updateSwimlane(swimlane.id, { name: e.target.value })}
          />
        </div>

        <div className="property-group">
          <label className="property-group__label">排序</label>
          <input
            className="property-group__input"
            type="number"
            value={swimlane.order}
            onChange={(e) => updateSwimlane(swimlane.id, { order: Number(e.target.value) })}
          />
        </div>

        <div className="dialog__actions" style={{ marginTop: 16 }}>
          <button className="dialog__btn" onClick={handleDelete} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            删除泳道
          </button>
        </div>
      </div>
    );
  }

  // No selection
  if (!item) {
    return (
      <div className="property-panel">
        <div className="property-panel__empty">
          选择一个条形、里程碑<br />或泳道以编辑属性
        </div>
      </div>
    );
  }

  const isTask = 'startDate' in item && 'endDate' in item;

  return (
    <div className="property-panel">
      <div className="property-panel__title">
        {isTask ? '活动属性' : '里程碑属性'}
      </div>

      <div className="property-group">
        <label className="property-group__label">名称</label>
        <input
          className="property-group__input"
          value={item.name}
          onChange={(e) => {
            if (isTask) {
              updateTask(item.id, { name: e.target.value });
            } else {
              updateMilestone(item.id, { name: e.target.value });
            }
          }}
        />
      </div>

      {isTask ? (
        <>
          <div className="property-group">
            <label className="property-group__label">开始日期</label>
            <input
              className="property-group__input"
              type="date"
              value={(item as GanttTask).startDate}
              onChange={(e) => updateTask(item.id, { startDate: e.target.value })}
            />
          </div>
          <div className="property-group">
            <label className="property-group__label">结束日期</label>
            <input
              className="property-group__input"
              type="date"
              value={(item as GanttTask).endDate}
              onChange={(e) => updateTask(item.id, { endDate: e.target.value })}
            />
          </div>
          <div className="property-group">
            <label className="property-group__label">进度 ({(item as GanttTask).progress}%)</label>
            <input
              className="property-group__input"
              type="range"
              min={0}
              max={100}
              value={(item as GanttTask).progress}
              onChange={(e) => updateTask(item.id, { progress: Number(e.target.value) })}
            />
          </div>
        </>
      ) : (
        <div className="property-group">
          <label className="property-group__label">日期</label>
          <input
            className="property-group__input"
            type="date"
            value={(item as Milestone).date}
            onChange={(e) => updateMilestone(item.id, { date: e.target.value })}
          />
        </div>
      )}

      <div className="property-group">
        <label className="property-group__label">颜色</label>
        <div className="property-group__color">
          {DEFAULT_COLORS.map((color) => (
            <div
              key={color}
              className={`property-color-swatch ${item.color === color ? 'selected' : ''}`}
              style={{ background: color }}
              onClick={() => {
                if (isTask) {
                  updateTask(item.id, { color });
                } else {
                  updateMilestone(item.id, { color });
                }
              }}
            />
          ))}
        </div>
      </div>

      {(() => {
        // Find dependencies involving this item
        const relDeps = dependencies.filter(
          (d) => d.fromItemId === item.id || d.toItemId === item.id,
        );
        if (relDeps.length === 0) return null;

        function getItemName(id: string) {
          return tasks.get(id)?.name || milestones.get(id)?.name || id;
        }

        return (
          <div className="property-group">
            <label className="property-group__label">依赖关系</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {relDeps.map((dep) => (
                <div
                  key={dep.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    padding: '4px 6px',
                    background: '#f8f9fa',
                    borderRadius: 4,
                  }}
                >
                  <span>
                    {getItemName(dep.fromItemId)} → {getItemName(dep.toItemId)}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                      ({dep.type})
                    </span>
                  </span>
                  <button
                    className="dialog__btn"
                    style={{
                      padding: '2px 6px',
                      fontSize: 10,
                      color: 'var(--danger)',
                      borderColor: 'transparent',
                      background: 'transparent',
                    }}
                    onClick={() => removeDependency(dep.id)}
                    title="删除此依赖"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="dialog__actions" style={{ marginTop: 16 }}>
        <button className="dialog__btn" onClick={handleDelete} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
          删除
        </button>
      </div>
    </div>
  );
};

export default PropertyPanel;
