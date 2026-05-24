import { GanttState } from '@/store';
import { DependencyType } from '@/model/types';
import { dateToPixel } from '@/utils/dateUtils';
import { getSwimlaneYMap } from '@/utils/swimlaneLayout';
import {
  SWIMLANE_HEADER_WIDTH,
  SWIMLANE_ROW_HEIGHT,
} from '@/model/defaults';

export function renderDependencies(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
): void {
  const { dependencies, tasks, milestones, swimlanes, timeConfig } = state;
  const { viewStartDate, pixelsPerDay } = timeConfig;

  const swimlaneYMap = getSwimlaneYMap(swimlanes);

  ctx.save();
  ctx.beginPath();
  ctx.rect(SWIMLANE_HEADER_WIDTH, 0, width - SWIMLANE_HEADER_WIDTH, height);
  ctx.clip();

  for (const dep of dependencies) {
    const fromTask = tasks.get(dep.fromItemId);
    const toTask = tasks.get(dep.toItemId);
    const fromMS = milestones.get(dep.fromItemId);
    const toMS = milestones.get(dep.toItemId);

    const fromItem = fromTask || fromMS;
    const toItem = toTask || toMS;
    if (!fromItem || !toItem) continue;

    const fromSY = swimlaneYMap.get(fromItem.swimlaneId);
    const toSY = swimlaneYMap.get(toItem.swimlaneId);
    if (fromSY === undefined || toSY === undefined) continue;

    const fromCenterY = fromSY + SWIMLANE_ROW_HEIGHT / 2;
    const toCenterY = toSY + SWIMLANE_ROW_HEIGHT / 2;

    // Calculate attachment points
    let fromX: number;
    let toX: number;

    if ('endDate' in fromItem) {
      // Task: use end date for FS/FF, start date for SS/SF
      fromX = dep.type === DependencyType.FS || dep.type === DependencyType.FF
        ? SWIMLANE_HEADER_WIDTH + dateToPixel(fromItem.endDate, viewStartDate, pixelsPerDay)
        : SWIMLANE_HEADER_WIDTH + dateToPixel(fromItem.startDate, viewStartDate, pixelsPerDay);
    } else {
      fromX = SWIMLANE_HEADER_WIDTH + dateToPixel(fromItem.date, viewStartDate, pixelsPerDay);
    }

    if ('endDate' in toItem) {
      toX = dep.type === DependencyType.FS || dep.type === DependencyType.SS
        ? SWIMLANE_HEADER_WIDTH + dateToPixel(toItem.startDate, viewStartDate, pixelsPerDay)
        : SWIMLANE_HEADER_WIDTH + dateToPixel(toItem.endDate, viewStartDate, pixelsPerDay);
    } else {
      toX = SWIMLANE_HEADER_WIDTH + dateToPixel(toItem.date, viewStartDate, pixelsPerDay);
    }

    // Draw 3-segment orthogonal arrow
    const midX = (fromX + toX) / 2;

    ctx.strokeStyle = '#9090a8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fromX, fromCenterY);
    ctx.lineTo(midX, fromCenterY);
    ctx.lineTo(midX, toCenterY);
    ctx.lineTo(toX, toCenterY);
    ctx.stroke();

    // Draw arrowhead at end
    const arrowSize = 6;
    const angle = Math.atan2(toCenterY - toCenterY, toX - midX); // always rightward for FS
    const actualAngle = toX >= midX ? 0 : Math.PI;

    ctx.fillStyle = '#9090a8';
    ctx.beginPath();
    ctx.moveTo(toX, toCenterY);
    ctx.lineTo(
      toX - arrowSize * Math.cos(actualAngle - Math.PI / 6),
      toCenterY - arrowSize * Math.sin(actualAngle - Math.PI / 6),
    );
    ctx.lineTo(
      toX - arrowSize * Math.cos(actualAngle + Math.PI / 6),
      toCenterY - arrowSize * Math.sin(actualAngle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
