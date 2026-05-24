/**
 * RenderScheduler — batched dirty-flag rendering via requestAnimationFrame.
 * Each store mutation marks which layers need redrawing, and the scheduler
 * redraws only those layers on the next animation frame.
 */

import { LayerManager } from './LayerManager';
import { GanttState } from '@/store';

export type LayerRenderer = (
  name: string,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GanttState,
) => void;

export class RenderScheduler {
  private layerManager: LayerManager;
  private renderFn: LayerRenderer;
  private getState: () => GanttState;
  private rafId: number | null = null;
  private width = 0;
  private height = 0;

  constructor(
    layerManager: LayerManager,
    renderFn: LayerRenderer,
    getState: () => GanttState,
  ) {
    this.layerManager = layerManager;
    this.renderFn = renderFn;
    this.getState = getState;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /** Mark a specific layer dirty and schedule a render pass */
  markDirty(layerName: string): void {
    this.layerManager.markDirty(layerName);
    this.scheduleRender();
  }

  /** Mark all layers dirty (e.g. on zoom change) */
  markAllDirty(): void {
    this.layerManager.markAllDirty();
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.rafId !== null) return; // Already scheduled
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flush();
    });
  }

  private flush(): void {
    const state = this.getState();
    const dirtyLayers = this.layerManager.getDirtyLayers();

    for (const layer of dirtyLayers) {
      this.layerManager.clearLayer(layer.name);
      this.renderFn(layer.name, layer.ctx, this.width, this.height, state);
      this.layerManager.clearDirty(layer.name);
    }
  }

  /** Force synchronous render of all layers (used for export) */
  renderAllSync(state: GanttState): void {
    const layers = this.layerManager.getDirtyLayers();
    // If none dirty, make all dirty first
    if (layers.length === 0) {
      this.layerManager.markAllDirty();
    }
    for (const layer of this.layerManager.getDirtyLayers()) {
      this.layerManager.clearLayer(layer.name);
      this.renderFn(layer.name, layer.ctx, this.width, this.height, state);
      this.layerManager.clearDirty(layer.name);
    }
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
