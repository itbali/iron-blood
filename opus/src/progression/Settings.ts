import type { Difficulty } from '../game/GameState';
import type { Bindings } from '../input/KeyBindings';
import { DEFAULT_P1_BINDINGS, DEFAULT_P2_BINDINGS, cloneBindings } from '../input/KeyBindings';

export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  graphics: {
    quality: Quality;
    particles: number;
    screenShake: boolean;
    shakeIntensity: number;
    motionBlur: boolean;
    effects: boolean;
  };
  audio: { master: number; music: number; sfx: number };
  controls: { p1: Bindings; p2: Bindings };
  accessibility: {
    colorblind: boolean;
    reducedMotion: boolean;
    flashes: boolean;
    subtitles: boolean;
    damageNumbers: boolean;
  };
  gameplay: { difficulty: Difficulty };
}

export const defaultSettings = (): Settings => ({
  graphics: { quality: 'high', particles: 1, screenShake: true, shakeIntensity: 1, motionBlur: true, effects: true },
  audio: { master: 0.8, music: 0.6, sfx: 0.85 },
  controls: { p1: cloneBindings(DEFAULT_P1_BINDINGS), p2: cloneBindings(DEFAULT_P2_BINDINGS) },
  accessibility: { colorblind: false, reducedMotion: false, flashes: true, subtitles: true, damageNumbers: true },
  gameplay: { difficulty: 'normal' },
});
