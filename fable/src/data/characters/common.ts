import type { CharacterConfig, CharacterPalette } from '@/characters/CharacterConfig';

/** The unlockable crimson skin: blood-red armor with the character's own skin tone and silhouette. */
export const crimsonPalette = (base: CharacterPalette): CharacterPalette => ({
  ...base,
  primary: '#2a090d',
  secondary: '#6a1118',
  accent: '#ff2a3c',
  glow: '#ff5060',
  hair: '#120406',
});
import type { Rect } from '@/core/types';

/** Hurtboxes derived from a body height so every character shares head/body/legs zones. */
export const standardHurtboxes = (height: number, width: number): CharacterConfig['hurtboxes'] => {
  const headR = height * 0.13;
  const stand: Rect[] = [
    { x: 4, y: height - headR, w: headR * 2, h: headR * 2 },
    { x: 0, y: height * 0.56, w: width, h: height * 0.36 },
    { x: 0, y: height * 0.19, w: width * 0.85, h: height * 0.38 },
  ];
  const crouch: Rect[] = [
    { x: 8, y: height * 0.55, w: headR * 2, h: headR * 2 },
    { x: 0, y: height * 0.3, w: width, h: height * 0.32 },
    { x: 0, y: height * 0.1, w: width * 0.9, h: height * 0.2 },
  ];
  const air: Rect[] = [
    { x: 4, y: height * 0.74, w: headR * 2, h: headR * 2 },
    { x: 0, y: height * 0.42, w: width, h: height * 0.52 },
  ];
  const down: Rect[] = [{ x: -10, y: height * 0.12, w: width * 1.9, h: height * 0.24 }];
  return { stand, crouch, air, down };
};
