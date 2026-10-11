import {
  CAMERA_LERP,
  CAMERA_LOOK_UP,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_ZOOM_FAR_DISTANCE,
  CAMERA_ZOOM_LERP,
  CAMERA_ZOOM_NEAR_DISTANCE,
  STAGE_HALF_WIDTH,
  VIEW_WIDTH,
} from '@/core/constants';
import { clamp, lerp } from '@/core/math';

export interface CameraTarget {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Follows the midpoint between two fighters, zooms with their distance and supports
 * temporary cinematic overrides (hit zoom, finisher close-ups).
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  private targetZoomBoost = 0;
  private boostTicks = 0;
  private cinematic: { x: number; y: number; zoom: number; strength: number } | null = null;
  reducedMotion = false;

  snap(target: CameraTarget): void {
    const d = this.desired(target);
    this.x = d.x;
    this.y = d.y;
    this.zoom = d.zoom;
  }

  /** Short punch-in used on heavy hits. */
  hitZoom(amount: number, ticks: number): void {
    if (this.reducedMotion) return;
    this.targetZoomBoost = Math.max(this.targetZoomBoost, amount);
    this.boostTicks = Math.max(this.boostTicks, ticks);
  }

  setCinematic(x: number, y: number, zoom: number, strength = 1): void {
    this.cinematic = { x, y, zoom, strength };
  }

  clearCinematic(): void {
    this.cinematic = null;
  }

  private desired(t: CameraTarget): { x: number; y: number; zoom: number } {
    const midX = (t.x1 + t.x2) / 2;
    const dist = Math.abs(t.x1 - t.x2);
    const zt = clamp((dist - CAMERA_ZOOM_NEAR_DISTANCE) / (CAMERA_ZOOM_FAR_DISTANCE - CAMERA_ZOOM_NEAR_DISTANCE), 0, 1);
    let zoom = lerp(CAMERA_MAX_ZOOM, CAMERA_MIN_ZOOM, zt);
    const highest = Math.max(t.y1, t.y2);
    const y = CAMERA_LOOK_UP + highest * 0.3;
    const halfView = VIEW_WIDTH / 2 / zoom;
    const x = clamp(midX, -STAGE_HALF_WIDTH + halfView - 60, STAGE_HALF_WIDTH - halfView + 60);
    if (halfView > STAGE_HALF_WIDTH + 60) zoom = VIEW_WIDTH / 2 / (STAGE_HALF_WIDTH + 60);
    return { x, y, zoom };
  }

  update(target: CameraTarget, dt: number): void {
    const d = this.desired(target);
    if (this.cinematic) {
      const c = this.cinematic;
      d.x = lerp(d.x, c.x, c.strength);
      d.y = lerp(d.y, c.y, c.strength);
      d.zoom = lerp(d.zoom, c.zoom, c.strength);
    }
    if (this.boostTicks > 0) {
      this.boostTicks -= dt;
      d.zoom += this.targetZoomBoost;
      if (this.boostTicks <= 0) this.targetZoomBoost = 0;
    }
    const k = 1 - Math.pow(1 - CAMERA_LERP, dt);
    const kz = 1 - Math.pow(1 - CAMERA_ZOOM_LERP, dt);
    this.x = lerp(this.x, d.x, k);
    this.y = lerp(this.y, d.y, k);
    this.zoom = lerp(this.zoom, d.zoom, this.cinematic ? k : kz);
  }

  /** World (x, heightAboveFloor) → screen coordinates on the 1920x1080 virtual canvas. */
  toScreen(wx: number, wy: number, floorY: number, shakeX = 0, shakeY = 0): { x: number; y: number } {
    return {
      x: VIEW_WIDTH / 2 + (wx - this.x + shakeX) * this.zoom,
      y: floorY + (this.y - wy + shakeY) * this.zoom,
    };
  }
}
