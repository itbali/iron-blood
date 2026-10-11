import { audio } from '@/audio/AudioManager';
import { InputManager } from '@/input/InputManager';
import { progression } from '@/progression/Progression';
import { settingsStore } from '@/progression/Settings';

const initial = settingsStore.get();
export const inputManager = new InputManager(initial.controls.p1, initial.controls.p2);
settingsStore.subscribe(() => {
  const s = settingsStore.get();
  inputManager.setBindings(0, s.controls.p1);
  inputManager.setBindings(1, s.controls.p2);
  audio.applySettings(s.audio);
});
audio.applySettings(initial.audio);

export { audio, progression, settingsStore };

export const sfx = {
  hover: () => audio.play('menu-hover'),
  click: () => audio.play('menu-click'),
  back: () => audio.play('menu-back'),
  select: () => audio.play('select'),
};
