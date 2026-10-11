import { describe, expect, it } from 'vitest';
import { BRUTE } from '../characters/Brute';
import { Fighter, type FighterContext } from '../characters/Fighter';
import { FighterState } from '../characters/FighterState';
import { RAVEN } from '../characters/Raven';
import type { GameEvent } from '../game/events';
import { PhysicsSystem } from '../game/PhysicsSystem';
import { Button, type FrameInput } from '../input/InputTypes';
import { CombatSystem } from './CombatSystem';
import { ComboSystem } from './ComboSystem';
import { canBlockLevel, comboScale, computeDamage } from './DamageSystem';
import { findOverlap, toWorldBox } from './HitboxSystem';
import { LockSystem } from './LockSystem';

const idle: FrameInput = { x: 0, y: 0, held: 0, pressed: 0 };
const press = (b: Button, x: -1 | 0 | 1 = 0, y: -1 | 0 | 1 = 0): FrameInput => ({ x, y, held: b, pressed: b });
const hold = (b: Button, y: -1 | 0 | 1 = 0): FrameInput => ({ x: 0, y, held: b, pressed: 0 });

/** Minimal headless fight harness running the real systems in the session's order. */
const setup = (gap = 100) => {
  const a = new Fighter(RAVEN, 0);
  const b = new Fighter(BRUTE, 1);
  a.resetForRound(-gap / 2, 1, 0);
  b.resetForRound(gap / 2, -1, 0);
  const combo = new ComboSystem();
  const physics = new PhysicsSystem();
  const locks = new LockSystem(combo, (x) => physics.clampX(a, x));
  const combat = new CombatSystem(combo, locks);
  const events: GameEvent[] = [];
  let hitstop = 0;
  let frame = 0;
  const carry = [0, 0];
  const ctxFor = (f: Fighter): FighterContext => ({
    events,
    opponent: f === a ? b : a,
    inputEnabled: true,
    finisherWindow: false,
    spawnProjectile: () => undefined,
    requestFreeze: () => undefined,
    startFinisher: () => undefined,
    clampX: (x) => physics.clampX(f, x),
  });
  const step = (ia: FrameInput = idle, ib: FrameInput = idle) => {
    frame++;
    if (hitstop > 0) {
      hitstop--;
      carry[0] |= ia.pressed;
      carry[1] |= ib.pressed;
      return;
    }
    if (carry[0]) ia = { ...ia, pressed: ia.pressed | carry[0], held: ia.held | carry[0] };
    if (carry[1]) ib = { ...ib, pressed: ib.pressed | carry[1], held: ib.held | carry[1] };
    carry[0] = carry[1] = 0;
    a.update(ia, ctxFor(a));
    b.update(ib, ctxFor(b));
    physics.step([a, b], events);
    if (a.lock) locks.update(a, events);
    if (b.lock) locks.update(b, events);
    combat.resolveFighters([a, b], { events, frame, addHitstop: (n) => (hitstop = Math.max(hitstop, n)) });
    combo.update(frame, [a.isActionable, b.isActionable], events);
  };
  const run = (n: number, ia: FrameInput = idle, ib: FrameInput = idle) => {
    for (let i = 0; i < n; i++) step(ia, ib);
  };
  return { a, b, combo, events, step, run };
};

describe('damage calculation', () => {
  it('scales damage by attacker, defender and combo length', () => {
    expect(computeDamage({ base: 100, attackerMult: 1, defenderMult: 1, comboHits: 0, counterHit: false })).toBe(100);
    expect(computeDamage({ base: 100, attackerMult: 1.2, defenderMult: 0.9, comboHits: 0, counterHit: false })).toBe(108);
    expect(comboScale(0)).toBe(1);
    expect(comboScale(1)).toBe(1);
    expect(comboScale(3)).toBeCloseTo(0.81);
    expect(comboScale(40)).toBe(0.4);
    expect(computeDamage({ base: 100, attackerMult: 1, defenderMult: 1, comboHits: 0, counterHit: true })).toBe(120);
  });

  it('applies block rules per hit level', () => {
    expect(canBlockLevel('high', false)).toBe(true);
    expect(canBlockLevel('mid', false)).toBe(true);
    expect(canBlockLevel('low', false)).toBe(false);
    expect(canBlockLevel('low', true)).toBe(true);
    expect(canBlockLevel('mid', true)).toBe(false);
    expect(canBlockLevel('unblockable', false)).toBe(false);
  });
});

