import { ARCHON } from '../characters/Archon';
import { BRUTE } from '../characters/Brute';
import type { CharacterDef } from '../characters/CharacterDef';
import { KAI } from '../characters/Kai';
import { RAVEN } from '../characters/Raven';
import { TITAN } from '../characters/Titan';
import { VERA } from '../characters/Vera';
import { WRAITH } from '../characters/Wraith';

/** Order of the character select grid. Adding a fighter = writing its data file and adding it here. */
export const ROSTER: readonly CharacterDef[] = [RAVEN, VERA, BRUTE, KAI, WRAITH, TITAN];
export const BOSS: CharacterDef = ARCHON;
export const ALL_CHARACTERS: readonly CharacterDef[] = [...ROSTER, ARCHON];

export const getCharacter = (id: string): CharacterDef => {
  const c = ALL_CHARACTERS.find((ch) => ch.id === id);
  if (!c) {
    console.error(`Unknown character "${id}", falling back to Raven`);
    return RAVEN;
  }
  return c;
};
