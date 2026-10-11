import { describe, expect, it } from 'vitest';
import { Btn, makeInput } from '@/input/InputFrame';
import { FighterState } from '@/combat/FighterState';
import { KO_FRAMES, ROUND_END_FRAMES, TICK_RATE } from '@/core/constants';
import { closeIn, hold, idle, makeSim, pressOnce, run, toFight } from '@/test/helpers';

describe('Simulation core loop', () => {
  it('starts in round-start and enters fight after announcements', () => {
    const sim = makeSim();
    expect(sim.phase).toBe('round-start');
    toFight(sim);
    expect(sim.phase).toBe('fight');
  });

  it('light punch deals damage after walking into range and respects startup frames', () => {
    const sim = makeSim();
    toFight(sim);
    // Walk forward until in range.
    closeIn(sim);
    const dist = Math.abs(sim.p2.x - sim.p1.x);
    expect(dist).toBeLessThanOrEqual(150);
    const hpBefore = sim.p2.hp;
    sim.tick([pressOnce(Btn.LP), idle]);
    expect(sim.p1.state).toBe(FighterState.ATTACK);
    // Startup is 5 frames: no damage yet after 3 ticks.
    run(sim, 3);
    expect(sim.p2.hp).toBe(hpBefore);
    run(sim, 6);
    expect(sim.p2.hp).toBeLessThan(hpBefore);
    expect(sim.p2.state === FighterState.HIT || sim.p2.state === FighterState.HURT).toBe(true);
  });

  it('standing block prevents damage from a high punch and causes blockstun', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim);
    const hpBefore = sim.p2.hp;
    sim.tick([pressOnce(Btn.LP), makeInput(0, 0, Btn.BLOCK, Btn.BLOCK)]);
    run(sim, 12, () => [idle, makeInput(0, 0, Btn.BLOCK, 0)]);
    expect(sim.p2.hp).toBe(hpBefore);
    expect(sim.p2.state).toBe(FighterState.BLOCKSTUN);
  });

  it('perfect block happens when block is pressed just before impact', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim);
    let perfect = false;
    sim.events.on('hit', (e) => {
      if (e.perfect) perfect = true;
    });
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, 3);
    sim.tick([idle, makeInput(0, 0, Btn.BLOCK, Btn.BLOCK)]);
    run(sim, 8, () => [idle, makeInput(0, 0, Btn.BLOCK, 0)]);
    expect(perfect).toBe(true);
    expect(sim.p2.state).toBe(FighterState.BLOCK);
  });

  it('a low attack beats a standing block', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim);
    const hpBefore = sim.p2.hp;
    sim.tick([pressOnce(Btn.LK, 0, -1), makeInput(0, 0, Btn.BLOCK, Btn.BLOCK)]);
    run(sim, 12, () => [hold(0, -1), makeInput(0, 0, Btn.BLOCK, 0)]);
    expect(sim.p2.hp).toBeLessThan(hpBefore);
  });

  it('knockback pushes the defender away and hitstun expires back to idle', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim);
    const xBefore = sim.p2.x;
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, 10);
    expect(sim.p2.x).toBeGreaterThan(xBefore);
    run(sim, 40);
    expect(sim.p2.state).toBe(FighterState.IDLE);
  });

  it('KO ends the round, awards it to the winner and the next round starts', () => {
    const sim = makeSim();
    toFight(sim);
    sim.p2.hp = 10;
    closeIn(sim);
    sim.tick([pressOnce(Btn.HP), idle]);
    run(sim, 20);
    expect(sim.phase).toBe('ko');
    expect(sim.p2.hp).toBe(0);
    run(sim, KO_FRAMES + 5);
    expect(sim.phase).toBe('round-end');
    expect(sim.p1.roundsWon).toBe(1);
    run(sim, ROUND_END_FRAMES + 2);
    expect(sim.phase).toBe('round-start');
    expect(sim.round).toBe(2);
    expect(sim.p2.hp).toBe(sim.p2.maxHp);
  });

  it('two round wins end the match with a winner', () => {
    const sim = makeSim();
    let result: { winner: 0 | 1 | null } | null = null;
    sim.events.on('matchEnd', (e) => (result = e.result));
    for (let r = 0; r < 2; r++) {
      toFight(sim);
      sim.p2.hp = 1;
      closeIn(sim);
      sim.tick([pressOnce(Btn.LP), idle]);
      run(sim, KO_FRAMES + ROUND_END_FRAMES + 40);
    }
    expect(sim.phase).toBe('match-end');
    expect(sim.matchWinner).toBe(0);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe(0);
  });

  it('timeout with equal HP is a draw round; higher HP wins otherwise', () => {
    const sim = makeSim('raven', 'brute', { timeLimit: 2 });
    toFight(sim);
    run(sim, TICK_RATE * 2 + 5);
    expect(sim.phase).toBe('round-end');
    expect(sim.roundWinner).toBeNull();
    run(sim, ROUND_END_FRAMES + 2);
    toFight(sim);
    sim.p2.hp = 500;
    run(sim, TICK_RATE * 2 + 5);
    expect(sim.roundWinner).toBe(0);
  });

  it('fighters cannot pass through each other', () => {
    const sim = makeSim();
    toFight(sim);
    run(sim, 200, () => [hold(1), hold(-1)]);
    expect(sim.p1.x).toBeLessThan(sim.p2.x);
    expect(sim.p2.x - sim.p1.x).toBeGreaterThanOrEqual((sim.p1.config.pushbox.w + sim.p2.config.pushbox.w) / 2 - 2);
  });

  it('stage walls stop movement', () => {
    const sim = makeSim();
    toFight(sim);
    run(sim, 600, () => [hold(-1), hold(1)]);
    expect(sim.p1.x).toBeGreaterThan(-1300);
    expect(sim.p2.x).toBeLessThan(1300);
  });
});

describe('finisher flow', () => {
  it('decisive KO opens the END HIM window and a special in range triggers the finisher', () => {
    const sim = makeSim('raven', 'brute', { finishers: true });
    toFight(sim);
    sim.p1.roundsWon = 1;
    sim.p2.hp = 1;
    closeIn(sim);
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, KO_FRAMES + 20);
    expect(sim.phase).toBe('finisher-window');
    expect(sim.finisherAvailable).toBe(true);
    // Walk in and press special.
    for (let i = 0; i < 120 && Math.abs(sim.p2.x - sim.p1.x) > 200; i++) sim.tick([hold(1), idle]);
    let started = false;
    sim.events.on('finisherStart', () => (started = true));
    sim.tick([pressOnce(Btn.SP1), idle]);
    expect(started).toBe(true);
    expect(sim.phase).toBe('finisher');
    run(sim, 260);
    expect(sim.phase).toBe('round-end');
    expect(sim.finisherUsed).toBe(true);
    run(sim, ROUND_END_FRAMES + 5);
    expect(sim.phase).toBe('match-end');
    expect(sim.matchWinner).toBe(0);
  });

  it('window expires without input and the match still ends', () => {
    const sim = makeSim('raven', 'brute', { finishers: true });
    toFight(sim);
    sim.p1.roundsWon = 1;
    sim.p2.hp = 1;
    closeIn(sim);
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, KO_FRAMES + 20 + 260 + ROUND_END_FRAMES + 10);
    expect(sim.phase).toBe('match-end');
    expect(sim.finisherUsed).toBe(false);
  });
});
