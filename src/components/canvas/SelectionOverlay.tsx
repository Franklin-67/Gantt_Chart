import { GanttState } from '@/store';
import { dateToPixel } from '@/utils/dateUtils';
import { getSwimlaneYMap } from '@/utils/swimlaneLayout';
import {
  SWIMLANE_HEADER_WIDTH,
  SWIMLANE_ROW_HEIGHT,
  BAR_HEIGHT,
  MILESTONE_SIZE,
  MIN_BAR_WIDTH,
} from '@/model/defaults';

export function renderSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
): void {
  const { selection, tasks, milestones, swimlanes, timeConfig } = state;
  const { viewStartDate, pixelsPerDay } = timeConfig;

  if (selection.selectedIds.length === 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(SWIMLANE_HEADER_WIDTH, 0, width - SWIMLANE_HEADER_WIDTH, height);
  ctx.clip();

  const swimlaneYMap = getSwimlaneYMap(swimlanes);

  for (const id of selection.selectedIds) {
    const task = tasks.get(id);
    const ms = milestones.get(id);

    if (task) {
      const slY = swimlaneYMap.get(task.swimlaneId);
      if (slY === undefined) continue;

      const x1 = SWIMLANE_HEADER_WIDTH + dateToPixel(task.startDate, viewStartDate, pixelsPerDay);
      const x2 = SWIMLANE_HEADER_WIDTH + dateToPixel(task.endDate, viewStartDate, pixelsPerDay);
      const barW = Math.max(x2 - x1, MIN_BAR_WIDTH);
      const barY = slY + (SWIMLANE_ROW_HEIGHT - BAR_HEIGHT) / 2;

      // Selection highlight
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(x1 - 3, barY - 3, barW + 6, BAR_HEIGHT + 6);
      ctx.setLineDash([]);

      // Resize handles
      drawHandle(ctx, x1, barY + BAR_HEIGHT / 2);
      drawHandle(ctx, x1 + barW, barY + BAR_HEIGHT / 2);
    }

    if (ms) {
      const slY = swimlaneYMap.get(ms.swimlaneId);
      if (slY === undefined) continue;

      const cx = SWIMLANE_HEADER_WIDTH + dateToPixel(ms.date, viewStartDate, pixelsPerDay);
      const cy = slY + SWIMLANE_ROW_HEIGHT / 2;

      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(cx - MILESTONE_SIZE - 3, cy - MILESTONE_SIZE - 3, MILESTONE_SIZE * 2 + 6, MILESTONE_SIZE * 2 + 6);
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
