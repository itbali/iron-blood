import { STAGE_HALF_WIDTH } from '@/core/constants';
import type { Facing, PlayerSide, WorldBox } from '@/core/types';
import type { AttackData, ProjectileSpec } from './AttackData';

export class Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  alive = true;
  readonly owner: PlayerSide;
  readonly facing: Facing;
  readonly spec: ProjectileSpec;
  readonly attack: AttackData;
  age = 0;

  constructor(owner: PlayerSide, x: number, y: number, facing: Facing, spec: ProjectileSpec, attack: AttackData) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.spec = spec;
    this.attack = attack;
    this.vx = spec.speed * facing;
    this.vy = spec.vy ?? 0;
    this.life = spec.lifetime;
  }

  update(): void {
    this.age++;
    this.x += this.vx;
    this.y += this.vy;
    if (this.spec.gravity) this.vy -= this.spec.gravity;
    if (this.y < 0) {
      this.y = 0;
      this.vy = 0;
    }
    this.life--;
    if (this.life <= 0 || Math.abs(this.x) > STAGE_HALF_WIDTH + 200) this.alive = false;
  }

  get box(): WorldBox {
    return {
      left: this.x - this.spec.size.w / 2,
      right: this.x + this.spec.size.w / 2,
      bottom: this.y - this.spec.size.h / 2,
      top: this.y + this.spec.size.h / 2,
    };
  }
}
