import type { LockSequenceDef, MoveDef, SpecialInput } from '../combat/AttackData';
import type { MotionToken } from '../input/InputBuffer';

export type NormalSlot = 'lp' | 'hp' | 'lk' | 'hk' | 'clp' | 'chp' | 'clk' | 'chk' | 'jlp' | 'jhp' | 'jlk' | 'jhk';

/** Designer-facing 1–10 ratings from the balance table; converted to physics in `derivePhysique`. */
export interface CharacterStats {
  speed: number;
  damage: number;
  health: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard' | 'Boss';
}

export interface Physique {
  scale: number;
  walkSpeed: number;
  backSpeed: number;
  jumpVelocity: number;
  jumpVx: number;
  gravityMult: number;
  /** Multiplier applied to knockback this fighter receives. */
  weight: number;
  damageMult: number;
  /** Multiplier applied to damage this fighter receives. */
  defenseMult: number;
  pushWidth: number;
}

export type HeadStyle = 'short' | 'bald' | 'hood' | 'helmet' | 'visor' | 'topknot' | 'horned' | 'crown';
export type Extra =
  | 'forearmBlades'
  | 'scars'
  | 'cyberArm'
  | 'mutant'
  | 'spikes'
  | 'sash'
  | 'beads'
  | 'tatters'
  | 'mechPlates'
  | 'exhaust'
  | 'core'
  | 'cape'
  | 'shoulderPads';

export interface CharacterVisual {
  palette: {
    skin: string;
    hair: string;
    primary: string;
    secondary: string;
    trim: string;
    glow: string;
    eye: string;
  };
  altPalette: Partial<CharacterVisual['palette']>;
  build: {
    torso: number;
    torsoW: number;
    upperArm: number;
    foreArm: number;
    thigh: number;
    shin: number;
    armW: number;
    legW: number;
    headR: number;
    shoulderW: number;
  };
  head: HeadStyle;
  extras: Extra[];
  victoryPose: string;
  defeatPose: string;
  idleStyle: 'boxer' | 'stalker' | 'brute' | 'monk' | 'phantom' | 'mech' | 'tyrant';
  /** Optional sprite sheet URL; the procedural renderer is used whenever it is missing. */
  spriteSheet?: string;
}

export interface Dialogue {
  introLines: string[];
  victoryLines: string[];
  defeatLines: string[];
  taunts: string[];
}

export type FinisherType = 'energy' | 'physical' | 'cinematic';

export interface FinisherDef {
  id: string;
  name: string;
  type: FinisherType;
  motion: MotionToken[];
  button: 's1' | 's2';
  notation: string;
  /** Max distance to start; Infinity for finishers that close the gap themselves. */
  range: number;
  lock: LockSequenceDef;
}

export interface BossDef {
  phase2Threshold: number;
  phase2SpeedMult: number;
  phase2DamageMult: number;
  phase2Glow: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  faction: string;
  bio: string;
  stats: CharacterStats;
  maxHealth: number;
  physique: Physique;
  visual: CharacterVisual;
  normals: Record<NormalSlot, MoveDef>;
  specials: MoveDef[];
  specialInputs: SpecialInput[];
  superMove: MoveDef;
  throwMove: MoveDef;
  finishers: FinisherDef[];
  comboRoutes: string[];
  strengths: string[];
  weaknesses: string[];
  dialogue: Dialogue;
  boss?: BossDef;
  /** Hidden characters are only selectable once unlocked. */
  hidden?: boolean;
}

/**
 * Converts the designer's 1–10 ratings into physics so the balance table is
 * genuinely used in gameplay (speed → walk/jump, damage → output, health → toughness).
 */
export const derivePhysique = (
  stats: CharacterStats,
  extra: { scale: number; jump?: number; weight?: number; gravity?: number; pushWidth?: number; armor?: number },
): Physique => ({
  scale: extra.scale,
  walkSpeed: 2.2 + stats.speed * 0.42,
  backSpeed: 1.8 + stats.speed * 0.32,
  jumpVelocity: (extra.jump ?? 16) + stats.speed * 0.15,
  jumpVx: 2.6 + stats.speed * 0.38,
  gravityMult: extra.gravity ?? 1,
  weight: extra.weight ?? 1,
  damageMult: 0.6 + stats.damage * 0.035,
  defenseMult: (1.15 - stats.health * 0.025) * (1 - (extra.armor ?? 0)),
  pushWidth: extra.pushWidth ?? 52,
});
