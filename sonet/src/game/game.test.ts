import { describe, expect, it } from 'vitest';
import { AIController } from '../ai/AIController';
import { FighterState } from '../combat/types';
import { Btn, makeSim, place, run, script, toFight } from './testUtils';
import { InputBuffer } from '../input/InputBuffer';
import { SaveManager, SAVE_KEY, type StorageLike } from '../progression/SaveManager';
import { SettingsStore } from '../progression/Settings';
import { completeArcade } from '../progression/Progression';
import { getCharacter, CHARACTERS } from '../data/characters';
import { createRun, fightConfig } from './ArcadeRun';

const mem = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
};

describe('input buffer', () => {
  it('detects quarter-circle and dash motions', () => {
    const b = new InputBuffer();
    for (const f of [Btn.DOWN, Btn.DOWN | Btn.RIGHT, Btn.RIGHT, Btn.RIGHT | Btn.SP1]) b.push(f, 1);
    expect(b.command(['DOWN', 'FWD'], 'sp1')).toBe(true);
    const d = new InputBuffer();
    for (const f of [Btn.RIGHT, 0, Btn.RIGHT | Btn.SP1]) d.push(f, 1);
    expect(d.command(['FWD', 'FWD'], 'sp1')).toBe(true);
    const n = new InputBuffer();
    for (const f of [Btn.RIGHT, Btn.RIGHT, Btn.RIGHT | Btn.SP1]) n.push(f, 1);
    expect(n.command(['FWD', 'FWD'], 'sp1')).toBe(false);
  });
  it('mirrors for left-facing fighters and expires old presses', () => {
    const b = new InputBuffer();
    for (const f of [Btn.DOWN, Btn.DOWN | Btn.LEFT, Btn.LEFT | Btn.SP1]) b.push(f, -1);
    expect(b.command(['DOWN', 'FWD'], 'sp1')).toBe(true);
    const c = new InputBuffer();
    c.push(Btn.LP, 1);
    for (let i = 0; i < 12; i++) c.push(0, 1);
    expect(c.pressed(Btn.LP)).toBe(false);
  });
});

describe('combos', () => {
  it('J → J → K chains and counts hits', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 100);
    const seq: number[] = [];
    seq[0] = Btn.LP;
    seq[11] = Btn.LP;
    seq[22] = Btn.HP;
    let max = 0;
    for (let f = 0; f < 90; f++) {
      sim.step([seq[f] ?? 0, 0]);
      max = Math.max(max, sim.combo.info[0].hits);
    }
    expect(max).toBeGreaterThanOrEqual(3);
    expect(sim.combo.maxCombo[0]).toBeGreaterThanOrEqual(3);
  });
  it('J → K → I reaches a special cancel', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 100);
    const seq: number[] = [];
    seq[0] = Btn.LP;
    seq[12] = Btn.HP;
    seq[36] = Btn.SP1;
    let usedSpecial = false;
    for (let f = 0; f < 120; f++) {
      sim.step([seq[f] ?? 0, 0]);
      if (sim.fighters[0].move?.kind === 'special') usedSpecial = true;
    }
    expect(usedSpecial).toBe(true);
  });
  it('combo resets once the victim recovers', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 100);
    run(sim, 20, script([Btn.LP]));
    run(sim, 120);
    expect(sim.combo.info[0].active).toBe(false);
  });
});

