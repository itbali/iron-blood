import { describe, expect, it } from 'vitest';
import { ROUND_TIME_SECONDS, SIM_FPS } from '../core/constants';
import { advanceArcade, arcadeComplete, arcadeMatchConfig, createArcadeRun } from './Arcade';
import type { MatchResult } from './GameState';
import { MatchController, PHASE_FRAMES, type MatchSignal, type MatchTickInput } from './MatchController';

const full: MatchTickInput = { hp: [1000, 1000], maxHp: [1000, 1000], finisherRunning: false, finisherDone: false };

const runUntil = (m: MatchController, phase: string, input = full, max = 5000): MatchSignal[] => {
  const all: MatchSignal[] = [];
  for (let i = 0; i < max && m.phase !== phase; i++) all.push(...m.tick(input));
  return all;
};

describe('round flow', () => {
  it('goes intro → round-start → fight with ROUND 1 and FIGHT announcements', () => {
    const m = new MatchController();
    expect(m.phase).toBe('intro');
    const sig = runUntil(m, 'fight');
    expect(sig.some((s) => s.type === 'announce' && s.text === 'ROUND 1')).toBe(true);
    expect(sig.some((s) => s.type === 'announce' && s.text === 'FIGHT!')).toBe(true);
    expect(m.inputEnabled).toBe(true);
  });

  it('a KO in round 1 awards the round and starts round 2', () => {
    const m = new MatchController(true);
    runUntil(m, 'fight');
    const ko = m.reportKO(1);
    expect(ko.some((s) => s.type === 'announce' && s.text === 'K.O.')).toBe(true);
    const sig = runUntil(m, 'round-start');
    expect(sig.some((s) => s.type === 'round-won' && s.winner === 0)).toBe(true);
    expect(sig.some((s) => s.type === 'reset-round')).toBe(true);
    expect(m.round).toBe(2);
    expect(m.wins).toEqual([1, 0]);
  });

  it('match point KO opens the END HIM finisher window, then victory', () => {
    const m = new MatchController(true);
    m.wins = [1, 0];
    runUntil(m, 'fight');
    const ko = m.reportKO(1);
    expect(ko.some((s) => s.type === 'announce' && s.text === 'END HIM')).toBe(true);
    const fin = runUntil(m, 'finisher');
    expect(fin.some((s) => s.type === 'enable-finisher' && s.winner === 0)).toBe(true);
    // finisher running pauses the window
    for (let i = 0; i < PHASE_FRAMES.finisherWindow + 50; i++) m.tick({ ...full, finisherRunning: true });
    expect(m.phase).toBe('finisher');
    m.tick({ ...full, finisherDone: true });
    expect(m.phase).toBe('round-end');
    const v = runUntil(m, 'victory');
    expect(v.length).toBeGreaterThan(0);
    expect(m.winner).toBe(0);
    let over: MatchSignal | undefined;
    for (let i = 0; i < PHASE_FRAMES.victory + 2; i++) over = m.tick(full).find((s) => s.type === 'match-over') ?? over;
    expect(over).toEqual({ type: 'match-over', winner: 0 });
  });

  it('defeat: the player losing two rounds gives the CPU the match', () => {
    const m = new MatchController(true);
    for (let r = 0; r < 2; r++) {
      runUntil(m, 'fight');
      m.reportKO(0);
      if (r === 0) runUntil(m, 'round-start');
      else {
        runUntil(m, 'finisher');
        for (let i = 0; i <= PHASE_FRAMES.finisherWindow; i++) m.tick(full);
      }
    }
    runUntil(m, 'victory');
    expect(m.winner).toBe(1);
  });

  it('time over gives the round to the healthier fighter, equal HP is a draw', () => {
    const m = new MatchController(true);
    runUntil(m, 'fight');
    expect(m.timerSeconds).toBe(ROUND_TIME_SECONDS);
    const sig = runUntil(m, 'round-end', { ...full, hp: [400, 700] }, ROUND_TIME_SECONDS * SIM_FPS + 10);
    expect(sig.some((s) => s.type === 'round-won' && s.winner === 1 && s.reason === 'time')).toBe(true);

    const d = new MatchController(true);
    runUntil(d, 'fight');
    const sd = runUntil(d, 'round-end', full, ROUND_TIME_SECONDS * SIM_FPS + 10);
    expect(sd.some((s) => s.type === 'round-won' && s.winner === -1)).toBe(true);
    expect(d.wins).toEqual([0, 0]);
  });
});

describe('arcade ladder', () => {
  const result = (winner: 0 | 1): MatchResult => ({
    winner,
    roundsWon: winner === 0 ? [2, 0] : [0, 2],
    timeSeconds: 60,
    maxCombo: [5, 2],
    damageDealt: [2000, 300],
    finisher: null,
    perfect: false,
  });

  it('has four challengers without mirror matches, then the boss', () => {
    const run = createArcadeRun('raven', 'default', 'normal', 7);
    expect(run.ladder).toHaveLength(5);
    expect(run.ladder.slice(0, 4)).not.toContain('raven');
    expect(run.ladder[4]).toBe('archon');
    expect(arcadeMatchConfig({ ...run, index: 4 }).isBoss).toBe(true);
  });

  it('advances on wins, stays on losses, and completes after the boss', () => {
    let run = createArcadeRun('vera', 'default', 'easy', 1);
    run = advanceArcade(run, result(1));
    expect(run.index).toBe(0);
    for (let i = 0; i < 5; i++) run = advanceArcade(run, result(0));
    expect(arcadeComplete(run)).toBe(true);
    expect(run.stats.wins).toBe(5);
    expect(run.stats.maxCombo).toBe(5);
  });
});
