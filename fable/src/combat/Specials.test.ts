import { describe, expect, it } from 'vitest';
import { Btn, makeInput } from '@/input/InputFrame';
import { FighterState } from '@/combat/FighterState';
import { closeIn, hold, idle, makeSim, pressOnce, run, toFight } from '@/test/helpers';

describe('special moves', () => {
  it('crimson slash spawns a projectile that damages the opponent', () => {
    const sim = makeSim();
    toFight(sim);
    const hp = sim.p2.hp;
    sim.tick([pressOnce(Btn.SP1), idle]);
    run(sim, 14);
    expect(sim.projectiles.length).toBe(1);
    run(sim, 60);
    expect(sim.p2.hp).toBeLessThan(hp);
  });

  it('blood dash triggers from forward-forward + SP1 and moves the fighter', () => {
    const sim = makeSim();
    toFight(sim);
    const x = sim.p1.x;
    sim.tick([hold(1), idle]);
    sim.tick([hold(1), idle]);
    sim.tick([idle, idle]);
    sim.tick([hold(1), idle]);
    sim.tick([makeInput(1, 0, Btn.SP1, Btn.SP1), idle]);
    expect(sim.p1.currentAttack?.id).toBe('bloodDash');
    run(sim, 25);
    expect(sim.p1.x - x).toBeGreaterThan(150);
  });

  it('execution grab connects at close range and deals damage over pulses', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim, 110);
    const hp = sim.p2.hp;
    sim.tick([pressOnce(Btn.SP2), idle]);
    run(sim, 14);
    expect(sim.p2.state).toBe(FighterState.GRABBED);
    run(sim, 70);
    expect(sim.p2.hp).toBeLessThan(hp - 150);
  });

  it('super requires full meter and both special buttons', () => {
    const sim = makeSim();
    toFight(sim);
    sim.tick([makeInput(0, 0, Btn.SP1 | Btn.SP2, Btn.SP1 | Btn.SP2), idle]);
    expect(sim.p1.currentAttack?.id).not.toBe('bloodRush');
    run(sim, 60);
    sim.p1.meter = 1000;
    sim.tick([makeInput(0, 0, Btn.SP1 | Btn.SP2, Btn.SP1 | Btn.SP2), idle]);
    expect(sim.p1.currentAttack?.id).toBe('bloodRush');
    expect(sim.p1.meter).toBe(0);
  });

  it('basic throw cannot be blocked', () => {
    const sim = makeSim();
    toFight(sim);
    closeIn(sim, 110);
    const hp = sim.p2.hp;
    sim.tick([pressOnce(Btn.GRAB), makeInput(0, 0, Btn.BLOCK, Btn.BLOCK)]);
    run(sim, 50, () => [idle, makeInput(0, 0, Btn.BLOCK, 0)]);
    expect(sim.p2.hp).toBeLessThan(hp);
  });
});
