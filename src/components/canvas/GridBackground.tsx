import { GanttState } from '@/store';
import { daysBetween, isWeekend } from '@/utils/dateUtils';
import { SWIMLANE_HEADER_WIDTH, TIMELINE_TOTAL_HEIGHT } from '@/model/defaults';

export function renderGridBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
): void {
  const { timeConfig, weekendRule, holidays } = state;
  const { viewStartDate, viewEndDate, pixelsPerDay } = timeConfig;

  const totalDays = daysBetween(viewStartDate, viewEndDate) + 1;
  const chartStartX = SWIMLANE_HEADER_WIDTH;
  const chartY = TIMELINE_TOTAL_HEIGHT;

  // Background base color
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(chartStartX, chartY, width - chartStartX, height - chartY);

  // Weekend shading with improved visual
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(viewStartDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    if (isWeekend(dateStr, weekendRule.days)) {
      const x = chartStartX + d * pixelsPerDay;
      ctx.fillStyle = '#f8fafc'; // Light blue-gray for weekend
      ctx.fillRect(x, chartY, pixelsPerDay, height - chartY);
    }
  }

  // Holiday shading
  for (const holiday of holidays) {
    const holidayIndex = daysBetween(viewStartDate, holiday.date);
    if (holidayIndex >= 0 && holidayIndex < totalDays) {
      const x = chartStartX + holidayIndex * pixelsPerDay;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'; // Light red tint
      ctx.fillRect(x, chartY, pixelsPerDay, height - chartY);
    }
  }

  // Vertical grid lines with improved styling
  for (let d = 0; d <= totalDays; d++) {
    const x = chartStartX + d * pixelsPerDay;
    if (x > width) break;
    
    // Check if it's a week boundary (Monday) for slightly darker line
    const date = new Date(viewStartDate);
    date.setDate(date.getDate() + d);
    const isWeekStart = date.getDay() === 1;
    
    ctx.strokeStyle = isWeekStart ? '#e2e8f0' : '#f1f5f9';
    ctx.lineWidth = isWeekStart ? 1 : 0.5;
    
    ctx.beginPath();
    ctx.moveTo(x, chartY);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Swimlane header background is drawn by the swimlane layer (fixed, not scrolled)
}