describe('hitbox collision', () => {
  it('mirrors boxes for left-facing fighters', () => {
    const right = toWorldBox({ x: 20, y: 100, w: 50, h: 20 }, 0, 0, 1, 1);
    const left = toWorldBox({ x: 20, y: 100, w: 50, h: 20 }, 0, 0, -1, 1);
    expect(right.x).toBe(20);
    expect(left.x).toBe(-70);
  });

  it('finds overlaps and misses separated boxes', () => {
    expect(findOverlap([{ x: 0, y: 0, w: 10, h: 10 }], [{ x: 5, y: 5, w: 10, h: 10 }])).toEqual({ x: 7.5, y: 7.5 });
    expect(findOverlap([{ x: 0, y: 0, w: 10, h: 10 }], [{ x: 11, y: 0, w: 10, h: 10 }])).toBeNull();
  });

  it('only exposes hitboxes during active frames', () => {
    const { a, step } = setup(600);
    step(press(Button.LP));
    const lp = RAVEN.normals.lp;
    let activeFrames = 0;
    for (let f = 1; f < lp.startup + lp.active + lp.recovery; f++) {
      if (a.getActiveHitboxes().length) activeFrames++;
      step();
    }
    expect(activeFrames).toBe(lp.active);
  });
});

describe('hits, hitstun and knockback', () => {
  it('a jab lands, deals damage and puts the defender in hitstun pushed away', () => {
    const { a, b, run, step } = setup(100);
    const hp = b.hp;
    step(press(Button.LP));
    run(RAVEN.normals.lp.startup + 6);
    expect(b.hp).toBeLessThan(hp);
    expect(b.state).toBe(FighterState.HIT);
    expect(b.vx).toBeGreaterThan(0);
    expect(a.moveConnected).toBe(true);
  });

  it('hitstun expires and the defender recovers', () => {
    const { b, run, step } = setup(100);
    step(press(Button.LP));
    run(RAVEN.normals.lp.startup + 2);
    expect(b.state).toBe(FighterState.HIT);
    run(60);
    expect(b.isActionable).toBe(true);
  });

  it('launchers juggle and knock down', () => {
    const { b, run, step } = setup(90);
    step(press(Button.HP, 0, -1));
    run(14, { x: 0, y: -1, held: 0, pressed: 0 });
    expect([FighterState.HURT, FighterState.KNOCKDOWN]).toContain(b.state);
    run(60);
    expect([FighterState.KNOCKDOWN, FighterState.GETUP, FighterState.IDLE]).toContain(b.state);
  });
});

describe('blocking', () => {
  it('standing block stops a mid attack and applies blockstun instead of damage', () => {
    const { b, run, step } = setup(100);
    run(10, idle, hold(Button.BLOCK));
    const hp = b.hp;
    step(press(Button.LK), hold(Button.BLOCK));
    run(RAVEN.normals.lk.startup + 3, idle, hold(Button.BLOCK));
    expect(b.hp).toBe(hp);
    expect(b.state).toBe(FighterState.BLOCK);
    expect(b.stun).toBeGreaterThan(0);
  });

  it('standing block does not stop a low attack', () => {
    const { b, run, step } = setup(100);
    run(10, idle, hold(Button.BLOCK));
    const hp = b.hp;
    step(press(Button.LK, 0, -1), hold(Button.BLOCK));
    run(RAVEN.normals.clk.startup + 3, { x: 0, y: -1, held: 0, pressed: 0 }, hold(Button.BLOCK));
    expect(b.hp).toBeLessThan(hp);
  });

  it('a block pressed just before impact is a perfect block', () => {
    const { events, run, step } = setup(100);
    step(press(Button.LP));
    run(RAVEN.normals.lp.startup - 3);
    step(idle, press(Button.BLOCK));
    run(4, idle, hold(Button.BLOCK));
    expect(events.some((e) => e.type === 'perfect-block')).toBe(true);
  });
});

