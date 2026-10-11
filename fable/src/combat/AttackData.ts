import type { Rect } from '@/core/types';

export type HitLevel = 'high' | 'mid' | 'low';

export type AttackCategory = 'light' | 'heavy' | 'special' | 'super' | 'grab';

export type Stance = 'stand' | 'crouch' | 'air';

/** Motion inputs, relative to facing: ff = forward forward, df = down forward, db = down back. */
export type Motion = 'ff' | 'df' | 'db';

export type HitEffect = 'spark' | 'blood' | 'energy' | 'smoke' | 'shock' | 'void';

export interface AttackInput {
  /** Btn bitmask of the button that triggers the attack. */
  button: number;
  /** Optional motion required (checked against the fighter's direction history). */
  motion?: Motion;
  /** Stance required. Defaults to 'stand'. */
  stance?: Stance;
  /** Meter cost (super). */
  meter?: number;
  /** When true the attack requires both SP1 and SP2 pressed together. */
  twoButton?: boolean;
}

export interface ProjectileSpec {
  speed: number;
  /** Spawn offset from the fighter origin (local space). */
  offset: { x: number; y: number };
  size: { w: number; h: number };
  lifetime: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  hitLevel: HitLevel;
  color: string;
  /** Frame of the attack at which the projectile is spawned. */
  spawnFrame: number;
  /** Optional vertical speed; used by arcing projectiles. */
  vy?: number;
  gravity?: number;
  /** Number of projectiles spawned in a fan. */
  count?: number;
  /** Interval between spawned projectiles. */
  interval?: number;
  pierce?: boolean;
}

export interface GrabSpec {
  range: number;
  /** Damage dealt when the throw connects. */
  damage: number;
  /** Frames the opponent is held before the throw releases. */
  holdFrames: number;
  throwVelocity: { x: number; y: number };
  /** Number of impact pulses during the hold (for cinematic multi-hit grabs). */
  pulses?: number;
}

export interface TeleportSpec {
  /** Frame at which the fighter blinks. */
  frame: number;
  /** Target: 'behind' puts the fighter behind the opponent, 'forward' moves by distance. */
  target: 'behind' | 'forward' | 'back';
  distance?: number;
}

export interface CounterSpec {
  /** Frames during which the fighter is in counter stance. */
  window: [number, number];
  /** Attack id performed on a successful counter. */
  attackId: string;
}

export interface AttackData {
  id: string;
  name: string;
  anim: string;
  input: AttackInput;
  category: AttackCategory;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  pushback: number;
  hitLevel: HitLevel;
  /** Attack ids this attack may cancel into on hit (and on block when cancelOnBlock is set). */
  cancelInto?: string[];
  cancelOnBlock?: boolean;
  /** Boxes active during the active frames, local space, facing right. */
  hitboxes: Rect[];
  /** Hit stop applied to both fighters, in ticks. */
  hitStop: number;
  /** Vertical velocity applied to the defender (launcher). */
  launch?: number;
  /** Knock the defender down on hit. */
  knockdown?: boolean;
  /** Multiple hits during active frames. */
  multiHit?: { count: number; interval: number };
  /** Horizontal self-movement per frame during each phase (forward positive). */
  movement?: { startup?: number; active?: number; recovery?: number };
  /** Vertical self-impulse applied at the given frame. */
  hop?: { frame: number; vy: number };
  /** Invulnerability window [from, to) in attack frames. */
  invuln?: [number, number];
  /** Armor window [from, to): hits taken during it do reduced damage and no hitstun. */
  armor?: [number, number];
  projectile?: ProjectileSpec;
  grab?: GrabSpec;
  teleport?: TeleportSpec;
  counter?: CounterSpec;
  effect: HitEffect;
  color?: string;
  sound: string;
  meterGain: number;
  /** Chip damage ratio when blocked (0 = none). */
  chip: number;
  /** Red energy trail while moving. */
  trail?: boolean;
  /** Screen darkening freeze at attack start (super). */
  superFreeze?: boolean;
  /** Text shown when this attack lands a big hit. */
  critical?: boolean;
}

export const attackTotalFrames = (a: AttackData): number => a.startup + a.active + a.recovery;

export type AttackPhase = 'startup' | 'active' | 'recovery';

export const attackPhaseAt = (a: AttackData, frame: number): AttackPhase => {
  if (frame < a.startup) return 'startup';
  if (frame < a.startup + a.active) return 'active';
  return 'recovery';
};
