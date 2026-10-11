import { describe, expect, it } from 'vitest';
import { SaveManager, sanitizeProgress, type StorageLike } from './SaveManager';
import { sanitizeSettings, loadSettings, saveSettings } from './Settings';
import { Progression } from './Progression';

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe('save system', () => {
  it('saves and loads progress round-trip', () => {
    const storage = new MemoryStorage();
    const saves = new SaveManager(storage);
    const p = saves.loadGame();
    p.totalWins = 5;
    p.highestCombo = 9;
    expect(saves.saveGame(p)).toBe(true);
    const loaded = new SaveManager(storage).loadGame();
    expect(loaded.totalWins).toBe(5);
    expect(loaded.highestCombo).toBe(9);
  });

  it('falls back to defaults on corrupted JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('ironblood.save.v1', '{not json');
    const loaded = new SaveManager(storage).loadGame();
    expect(loaded.totalWins).toBe(0);
    expect(loaded.unlockedCharacters).toContain('raven');
  });

  it('repairs partially valid saves', () => {
    const p = sanitizeProgress({ totalWins: -3, unlockedCharacters: 'nope', highestCombo: 12 });
    expect(p.totalWins).toBe(0);
    expect(p.highestCombo).toBe(12);
    expect(p.unlockedCharacters.length).toBeGreaterThan(0);
  });

  it('resetSave clears stored progress', () => {
    const storage = new MemoryStorage();
    const saves = new SaveManager(storage);
    saves.saveGame({ ...saves.loadGame(), totalWins: 3 });
    saves.resetSave();
    expect(saves.loadGame().totalWins).toBe(0);
  });

  it('arcade completion unlocks nightmare, boss and a skin', () => {
    const storage = new MemoryStorage();
    const prog = new Progression(new SaveManager(storage));
    const rewards = prog.completeArcade('raven', 6000);
    expect(rewards.newDifficulty).toBe('NIGHTMARE');
    expect(rewards.newCharacters).toContain('archon');
    expect(prog.progress.completedArcade).toBe(true);
    const again = new Progression(new SaveManager(storage));
    expect(again.progress.unlockedDifficulties).toContain('nightmare');
  });
});

describe('settings', () => {
  it('sanitizes invalid values', () => {
    const s = sanitizeSettings({ audio: { master: 7, music: 'x' }, graphics: { quality: 'ultra' }, controls: { p1: { left: 'KeyA' } } });
    expect(s.audio.master).toBe(1);
    expect(s.audio.music).toBe(0.6);
    expect(s.graphics.quality).toBe('high');
    expect(s.controls.p1.LP).toBe('KeyJ');
  });

  it('persists through storage', () => {
    const storage = new MemoryStorage();
    const s = sanitizeSettings({});
    s.graphics.screenShake = false;
    saveSettings(s, storage);
    expect(loadSettings(storage).graphics.screenShake).toBe(false);
  });
});
