/**
 * ResolutionCalculator — computes output dimensions for image export
 * in both pixels and PowerPoint points.
 */

import { GanttState } from '@/store';
import { ExportOptions } from '@/model/types';
import { daysBetween } from '@/utils/dateUtils';
import { SWIMLANE_HEADER_WIDTH, SWIMLANE_ROW_HEIGHT, TIMELINE_TOTAL_HEIGHT } from '@/model/defaults';

const POINTS_PER_PX = 0.75; // 72 dpi / 96 dpi

export interface ExportDimensions {
  /** Pixel dimensions at export scale */
  pxWidth: number;
  pxHeight: number;
  /** PowerPoint point dimensions (physical size on slide) */
  ptWidth: number;
  ptHeight: number;
}

export function calculateExportDimensions(
  state: GanttState,
  options: ExportOptions,
): ExportDimensions {
  const { timeConfig, swimlanes } = state;
  const { projectStart, projectEnd, pixelsPerDay } = timeConfig;

  // Chart area dimensions in screen pixels
  const chartWidthPx = SWIMLANE_HEADER_WIDTH +
    daysBetween(projectStart, projectEnd) * pixelsPerDay;
  const chartHeightPx = TIMELINE_TOTAL_HEIGHT +
    swimlanes.length * SWIMLANE_ROW_HEIGHT;

  const scale = options.scale;

  if (options.scope === 'full') {
    return {
      pxWidth: chartWidthPx * scale,
      pxHeight: chartHeightPx * scale,
      ptWidth: chartWidthPx * POINTS_PER_PX,
      ptHeight: chartHeightPx * POINTS_PER_PX,
    };
  }

  // Visible area only
  const { view } = state;
  return {
    pxWidth: view.viewportWidth * scale,
    pxHeight: view.viewportHeight * scale,
    ptWidth: view.viewportWidth * POINTS_PER_PX,
    ptHeight: view.viewportHeight * POINTS_PER_PX,
  };
}
