import { describe, expect, it } from 'vitest';
import { Btn } from '@/input/InputFrame';
import { closeIn, idle, makeSim, pressOnce, run, toFight } from '@/test/helpers';
import { calculateDamage, comboScale } from './DamageSystem';
import { matchesMotion } from './MotionInput';

describe('combo system', () => {
  it('J J K chain registers a 3 hit combo', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim);
    let maxHits = 0;
    sim.events.on('combo', (e) => (maxHits = Math.max(maxHits, e.hits)));
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, 7);
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, 7);
    sim.tick([pressOnce(Btn.HP), idle]);
    run(sim, 20);
    expect(maxHits).toBe(3);
  });

  it('J K I (crimson slash cancel) continues the combo with a projectile', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim);
    let maxHits = 0;
    sim.events.on('combo', (e) => (maxHits = Math.max(maxHits, e.hits)));
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, 7);
    sim.tick([pressOnce(Btn.HP), idle]);
    run(sim, 12);
    sim.tick([pressOnce(Btn.SP1), idle]);
    run(sim, 40);
    expect(maxHits).toBe(3);
  });

  it('input buffer lets a press slightly before the cancel window still chain', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim);
    let maxHits = 0;
    sim.events.on('combo', (e) => (maxHits = Math.max(maxHits, e.hits)));
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, 2);
    // Pressed during startup: buffered until the hit connects.
    sim.tick([pressOnce(Btn.HP), idle]);
    run(sim, 30);
    expect(maxHits).toBe(2);
  });

  it('combo resets after the victim recovers', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim);
    let ended = false;
    sim.events.on('comboEnd', () => (ended = true));
    sim.tick([pressOnce(Btn.LP), idle]);
    run(sim, 80);
    expect(ended).toBe(true);
    expect(sim.combos.tracks[0].hits).toBe(0);
  });

  it('damage scaling decreases with combo length', () => {
    expect(comboScale(1)).toBe(1);
    expect(comboScale(3)).toBeLessThan(comboScale(2));
    const first = calculateDamage({ baseDamage: 100, attackerScale: 1, comboHits: 0, blocked: false, perfectBlock: false, armored: false, chipRatio: 0, counterHit: false });
    const fifth = calculateDamage({ baseDamage: 100, attackerScale: 1, comboHits: 5, blocked: false, perfectBlock: false, armored: false, chipRatio: 0, counterHit: false });
    expect(fifth.damage).toBeLessThan(first.damage);
  });

  it('blocked specials deal chip damage, blocked normals deal none', () => {
    const chip = calculateDamage({ baseDamage: 100, attackerScale: 1, comboHits: 0, blocked: true, perfectBlock: false, armored: false, chipRatio: 0.12, counterHit: false });
    expect(chip.damage).toBe(12);
    const none = calculateDamage({ baseDamage: 100, attackerScale: 1, comboHits: 0, blocked: true, perfectBlock: false, armored: false, chipRatio: 0, counterHit: false });
    expect(none.damage).toBe(0);
  });
});

describe('motion input detection', () => {
  it('detects forward-forward', () => {
    expect(matchesMotion(['n', 'f', 'n', 'f'], 'ff')).toBe(true);
    expect(matchesMotion(['f', 'f', 'f'], 'ff')).toBe(false);
    expect(matchesMotion(['n', 'f', 'b', 'f'], 'ff')).toBe(false);
  });
  it('detects down-forward and down-back', () => {
    expect(matchesMotion(['n', 'd', 'df', 'f'], 'df')).toBe(true);
    expect(matchesMotion(['n', 'd', 'db', 'b'], 'db')).toBe(true);
    expect(matchesMotion(['n', 'f'], 'df')).toBe(false);
  });
});
