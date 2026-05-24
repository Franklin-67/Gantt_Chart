/**
 * ImageExporter — renders the full Gantt chart to an offscreen canvas
 * and returns a Blob for saving to file via Electron IPC.
 */

import { GanttState } from '@/store';
import { ExportOptions } from '@/model/types';
import { calculateExportDimensions } from './ResolutionCalculator';
import { renderTimeline } from '@/components/canvas/TimelineHeader';
import { renderGridBackground } from '@/components/canvas/GridBackground';
import { renderSwimlanes } from '@/components/canvas/SwimlaneRenderer';
import { renderBars } from '@/components/canvas/BarRenderer';
import { renderDependencies } from '@/components/canvas/DependencyRenderer';
import { renderLabels } from '@/components/canvas/LabelRenderer';

export async function exportGanttImage(
  state: GanttState,
  options: ExportOptions = { format: 'png' as any, scale: 2, scope: 'full' },
): Promise<{ blob: Blob; dims: { pxWidth: number; pxHeight: number; ptWidth: number; ptHeight: number } }> {
  // For full-scope export, temporarily set view range to full project range
  const savedViewStart = state.timeConfig.viewStartDate;
  const savedViewEnd = state.timeConfig.viewEndDate;
  if (options.scope === 'full') {
    state.timeConfig.viewStartDate = state.timeConfig.projectStart;
    state.timeConfig.viewEndDate = state.timeConfig.projectEnd;
  }

  try {
    const dims = calculateExportDimensions(state, options);

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = dims.pxWidth;
    canvas.height = dims.pxHeight;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, dims.pxWidth, dims.pxHeight);

    // Apply scale transform
    ctx.scale(options.scale, options.scale);

    // Replay all layer rendering in order
    renderGridBackground(ctx, dims.pxWidth / options.scale, dims.pxHeight / options.scale, state);
    renderSwimlanes(ctx, dims.pxWidth / options.scale, dims.pxHeight / options.scale, state);
    renderBars(ctx, dims.pxWidth / options.scale, dims.pxHeight / options.scale, state);
    renderDependencies(ctx, dims.pxWidth / options.scale, dims.pxHeight / options.scale, state);
    renderLabels(ctx, dims.pxWidth / options.scale, dims.pxHeight / options.scale, state);
    renderTimeline(ctx, dims.pxWidth / options.scale, dims.pxHeight / options.scale, state);

    // Convert to blob
    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const blob = await canvasToBlob(canvas, mimeType);

    return { blob, dims };
  } finally {
    // Restore view range
    state.timeConfig.viewStartDate = savedViewStart;
    state.timeConfig.viewEndDate = savedViewEnd;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      mimeType,
    );
  });
}
