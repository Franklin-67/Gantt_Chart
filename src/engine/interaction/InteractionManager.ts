/**
 * InteractionManager — attaches to the Gantt canvas container and
 * orchestrates all pointer interactions: hit testing, drag state,
 * and store mutations.
 */

import { useGanttStore } from '@/store';
import { DragMode } from '@/model/types';
import { hitTest } from './HitTestEngine';
import { transitionDragMode } from './DragStateMachine';
import { pixelToDate } from '@/utils/dateUtils';
import { getSwimlaneLayout } from '@/utils/swimlaneLayout';
import { SWIMLANE_HEADER_WIDTH, SWIMLANE_ROW_HEIGHT, TIMELINE_TOTAL_HEIGHT } from '@/model/defaults';

export interface InteractionCallbacks {
  onScheduleRender: () => void;
}

const REORDER_THRESHOLD = 8;

export function createInteractionHandlers(
  getState: () => ReturnType<typeof useGanttStore.getState>,
  onScheduleRender: () => void,
) {
  let spaceHeld = false;
  let reorderState: { swimlaneId: string; originY: number } | null = null;

  function getCanvasPos(e: PointerEvent, container: HTMLElement): { x: number; y: number } {
    const rect = container.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function handlePointerDown(e: PointerEvent, container: HTMLElement): void {
    const pos = getCanvasPos(e, container);
    const state = getState();
    const hit = hitTest(pos.x, pos.y, state);

    const isRightClick = e.button === 2;
    let newMode = transitionDragMode(state.interaction.dragMode, 'pointerdown', hit, spaceHeld);

    if (newMode === DragMode.Create && !isRightClick) {
      newMode = DragMode.Idle;
    }
    if (newMode === DragMode.CreateMilestone && !isRightClick) {
      // In CreateMilestone mode, any click on empty area starts creating
      // newMode stays as CreateMilestone
    }
    if (isRightClick && newMode === DragMode.Idle && state.interaction.dragMode === DragMode.Create) {
      newMode = DragMode.Create;
    }
    if (isRightClick && newMode === DragMode.Idle && state.interaction.dragMode === DragMode.CreateMilestone) {
      newMode = DragMode.CreateMilestone;
    }

    // Swimlane header click — track for potential reorder drag
    if (hit.type === 'swimlane-header' && !isRightClick && newMode === DragMode.Idle && hit.swimlaneId) {
      reorderState = { swimlaneId: hit.swimlaneId, originY: pos.y };
      state.setInteraction({
        dragMode: DragMode.Idle,
        dragOrigin: pos,
        dragCurrent: pos,
        reorderSwimlaneId: hit.swimlaneId,
      });
      container.setPointerCapture(e.pointerId);
      onScheduleRender();
      return;
    }

    state.setInteraction({
      dragMode: newMode,
      dragOrigin: pos,
      dragCurrent: pos,
      linkSourceId: newMode === DragMode.Link ? hit.itemId : undefined,
      ghostSwimlaneId: hit.swimlaneId,
      reorderSwimlaneId: undefined,
    });

    if (hit.itemId && (newMode === DragMode.Move || newMode === DragMode.ResizeLeft || newMode === DragMode.ResizeRight)) {
      state.setSelection([hit.itemId]);
    } else if (hit.type === 'swimlane-header' && newMode === DragMode.Idle) {
      state.selectSwimlane(hit.swimlaneId || null);
    } else if (newMode === DragMode.Create || newMode === DragMode.CreateMilestone || newMode === DragMode.Pan) {
      state.clearSelection();
    }

    container.setPointerCapture(e.pointerId);
    onScheduleRender();
  }

  function handlePointerMove(e: PointerEvent, container: HTMLElement): void {
    const state = getState();

    // Check if a swimlane reorder drag should begin
    if (reorderState && state.interaction.dragMode === DragMode.Idle) {
      const pos = getCanvasPos(e, container);
      if (Math.abs(pos.y - reorderState.originY) > REORDER_THRESHOLD) {
        state.setInteraction({
          dragMode: DragMode.ReorderSwimlane,
          dragOrigin: { x: pos.x, y: reorderState.originY },
          dragCurrent: pos,
          reorderSwimlaneId: reorderState.swimlaneId,
        });
        state.clearSelection();
        onScheduleRender();
      }
      return;
    }

    if (state.interaction.dragMode === DragMode.Idle) return;

    const pos = getCanvasPos(e, container);

    let ghostStartDate: string | undefined;
    let ghostEndDate: string | undefined;

    if (state.interaction.dragMode === DragMode.Create) {
      const originX = state.interaction.dragOrigin.x - SWIMLANE_HEADER_WIDTH;
      const currentX = pos.x - SWIMLANE_HEADER_WIDTH;
      const left = Math.min(originX, currentX);
      const right = Math.max(originX, currentX);
      const { viewStartDate, pixelsPerDay } = state.timeConfig;
      ghostStartDate = pixelToDate(left, viewStartDate, pixelsPerDay);
      ghostEndDate = pixelToDate(right, viewStartDate, pixelsPerDay);
    }

    state.setInteraction({
      dragCurrent: pos,
      ghostStartDate,
      ghostEndDate,
    });

    onScheduleRender();
  }

  function handlePointerUp(e: PointerEvent, container: HTMLElement): void {
    const state = getState();
    const { dragMode, dragOrigin, dragCurrent } = state.interaction;

    if (dragMode === DragMode.Idle) {
      // Was a short click on swimlane header (no drag)
      if (reorderState) {
        state.selectSwimlane(reorderState.swimlaneId);
        cleanupDrag(container, e.pointerId);
      }
      return;
    }

    const pos = getCanvasPos(e, container);

    if (dragMode === DragMode.ReorderSwimlane && state.interaction.reorderSwimlaneId) {
      commitSwimlaneReorder(state, pos.y);
    }

    if (dragMode === DragMode.CreateMilestone) {
      // Single click creates a milestone at the cursor date
      const layout = getSwimlaneLayout(state.swimlanes);
      let targetSlId = layout[0]?.id ?? '';
      for (const row of layout) {
        if (dragOrigin.y >= row.y && dragOrigin.y < row.y + row.height) {
          targetSlId = row.id;
          break;
        }
      }
      const canvasX = pos.x - SWIMLANE_HEADER_WIDTH;
      const { viewStartDate, pixelsPerDay } = state.timeConfig;
      const date = pixelToDate(canvasX, viewStartDate, pixelsPerDay);

      if (targetSlId && date) {
        const id = state.addMilestone({
          name: '里程碑',
          swimlaneId: targetSlId,
          date,
          color: '#E74C3C',
        });
        state.setSelection([id]);
      }
    }

    if (dragMode === DragMode.Create) {
      const originX = dragOrigin.x - SWIMLANE_HEADER_WIDTH;
      const currentX = pos.x - SWIMLANE_HEADER_WIDTH;
      const left = Math.min(originX, currentX);
      const right = Math.max(originX, currentX);
      const { viewStartDate, pixelsPerDay } = state.timeConfig;

      const startDate = pixelToDate(left, viewStartDate, pixelsPerDay);
      const endDate = pixelToDate(right, viewStartDate, pixelsPerDay);

      const layout = getSwimlaneLayout(state.swimlanes);
      let targetSlId = layout[0]?.id ?? '';
      for (const row of layout) {
        if (dragOrigin.y >= row.y && dragOrigin.y < row.y + row.height) {
          targetSlId = row.id;
          break;
        }
      }

      if (targetSlId && endDate > startDate) {
        const id = state.addTask({
          name: '新任务',
          swimlaneId: targetSlId,
          startDate,
          endDate,
          color: '#4A90D9',
          progress: 0,
        });
        state.setSelection([id]);
      }
    }

    if (dragMode === DragMode.Move) {
      const selectedIds = state.selection.selectedIds;
      if (selectedIds.length > 0) {
        const item = state.getItemById(selectedIds[0]);
        if (item) {
          const deltaX = pos.x - dragOrigin.x;
          const { viewStartDate, pixelsPerDay } = state.timeConfig;
          const dayDelta = Math.round(deltaX / pixelsPerDay);

          if (dayDelta !== 0) {
            if ('startDate' in item && 'endDate' in item) {
              state.updateTask(item.id, {
                startDate: addDays(item.startDate, dayDelta),
                endDate: addDays(item.endDate, dayDelta),
              });
            } else if ('date' in item) {
              state.updateMilestone(item.id, { date: addDays(item.date, dayDelta) });
            }
          }
        }
      }
    }

    if (dragMode === DragMode.ResizeLeft) {
      const selectedIds = state.selection.selectedIds;
      if (selectedIds.length > 0) {
        const task = state.tasks.get(selectedIds[0]);
        if (task) {
          const deltaX = pos.x - dragOrigin.x;
          const { viewStartDate, pixelsPerDay } = state.timeConfig;
          const dayDelta = Math.round(deltaX / pixelsPerDay);
          if (dayDelta !== 0) {
            const newStart = addDays(task.startDate, dayDelta);
            if (newStart < task.endDate) {
              state.updateTask(task.id, { startDate: newStart });
            }
          }
        }
      }
    }

    if (dragMode === DragMode.ResizeRight) {
      const selectedIds = state.selection.selectedIds;
      if (selectedIds.length > 0) {
        const task = state.tasks.get(selectedIds[0]);
        if (task) {
          const deltaX = pos.x - dragOrigin.x;
          const { viewStartDate, pixelsPerDay } = state.timeConfig;
          const dayDelta = Math.round(deltaX / pixelsPerDay);
          if (dayDelta !== 0) {
            const newEnd = addDays(task.endDate, dayDelta);
            if (newEnd > task.startDate) {
              state.updateTask(task.id, { endDate: newEnd });
            }
          }
        }
      }
    }

    if (dragMode === DragMode.Link && state.interaction.linkSourceId) {
      const hit = hitTest(pos.x, pos.y, state);
      if (hit.itemId && hit.itemId !== state.interaction.linkSourceId) {
        state.addDependency(state.interaction.linkSourceId, hit.itemId);
      }
    }

    cleanupDrag(container, e.pointerId);
    onScheduleRender();
  }

  function cleanupDrag(container: HTMLElement, pointerId: number): void {
    const state = getState();
    state.setInteraction({
      dragMode: DragMode.Idle,
      dragOrigin: { x: 0, y: 0 },
      dragCurrent: { x: 0, y: 0 },
      linkSourceId: undefined,
      reorderSwimlaneId: undefined,
    });
    reorderState = null;
    container.releasePointerCapture(pointerId);
  }

  function commitSwimlaneReorder(
    state: ReturnType<typeof useGanttStore.getState>,
    dragY: number,
  ): void {
    const swimlaneId = state.interaction.reorderSwimlaneId;
    if (!swimlaneId) return;

    const layout = getSwimlaneLayout(state.swimlanes);
    let insertIdx = layout.length;
    for (let i = 0; i < layout.length; i++) {
      if (dragY < layout[i].y + layout[i].height / 2) {
        insertIdx = i;
        break;
      }
    }

    const orderedIds = state.swimlanes.map((s) => s.id);
    const draggedIdx = orderedIds.indexOf(swimlaneId);
    if (draggedIdx < 0) return;

    // Only reorder if position actually changed
    if (draggedIdx === insertIdx || (insertIdx > draggedIdx && insertIdx === draggedIdx + 1)) return;

    orderedIds.splice(draggedIdx, 1);
    const adjusted = insertIdx > draggedIdx ? insertIdx - 1 : insertIdx;
    orderedIds.splice(adjusted, 0, swimlaneId);
    state.reorderSwimlanes(orderedIds);
  }

  function handlePointerCancel(e: PointerEvent, container: HTMLElement): void {
    cleanupDrag(container, e.pointerId);
    onScheduleRender();
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') spaceHeld = true;

    const state = getState();

    // Mode switching shortcuts
    if (e.key === 's' || e.key === 'S') state.setDragMode(DragMode.Idle);
    if (e.key === 'b' || e.key === 'B') state.setDragMode(DragMode.Create);
    if (e.key === 'm' || e.key === 'M') state.setDragMode(DragMode.CreateMilestone);
    if (e.key === 'l' || e.key === 'L') state.setDragMode(DragMode.Link);

    // Delete selected — skip when focus is in a text input
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const ids = state.selection.selectedIds;
      if (ids.length > 0) {
        state.deleteTasks(ids);
        state.deleteMilestones(ids);
        state.clearSelection();
        onScheduleRender();
      }
    }

    // Arrow key nudge
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      const ids = state.selection.selectedIds;
      const item = ids.length > 0 ? state.getItemById(ids[0]) : null;
      if (item) {
        const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (delta !== 0) {
          if ('startDate' in item && 'endDate' in item) {
            state.updateTask(item.id, {
              startDate: addDays(item.startDate, delta),
              endDate: addDays(item.endDate, delta),
            });
          } else if ('date' in item) {
            state.updateMilestone(item.id, { date: addDays(item.date, delta) });
          }
          onScheduleRender();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const swimlanes = state.swimlanes;
          const currentIdx = swimlanes.findIndex((s) => s.id === item.swimlaneId);
          const newIdx = e.key === 'ArrowUp' ? currentIdx - 1 : currentIdx + 1;
          if (newIdx >= 0 && newIdx < swimlanes.length) {
            if ('startDate' in item) {
              state.updateTask(item.id, { swimlaneId: swimlanes[newIdx].id });
            } else {
              state.updateMilestone(item.id, { swimlaneId: swimlanes[newIdx].id });
            }
            onScheduleRender();
          }
        }
      }
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') spaceHeld = false;
  }

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleKeyDown,
    handleKeyUp,
  };
}

function addDays(isoStr: string, days: number): string {
  const d = new Date(isoStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
