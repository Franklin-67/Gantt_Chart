import { GanttState } from '@/store';
import { DragMode } from '@/model/types';
import { dateToPixel } from '@/utils/dateUtils';
import { getSwimlaneLayout } from '@/utils/swimlaneLayout';
import {
  SWIMLANE_HEADER_WIDTH,
  SWIMLANE_ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_RADIUS,
  MIN_BAR_WIDTH,
} from '@/model/defaults';

export function renderDragOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
): void {
  const { interaction, timeConfig, swimlanes } = state;
  const { dragMode, dragOrigin, dragCurrent, ghostStartDate, ghostEndDate, reorderSwimlaneId } = interaction;

  if (dragMode === DragMode.Idle) return;

  const startX = dragOrigin.x;
  const currentX = dragCurrent.x;
  const startY = dragOrigin.y;
  const currentY = dragCurrent.y;

  // --- Swimlane reorder indicator ---
  if (dragMode === DragMode.ReorderSwimlane && reorderSwimlaneId) {
    const layout = getSwimlaneLayout(swimlanes);

    // Find insertion index
    let insertIdx = layout.length;
    for (let i = 0; i < layout.length; i++) {
      if (currentY < layout[i].y + layout[i].height / 2) {
        insertIdx = i;
        break;
      }
    }

    const insertY = insertIdx < layout.length
      ? layout[insertIdx].y
      : layout[layout.length - 1].y + layout[layout.length - 1].height;

    // Horizontal insertion line
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, insertY);
    ctx.lineTo(width, insertY);
    ctx.stroke();

    // Small circle handles at both ends
    ctx.fillStyle = '#4A90D9';
    ctx.beginPath();
    ctx.arc(8, insertY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width - 8, insertY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Highlight the dragged row
    const draggedRow = layout.find((r) => r.id === reorderSwimlaneId);
    if (draggedRow) {
      ctx.fillStyle = 'rgba(74, 144, 217, 0.08)';
      ctx.fillRect(0, draggedRow.y, SWIMLANE_HEADER_WIDTH, draggedRow.height);
    }

    return;
  }

  if (dragMode === DragMode.Create) {
    const left = Math.min(startX, currentX);
    const barWidth = Math.max(Math.abs(currentX - startX), MIN_BAR_WIDTH);

    const layout = getSwimlaneLayout(swimlanes);
    let targetSlY = startY;
    for (const row of layout) {
      if (startY >= row.y && startY < row.y + row.height) {
        targetSlY = row.y;
        break;
      }
    }

    const barY = targetSlY + (SWIMLANE_ROW_HEIGHT - BAR_HEIGHT) / 2;

    ctx.fillStyle = 'rgba(74, 144, 217, 0.4)';
    ctx.beginPath();
    roundRect(ctx, left, barY, barWidth, BAR_HEIGHT, BAR_RADIUS);
    ctx.fill();

    ctx.strokeStyle = 'rgba(74, 144, 217, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (ghostStartDate && ghostEndDate) {
      const tip = `${ghostStartDate} → ${ghostEndDate}`;
      ctx.font = '10px "Segoe UI", sans-serif';
      const tw = ctx.measureText(tip).width;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(left + barWidth / 2 - tw / 2 - 4, barY - 22, tw + 8, 18);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(tip, left + barWidth / 2, barY - 8);
    }
  }

  if (dragMode === DragMode.Link && interaction.linkSourceId) {
    const sourceItem = state.tasks.get(interaction.linkSourceId)
      || state.milestones.get(interaction.linkSourceId);
    if (sourceItem) {
      const slRow = getSwimlaneLayout(swimlanes).find(r => r.id === sourceItem.swimlaneId);
      if (slRow) {
        const y = slRow.y + SWIMLANE_ROW_HEIGHT / 2;
        let sx: number;
        if ('endDate' in sourceItem) {
          sx = SWIMLANE_HEADER_WIDTH + dateToPixel(
            sourceItem.endDate,
            timeConfig.viewStartDate,
            timeConfig.pixelsPerDay,
          );
        } else {
          sx = SWIMLANE_HEADER_WIDTH + dateToPixel(
            sourceItem.date,
            timeConfig.viewStartDate,
            timeConfig.pixelsPerDay,
          );
        }

        ctx.strokeStyle = '#9090a8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(sx, y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
