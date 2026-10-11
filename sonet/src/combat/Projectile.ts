import type { AttackData, MoveDef, ProjectileSpawn } from './types';

export interface Projectile {
  id: number;
  owner: number;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  life: number;
  age: number;
  facing: 1 | -1;
  attack: AttackData;
  damage: number;
  color: string;
  kind: ProjectileSpawn['kind'];
  moveId: string;
  launch?: { vx: number; vy: number };
  strength: 'light' | 'heavy' | 'special';
}

let nextId = 1;

export function createProjectile(
  ownerSlot: number, x: number, y: number, facing: 1 | -1, move: MoveDef, spawn: ProjectileSpawn,
): Projectile {
  return {
    id: nextId++,
    owner: ownerSlot,
    x: x + facing * spawn.x,
    y: y + spawn.y,
    vx: facing * spawn.speed,
    w: spawn.w,
    h: spawn.h,
    life: spawn.life,
    age: 0,
    facing,
    attack: move.attack,
    damage: spawn.damage ?? move.attack.damage,
    color: spawn.color,
    kind: spawn.kind,
    moveId: move.id,
    launch: move.launch,
    strength: 'special',
  };
}

export function resetProjectileIds(): void {
  nextId = 1;
}
