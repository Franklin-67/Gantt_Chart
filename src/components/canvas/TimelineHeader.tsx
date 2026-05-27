import { GanttState } from '@/store';
import { dateToPixel, formatDate } from '@/utils/dateUtils';
import { TimeUnit } from '@/model/types';
import { SWIMLANE_HEADER_WIDTH } from '@/model/defaults';

const LEVEL_STYLES = [
  { bg: '#f5f7fa', border: '#e4e7ed', text: '#303133' },
  { bg: '#ffffff', border: '#ebeef5', text: '#606266' },
  { bg: '#ffffff', border: '#f2f6fc', text: '#909399' },
];

export function renderTimeline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
): void {
  const { timeConfig, headerFontSizes } = state;
  const { scales, viewStartDate, viewEndDate, pixelsPerDay } = timeConfig;
  const fonts = headerFontSizes;

  const timelineX = SWIMLANE_HEADER_WIDTH;
  let yOffset = 0;

  ctx.save();
  ctx.beginPath();
  ctx.rect(timelineX, 0, width - timelineX, height);
  ctx.clip();

  for (let si = 0; si < scales.length; si++) {
    const scale = scales[si];
    if (!scale.visible) continue;

    const fontSize = fonts[si] ?? 12;
    const style = LEVEL_STYLES[si] || LEVEL_STYLES[2];

    // Draw background
    ctx.fillStyle = style.bg;
    ctx.fillRect(timelineX, yOffset, width - timelineX, scale.height);

    // Calculate total days in view
    const totalDays = Math.ceil((new Date(viewEndDate).getTime() - new Date(viewStartDate).getTime()) / 86400000) + 1;
    
    // Track which units we've already labeled
    const labeledUnits = new Set<string>();

    // Handle Year units specially - show all years in view even if not complete
    if (scale.unit === TimeUnit.Year) {
      const startYear = new Date(viewStartDate).getFullYear();
      const endYear = new Date(viewEndDate).getFullYear();
      
      for (let year = startYear; year <= endYear; year++) {
        // Calculate the actual range of this year in the view
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
        
        // Clamp to view range
        const viewStart = new Date(viewStartDate);
        const viewEnd = new Date(viewEndDate);
        
        const actualStart = yearStart < viewStart ? viewStart : yearStart;
        const actualEnd = yearEnd > viewEnd ? viewEnd : yearEnd;
        
        // Calculate position
        const startOffset = Math.ceil((actualStart.getTime() - viewStart.getTime()) / 86400000);
        const endOffset = Math.ceil((actualEnd.getTime() - viewStart.getTime()) / 86400000) + 1;
        
        const x = timelineX + startOffset * pixelsPerDay;
        const unitWidth = (endOffset - startOffset) * pixelsPerDay;
        
        // Only draw if visible
        if (x + unitWidth < timelineX || x > width) continue;
        
        const label = `${year}年`;
        
        // Draw label centered in the visible portion
        const labelX = x + unitWidth / 2;
        const textWidth = ctx.measureText(label).width;
        
        if (labelX + textWidth / 2 > timelineX && labelX - textWidth / 2 < width) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = style.text;
          ctx.font = `${si === 0 ? '600' : '400'} ${fontSize}px "Segoe UI", sans-serif`;
          ctx.fillText(label, labelX, yOffset + scale.height / 2);
        }
        
        // Draw separator at year boundary if within view
        const sepX = timelineX + endOffset * pixelsPerDay;
        if (sepX > timelineX && sepX < width) {
          ctx.strokeStyle = style.border;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sepX, yOffset);
          ctx.lineTo(sepX, yOffset + scale.height);
          ctx.stroke();
        }
      }
    } else {
      // For other units (Month, Week, Day), use original logic
      for (let dayOffset = 0; dayOffset <= totalDays; dayOffset++) {
        const date = new Date(viewStartDate);
        date.setDate(date.getDate() + dayOffset);
        const dateStr = date.toISOString().slice(0, 10);
        
        // Check if this is the start of a new unit
        const isUnitStart = isStartOfUnit(date, scale.unit, scale.step);
        
        if (isUnitStart) {
          const label = formatDate(date, scale.format);
          
          // Generate unique key for tracking
          // For month, include year to allow same month in different years
          let uniqueKey = label;
          if (scale.unit === TimeUnit.Month) {
            uniqueKey = `${date.getFullYear()}-${label}`;
          }
          
          // Only label once per unique unit
          if ((scale.unit === TimeUnit.Month) && labeledUnits.has(uniqueKey)) {
            continue;
          }
          labeledUnits.add(uniqueKey);
          
          // Calculate position
          const x = timelineX + dayOffset * pixelsPerDay;
          
          // Only draw if visible
          if (x < timelineX || x > width) continue;
          
          // Find the end of this unit to calculate width
          const nextUnitStart = getNextUnitStart(date, scale.unit, scale.step);
          const nextDayOffset = Math.ceil((nextUnitStart.getTime() - new Date(viewStartDate).getTime()) / 86400000);
          const unitWidth = (nextDayOffset - dayOffset) * pixelsPerDay;
          
          // Draw label centered
          const labelX = x + unitWidth / 2;
          const textWidth = ctx.measureText(label).width;
          
          if (labelX + textWidth / 2 > timelineX && labelX - textWidth / 2 < width) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = style.text;
            ctx.font = `${si === 0 ? '600' : '400'} ${fontSize}px "Segoe UI", sans-serif`;
            ctx.fillText(label, labelX, yOffset + scale.height / 2);
          }
          
          // Draw separator line at the end of the unit
          const sepX = x + unitWidth;
          if (sepX > timelineX && sepX < width) {
            ctx.strokeStyle = style.border;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sepX, yOffset);
            ctx.lineTo(sepX, yOffset + scale.height);
            ctx.stroke();
          }
        }
      }
    }

    yOffset += scale.height;

    // Draw separator between levels
    ctx.strokeStyle = '#dcdfe6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(timelineX, yOffset);
    ctx.lineTo(width, yOffset);
    ctx.stroke();
  }

  ctx.restore();

  // Bottom border
  ctx.strokeStyle = '#c0c4cc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(timelineX, yOffset);
  ctx.lineTo(width, yOffset);
  ctx.stroke();

  // Today marker
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = Math.ceil((today.getTime() - new Date(viewStartDate).getTime()) / 86400000);
  const todayX = timelineX + todayOffset * pixelsPerDay;

  if (todayX > timelineX && todayX < width) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(todayX, 0);
    ctx.lineTo(todayX, yOffset);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function isStartOfUnit(date: Date, unit: TimeUnit, step: number): boolean {
  switch (unit) {
    case TimeUnit.Year:
      return date.getMonth() === 0 && date.getDate() === 1;
    case TimeUnit.Month:
      return date.getDate() === 1;
    case TimeUnit.Week:
      return date.getDay() === 1; // Monday start
    case TimeUnit.Day:
      return true;
    default:
      return true;
  }
}

function getNextUnitStart(date: Date, unit: TimeUnit, step: number): Date {
  const next = new Date(date);
  switch (unit) {
    case TimeUnit.Year:
      next.setFullYear(next.getFullYear() + step);
      break;
    case TimeUnit.Month:
      next.setMonth(next.getMonth() + step);
      break;
    case TimeUnit.Week:
      next.setDate(next.getDate() + 7 * step);
      break;
    case TimeUnit.Day:
      next.setDate(next.getDate() + step);
      break;
  }
  return next;
}


