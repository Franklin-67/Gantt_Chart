/**
 * HitTestEngine — detects what is under the cursor at a given canvas position.
 * Used by InteractionManager to determine what action to take on pointer events.
 */

import { GanttState } from '@/store';
import { HitTestResult } from '@/model/types';
import { dateToPixel } from '@/utils/dateUtils';
import { getSwimlaneLayout } from '@/utils/swimlaneLayout';
import {
  SWIMLANE_HEADER_WIDTH,
  SWIMLANE_ROW_HEIGHT,
  TIMELINE_TOTAL_HEIGHT,
  BAR_HEIGHT,
  MILESTONE_SIZE,
  MIN_BAR_WIDTH,
  EDGE_HIT_TOLERANCE,
} from '@/model/defaults';

export function hitTest(
  canvasX: number,
  canvasY: number,
  state: GanttState,
): HitTestResult {
  const { tasks, milestones, swimlanes, timeConfig } = state;
  const { viewStartDate, pixelsPerDay } = timeConfig;

  // 1. Check swimlane header area — find which swimlane row was clicked
  if (canvasX < SWIMLANE_HEADER_WIDTH && canvasY > TIMELINE_TOTAL_HEIGHT) {
    const layout = getSwimlaneLayout(swimlanes);
    for (const row of layout) {
      if (canvasY >= row.y && canvasY < row.y + row.height) {
        return { type: 'swimlane-header', swimlaneId: row.id, canvasX, canvasY };
      }
    }
    return { type: 'swimlane-header', canvasX, canvasY };
  }

  // 2. Check timeline header area
  if (canvasY < TIMELINE_TOTAL_HEIGHT) {
    return { type: 'empty', canvasX, canvasY };
  }

  // 3. Determine which swimlane the cursor is in
  const layout = getSwimlaneLayout(swimlanes);
  let targetSwimlaneId: string | undefined;
  let rowY = TIMELINE_TOTAL_HEIGHT;
  for (const row of layout) {
    if (canvasY >= row.y && canvasY < row.y + row.height) {
      targetSwimlaneId = row.id;
      rowY = row.y;
      break;
    }
  }

  // 4. Check milestones (smaller hit area, so check first)
  for (const ms of milestones.values()) {
    if (targetSwimlaneId && ms.swimlaneId !== targetSwimlaneId) continue;
    const cx = SWIMLANE_HEADER_WIDTH + dateToPixel(ms.date, viewStartDate, pixelsPerDay);
    const cy = rowY + SWIMLANE_ROW_HEIGHT / 2;
    const halfSize = MILESTONE_SIZE / 2 + 4; // Add padding for easier clicking

    if (Math.abs(canvasX - cx) < halfSize && Math.abs(canvasY - cy) < halfSize) {
      return { type: 'milestone', itemId: ms.id, swimlaneId: ms.swimlaneId, canvasX, canvasY };
    }
  }

  // 5. Check tasks
  for (const task of tasks.values()) {
    if (targetSwimlaneId && task.swimlaneId !== targetSwimlaneId) continue;
    const x1 = SWIMLANE_HEADER_WIDTH + dateToPixel(task.startDate, viewStartDate, pixelsPerDay);
    const x2 = SWIMLANE_HEADER_WIDTH + dateToPixel(task.endDate, viewStartDate, pixelsPerDay);
    const barW = Math.max(x2 - x1, MIN_BAR_WIDTH);
    const barY = rowY + (SWIMLANE_ROW_HEIGHT - BAR_HEIGHT) / 2;

    // Check resize edges first (they have priority)
    if (Math.abs(canvasX - x1) < EDGE_HIT_TOLERANCE &&
        canvasY >= barY - 4 && canvasY <= barY + BAR_HEIGHT + 4) {
      return { type: 'bar-left-edge', itemId: task.id, swimlaneId: task.swimlaneId, canvasX, canvasY };
    }
    if (Math.abs(canvasX - (x1 + barW)) < EDGE_HIT_TOLERANCE &&
        canvasY >= barY - 4 && canvasY <= barY + BAR_HEIGHT + 4) {
      return { type: 'bar-right-edge', itemId: task.id, swimlaneId: task.swimlaneId, canvasX, canvasY };
    }

    // Check bar body
    if (canvasX >= x1 - 4 && canvasX <= x1 + barW + 4 &&
        canvasY >= barY - 4 && canvasY <= barY + BAR_HEIGHT + 4) {
      // Check if near endpoints for dependency linking
      const endpointDistance = 10;
      if (Math.abs(canvasX - x1) < endpointDistance || Math.abs(canvasX - (x1 + barW)) < endpointDistance) {
        return {
          type: 'dependency-endpoint',
          itemId: task.id,
          swimlaneId: task.swimlaneId,
          canvasX,
          canvasY,
        };
      }
      return { type: 'bar-body', itemId: task.id, swimlaneId: task.swimlaneId, canvasX, canvasY };
    }
  }

  return { type: 'empty', swimlaneId: targetSwimlaneId, canvasX, canvasY };
}
