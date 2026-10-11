import { MAX_ROUNDS, ROUND_TIME_SECONDS, ROUNDS_TO_WIN, SIM_FPS } from '../core/constants';
import type { MatchPhase } from './GameState';

export const PHASE_FRAMES = {
  intro: 330,
  roundAnnounce: 70,
  fightAnnounce: 40,
  ko: 110,
  finisherWindow: 300,
  roundEnd: 170,
  victory: 200,
} as const;

export type MatchSignal =
  | { type: 'phase'; phase: MatchPhase }
  | { type: 'announce'; text: string; style: 'round' | 'fight' | 'ko' | 'finish' | 'win' | 'time' | 'draw' | 'defeat' | 'perfect'; sub?: string }
  | { type: 'reset-round' }
  | { type: 'round-won'; winner: 0 | 1 | -1; reason: 'ko' | 'time' | 'finisher' }
  | { type: 'enable-finisher'; winner: 0 | 1 }
  | { type: 'match-over'; winner: 0 | 1 | -1 }
  | { type: 'countdown'; seconds: number };

export interface MatchTickInput {
  hp: [number, number];
  maxHp: [number, number];
  /** True while a finisher sequence is running (the window timer pauses). */
  finisherRunning: boolean;
  /** Set once the finisher has resolved (or the loser collapsed). */
  finisherDone: boolean;
}

/**
 * Pure round/timer/KO state machine. It knows nothing about fighters or rendering,
 * which keeps it unit-testable: feed HP each frame, read back signals.
 */
export class MatchController {
  phase: MatchPhase = 'intro';
  phaseFrame = 0;
  round = 1;
  timerFrames = ROUND_TIME_SECONDS * SIM_FPS;
  wins: [number, number] = [0, 0];
  winner: 0 | 1 | -1 = -1;
  roundWinner: 0 | 1 | -1 = -1;
  finisherUsed: string | null = null;
  totalFrames = 0;
  /** Training mode freezes the round timer. */
  timerEnabled = true;
  private koLoser: 0 | 1 | -1 = -1;
  private finisherSignalled = false;

  constructor(skipIntro = false) {
    if (skipIntro) this.phase = 'round-start';
  }

  get timerSeconds(): number {
    return Math.ceil(this.timerFrames / SIM_FPS);
  }

  get inputEnabled(): boolean {
    return this.phase === 'fight' || this.phase === 'finisher';
  }

  get matchPoint(): boolean {
    return this.wins[0] === ROUNDS_TO_WIN - 1 || this.wins[1] === ROUNDS_TO_WIN - 1;
  }

  skip(): void {
    if (this.phase === 'intro') this.setPhase('round-start');
  }

  private setPhase(p: MatchPhase): void {
    this.phase = p;
    this.phaseFrame = 0;
  }

  /** The session reports a KO the moment a fighter's HP reaches zero. */
  reportKO(loser: 0 | 1): MatchSignal[] {
    if (this.phase !== 'fight') return [];
    this.koLoser = loser;
    const winner = (1 - loser) as 0 | 1;
    const finalRound = this.wins[winner] + 1 >= ROUNDS_TO_WIN;
    this.setPhase('ko');
    this.roundWinner = winner;
    const out: MatchSignal[] = [{ type: 'phase', phase: 'ko' }];
    if (finalRound) {
      out.push({ type: 'announce', text: 'END HIM', style: 'finish' });
    } else {
      out.push({ type: 'announce', text: 'K.O.', style: 'ko' });
    }
    return out;
  }

  reportDoubleKO(): MatchSignal[] {
    if (this.phase !== 'fight') return [];
    this.koLoser = -1;
    this.roundWinner = -1;
    this.setPhase('ko');
    return [{ type: 'phase', phase: 'ko' }, { type: 'announce', text: 'DOUBLE K.O.', style: 'ko' }];
  }

