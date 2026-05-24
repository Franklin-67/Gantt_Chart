/**
 * ShapeExporter — Phase 2: generates native PowerPoint shapes
 * (rectangles, diamonds, connectors, text boxes) instead of an image.
 *
 * This is a STUB for Phase 2 implementation.
 */

import { GanttState } from '@/store';
import { ExportOptions } from '@/model/types';

export async function exportShapesToSlide(
  state: GanttState,
  options: ExportOptions,
): Promise<void> {
  // Phase 2: Use PowerPoint.run() to create native shapes.
  // This will map GanttTask → roundedRectangle,
  // Milestone → freeform diamond,
  // Dependency → connector lines,
  // Labels → text boxes.
  //
  // await PowerPoint.run(async (context) => {
  //   const slide = context.presentation.slides.getActiveSlide();
  //   // Create shapes...
  //   await context.sync();
  // });

  throw new Error('Native shape export not yet implemented (Phase 2)');
}
