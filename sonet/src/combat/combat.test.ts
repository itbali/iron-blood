import { describe, expect, it } from 'vitest';
import { FighterState } from './types';
import { Btn, makeSim, place, run, script, tap, toFight } from '../game/testUtils';
import { computeDamage, comboScale, chipDamage } from './DamageSystem';

describe('damage calculation', () => {
  it('scales by combo hit index and attacker multiplier', () => {
    expect(computeDamage(100, 1, 0)).toBe(100);
    expect(computeDamage(100, 1, 3)).toBe(Math.round(100 * comboScale(3)));
    expect(comboScale(50)).toBeGreaterThanOrEqual(0.4);
    expect(chipDamage(100)).toBeGreaterThan(0);
  });
});

describe('frame-based attacks', () => {
  it('light punch connects only in active frames and deals damage + hitstun', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 110);
    const [raven, brute] = sim.fighters;
    const hp0 = brute.hp;
    const startup = raven.def.moves.lightPunch.attack.startup;
    const seq = [Btn.LP, 0];
    let connectFrame = -1;
    for (let f = 0; f < 40; f++) {
      sim.step([seq[f] ?? 0, 0]);
      if (connectFrame < 0 && brute.hp < hp0) connectFrame = f;
    }
    expect(connectFrame).toBeGreaterThanOrEqual(startup);
    expect(brute.hp).toBeLessThan(hp0);
    expect(raven.moveConnected === 'hit' || raven.state === FighterState.IDLE).toBe(true);
  });

  it('hitbox does not exist during startup', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 110);
    sim.step([Btn.LP, 0]);
    expect(sim.fighters[0].hitRects().length).toBe(0);
  });

  it('whiffs at long range', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 600);
    const hp0 = sim.fighters[1].hp;
    run(sim, 40, script(tap(Btn.LP)));
    expect(sim.fighters[1].hp).toBe(hp0);
  });
});

describe('blocking', () => {
  it('high block stops mid attacks and applies chip + blockstun', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 110);
    const brute = sim.fighters[1];
    const hp0 = brute.hp;
    run(sim, 20, 0, Btn.BLOCK);
    run(sim, 40, script(tap(Btn.LP)), Btn.BLOCK);
    expect(brute.hp).toBeLessThan(hp0);
    expect(hp0 - brute.hp).toBeLessThan(10);
  });

  it('low attacks beat a standing block, crouch-block stops them', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 110);
    const brute = sim.fighters[1];
    const hp0 = brute.hp;
    run(sim, 6, 0, 0);
    run(sim, 60, script([Btn.DOWN | Btn.LK, Btn.DOWN]), Btn.BLOCK);
    expect(hp0 - brute.hp).toBeGreaterThan(15);

    const sim2 = makeSim();
    toFight(sim2);
    place(sim2, 110);
    const b2 = sim2.fighters[1];
    const h2 = b2.hp;
    run(sim2, 60, script([Btn.DOWN | Btn.LK, Btn.DOWN]), Btn.BLOCK | Btn.DOWN);
    expect(h2 - b2.hp).toBeLessThan(10);
  });

  it('perfect block staggers the attacker', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 110);
    const [raven, brute] = sim.fighters;
    let perfect = false;
    for (let f = 0; f < 40; f++) {
      const blockPress = f === 2 ? Btn.BLOCK : f > 2 ? Btn.BLOCK : 0;
      sim.step([f === 0 ? Btn.LP : 0, blockPress]);
      if (sim.events.some((e) => e.type === 'perfect-block')) perfect = true;
    }
    expect(perfect).toBe(true);
    expect(brute.hp).toBe(brute.maxHp);
    expect(raven.hp).toBe(raven.maxHp);
  });
});

describe('hitstun and knockback', () => {
  it('victim is pushed away and stunned', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 110);
    const brute = sim.fighters[1];
    const x0 = brute.x;
    let stunned = false;
    for (let f = 0; f < 30; f++) {
      sim.step([f === 0 ? Btn.LP : 0, 0]);
      if (brute.state === FighterState.HIT) stunned = true;
    }
    expect(stunned).toBe(true);
    expect(brute.x).toBeGreaterThan(x0);
  });

  it('heavy kick launches into knockdown', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 120);
    const brute = sim.fighters[1];
    let down = false;
    for (let f = 0; f < 120; f++) {
      sim.step([f === 0 ? Btn.HK : 0, 0]);
      if (brute.state === FighterState.KNOCKDOWN) down = true;
    }
    expect(down).toBe(true);
  });
});

describe('input during hit-stop', () => {
  it('a heavy punch tapped inside hit-stop still comes out', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 100);
    let pressedAt = -1;
    for (let f = 0; f < 80; f++) {
      let input = 0;
      if (f === 0) input = Btn.LP;
      if (pressedAt < 0 && sim.hitstop > 2) {
        pressedAt = f;
        input = Btn.HP;
      } else if (pressedAt >= 0 && f === pressedAt + 1) input = 0;
      sim.step([input, 0]);
    }
    expect(pressedAt).toBeGreaterThan(0);
    expect(sim.stats.hits[0]).toBeGreaterThanOrEqual(2);
  });
});
