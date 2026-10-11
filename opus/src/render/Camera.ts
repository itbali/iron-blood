import { STAGE_HALF_WIDTH, VIEW_HEIGHT, VIEW_WIDTH } from '../core/constants';
import { clamp, lerp } from '../core/math';
import type { ScreenShake } from '../effects/ScreenShake';

const FOCUS_SCREEN_Y = VIEW_HEIGHT * 0.6;
const BASE_FOCUS_HEIGHT = 130;
const MIN_ZOOM = 0.84;
const MAX_ZOOM = 1.18;
const FOLLOW = 0.12;
const ZOOM_FOLLOW = 0.06;

/** Minimal world→screen mapping used by renderers (the fight camera, portraits, menus). */
export interface ViewTransform {
  sx(worldX: number): number;
  sy(worldY: number): number;
  readonly zoom: number;
}

interface CinematicShot {
  x: number;
  y: number;
  zoom: number;
  tilt: number;
  frames: number;
}

/**
 * Follows both fighters, zooming out as they separate. Supports hit-punch zoom,
 * cinematic overrides (supers / finishers / intro) and shake offsets.
 */
export class Camera implements ViewTransform {
  x = 0;
  y = BASE_FOCUS_HEIGHT;
  zoom = 1;
  tilt = 0;
  private punch = 0;
  private shot: CinematicShot | null = null;
  reducedMotion = false;

  constructor(private readonly shake: ScreenShake) {}

  reset(x = 0): void {
    this.x = x;
    this.y = BASE_FOCUS_HEIGHT;
    this.zoom = 1;
    this.tilt = 0;
    this.punch = 0;
    this.shot = null;
  }

  hitZoom(amount: number): void {
    if (this.reducedMotion) return;
    this.punch = Math.max(this.punch, amount);
  }

  cinematic(x: number, y: number, zoom: number, frames: number, tilt = 0): void {
    this.shot = { x, y, zoom: this.reducedMotion ? Math.min(zoom, 1.2) : zoom, tilt: this.reducedMotion ? 0 : tilt, frames };
  }

  clearCinematic(): void {
    this.shot = null;
  }

  get inCinematic(): boolean {
    return this.shot !== null;
  }

  update(dt: number, ax: number, ay: number, bx: number, by: number): void {
    let tx: number;
    let ty: number;
    let tz: number;
    let tt = 0;
    if (this.shot) {
      tx = this.shot.x;
      ty = this.shot.y;
      tz = this.shot.zoom;
      tt = this.shot.tilt;
      this.shot.frames -= dt;
      if (this.shot.frames <= 0) this.shot = null;
    } else {
      const dist = Math.abs(ax - bx);
      tz = clamp(1.18 - (dist - 200) / 1700, MIN_ZOOM, MAX_ZOOM);
      tx = (ax + bx) / 2;
      ty = BASE_FOCUS_HEIGHT + Math.max(0, Math.max(ay, by) - 90) * 0.35;
    }
    const k = 1 - Math.pow(1 - FOLLOW, dt);
    const kz = 1 - Math.pow(1 - (this.shot ? ZOOM_FOLLOW * 1.5 : ZOOM_FOLLOW), dt);
    this.zoom = lerp(this.zoom, tz + this.punch, kz);
    this.punch *= Math.pow(0.85, dt);
    const halfView = VIEW_WIDTH / 2 / this.zoom;
    tx = clamp(tx, -STAGE_HALF_WIDTH + halfView, STAGE_HALF_WIDTH - halfView);
    this.x = lerp(this.x, tx, k);
    this.y = lerp(this.y, ty, k);
    this.tilt = lerp(this.tilt, tt, k);
  }

  get shakeX(): number {
    return this.shake.x;
  }

  get shakeY(): number {
    return this.shake.y;
  }

  sx(worldX: number): number {
    return VIEW_WIDTH / 2 + (worldX - this.x) * this.zoom + this.shake.x;
  }

  sy(worldY: number): number {
    return FOCUS_SCREEN_Y - (worldY - this.y) * this.zoom + this.shake.y;
  }

  /** Parallax helper: screen x for a layer that moves at `factor` of camera speed. */
  layerX(worldX: number, factor: number): number {
    return VIEW_WIDTH / 2 + (worldX - this.x * factor) * (1 + (this.zoom - 1) * factor) + this.shake.x * factor;
  }
}
