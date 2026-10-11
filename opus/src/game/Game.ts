import { AudioManager } from '../audio/AudioManager';
import { InputManager } from '../input/InputManager';
import type { SaveData } from '../progression/SaveManager';
import { loadGame, resetSave, saveGame } from '../progression/SaveManager';
import type { Settings } from '../progression/Settings';

type Listener = () => void;

/**
 * Long-lived services shared by every screen: input, audio and persistence.
 * Created once by the React root and passed down through context — no global singletons.
 */
export class GameServices {
  readonly input: InputManager;
  readonly audio = new AudioManager();
  private data: SaveData;
  private listeners = new Set<Listener>();

  constructor() {
    this.data = loadGame();
    this.input = new InputManager([this.data.settings.controls.p1, this.data.settings.controls.p2]);
    this.applyAudio();
  }

  get save(): SaveData {
    return this.data;
  }

  get settings(): Settings {
    return this.data.settings;
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): SaveData => this.data;

  /** Immutable update + persist; React re-renders via useSyncExternalStore. */
  update(mutator: (draft: SaveData) => void): void {
    const next: SaveData = structuredClone(this.data);
    mutator(next);
    this.data = next;
    saveGame(next);
    this.input.setBindings([next.settings.controls.p1, next.settings.controls.p2]);
    this.applyAudio();
    this.listeners.forEach((l) => l());
  }

  resetAll(): void {
    this.data = resetSave();
    saveGame(this.data);
    this.input.setBindings([this.data.settings.controls.p1, this.data.settings.controls.p2]);
    this.applyAudio();
    this.listeners.forEach((l) => l());
  }

  private applyAudio(): void {
    const a = this.data.settings.audio;
    this.audio.setVolumes(a.master, a.music, a.sfx);
  }
}
