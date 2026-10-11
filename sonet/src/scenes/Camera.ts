import { GROUND_SCREEN_Y, STAGE_HALF_WIDTH, VIEW_H, VIEW_W } from '../data/constants';
import { view } from './render/view';

export interface CameraOverride {
  x: number;
  y: number;
  zoom: number;
  strength: number;
}

const PIVOT_Y = GROUND_SCREEN_Y - 120;
const CAM_Y_DEFAULT = 120;

/** Follows both fighters, zooming out as they separate; supports hit zoom and cinematic overrides. */
export class Camera {
  x = 0;
  y = CAM_Y_DEFAULT;
  zoom = 1;
  private targetX = 0;
  private targetZoom = 1;
  private kick = 0;
  private override: CameraOverride | null = null;
  private tilt = 0;
  angle = 0;

  reset(): void {
    this.x = 0;
    this.y = CAM_Y_DEFAULT;
    this.zoom = 1;
    this.kick = 0;
    this.override = null;
    this.angle = 0;
  }

  hitZoom(amount: number): void {
    this.kick = Math.max(this.kick, amount);
  }

  /** Camera y that places world height `worldY` at screen row `screenY` for a given zoom. */
  static yFor(worldY: number, zoom: number, screenY = 400): number {
    return worldY + (screenY - PIVOT_Y) / zoom;
  }

  setOverride(o: CameraOverride | null): void {
    this.override = o;
  }

  setTilt(a: number): void {
    this.tilt = a;
  }

  update(ax: number, bx: number, ay: number, by: number): void {
    const sep = Math.abs(ax - bx);
    this.targetX = (ax + bx) / 2;
    const base = Math.max(0.78, Math.min(1.32, 1.18 - (sep - 220) * 0.00055));
    const heightLift = Math.max(0, Math.max(ay, by) - 120) * 0.35;
    this.targetZoom = base;
    let tx = this.targetX;
    let tz = this.targetZoom + this.kick;
    let ty = CAM_Y_DEFAULT + heightLift;
    let blend = 0.12;
    if (this.override) {
      const o = this.override;
      tx = tx + (o.x - tx) * o.strength;
      tz = tz + (o.zoom - tz) * o.strength;
      ty = ty + (o.y - ty) * o.strength;
      blend = 0.14;
    }
    const half = VIEW_W / (2 * tz);
    const limit = Math.max(0, STAGE_HALF_WIDTH + 140 - half);
    tx = Math.max(-limit, Math.min(limit, tx));
    this.x += (tx - this.x) * blend;
    this.y += (ty - this.y) * blend;
    this.zoom += (tz - this.zoom) * 0.14;
    this.kick *= 0.88;
    this.angle += (this.tilt - this.angle) * 0.08;
  }

  /** Applies world → screen transform with y-up world coordinates. */
  apply(ctx: CanvasRenderingContext2D, shakeX: number, shakeY: number): void {
    const k = view.scale;
    ctx.setTransform(this.zoom * k, 0, 0, -this.zoom * k, (VIEW_W / 2 - this.x * this.zoom + shakeX) * k, (PIVOT_Y + this.y * this.zoom + shakeY) * k);
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: VIEW_W / 2 + (wx - this.x) * this.zoom, y: PIVOT_Y + (this.y - wy) * this.zoom };
  }

  get groundY(): number {
    return PIVOT_Y + this.y * this.zoom;
  }

  get viewBottom(): number {
    return VIEW_H;
  }
}
