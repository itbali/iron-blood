import { describe, expect, it } from 'vitest';
import { applyArcadeClear, recordMatch } from './Progression';
import { defaultSave, loadGame, resetSave, SAVE_KEY, saveGame, type StorageLike } from './SaveManager';

const memory = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

describe('save system', () => {
  it('round-trips settings and progress', () => {
    const st = memory();
    const save = defaultSave();
    save.settings.audio.music = 0.25;
    save.settings.controls.p1.lp = ['KeyU'];
    recordMatch(save.progress, true, 12, 900, true);
    expect(saveGame(save, st)).toBe(true);
    const loaded = loadGame(st);
    expect(loaded.settings.audio.music).toBe(0.25);
    expect(loaded.settings.controls.p1.lp).toEqual(['KeyU']);
    expect(loaded.progress.highestCombo).toBe(12);
    expect(loaded.progress.totalWins).toBe(1);
    expect(loaded.progress.finishersPerformed).toBe(1);
  });

  it('falls back to defaults on corrupted JSON', () => {
    const st = memory();
    st.setItem(SAVE_KEY, '{not json');
    expect(loadGame(st)).toEqual(defaultSave());
  });

  it('falls back to defaults on a wrong version or shape', () => {
    const st = memory();
    st.setItem(SAVE_KEY, JSON.stringify({ version: 99 }));
    expect(loadGame(st)).toEqual(defaultSave());
    st.setItem(SAVE_KEY, JSON.stringify([1, 2, 3]));
    expect(loadGame(st)).toEqual(defaultSave());
  });

  it('fills missing fields of an older partial save with defaults', () => {
    const st = memory();
    st.setItem(SAVE_KEY, JSON.stringify({ version: 1, progress: { totalWins: 7 }, settings: { audio: { master: 0.3 } } }));
    const loaded = loadGame(st);
    expect(loaded.progress.totalWins).toBe(7);
    expect(loaded.progress.unlockedCharacters.length).toBeGreaterThan(0);
    expect(loaded.settings.audio.master).toBe(0.3);
    expect(loaded.settings.audio.sfx).toBe(defaultSave().settings.audio.sfx);
    expect(loaded.settings.controls.p1.block).toEqual(['Space']);
  });

  it('reset clears storage', () => {
    const st = memory();
    saveGame(defaultSave(), st);
    resetSave(st);
    expect(st.data.has(SAVE_KEY)).toBe(false);
  });

  it('arcade clear unlocks skin, nightmare, concept art and the boss', () => {
    const p = defaultSave().progress;
    const u = applyArcadeClear(p, 'raven', 400);
    expect(u).toEqual({ skin: 'raven:alt', difficulty: 'nightmare', art: 'art:raven', character: 'archon' });
    expect(p.completedArcade).toBe(true);
    expect(applyArcadeClear(p, 'raven', 500).skin).toBeNull();
    expect(p.bestArcadeTimeSeconds).toBe(400);
  });
});
