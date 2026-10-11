import { describe, expect, it } from 'vitest';
import { AIController } from '@/ai/AIController';
import { DIFFICULTIES } from '@/core/types';
import { makeSim, toFight } from '@/test/helpers';
import { EMPTY_INPUT, type InputFrame } from '@/input/InputFrame';

const playAiVsAi = (frames: number, seed = 7) => {
  const sim = makeSim('raven', 'brute', { seed, rounds: 2 });
  const a = new AIController(0, 'hard', sim);
  const b = new AIController(1, 'hard', sim);
  const stats = { hits: 0, blocks: 0, moved: false };
  sim.events.on('hit', (e) => (e.blocked ? stats.blocks++ : stats.hits++));
  const startX = [sim.p1.x, sim.p2.x];
  for (let i = 0; i < frames && !sim.isOver; i++) {
    const inputs: [InputFrame, InputFrame] = sim.inputsEnabled ? [a.update(sim), b.update(sim)] : [EMPTY_INPUT, EMPTY_INPUT];
    sim.tick(inputs);
    if (sim.p1.x !== startX[0] || sim.p2.x !== startX[1]) stats.moved = true;
  }
  return { sim, stats };
};

describe('AI opponent', () => {
  it('moves, attacks, blocks and can finish a match without cheating', () => {
    const { sim, stats } = playAiVsAi(60 * 240);
    expect(stats.moved).toBe(true);
    expect(stats.hits).toBeGreaterThan(5);
    expect(stats.blocks).toBeGreaterThan(0);
    expect(sim.isOver).toBe(true);
    expect(sim.matchWinner === 0 || sim.matchWinner === 1 || sim.draw).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const a = playAiVsAi(60 * 30, 3);
    const b = playAiVsAi(60 * 30, 3);
    expect(a.sim.p1.hp).toBe(b.sim.p1.hp);
    expect(a.sim.p2.hp).toBe(b.sim.p2.hp);
    expect(a.sim.p1.x).toBe(b.sim.p1.x);
  });

  it('every difficulty produces input and lands hits against a passive dummy', () => {
    for (const d of DIFFICULTIES) {
      const sim = makeSim('brute', 'raven', { seed: 11 });
      const ai = new AIController(1, d, sim);
      toFight(sim);
      let hits = 0;
      sim.events.on('hit', (e) => {
        if (e.attacker.side === 1 && !e.blocked) hits++;
      });
      for (let i = 0; i < 60 * 20 && sim.phase === 'fight'; i++) sim.tick([EMPTY_INPUT, ai.update(sim)]);
      expect(hits).toBeGreaterThan(0);
    }
  });

  it('harder difficulties win more often against easy', () => {
    let hardWins = 0;
    const games = 6;
    for (let g = 0; g < games; g++) {
      const sim = makeSim('raven', 'raven', { seed: 100 + g, rounds: 1 });
      const easy = new AIController(0, 'easy', sim);
      const hard = new AIController(1, 'nightmare', sim);
      for (let i = 0; i < 60 * 120 && !sim.isOver; i++) {
        sim.tick(sim.inputsEnabled ? [easy.update(sim), hard.update(sim)] : [EMPTY_INPUT, EMPTY_INPUT]);
      }
      if (sim.matchWinner === 1) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(4);
  });
});
