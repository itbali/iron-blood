import type { EffectStyle, ImpactStrength } from '../combat/AttackData';

/**
 * Gameplay → presentation messages. The simulation only pushes events; audio, particles,
 * camera and HUD consume them, keeping combat code free of rendering concerns.
 */
export type GameEvent =
  | { type: 'hit'; x: number; y: number; attacker: number; strength: ImpactStrength; effect: EffectStyle; damage: number; counter: boolean; dir: 1 | -1; crit: boolean; sfx?: string }
  | { type: 'block'; x: number; y: number; defender: number; perfect: boolean; dir: 1 | -1 }
  | { type: 'armor'; x: number; y: number; defender: number }
  | { type: 'whiff'; fighter: number; sfx: string }
  | { type: 'move-start'; fighter: number; moveId: string; kind: string; sfx: string; name: string }
  | { type: 'projectile'; fighter: number; x: number; y: number; color: string }
  | { type: 'projectile-clash'; x: number; y: number }
  | { type: 'teleport'; fighter: number; fromX: number; toX: number; y: number; color: string }
  | { type: 'land'; fighter: number; x: number; heavy: boolean }
  | { type: 'wall'; fighter: number; x: number; y: number }
  | { type: 'jump'; fighter: number; x: number }
  | { type: 'super-freeze'; fighter: number; frames: number; name: string; color: string }
  | { type: 'lock-start'; attacker: number; cinematic: boolean; darken: boolean; tech: boolean }
  | { type: 'lock-step'; attacker: number; x: number; y: number; sfx?: string; flash?: boolean; shake?: number; slowmo?: number; zoom?: number; blood?: number; text?: string; effect?: EffectStyle; strength?: ImpactStrength }
  | { type: 'lock-end'; attacker: number; name: string; damage: number; showSummary: boolean }
  | { type: 'throw-tech'; x: number; y: number }
  | { type: 'combo'; attacker: number; hits: number; damage: number }
  | { type: 'combo-end'; attacker: number; hits: number; damage: number }
  | { type: 'combo-break'; attacker: number }
  | { type: 'perfect-block'; defender: number }
  | { type: 'counter-hit'; attacker: number }
  | { type: 'knockdown'; fighter: number; x: number }
  | { type: 'ko'; loser: number; x: number; y: number }
  | { type: 'phase2'; fighter: number }
  | { type: 'finisher'; fighter: number; name: string }
  | { type: 'finisher-outcome'; fighter: number; outcome: 'disintegrate' | 'shatter' | 'collapse'; x: number }
  | { type: 'frame-advantage'; attacker: number; moveId: string; advantage: number; startup: number; active: number; recovery: number; blocked: boolean };

export type EventSink = GameEvent[];
