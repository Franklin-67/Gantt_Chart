/**
 * Date utility functions for the Gantt chart engine.
 * All dates use ISO 8601 strings (YYYY-MM-DD) internally.
 */

import { TimeScaleLevel, TimeUnit, HeaderCell, TimeConfig } from '@/model/types';

export function parseDate(isoStr: string): Date {
  const d = new Date(isoStr + 'T00:00:00');
  return d;
}

const SHORT_CHINESE_MONTHS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const FULL_CHINESE_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

type FormatFn = (date: Date, weekNum: number) => string;

const FORMATTERS: Record<string, FormatFn> = {
  'yyyy年': (date) => `${date.getFullYear()}年`,
  'M月':    (date) => `${date.getMonth() + 1}月`,
  'WW':     (_date, w) => String(w).padStart(2, '0'),
  'W':      (_date, w) => String(w),
  'MM':     (date) => String(date.getMonth() + 1).padStart(2, '0'),
  'MMM':    (date) => SHORT_CHINESE_MONTHS[date.getMonth()],
  'MMMM':   (date) => FULL_CHINESE_MONTHS[date.getMonth()],
  'M':      (date) => String(date.getMonth() + 1),
  'dd':     (date) => String(date.getDate()).padStart(2, '0'),
  'd':      (date) => String(date.getDate()),
  'yy':     (date) => String(date.getFullYear()).slice(-2),
};

export function formatDate(date: Date, fmt: string): string {
  const formatter = FORMATTERS[fmt];
  if (formatter) {
    const weekNum = getISOWeekNumber(date.toISOString().slice(0, 10));
    return formatter(date, weekNum);
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** Get the number of days between two ISO dates */
export function daysBetween(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/** Add N days to an ISO date string */
export function addDays(isoStr: string, days: number): string {
  const d = parseDate(isoStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Get the first day of the week containing the given date */
export function startOfWeek(isoStr: string): string {
  const d = parseDate(isoStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

/** Snap a date to the start of its containing unit */
export function snapToUnitStart(isoStr: string, unit: TimeUnit): string {
  const d = parseDate(isoStr);
  switch (unit) {
    case TimeUnit.Year:
      d.setMonth(0, 1);
      break;
    case TimeUnit.Quarter:
      d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
      break;
    case TimeUnit.Month:
      d.setDate(1);
      break;
    case TimeUnit.Week:
      return startOfWeek(isoStr);
    case TimeUnit.Day:
      break;
  }
  return d.toISOString().slice(0, 10);
}

/** Snap a date to the end of its containing unit */
export function snapToUnitEnd(isoStr: string, unit: TimeUnit): string {
  const start = parseDate(snapToUnitStart(isoStr, unit));
  switch (unit) {
    case TimeUnit.Year:
      start.setFullYear(start.getFullYear() + 1);
      break;
    case TimeUnit.Quarter:
      start.setMonth(start.getMonth() + 3);
      break;
    case TimeUnit.Month:
      start.setMonth(start.getMonth() + 1);
      break;
    case TimeUnit.Week:
      start.setDate(start.getDate() + 7);
      break;
    case TimeUnit.Day:
      start.setDate(start.getDate() + 1);
      break;
  }
  start.setDate(start.getDate() - 1);
  return start.toISOString().slice(0, 10);
}

/**
 * Convert a date to pixel X position.
 * @param isoStr ISO date string
 * @param projectStart project start date string
 * @param pixelsPerDay zoom level
 * @returns X pixel position relative to project start
 */
export function dateToPixel(isoStr: string, projectStart: string, pixelsPerDay: number): number {
  return daysBetween(projectStart, isoStr) * pixelsPerDay;
}

/**
 * Convert a pixel X position back to a date (snapped to nearest day).
 */
export function pixelToDate(x: number, projectStart: string, pixelsPerDay: number): string {
  const days = Math.round(x / pixelsPerDay);
  return addDays(projectStart, days);
}

/** Generate header cells for a given time scale level */
export function generateHeaderCells(
  level: TimeScaleLevel,
  startDate: string,
  endDate: string,
  pixelsPerDay: number,
  projectStart: string,
): HeaderCell[] {
  const cells: HeaderCell[] = [];
  let current = snapToUnitStart(startDate, level.unit);
  const finish = snapToUnitEnd(endDate, level.unit);

  // Prevent duplicate cells by tracking lastEndDate
  let lastEndDate: string | null = null;

  while (current <= finish) {
    const cellEnd = snapToUnitEnd(current, level.unit);
    
    // Skip if this cell overlaps with previous one
    if (lastEndDate && current <= lastEndDate) {
      // Advance to next unit
      const d = parseDate(current);
      switch (level.unit) {
        case TimeUnit.Year: d.setFullYear(d.getFullYear() + level.step); break;
        case TimeUnit.Quarter: d.setMonth(d.getMonth() + 3 * level.step); break;
        case TimeUnit.Month: d.setMonth(d.getMonth() + level.step); break;
        case TimeUnit.Week: d.setDate(d.getDate() + 7 * level.step); break;
        case TimeUnit.Day: d.setDate(d.getDate() + level.step); break;
      }
      current = d.toISOString().slice(0, 10);
      continue;
    }

    const x = dateToPixel(current, projectStart, pixelsPerDay);
    const width = Math.max(daysBetween(current, cellEnd) + 1, 0) * pixelsPerDay;
    const label = formatDate(parseDate(current), level.format);

    if (width > 0) {
      cells.push({
        startDate: current,
        endDate: cellEnd,
        label,
        x,
        width,
      });
      lastEndDate = cellEnd;
    }

    // Advance to next unit
    const d = parseDate(current);
    switch (level.unit) {
      case TimeUnit.Year: d.setFullYear(d.getFullYear() + level.step); break;
      case TimeUnit.Quarter: d.setMonth(d.getMonth() + 3 * level.step); break;
      case TimeUnit.Month: d.setMonth(d.getMonth() + level.step); break;
      case TimeUnit.Week: d.setDate(d.getDate() + 7 * level.step); break;
      case TimeUnit.Day: d.setDate(d.getDate() + level.step); break;
    }
    current = d.toISOString().slice(0, 10);
  }

  return cells;
}

/** Check if a date falls on a weekend */
export function isWeekend(isoStr: string, weekendDays: number[]): boolean {
  const d = parseDate(isoStr);
  return weekendDays.includes(d.getDay());
}

/** Get the ISO week number */
export function getISOWeekNumber(isoStr: string): number {
  const d = parseDate(isoStr);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const dayDiff = (target.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round(dayDiff / 7);
}
