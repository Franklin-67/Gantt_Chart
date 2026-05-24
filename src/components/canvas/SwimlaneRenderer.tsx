import { GanttState } from '@/store';
import { SWIMLANE_HEADER_WIDTH, TIMELINE_TOTAL_HEIGHT } from '@/model/defaults';
import { getSwimlaneLayout } from '@/utils/swimlaneLayout';

export function renderSwimlanes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
): void {
  const { swimlanes } = state;
  const layout = getSwimlaneLayout(swimlanes);

  // Fixed top-left corner (above swimlane headers, left of timeline)
  ctx.fillStyle = '#e0e2ea';
  ctx.fillRect(0, 0, SWIMLANE_HEADER_WIDTH, TIMELINE_TOTAL_HEIGHT);
  ctx.fillStyle = '#3a3a5e';
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('任务 / 泳道', SWIMLANE_HEADER_WIDTH / 2, TIMELINE_TOTAL_HEIGHT / 2);

  for (const row of layout) {
    const indent = row.depth * 16;

    // Row background (alternating)
    ctx.fillStyle = row.order % 2 === 0 ? '#ffffff' : '#fafbfc';
    ctx.fillRect(0, row.y, SWIMLANE_HEADER_WIDTH, row.height);

    // Horizontal lane line
    ctx.strokeStyle = '#e8e8f0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, row.y + row.height);
    ctx.lineTo(width, row.y + row.height);
    ctx.stroke();

    // Swimlane name
    ctx.fillStyle = '#1a1a2e';
    ctx.font = row.depth === 0
      ? 'bold 12px "Segoe UI", sans-serif'
      : '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.name, 12 + indent, row.y + row.height / 2);

    // Collapse/expand indicator
    const children = swimlanes.filter((s) => s.parentId === row.id);
    if (children.length > 0) {
      ctx.fillStyle = '#9090a8';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(row.collapsed ? '▶' : '▼', SWIMLANE_HEADER_WIDTH - 10, row.y + row.height / 2);
    }
  }

  // Fill empty area below last swimlane row
  const lastRow = layout[layout.length - 1];
  const maxY = lastRow ? lastRow.y + lastRow.height : TIMELINE_TOTAL_HEIGHT;
  if (maxY < height) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, maxY, SWIMLANE_HEADER_WIDTH, height - maxY);
  }

  // Prominent vertical divider between swimlane headers and chart area
  ctx.save();
  // Shadow on the right side of the divider
  const gradient = ctx.createLinearGradient(SWIMLANE_HEADER_WIDTH, 0, SWIMLANE_HEADER_WIDTH + 4, 0);
  gradient.addColorStop(0, 'rgba(0,0,0,0.08)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(SWIMLANE_HEADER_WIDTH, 0, 4, height);

  // Solid divider line
  ctx.strokeStyle = '#b0b0b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SWIMLANE_HEADER_WIDTH + 0.5, 0);
  ctx.lineTo(SWIMLANE_HEADER_WIDTH + 0.5, height);
  ctx.stroke();
  ctx.restore();
}
