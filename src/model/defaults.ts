import { TimeConfig, TimeUnit, WeekendRule } from './types';

export const SWIMLANE_ROW_HEIGHT = 40;
export const SWIMLANE_HEADER_WIDTH = 180;
export const TIMELINE_TOTAL_HEIGHT = 86; // Year 22 + Month 24 + Week 20 + Day 20
export const BAR_HEIGHT = 20;
export const BAR_RADIUS = 4;
export const MILESTONE_SIZE = 12;
export const MIN_BAR_WIDTH = 4;
export const EDGE_HIT_TOLERANCE = 6;

export const DEFAULT_COLORS = [
  '#4A90D9', '#5CB85C', '#F0AD4E', '#D9534F',
  '#5BC0DE', '#9B59B6', '#E67E22', '#1ABC9C',
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
];

export const DEFAULT_WEEKEND_RULE: WeekendRule = {
  days: [0, 6], // Sat, Sun (JS convention)
};

export const DEFAULT_TIME_SCALES = [
  { unit: TimeUnit.Year, step: 1, format: 'yyyy年', height: 22, visible: true },
  { unit: TimeUnit.Month, step: 1, format: 'M月', height: 24, visible: true },
  { unit: TimeUnit.Week, step: 1, format: 'WW', height: 20, visible: true },
  { unit: TimeUnit.Day, step: 1, format: 'd', height: 20, visible: false },
];

export function createDefaultTimeConfig(): TimeConfig {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  // Default view: show 3 months from current date
  const vs = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ve = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  return {
    scales: DEFAULT_TIME_SCALES.map(s => ({ ...s })),
    projectStart: dateToISO(start),
    projectEnd: dateToISO(end),
    viewStartDate: dateToISO(vs),
    viewEndDate: dateToISO(ve),
    pixelsPerDay: 20,
    minPixelsPerDay: 0.3,
    maxPixelsPerDay: 500,
  };
}

export function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
