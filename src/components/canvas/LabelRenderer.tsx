import { GanttState } from '@/store';
import { dateToPixel } from '@/utils/dateUtils';
import { getSwimlaneYMap } from '@/utils/swimlaneLayout';
import {
  SWIMLANE_HEADER_WIDTH,
  SWIMLANE_ROW_HEIGHT,
  BAR_HEIGHT,
  MILESTONE_SIZE,
} from '@/model/defaults';

export function renderLabels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
): void {
  const { tasks, milestones, swimlanes, timeConfig } = state;
  const { viewStartDate, pixelsPerDay } = timeConfig;

  const swimlaneYMap = getSwimlaneYMap(swimlanes);

  const placedLabels: { x: number; y: number; w: number; h: number }[] = [];

  // Clip to chart area
  ctx.save();
  ctx.beginPath();
  ctx.rect(SWIMLANE_HEADER_WIDTH, 0, width - SWIMLANE_HEADER_WIDTH, height);
  ctx.clip();

  // Render task labels
  for (const task of tasks.values()) {
    const slY = swimlaneYMap.get(task.swimlaneId);
    if (slY === undefined) continue;

    const x1 = SWIMLANE_HEADER_WIDTH + dateToPixel(task.startDate, viewStartDate, pixelsPerDay);
    const x2 = SWIMLANE_HEADER_WIDTH + dateToPixel(task.endDate, viewStartDate, pixelsPerDay);
    const barWidth = Math.max(x2 - x1, 10);
    const barY = slY + (SWIMLANE_ROW_HEIGHT - BAR_HEIGHT) / 2;

    const label = task.label || task.name;
    ctx.font = '11px "Segoe UI", sans-serif';
    const textWidth = ctx.measureText(label).width;
    const textHeight = 14;

    // Try to place label: prefer right-outside, then center-inside, then above
    let lx: number, ly: number, hasConnector = false;

    // Candidate 1: right-outside
    lx = x2 + 6;
    ly = barY + BAR_HEIGHT / 2 - textHeight / 2;
    if (!overlapsAny(lx, ly, textWidth, textHeight, placedLabels) && lx + textWidth < width) {
      // OK
    } else {
      // Candidate 2: center-inside
      lx = x1 + (barWidth - textWidth) / 2;
      ly = barY + BAR_HEIGHT / 2 - textHeight / 2;
      if (barWidth < textWidth + 8 || overlapsAny(lx, ly, textWidth, textHeight, placedLabels)) {
        // Candidate 3: above
        lx = x1;
        ly = barY - textHeight - 2;
        hasConnector = true;
      }
    }

    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, lx, ly);

    if (hasConnector) {
      ctx.strokeStyle = '#9090a8';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(lx + textWidth / 2, barY);
      ctx.lineTo(lx + textWidth / 2, ly + textHeight);
      ctx.stroke();
    }

    placedLabels.push({ x: lx, y: ly, w: textWidth + 4, h: textHeight });
  }

  // Render milestone labels
  for (const ms of milestones.values()) {
    const slY = swimlaneYMap.get(ms.swimlaneId);
    if (slY === undefined) continue;

    const cx = SWIMLANE_HEADER_WIDTH + dateToPixel(ms.date, viewStartDate, pixelsPerDay);
    const cy = slY + SWIMLANE_ROW_HEIGHT / 2;

    const label = ms.label || ms.name;
    ctx.font = '10px "Segoe UI", sans-serif';
    const textWidth = ctx.measureText(label).width;

    // Place top-right of diamond
    const lx = cx + MILESTONE_SIZE / 2 + 4;
    const ly = cy - MILESTONE_SIZE / 2 - 4;

    ctx.fillStyle = '#5a5a7a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, lx, ly);
  }

  ctx.restore();
}

function overlapsAny(
  x: number, y: number, w: number, h: number,
  placed: { x: number; y: number; w: number; h: number }[],
): boolean {
  for (const r of placed) {
    if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) {
      return true;
    }
  }
  return false;
}
