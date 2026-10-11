import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AudioManager } from '../audio/AudioManager';
import { InputManager } from '../input/InputManager';
import { SaveManager, saveManager, type PlayerProgress } from '../progression/SaveManager';
import { SettingsStore, settingsStore, type Settings } from '../progression/Settings';

export interface Services {
  audio: AudioManager;
  input: InputManager;
  settings: SettingsStore;
  save: SaveManager;
}

const Ctx = createContext<Services | null>(null);

export function createServices(): Services {
  const input = new InputManager();
  input.setBindings(settingsStore.get().bindings);
  return { audio: new AudioManager(), input, settings: settingsStore, save: saveManager };
}

export function ServicesProvider({ value, children }: { value: Services; children: ReactNode }): JSX.Element {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useServices(): Services {
  const s = useContext(Ctx);
  if (!s) throw new Error('Services missing');
  return s;
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const { settings } = useServices();
  const value = useSyncExternalStore(
    (cb) => settings.subscribe(cb),
    () => settings.get(),
  );
  return [value, (patch) => settings.set(patch)];
}

export function useProgress(): [PlayerProgress, (p: PlayerProgress) => void] {
  const { save } = useServices();
  const [p, setP] = useState(() => save.get());
  useEffect(() => setP(save.get()), [save]);
  return [
    p,
    (next) => {
      save.saveGame(next);
      setP(next);
    },
  ];
}

export function useSfx(): { hover: () => void; click: () => void } {
  const { audio } = useServices();
  return {
    hover: () => audio.play('menu-hover'),
    click: () => audio.play('menu-click'),
  };
}
