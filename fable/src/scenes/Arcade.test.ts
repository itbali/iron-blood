import { describe, expect, it } from 'vitest';
import { arcadeAdvance, arcadeComplete, arcadeMatchConfig, createArcadeRun, isBossFight } from './ArcadeMode';

describe('arcade ladder', () => {
  it('has four opponents then the boss, never the player character, Brute first for Raven', () => {
    const run = createArcadeRun('raven', 'normal', 42);
    expect(run.ladder.length).toBe(5);
    expect(run.ladder[0]).toBe('brute');
    expect(run.ladder[4]).toBe('archon');
    expect(run.ladder.includes('raven')).toBe(false);
    expect(new Set(run.ladder).size).toBe(5);
  });

  it('advances through fights and completes after the boss', () => {
    let run = createArcadeRun('vera', 'hard', 7);
    const result = { winner: 0 as const, draw: false, rounds: [0 as const, 0 as const], maxCombo: 4, damageDealt: 1000, durationFrames: 600, finisherUsed: false };
    for (let i = 0; i < 5; i++) {
      const cfg = arcadeMatchConfig(run);
      expect(cfg.p2).toBe(run.ladder[i]);
      expect(isBossFight(run)).toBe(i === 4);
      run = arcadeAdvance(run, result);
    }
    expect(arcadeComplete(run)).toBe(true);
    expect(run.totalFrames).toBe(3000);
  });
});
