import type { MotionToken } from '../input/InputBuffer';

export type HitLevel = 'high' | 'mid' | 'low' | 'unblockable';
export type ImpactStrength = 'light' | 'medium' | 'heavy' | 'special' | 'super';
export type EffectStyle = 'strike' | 'blade' | 'energy' | 'blunt' | 'shadow' | 'electric' | 'fire';

/** Hitbox relative to the fighter origin while facing right: x forward, y up from the floor. */
export interface HitboxDef {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional sub-window inside the active frames (0-based offsets from the first active frame). */
  from?: number;
  to?: number;
}

/** The core frame-data block requested by the design doc. */
export interface AttackData {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  pushback: number;
  hitLevel: HitLevel;
  cancelInto?: string[];
}

export type MoveKind = 'normal' | 'special' | 'super' | 'grab' | 'finisher';
export type Stance = 'stand' | 'crouch' | 'air';

/** Impulse applied to the attacker on a specific frame of the move. */
export interface MotionStep {
  frame: number;
  vx?: number;
  vy?: number;
  /** Keep applying vx every frame until `until`. */
  until?: number;
}

export type ProjectileVisual = 'crescent' | 'bolt' | 'orb' | 'wave' | 'pillar' | 'phantom' | 'lance' | 'fist' | 'needle';

export interface ProjectileDef {
  id: string;
  visual: ProjectileVisual;
  color: string;
  speed: number;
  vy?: number;
  gravity?: number;
  /** Spawn point relative to the owner (x forward). */
  spawnX: number;
  spawnY: number;
  w: number;
  h: number;
  lifetime: number;
  attack: AttackData;
  strength: ImpactStrength;
  effect: EffectStyle;
  hits?: number;
  /** Frames between hits for multi-hit projectiles. */
  hitInterval?: number;
  /** Spawn at the opponent's position after a telegraph instead of travelling (pillar). */
  targeted?: boolean;
  telegraph?: number;
  launch?: number;
  knockdown?: boolean;
  /** Projectile that rides on the floor (shockwaves): it ignores airborne targets. */
  grounded?: boolean;
  count?: number;
  spread?: number;
}

export interface LockStep {
  frame: number;
  damage?: number;
  strength?: ImpactStrength;
  effect?: EffectStyle;
  sfx?: string;
  /** Defender offset from the attacker (x forward, y up) reached at this step. */
  offsetX?: number;
  offsetY?: number;
  /** Attacker repositions (teleport flurry) relative to the defender. */
  attackerSide?: 1 | -1;
  attackerAnim?: string;
  defenderAnim?: string;
  flash?: boolean;
  shake?: number;
  slowmo?: number;
  zoom?: number;
  blood?: number;
  text?: string;
}

/** Scripted sequence used by throws, command grabs, cinematic supers, counters and finishers. */
export interface LockSequenceDef {
  id: string;
  duration: number;
  steps: LockStep[];
  release: {
    knockback: number;
    launch: number;
    knockdown: boolean;
    /** Throw the defender to the other side of the attacker. */
    swapSides?: boolean;
  };
  cinematic?: boolean;
  darken?: boolean;
  /** Finisher outcome applied to the loser's body after the sequence. */
  finisherOutcome?: 'disintegrate' | 'shatter' | 'collapse';
}

export interface MoveDef extends AttackData {
  id: string;
  name: string;
  kind: MoveKind;
  stance: Stance;
  anim: string;
  hitboxes: HitboxDef[];
  strength: ImpactStrength;
  effect: EffectStyle;
  sfx: string;
  whiffSfx?: string;
  meterGain?: number;
  meterCost?: number;
  motion?: MotionStep[];
  /** Fully invulnerable frame range (inclusive, 1-based move frames). */
  invuln?: [number, number];
  /** Projectile-only invulnerability. */
  projectileInvuln?: [number, number];
  /** Absorbs `hits` strikes in the frame range without being interrupted. */
  armor?: { from: number; to: number; hits: number };
  launch?: number;
  knockdown?: boolean;
  /** Allows hitting more than once per move (every `rehit` frames). */
  hits?: number;
  rehit?: number;
  projectile?: ProjectileDef;
  /** Frame on which the projectile spawns (defaults to startup). */
  projectileFrame?: number;
  teleport?: { frame: number; mode: 'behind' | 'front' | 'back'; distance: number };
  /** On hit, run this lock sequence (command grab / cinematic super). */
  lock?: LockSequenceDef;
  /** Counter stance: if struck during [from,to] the sequence runs against the attacker. */
  counter?: { from: number; to: number; lock: LockSequenceDef };
  /** Grab-type moves only connect on grounded, non-stunned opponents. */
  grab?: boolean;
  /** Hit even when the opponent is in the air (anti-air). */
  antiAir?: boolean;
  /** Super freeze before the move starts. */
  superFreeze?: number;
  /** Visual trail colour during the move. */
  trail?: string;
  /** Boss-only phase 2 moves. */
  phase2Only?: boolean;
  /** Overhead: must be blocked standing even though it is labelled mid. */
  airOk?: boolean;
}

export type SpecialButton = 's1' | 's2' | 'grab';

export interface SpecialInput {
  move: string;
  motion: MotionToken[];
  button: SpecialButton;
  /** Display string such as "→ → I". */
  notation: string;
}
