import { GanttState } from '@/store';
import { dateToPixel } from '@/utils/dateUtils';
import { getSwimlaneYMap } from '@/utils/swimlaneLayout';
import { roundRect, darken } from '@/utils/canvasUtils';
import {
  SWIMLANE_HEADER_WIDTH,
  SWIMLANE_ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_RADIUS,
  MILESTONE_SIZE,
  MIN_BAR_WIDTH,
} from '@/model/defaults';

export function renderBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
): void {
  const { tasks, milestones, swimlanes, timeConfig } = state;
  const { viewStartDate, pixelsPerDay } = timeConfig;

  const swimlaneYMap = getSwimlaneYMap(swimlanes, state.rowHeight);

  // Clip to chart area (prevent bars from bleeding into swimlane header)
  ctx.save();
  ctx.beginPath();
  ctx.rect(SWIMLANE_HEADER_WIDTH, 0, width - SWIMLANE_HEADER_WIDTH, height);
  ctx.clip();

  // Render tasks
  for (const task of tasks.values()) {
    const slY = swimlaneYMap.get(task.swimlaneId);
    if (slY === undefined) continue;

    const x1 = SWIMLANE_HEADER_WIDTH + dateToPixel(task.startDate, viewStartDate, pixelsPerDay);
    const x2 = SWIMLANE_HEADER_WIDTH + dateToPixel(task.endDate, viewStartDate, pixelsPerDay);
    const barWidth = Math.max(x2 - x1, MIN_BAR_WIDTH);
    const barY = slY + (SWIMLANE_ROW_HEIGHT - BAR_HEIGHT) / 2;

    // Skip if fully outside visible area
    if (x1 + barWidth < 0 || x1 > width) continue;

    // Draw bar background
    ctx.fillStyle = task.color;
    ctx.beginPath();
    roundRect(ctx, x1, barY, barWidth, BAR_HEIGHT, BAR_RADIUS);
    ctx.fill();

    // Draw progress fill
    if (task.progress > 0 && task.progress <= 100) {
      const progressWidth = (barWidth * task.progress) / 100;
      if (progressWidth > 0) {
        ctx.fillStyle = darken(task.color, 0.2);
        ctx.beginPath();
        if (progressWidth > BAR_RADIUS * 2) {
          roundRect(ctx, x1, barY, progressWidth, BAR_HEIGHT, BAR_RADIUS);
        } else {
          ctx.fillRect(x1, barY, progressWidth, BAR_HEIGHT);
        }
        ctx.fill();
      }
    }

    // Draw bar border
    ctx.strokeStyle = darken(task.color, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, x1, barY, barWidth, BAR_HEIGHT, BAR_RADIUS);
    ctx.stroke();
  }

  // Render milestones
  for (const ms of milestones.values()) {
    const slY = swimlaneYMap.get(ms.swimlaneId);
    if (slY === undefined) continue;

    const cx = SWIMLANE_HEADER_WIDTH + dateToPixel(ms.date, viewStartDate, pixelsPerDay);
    const cy = slY + SWIMLANE_ROW_HEIGHT / 2;

    if (cx < -MILESTONE_SIZE || cx > width + MILESTONE_SIZE) continue;

    ctx.fillStyle = ms.color;
    ctx.beginPath();
    const hs = MILESTONE_SIZE / 2;
    ctx.moveTo(cx, cy - hs);
    ctx.lineTo(cx + hs, cy);
    ctx.lineTo(cx, cy + hs);
    ctx.lineTo(cx - hs, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = darken(ms.color, 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}