describe('specials', () => {
  it('Crimson Slash (down, forward, I) spawns a projectile that damages', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 420);
    const hp = sim.fighters[1].hp;
    run(sim, 120, script([Btn.DOWN, Btn.DOWN | Btn.RIGHT, Btn.RIGHT | Btn.SP1]));
    expect(sim.fighters[1].hp).toBeLessThan(hp);
  });
  it('Blood Dash (forward, forward, I) lunges', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 500);
    const x0 = sim.fighters[0].x;
    run(sim, 20, script([Btn.RIGHT, 0, Btn.RIGHT | Btn.SP1]));
    expect(sim.fighters[0].x - x0).toBeGreaterThan(100);
  });
  it('Execution Grab beats block and deals heavy damage', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 90);
    const brute = sim.fighters[1];
    const hp = brute.hp;
    run(sim, 20, 0, Btn.BLOCK);
    run(sim, 160, script([Btn.DOWN, Btn.DOWN | Btn.LEFT | 0, Btn.RIGHT | Btn.SP2].map((v, i) => (i === 1 ? Btn.DOWN | Btn.LEFT : i === 2 ? Btn.LEFT | Btn.SP2 : v))), Btn.BLOCK);
    expect(hp - brute.hp).toBeGreaterThan(100);
  });
  it('Super needs full meter', () => {
    const sim = makeSim();
    toFight(sim);
    place(sim, 200);
    run(sim, 30, script([Btn.SP1 | Btn.SP2]));
    expect(sim.fighters[0].move?.kind).not.toBe('super');
    const sim2 = makeSim();
    toFight(sim2);
    place(sim2, 200);
    sim2.fighters[0].meter = 100;
    let supered = false;
    for (let f = 0; f < 20; f++) {
      sim2.step([f === 0 ? Btn.SP1 | Btn.SP2 : 0, 0]);
      if (sim2.fighters[0].move?.kind === 'super') supered = true;
    }
    expect(supered).toBe(true);
  });
});

describe('rounds, KO and victory', () => {
  it('KO ends the round, awards a win, and starts round 2', () => {
    const sim = makeSim();
    toFight(sim);
    sim.fighters[1].hp = 1;
    place(sim, 100);
    run(sim, 30, script([Btn.LP]));
    expect(sim.rounds.phase).toBe('ko');
    run(sim, 400);
    expect(sim.rounds.wins[0]).toBe(1);
    expect(sim.rounds.round).toBe(2);
    expect(sim.fighters[1].hp).toBe(sim.fighters[1].maxHp);
  });
  it('best of 3: two round wins give match victory', () => {
    const sim = makeSim();
    for (let r = 0; r < 2; r++) {
      toFight(sim);
      sim.fighters[1].hp = 1;
      place(sim, 100);
      run(sim, 30, script([Btn.LP]));
      run(sim, 520);
    }
    expect(sim.rounds.matchWinner).toBe(0);
    expect(sim.rounds.phase).toBe('victory');
  });
  it('timer expiry awards the fighter with more health; equal health is a draw', () => {
    const sim = makeSim();
    toFight(sim);
    sim.rounds.timerFrames = 2;
    sim.fighters[1].hp = 500;
    run(sim, 5);
    expect(sim.rounds.roundWinner).toBe(0);
    const d = makeSim();
    toFight(d);
    d.rounds.timerFrames = 2;
    run(d, 5);
    expect(d.rounds.roundWinner).toBe(-1);
  });
  it('player can lose (defeat)', () => {
    const sim = makeSim();
    toFight(sim);
    sim.fighters[0].hp = 1;
    place(sim, 100);
    run(sim, 40, 0, script([Btn.LP]));
    expect(sim.rounds.roundWinner).toBe(1);
  });
  it('finisher window opens on the deciding KO and can be skipped', () => {
    const sim = makeSim('raven', 'brute', { finishers: true, humanSlots: [0] });
    for (let r = 0; r < 2; r++) {
      toFight(sim);
      sim.fighters[1].hp = 1;
      place(sim, 100);
      run(sim, 30, script([Btn.LP]));
      if (r === 0) run(sim, 520);
    }
    run(sim, 200);
    expect(sim.rounds.phase).toBe('finisher');
    sim.skipFinisher();
    run(sim, 400);
    expect(sim.rounds.matchWinner).toBe(0);
  });
});

