/**
 * LayerManager — manages multiple stacked canvas elements,
 * each representing a logical rendering layer.
 */

export interface CanvasLayer {
  name: string;
  index: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  visible: boolean;
  dirty: boolean;
}

const LAYER_DEFS = [
  { name: 'background', index: 0 },
  { name: 'swimlane', index: 1 },
  { name: 'bars', index: 2 },
  { name: 'dependencies', index: 3 },
  { name: 'labels', index: 4 },
  { name: 'timeline', index: 5 },
  { name: 'selection', index: 6 },
  { name: 'drag', index: 7 },
];

export class LayerManager {
  private layers: Map<string, CanvasLayer> = new Map();
  private container: HTMLElement;
  private width = 0;
  private height = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createLayers();
  }

  private createLayers(): void {
    for (const def of LAYER_DEFS) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.pointerEvents = 'none'; // Events handled by InteractionManager on container
      canvas.style.zIndex = String(def.index);
      this.container.appendChild(canvas);

      const ctx = canvas.getContext('2d')!;
      const layer: CanvasLayer = {
        name: def.name,
        index: def.index,
        canvas,
        ctx,
        visible: true,
        dirty: true,
      };
      this.layers.set(def.name, layer);
    }
  }

  getLayer(name: string): CanvasLayer | undefined {
    return this.layers.get(name);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    for (const layer of this.layers.values()) {
      layer.canvas.width = width * dpr;
      layer.canvas.height = height * dpr;
      layer.canvas.style.width = width + 'px';
      layer.canvas.style.height = height + 'px';
      layer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layer.dirty = true;
    }
  }

  clearLayer(name: string): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  markDirty(name: string): void {
    const layer = this.layers.get(name);
    if (layer) layer.dirty = true;
  }

  markAllDirty(): void {
    for (const layer of this.layers.values()) {
      layer.dirty = true;
    }
  }

  getDirtyLayers(): CanvasLayer[] {
    return Array.from(this.layers.values()).filter((l) => l.dirty);
  }

  clearDirty(name: string): void {
    const layer = this.layers.get(name);
    if (layer) layer.dirty = false;
  }

  destroy(): void {
    for (const layer of this.layers.values()) {
      layer.canvas.remove();
    }
    this.layers.clear();
  }
}
