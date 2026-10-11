import type { Phase } from './GameState';
import { ROUND_TIME, ROUNDS_TO_WIN, FPS, KO_FINISHER_WINDOW_FRAMES } from '../data/constants';

export const INTRO_FRAMES = 330;
export const ANNOUNCE_FRAMES = 118;
export const FIGHT_CALL_FRAME = 66;
export const KO_FRAMES = 130;
export const ROUND_END_FRAMES = 170;

export type RoundEventType =
  | 'intro' | 'round-announce' | 'fight-start' | 'ko' | 'time-up' | 'finisher-window' | 'finisher-start'
  | 'round-end' | 'victory' | 'draw';

export interface RoundEvent {
  type: RoundEventType;
  round?: number;
  winner?: number;
}

export interface RoundConfig {
  roundsToWin: number;
  roundTime: number;
  timed: boolean;
  introFrames: number;
  training: boolean;
  finisherEligible: (winner: number) => boolean;
}

export const DEFAULT_ROUND_CONFIG: RoundConfig = {
  roundsToWin: ROUNDS_TO_WIN,
  roundTime: ROUND_TIME,
  timed: true,
  introFrames: INTRO_FRAMES,
  training: false,
  finisherEligible: () => false,
};

export interface RoundView {
  hp: [number, number];
  maxHp: [number, number];
}

export interface RoundHooks {
  resetRound(): void;
}

export class RoundManager {
  phase: Phase = 'intro';
  phaseFrame = 0;
  round = 1;
  wins: [number, number] = [0, 0];
  timerFrames: number;
  /** Winner of the current round: 0/1, or -1 for a draw. */
  roundWinner: number | null = null;
  matchWinner: number | null = null;
  decisive = false;
  finalRound = false;
  finisherStage: 'none' | 'window' | 'playing' = 'none';
  finisherFrame = 0;
  timeUp = false;
  readonly events: RoundEvent[] = [];

  constructor(public cfg: RoundConfig) {
    this.timerFrames = cfg.roundTime * FPS;
    if (cfg.training) {
      this.phase = 'fight';
    } else if (cfg.introFrames <= 0) {
      this.phase = 'round-announce';
      this.events.push({ type: 'round-announce', round: 1 });
    } else {
      this.events.push({ type: 'intro' });
    }
  }

  get timerSeconds(): number {
    return Math.max(0, Math.ceil(this.timerFrames / FPS));
  }

  get fightLive(): boolean {
    return this.phase === 'fight' || (this.phase === 'round-announce' && this.phaseFrame >= FIGHT_CALL_FRAME);
  }

  private go(next: Phase): void {
    this.phase = next;
    this.phaseFrame = 0;
  }

  skipIntro(): void {
    if (this.phase === 'intro') {
      this.go('round-announce');
      this.events.push({ type: 'round-announce', round: this.round });
    }
  }

  startFinisher(): void {
    if (this.phase !== 'finisher' || this.finisherStage !== 'window') return;
    this.finisherStage = 'playing';
    this.finisherFrame = 0;
    this.events.push({ type: 'finisher-start', winner: this.roundWinner ?? undefined });
  }

  skipFinisher(): void {
    if (this.phase === 'finisher') this.finishRound();
  }

  /** Advances the phase machine one sim tick (not called during hit-stop). */
  tick(view: RoundView, hooks: RoundHooks): void {
    this.phaseFrame++;
    switch (this.phase) {
      case 'intro':
        if (this.phaseFrame >= this.cfg.introFrames) {
          this.go('round-announce');
          this.events.push({ type: 'round-announce', round: this.round });
        }
        break;
      case 'round-announce':
        if (this.phaseFrame === FIGHT_CALL_FRAME) this.events.push({ type: 'fight-start', round: this.round });
        if (this.phaseFrame >= ANNOUNCE_FRAMES) this.go('fight');
        break;
      case 'fight':
        this.tickFight(view);
        break;
      case 'ko':
        if (this.phaseFrame >= KO_FRAMES) this.afterKo();
        break;
      case 'finisher':
        this.tickFinisher();
        break;
      case 'round-end':
        if (this.phaseFrame >= ROUND_END_FRAMES) this.afterRoundEnd(hooks);
        break;
      default:
        break;
    }
  }

  private tickFight(view: RoundView): void {
    if (this.cfg.training) return;
    const dead0 = view.hp[0] <= 0;
    const dead1 = view.hp[1] <= 0;
    if (dead0 || dead1) {
      this.roundWinner = dead0 && dead1 ? -1 : dead0 ? 1 : 0;
      this.timeUp = false;
      this.enterKo();
      return;
    }
    if (this.cfg.timed) {
      this.timerFrames--;
      if (this.timerFrames <= 0) {
        this.timerFrames = 0;
        const r0 = view.hp[0] / view.maxHp[0];
        const r1 = view.hp[1] / view.maxHp[1];
        this.roundWinner = Math.abs(r0 - r1) < 1e-6 ? -1 : r0 > r1 ? 0 : 1;
        this.timeUp = true;
        this.events.push({ type: 'time-up' });
        this.enterKo();
      }
    }
  }

  private enterKo(): void {
    this.go('ko');
    const w = this.roundWinner ?? -1;
    if (w >= 0) this.decisive = this.wins[w] + 1 >= this.cfg.roundsToWin;
    else this.decisive = false;
    this.events.push({ type: 'ko', winner: w });
  }

  private afterKo(): void {
    const w = this.roundWinner ?? -1;
    if (w >= 0 && this.decisive && !this.timeUp && this.cfg.finisherEligible(w)) {
      this.go('finisher');
      this.finisherStage = 'window';
      this.finisherFrame = 0;
      this.events.push({ type: 'finisher-window', winner: w });
      return;
    }
    this.finishRound();
  }

  private tickFinisher(): void {
    this.finisherFrame++;
    if (this.finisherStage === 'window') {
      if (this.finisherFrame >= KO_FINISHER_WINDOW_FRAMES) this.finishRound();
    }
  }

  /** Called by the sim when the finisher animation has run its course. */
  endFinisher(): void {
    if (this.phase === 'finisher') this.finishRound();
  }

  private finishRound(): void {
    this.finisherStage = 'none';
    const w = this.roundWinner ?? -1;
    if (w >= 0) {
      this.wins[w]++;
    } else {
      this.wins[0]++;
      this.wins[1]++;
      this.events.push({ type: 'draw' });
    }
    const need = this.cfg.roundsToWin;
    if (this.wins[0] >= need && this.wins[1] >= need) {
      this.wins = [need - 1, need - 1];
      this.finalRound = true;
      this.matchWinner = null;
    } else if (this.wins[0] >= need) {
      this.matchWinner = 0;
    } else if (this.wins[1] >= need) {
      this.matchWinner = 1;
    }
    this.go('round-end');
    this.events.push({ type: 'round-end', winner: w, round: this.round });
  }

  private afterRoundEnd(hooks: RoundHooks): void {
    if (this.matchWinner !== null) {
      this.go('victory');
      this.events.push({ type: 'victory', winner: this.matchWinner });
      return;
    }
    this.round++;
    this.timerFrames = this.cfg.roundTime * FPS;
    this.roundWinner = null;
    this.decisive = false;
    this.timeUp = false;
    hooks.resetRound();
    this.go('round-announce');
    this.events.push({ type: 'round-announce', round: this.round });
  }

  /** Training mode: fight is perpetual. */
  forcePhase(p: Phase): void {
    this.go(p);
  }
}
