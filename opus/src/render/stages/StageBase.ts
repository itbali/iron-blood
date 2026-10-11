import { VIEW_HEIGHT, VIEW_WIDTH } from '../../core/constants';
import type { Camera } from '../Camera';

export type Quality = 'low' | 'medium' | 'high';

export interface StageRenderContext {
  ctx: CanvasRenderingContext2D;
  cam: Camera;
  /** Real time in ms (ambient animation is independent of simulation speed). */
  time: number;
  dt: number;
  quality: Quality;
  /** 0..1 — boss phase 2 lighting. */
  danger: number;
  reducedMotion: boolean;
}

export interface Layer {
  canvas: HTMLCanvasElement;
  factor: number;
  /** y pixel inside the layer image that sits on the horizon/floor line. */
  groundLine: number;
}

/** Screen y of the horizon for a layer with parallax factor f. */
export const horizonY = (cam: Camera, f: number): number => {
  const fixed = VIEW_HEIGHT * 0.78;
  return fixed + (cam.sy(0) - cam.shakeY - fixed) * f + cam.shakeY * f;
};

export const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

export const drawLayer = (ctx: CanvasRenderingContext2D, cam: Camera, layer: Layer): void => {
  const s = 1 + (cam.zoom - 1) * layer.factor;
  const w = layer.canvas.width;
  const x = VIEW_WIDTH / 2 + (-w / 2 - cam.x * layer.factor) * s + cam.shakeX * layer.factor;
  const y = horizonY(cam, layer.factor) - layer.groundLine * s;
  ctx.drawImage(layer.canvas, x, y, w * s, layer.canvas.height * s);
};

/** Converts a layer-local x (relative to layer centre) to screen x. */
export const layerScreenX = (cam: Camera, factor: number, lx: number): number => {
  const s = 1 + (cam.zoom - 1) * factor;
  return VIEW_WIDTH / 2 + (lx - cam.x * factor) * s;
};

export const layerScreenY = (cam: Camera, factor: number, ly: number): number => {
  const s = 1 + (cam.zoom - 1) * factor;
  return horizonY(cam, factor) - ly * s;
};

export const layerScale = (cam: Camera, factor: number): number => 1 + (cam.zoom - 1) * factor;

export abstract class Stage {
  abstract readonly id: string;
  abstract readonly floorReflect: number;
  protected layers: Layer[] = [];
  private ready = false;

  init(): void {
    if (this.ready) return;
    try {
      this.build();
    } catch (err) {
      console.error(`Stage ${this.id} failed to build its layers; using flat fallback`, err);
      this.layers = [];
    }
    this.ready = true;
  }

  protected abstract build(): void;
  abstract renderBackground(r: StageRenderContext): void;
  abstract renderFloor(r: StageRenderContext): void;
  abstract renderForeground(r: StageRenderContext): void;

  protected drawLayers(r: StageRenderContext, from: number, to: number): void {
    for (const l of this.layers) if (l.factor >= from && l.factor < to) drawLayer(r.ctx, r.cam, l);
  }

  /** Floor with perspective grid; colours supplied by the stage. */
  protected drawPerspectiveFloor(r: StageRenderContext, top: string, bottom: string, line: string, spacing = 140): void {
    const { ctx, cam } = r;
    const gy = cam.sy(0);
    const grad = ctx.createLinearGradient(0, gy, 0, VIEW_HEIGHT);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, gy, VIEW_WIDTH, VIEW_HEIGHT - gy + 40);
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    const vpY = gy - 600;
    const start = Math.floor((cam.x - 1400) / spacing) * spacing;
    ctx.beginPath();
    for (let wx = start; wx < cam.x + 1400; wx += spacing) {
      const x0 = cam.sx(wx);
      const vx = VIEW_WIDTH / 2 + (x0 - VIEW_WIDTH / 2) * 0.1;
      const t = (VIEW_HEIGHT + 40 - gy) / (VIEW_HEIGHT + 40 - vpY);
      ctx.moveTo(x0, gy);
      ctx.lineTo(x0 + (x0 - vx) * t * 2.2, VIEW_HEIGHT + 40);
    }
    for (let i = 1; i < 6; i++) {
      const y = gy + Math.pow(i / 6, 1.8) * (VIEW_HEIGHT - gy + 40);
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_WIDTH, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(VIEW_WIDTH, gy);
    ctx.stroke();
  }
}