describe('AI', () => {
  it('every difficulty plays full matches without stalling', () => {
    for (const d of ['easy', 'normal', 'hard', 'nightmare'] as const) {
      const sim = makeSim('raven', 'vera', { humanSlots: [] });
      const a = new AIController(sim, 0, d, 1);
      const b = new AIController(sim, 1, d, 2);
      let hits = 0;
      for (let f = 0; f < 60 * 120 && sim.rounds.phase !== 'victory'; f++) {
        sim.step([a.poll(), b.poll()]);
        hits += sim.events.filter((e) => e.type === 'hit').length;
      }
      expect(hits).toBeGreaterThan(5);
      expect(sim.rounds.round).toBeGreaterThanOrEqual(1);
    }
  });
  it('all characters can fight each other with AI', () => {
    const ids = Object.keys(CHARACTERS);
    for (const p1 of ids) {
      const p2 = ids[(ids.indexOf(p1) + 1) % ids.length];
      const sim = makeSim(p1, p2, { humanSlots: [], bossFight: p2 === 'archon' });
      const a = new AIController(sim, 0, 'hard', 3);
      const b = new AIController(sim, 1, 'hard', 4);
      for (let f = 0; f < 60 * 40; f++) sim.step([a.poll(), b.poll()]);
      expect(Number.isFinite(sim.fighters[0].x)).toBe(true);
    }
  });
  it('AI only uses inputs: it never mutates fighter state directly', () => {
    const sim = makeSim('raven', 'brute', { humanSlots: [0] });
    const ai = new AIController(sim, 1, 'normal', 5);
    toFight(sim);
    const hp = sim.fighters[0].hp;
    for (let f = 0; f < 5; f++) {
      ai.poll();
    }
    expect(sim.fighters[0].hp).toBe(hp);
  });
  it('boss enters phase 2 at 50% health', () => {
    const sim = makeSim('raven', 'archon', { bossFight: true });
    toFight(sim);
    const boss = sim.fighters[1];
    expect(boss.phase).toBe(1);
    boss.hp = boss.maxHp * 0.49;
    run(sim, 3);
    expect(boss.phase).toBe(2);
    expect(boss.maxHp).toBe(2000);
  });
});

describe('save system', () => {
  it('saves and loads progress', () => {
    const st = mem();
    const m = new SaveManager(st);
    const p = m.loadGame();
    p.highestCombo = 12;
    m.saveGame(p);
    expect(new SaveManager(st).loadGame().highestCombo).toBe(12);
  });
  it('falls back to defaults on corrupted data', () => {
    const st = mem();
    st.setItem(SAVE_KEY, '{not json');
    expect(new SaveManager(st).loadGame().totalWins).toBe(0);
    st.setItem(SAVE_KEY, JSON.stringify({ totalWins: 'x', unlockedCharacters: 5, highestCombo: -4 }));
    const p = new SaveManager(st).loadGame();
    expect(p.totalWins).toBe(0);
    expect(p.unlockedCharacters.length).toBeGreaterThan(0);
  });
  it('resetSave clears; settings persist across stores', () => {
    const st = mem();
    const m = new SaveManager(st);
    const p = m.loadGame();
    p.totalWins = 4;
    m.saveGame(p);
    expect(m.resetSave().totalWins).toBe(0);
    const s1 = new SettingsStore(st);
    s1.set({ master: 0.3, reducedMotion: true });
    const s2 = new SettingsStore(st);
    expect(s2.get().master).toBe(0.3);
    expect(s2.get().reducedMotion).toBe(true);
  });
  it('arcade completion unlocks rewards', () => {
    const m = new SaveManager(mem());
    const { progress, reward } = completeArcade(m.loadGame(), getCharacter('raven'), 300);
    expect(progress.completedArcade).toBe(true);
    expect(progress.unlockedSkins).toContain('raven:ghost');
    expect(progress.nightmareUnlocked).toBe(true);
    expect(reward.archon).toBe(true);
  });
});

describe('arcade ladder', () => {
  it('has 4 unique opponents then the boss', () => {
    const r = createRun({ charId: 'raven', skin: 'default' }, 'normal', 7);
    expect(r.ladder.length).toBe(5);
    expect(new Set(r.ladder).size).toBe(5);
    expect(r.ladder).not.toContain('raven');
    expect(r.ladder[4]).toBe('archon');
    expect(fightConfig({ ...r, index: 4 }).bossFight).toBe(true);
  });
});

describe('facing and collision', () => {
  it('fighters face each other and cannot overlap', () => {
    const sim = makeSim();
    toFight(sim);
    run(sim, 200, Btn.RIGHT, Btn.LEFT);
    const [a, b] = sim.fighters;
    expect(a.facing).toBe(1);
    expect(b.facing).toBe(-1);
    expect(b.x - a.x).toBeGreaterThan((a.def.pushWidth + b.def.pushWidth) / 2 - 1);
    expect(a.state === FighterState.WALK || a.state === FighterState.IDLE).toBe(true);
  });
  it('stage walls keep fighters inside', () => {
    const sim = makeSim();
    toFight(sim);
    run(sim, 600, Btn.LEFT, 0);
    expect(sim.fighters[0].x).toBeGreaterThanOrEqual(-sim.stageHalf);
  });
});
