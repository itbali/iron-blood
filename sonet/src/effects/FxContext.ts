import type { AudioManager } from '../audio/AudioManager';
import type { FightSim } from '../game/FightSim';
import type { Settings } from '../progression/Settings';
import type { HudController } from '../ui/HudController';
import type { Camera } from '../scenes/Camera';
import type { DamageNumber, RenderFx } from '../scenes/render/FightRenderer';
import type { ParticleSystem } from './ParticleSystem';
import type { ScreenShake } from './ScreenShake';
import type { SlowMotion } from './SlowMotion';

/** Everything an effect or cinematic director may touch. Gameplay state is read-only through `sim`. */
export interface FxContext {
  sim: FightSim;
  particles: ParticleSystem;
  camera: Camera;
  shake: ScreenShake;
  slowmo: SlowMotion;
  audio: AudioManager;
  hud: HudController;
  fx: RenderFx;
  numbers: DamageNumber[];
  settings: () => Settings;
}

export function flashScale(ctx: FxContext, amount: number): number {
  return ctx.settings().flashEffects ? amount : amount * 0.2;
}

export function shakeScale(ctx: FxContext): number {
  const s = ctx.settings();
  if (!s.screenShake) return 0;
  return s.reducedMotion ? 0.3 : 1;
}

export function kickScale(ctx: FxContext): number {
  return ctx.settings().reducedMotion ? 0.3 : 1;
}
