import type { MatchPhase } from './GameState';

export type AnnounceStyle = 'round' | 'fight' | 'ko' | 'finish' | 'win' | 'time' | 'draw' | 'defeat' | 'perfect' | 'phase2';

export interface HudFighter {
  name: string;
  id: string;
  hp: number;
  maxHp: number;
  meter: number;
  wins: number;
  superReady: boolean;
  phase2: boolean;
  controller: string;
}

export interface HudCallout {
  id: number;
  text: string;
  sub?: string;
  side: 0 | 1 | -1;
  kind: 'perfect' | 'counter' | 'super' | 'summary' | 'escape' | 'break' | 'armor' | 'finisher';
}

export interface HudCombo {
  id: number;
  hits: number;
  damage: number;
  ended: boolean;
}

export interface HudState {
  fighters: [HudFighter, HudFighter];
  timer: number;
  timerVisible: boolean;
  round: number;
  phase: MatchPhase;
  roundsToWin: number;
  announce: { id: number; text: string; style: AnnounceStyle; sub?: string } | null;
  subtitle: { id: number; speaker: string; text: string; side: 0 | 1 } | null;
  combo: [HudCombo | null, HudCombo | null];
  callout: HudCallout | null;
  finisherHint: string | null;
  bossName: string | null;
  arcadeStage: number | null;
  maxCombo: [number, number];
}

const emptyFighter = (): HudFighter => ({ name: '', id: '', hp: 1, maxHp: 1, meter: 0, wins: 0, superReady: false, phase2: false, controller: '' });

/**
 * Bridge between the game loop and React. The loop mutates fields freely; React only
 * re-renders when `flush()` publishes a new snapshot (once per animation frame) and a
 * component's selected primitive actually changed.
 */
export class HudStore {
  private state: HudState = {
    fighters: [emptyFighter(), emptyFighter()],
    timer: 99,
    timerVisible: true,
    round: 1,
    phase: 'intro',
    roundsToWin: 2,
    announce: null,
    subtitle: null,
    combo: [null, null],
    callout: null,
    finisherHint: null,
    bossName: null,
    arcadeStage: null,
    maxCombo: [0, 0],
  };
  private snapshot: HudState = this.state;
  private dirty = false;
  private listeners = new Set<() => void>();
  private ids = 1;

  get draft(): HudState {
    this.dirty = true;
    return this.state;
  }

  nextId(): number {
    return this.ids++;
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.snapshot = {
      ...this.state,
      fighters: [{ ...this.state.fighters[0] }, { ...this.state.fighters[1] }],
      combo: [this.state.combo[0], this.state.combo[1]],
      maxCombo: [this.state.maxCombo[0], this.state.maxCombo[1]],
    };
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): HudState => this.snapshot;
}
