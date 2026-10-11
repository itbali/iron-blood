import type { CharacterDef } from '../combat/types';
import { ARCHON } from '../characters/Archon';
import { BRUTE } from '../characters/Brute';
import { KAI } from '../characters/Kai';
import { RAVEN } from '../characters/Raven';
import { TITAN } from '../characters/Titan';
import { VERA } from '../characters/Vera';
import { WRAITH } from '../characters/Wraith';

export const CHARACTERS: Record<string, CharacterDef> = {
  raven: RAVEN,
  vera: VERA,
  brute: BRUTE,
  kai: KAI,
  wraith: WRAITH,
  titan: TITAN,
  archon: ARCHON,
};

export const ROSTER_IDS = ['raven', 'vera', 'brute', 'kai', 'wraith', 'titan'] as const;

export function getCharacter(id: string): CharacterDef {
  const def = CHARACTERS[id];
  if (!def) {
    console.error(`Unknown character "${id}", falling back to raven`);
    return RAVEN;
  }
  return def;
}
