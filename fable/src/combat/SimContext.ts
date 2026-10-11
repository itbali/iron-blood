import type { Emitter } from '@/core/events';
import type { Rng } from '@/core/rng';
import type { AttackData, ProjectileSpec } from './AttackData';
import type { Fighter } from './Fighter';
import type { Projectile } from './Projectile';
import type { PlayerSide } from '@/core/types';
import type { MatchResult, SimPhase } from '@/game/GameState';

export interface HitEvent {
  attacker: Fighter;
  defender: Fighter;
  attack: AttackData;
  damage: number;
  blocked: boolean;
  perfect: boolean;
  armored: boolean;
  critical: boolean;
  counterHit: boolean;
  x: number;
  y: number;
  projectile?: Projectile;
}

export interface SimEvents extends Record<string, unknown> {
  hit: HitEvent;
  wall: { fighter: Fighter; impact: number };
  attackStart: { fighter: Fighter; attack: AttackData };
  jump: { fighter: Fighter };
  land: { fighter: Fighter };
  grab: { attacker: Fighter; defender: Fighter; attack: AttackData };
  teleport: { fighter: Fighter; fromX: number; toX: number };
  projectileSpawn: { projectile: Projectile };
  projectileClash: { x: number; y: number };
  combo: { side: 0 | 1; hits: number; damage: number };
  comboEnd: { side: 0 | 1; hits: number; damage: number; dropped: boolean };
  counter: { fighter: Fighter };
  superStart: { fighter: Fighter; attack: AttackData };
  armorHit: { fighter: Fighter };
  phase: { phase: SimPhase; round: number };
  ko: { loser: PlayerSide; winner: PlayerSide };
  roundEnd: { winner: PlayerSide | null; round: number };
  matchEnd: { result: MatchResult };
  finisherStart: { winner: PlayerSide; loser: PlayerSide; name: string };
  finisherSkipped: { winner: PlayerSide };
  bossPhase2: { fighter: Fighter };
  slowmo: { ticks: number; scale: number };
  timeout: { winner: PlayerSide | null };
  perfectBlock: { fighter: Fighter };
  dialogue: { side: PlayerSide; text: string };
  announce: { text: string };
}

export interface SimContext {
  readonly frame: number;
  readonly rng: Rng;
  readonly events: Emitter<SimEvents>;
  spawnProjectile(owner: Fighter, spec: ProjectileSpec, attack: AttackData): void;
  resolveThrowHit(attacker: Fighter, defender: Fighter, attack: AttackData, isLast: boolean): void;
}
