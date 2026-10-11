import type { Fighter } from '../characters/Fighter';
import { MAX_SEPARATION, STAGE_HALF_WIDTH } from '../core/constants';
import { boxesOverlap, clamp } from '../core/math';
import type { GameEvent } from './events';

const WALL_BUMP_SPEED = 4;

/**
 * Integrates both fighters, clamps them to stage walls and the camera's max separation,
 * and resolves push-box overlap. Push boxes are separate from hurt/hit boxes so bodies
 * never pass through each other while attacks still use their own geometry.
 */
export class PhysicsSystem {
  step(fighters: [Fighter, Fighter], events: GameEvent[]): void {
    for (const f of fighters) {
      const wasAir = f.y > 0;
      const prevVx = f.vx;
      f.integrate();
      if (wasAir && f.y === 0 && !f.isLocked) events.push({ type: 'land', fighter: f.index, x: f.x, heavy: f.pendingLandEvent });
      if (f.pendingLandEvent) {
        f.pendingLandEvent = false;
        events.push({ type: 'knockdown', fighter: f.index, x: f.x });
      }
      this.clampToWalls(f, prevVx, events);
    }
    this.separate(fighters);
    this.enforceMaxSeparation(fighters);
  }

  clampX(f: Fighter, x: number): number {
    const half = (f.def.physique.pushWidth * f.scale) / 2;
    return clamp(x, -STAGE_HALF_WIDTH + half, STAGE_HALF_WIDTH - half);
  }

  private clampToWalls(f: Fighter, prevVx: number, events: GameEvent[]): void {
    const clamped = this.clampX(f, f.x);
    if (clamped !== f.x) {
      f.x = clamped;
      if (Math.abs(prevVx) > WALL_BUMP_SPEED && !f.isLocked) {
        events.push({ type: 'wall', fighter: f.index, x: f.x, y: f.y + 100 });
      }
      f.vx = 0;
    }
  }

  private separate(fighters: [Fighter, Fighter]): void {
    const [a, b] = fighters;
    if (a.isLocked || b.isLocked) return;
    const pa = a.getPushbox();
    const pb = b.getPushbox();
    if (!boxesOverlap(pa, pb)) return;
    const overlap = Math.min(pa.x + pa.w, pb.x + pb.w) - Math.max(pa.x, pb.x);
    // Decide sides from centres; equal positions fall back to facing so bodies never swap.
    let dir = Math.sign(b.x - a.x);
    if (dir === 0) dir = a.facing;
    const push = overlap / 2 + 0.01;
    a.x = this.clampX(a, a.x - dir * push);
    b.x = this.clampX(b, b.x + dir * push);
    // If one fighter is pinned to a wall, the other absorbs the remaining overlap.
    const pa2 = a.getPushbox();
    const pb2 = b.getPushbox();
    if (boxesOverlap(pa2, pb2)) {
      const rest = Math.min(pa2.x + pa2.w, pb2.x + pb2.w) - Math.max(pa2.x, pb2.x);
      if (Math.abs(this.clampX(a, a.x - dir) - a.x) < 0.5) b.x = this.clampX(b, b.x + dir * rest);
      else a.x = this.clampX(a, a.x - dir * rest);
    }
  }

  private enforceMaxSeparation(fighters: [Fighter, Fighter]): void {
    const [a, b] = fighters;
    const dist = Math.abs(a.x - b.x);
    if (dist <= MAX_SEPARATION) return;
    const excess = dist - MAX_SEPARATION;
    const dir = Math.sign(b.x - a.x);
    // Push back whoever is moving away; if both, split.
    const aAway = Math.sign(a.vx) === -dir;
    const bAway = Math.sign(b.vx) === dir;
    if (aAway && !bAway) a.x += dir * excess;
    else if (bAway && !aAway) b.x -= dir * excess;
    else {
      a.x += (dir * excess) / 2;
      b.x -= (dir * excess) / 2;
    }
    if (aAway) a.vx = 0;
    if (bAway) b.vx = 0;
  }
}