  tick(input: MatchTickInput): MatchSignal[] {
    const out: MatchSignal[] = [];
    this.phaseFrame++;
    this.totalFrames++;
    switch (this.phase) {
      case 'intro':
        if (this.phaseFrame >= PHASE_FRAMES.intro) {
          this.setPhase('round-start');
          out.push({ type: 'phase', phase: 'round-start' });
        }
        break;
      case 'round-start':
        if (this.phaseFrame === 1) out.push({ type: 'announce', text: this.roundLabel(), style: 'round' });
        if (this.phaseFrame === PHASE_FRAMES.roundAnnounce) out.push({ type: 'announce', text: 'FIGHT!', style: 'fight' });
        if (this.phaseFrame >= PHASE_FRAMES.roundAnnounce + PHASE_FRAMES.fightAnnounce) {
          this.setPhase('fight');
          out.push({ type: 'phase', phase: 'fight' });
        }
        break;
      case 'fight': {
        if (!this.timerEnabled) break;
        this.timerFrames--;
        if (this.timerFrames % SIM_FPS === 0 && this.timerSeconds <= 10 && this.timerSeconds > 0) {
          out.push({ type: 'countdown', seconds: this.timerSeconds });
        }
        if (this.timerFrames <= 0) {
          this.timerFrames = 0;
          out.push(...this.timeOver(input));
        }
        break;
      }
      case 'ko': {
        if (this.phaseFrame >= PHASE_FRAMES.ko) {
          const winner = this.roundWinner;
          if (winner !== -1 && this.wins[winner] + 1 >= ROUNDS_TO_WIN && this.koLoser !== -1) {
            this.setPhase('finisher');
            this.finisherSignalled = false;
            out.push({ type: 'phase', phase: 'finisher' }, { type: 'enable-finisher', winner });
          } else {
            out.push(...this.endRound(winner, 'ko'));
          }
        }
        break;
      }
      case 'finisher': {
        if (input.finisherRunning) {
          this.phaseFrame--;
          this.finisherSignalled = true;
        }
        if (input.finisherDone || (!input.finisherRunning && this.phaseFrame >= PHASE_FRAMES.finisherWindow)) {
          out.push(...this.endRound(this.roundWinner, this.finisherSignalled ? 'finisher' : 'ko'));
        }
        break;
      }
      case 'round-end':
        if (this.phaseFrame >= PHASE_FRAMES.roundEnd) {
          const over = this.wins[0] >= ROUNDS_TO_WIN || this.wins[1] >= ROUNDS_TO_WIN || this.round >= MAX_ROUNDS;
          if (over) {
            this.winner = this.wins[0] === this.wins[1] ? -1 : this.wins[0] > this.wins[1] ? 0 : 1;
            this.setPhase('victory');
            out.push({ type: 'phase', phase: 'victory' });
          } else {
            this.round++;
            this.timerFrames = ROUND_TIME_SECONDS * SIM_FPS;
            this.roundWinner = -1;
            this.koLoser = -1;
            this.setPhase('round-start');
            out.push({ type: 'reset-round' }, { type: 'phase', phase: 'round-start' });
          }
        }
        break;
      case 'victory':
        if (this.phaseFrame === PHASE_FRAMES.victory) out.push({ type: 'match-over', winner: this.winner });
        break;
    }
    return out;
  }

  private roundLabel(): string {
    if (this.matchPoint && this.wins[0] === this.wins[1]) return 'FINAL ROUND';
    return `ROUND ${this.round}`;
  }

  private timeOver(input: MatchTickInput): MatchSignal[] {
    const r0 = input.hp[0] / input.maxHp[0];
    const r1 = input.hp[1] / input.maxHp[1];
    const winner: 0 | 1 | -1 = Math.abs(r0 - r1) < 1e-6 ? -1 : r0 > r1 ? 0 : 1;
    const out: MatchSignal[] = [{ type: 'announce', text: 'TIME', style: 'time' }];
    out.push(...this.endRound(winner, 'time'));
    return out;
  }

  private endRound(winner: 0 | 1 | -1, reason: 'ko' | 'time' | 'finisher'): MatchSignal[] {
    if (winner !== -1) this.wins[winner]++;
    this.roundWinner = winner;
    this.setPhase('round-end');
    return [{ type: 'phase', phase: 'round-end' }, { type: 'round-won', winner, reason }];
  }
}
