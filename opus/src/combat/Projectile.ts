import type { Fighter } from '../characters/Fighter';
import { STAGE_HALF_WIDTH } from '../core/constants';
import type { Box } from '../core/math';
import type { ProjectileDef } from './AttackData';

let nextId = 1;

export class Projectile {
  readonly id = nextId++;
  x: number;
  y: number;
  vx: number;
  vy: number;
  frame = 0;
  hitsLeft: number;
  cooldown = 0;
  telegraph: number;
  dead = false;
  readonly facing: 1 | -1;

  constructor(
    readonly owner: Fighter,
    readonly def: ProjectileDef,
    target: Fighter,
    yOffset = 0,
  ) {
    this.facing = owner.facing;
    const s = owner.scale;
    if (def.targeted) {
      this.x = target.x;
      this.y = 0;
    } else {
      this.x = owner.x + def.spawnX * s * owner.facing;
      this.y = owner.y + def.spawnY * s + yOffset;
    }
    this.vx = def.speed * this.facing;
    this.vy = def.vy ?? 0;
    this.hitsLeft = def.hits ?? 1;
    this.telegraph = def.telegraph ?? 0;
  }

  get active(): boolean {
    return !this.dead && this.telegraph <= 0 && this.cooldown <= 0;
  }

  update(): void {
    this.frame++;
    if (this.cooldown > 0) this.cooldown--;
    if (this.telegraph > 0) {
      this.telegraph--;
      return;
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.def.gravity) {
      this.vy -= this.def.gravity;
      if (this.y <= 0) {
        this.y = 0;
        this.dead = true;
      }
    }
    const lifetime = this.def.lifetime + (this.def.telegraph ?? 0);
    if (this.frame > lifetime || Math.abs(this.x) > STAGE_HALF_WIDTH + 200) this.dead = true;
  }

  hitbox(): Box {
    const { w, h } = this.def;
    if (this.def.targeted) return { x: this.x - w / 2, y: 0, w, h };
    if (this.def.grounded) return { x: this.x - w / 2, y: 0, w, h };
    return { x: this.x - w / 2, y: this.y - h / 2, w, h };
  }

  onHit(): void {
    this.hitsLeft--;
    if (this.hitsLeft <= 0) this.dead = true;
    else this.cooldown = this.def.hitInterval ?? 8;
  }
}
