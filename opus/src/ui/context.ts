import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameServices } from '../game/Game';
import type { SaveData } from '../progression/SaveManager';

export const ServicesContext = createContext<GameServices | null>(null);

export const useServices = (): GameServices => {
  const s = useContext(ServicesContext);
  if (!s) throw new Error('GameServices missing');
  return s;
};

export const useSave = (): SaveData => {
  const s = useServices();
  return useSyncExternalStore(s.subscribe, s.getSnapshot);
};