describe('combos and input buffer', () => {
  it('J → J → K → I chains into a 4-hit combo through cancels', () => {
    const { a, combo, run, step } = setup(100);
    const seq = [Button.LP, Button.LP, Button.HP, Button.S1];
    for (const b of seq) {
      step(press(b));
      run(7);
    }
    run(40);
    expect(combo.maxCombo(0)).toBe(4);
    expect(a.lastAttackId).toBe('redFang');
  });

  it('a press made during startup is buffered and used when the cancel window opens', () => {
    const { combo, run, step } = setup(100);
    step(press(Button.LP));
    run(2);
    step(press(Button.HP));
    run(40);
    expect(combo.maxCombo(0)).toBe(2);
  });

  it('combo resets once the defender recovers', () => {
    const { combo, run, step, events } = setup(100);
    step(press(Button.LP));
    run(6);
    step(press(Button.LP));
    run(60);
    expect(events.some((e) => e.type === 'combo-end')).toBe(true);
    expect(combo.currentHits(0)).toBe(0);
  });

  it('detects quarter-circle motion for Crimson Slash', () => {
    const f = new Fighter(RAVEN, 0);
    f.facing = 1;
    f.buffer.push({ x: 0, y: -1, held: 0, pressed: 0 }, 1);
    f.buffer.push({ x: 1, y: -1, held: 0, pressed: 0 }, 1);
    f.buffer.push({ x: 1, y: 0, held: Button.S1, pressed: Button.S1 }, 1);
    expect(f.buffer.matchMotion(['D', 'F'], 16, 0)).toBe(true);
    expect(f.buffer.matchMotion(['D', 'B'], 16, 0)).toBe(false);
    expect(f.buffer.findPress(Button.S1, 9)).toBe(0);
  });

  it('dash motion needs a neutral between forwards', () => {
    const f = new Fighter(RAVEN, 0);
    for (let i = 0; i < 4; i++) f.buffer.push({ x: 1, y: 0, held: 0, pressed: 0 }, 1);
    expect(f.buffer.matchMotion(['F', 'N', 'F'], 12, 0)).toBe(false);
    f.buffer.push({ x: 0, y: 0, held: 0, pressed: 0 }, 1);
    f.buffer.push({ x: 1, y: 0, held: 0, pressed: 0 }, 1);
    expect(f.buffer.matchMotion(['F', 'N', 'F'], 12, 0)).toBe(true);
  });

  it('buffered presses expire after the buffer window', () => {
    const f = new Fighter(RAVEN, 0);
    f.buffer.push(press(Button.LP), 1);
    for (let i = 0; i < 12; i++) f.buffer.push(idle, 1);
    expect(f.buffer.findPress(Button.LP, 9)).toBe(-1);
  });
});

describe('grabs', () => {
  it('a throw beats block and cannot be interrupted', () => {
    const { a, b, run, step } = setup(80);
    run(5, idle, hold(Button.BLOCK));
    const hp = b.hp;
    step(press(Button.GRAB), hold(Button.BLOCK));
    run(8, idle, hold(Button.BLOCK));
    expect(a.lock).not.toBeNull();
    expect(b.state).toBe(FighterState.THROWN);
    expect(a.isInvulnerable()).toBe(true);
    expect(b.getActiveHitboxes()).toHaveLength(0);
    run(60);
    expect(b.hp).toBeLessThan(hp);
  });
});
