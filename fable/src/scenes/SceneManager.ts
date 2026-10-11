import type { CharacterId, Difficulty, GameMode, StageId } from '@/core/types';
import type { MatchConfig, MatchResult, SkinId } from '@/game/GameState';
import { Store } from '@/state/store';
import type { ArcadeRun } from './ArcadeMode';
import type { ArcadeRewards } from '@/progression/Progression';

export type Screen = 'boot' | 'menu' | 'select' | 'loading' | 'fight' | 'victory' | 'characters' | 'settings' | 'arcade-complete';

export interface SceneState {
  screen: Screen;
  /** Screen shown underneath transitions. */
  transitioning: boolean;
  mode: GameMode;
  arcade: ArcadeRun | null;
  match: MatchConfig | null;
  lastResult: MatchResult | null;
  rewards: ArcadeRewards | null;
  selected: { p1: CharacterId; p2: CharacterId; stage: StageId; difficulty: Difficulty; skin: SkinId };
}

export const sceneStore = new Store<SceneState>({
  screen: 'boot',
  transitioning: false,
  mode: 'arcade',
  arcade: null,
  match: null,
  lastResult: null,
  rewards: null,
  selected: { p1: 'raven', p2: 'brute', stage: 'industrial', difficulty: 'normal', skin: 'default' },
});

const TRANSITION_MS = 260;
let transitionTimer = 0;

/** Switches screens with a short fade. Never switches instantly. */
export const goTo = (screen: Screen, patch: Partial<SceneState> = {}): void => {
  window.clearTimeout(transitionTimer);
  sceneStore.patch({ transitioning: true });
  transitionTimer = window.setTimeout(() => {
    sceneStore.patch({ ...patch, screen, transitioning: false });
  }, TRANSITION_MS);
};
