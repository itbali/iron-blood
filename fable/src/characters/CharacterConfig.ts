import type { AttackData } from '@/combat/AttackData';
import type { CharacterId, Rect } from '@/core/types';

export interface CharacterStats {
  speed: number;
  damage: number;
  health: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard' | 'Boss';
}

export interface CharacterLines {
  intro: string[];
  victory: string[];
  defeat: string[];
  taunts: string[];
}

export interface CharacterPalette {
  primary: string;
  secondary: string;
  accent: string;
  skin: string;
  glow: string;
  hair: string;
}

/** Proportions consumed by the procedural skeletal renderer. */
export interface BodyShape {
  height: number;
  torsoWidth: number;
  limbWidth: number;
  headRadius: number;
  /** Visual flavor used by the renderer: helmet, horns, hood, etc. */
  headStyle: 'human' | 'helmet' | 'visor' | 'hood' | 'mech' | 'crown';
  /** Extra bulk on shoulders/arms. */
  bulk: number;
}

export type FinisherType = 'energy' | 'physical' | 'cinematic';

export interface FinisherData {
  name: string;
  type: FinisherType;
  color: string;
}

export interface CommandListEntry {
  name: string;
  input: string;
  description: string;
}

export interface AIProfile {
  /** Preferred distance to keep from the opponent. */
  preferredRange: number;
  /** 0..1 how often the AI pushes forward. */
  aggression: number;
  /** 0..1 how much the AI favors projectiles / zoning. */
  zoning: number;
  /** 0..1 how much the AI favors grabs. */
  grabby: number;
  /** Button sequences used as combo strings (attack ids). */
  combos: string[][];
  /** Special ids to use at mid range / full screen / close. */
  closeSpecials: string[];
  midSpecials: string[];
  farSpecials: string[];
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  stats: CharacterStats;
  maxHealth: number;
  walkSpeed: number;
  backSpeed: number;
  jumpVelocity: number;
  jumpForwardSpeed: number;
  /** Multiplier on outgoing damage. */
  damageScale: number;
  /** Number of passive armor hits absorbed during heavy attacks (0 for none). */
  passiveArmor: number;
  pushbox: { w: number; h: number };
  hurtboxes: {
    stand: Rect[];
    crouch: Rect[];
    air: Rect[];
    down: Rect[];
  };
  attacks: Record<string, AttackData>;
  superId: string;
  commandList: CommandListEntry[];
  lines: CharacterLines;
  palette: CharacterPalette;
  /** Alternate "crimson" skin unlocked by completing Arcade. */
  altPalette: CharacterPalette;
  body: BodyShape;
  finisher: FinisherData;
  ai: AIProfile;
  /** Hidden until unlocked (boss). */
  locked?: boolean;
  /** Boss-only behavior. */
  boss?: {
    phase2Ratio: number;
  };
}
