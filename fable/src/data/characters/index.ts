import type { CharacterConfig } from '@/characters/CharacterConfig';
import type { CharacterId } from '@/core/types';
import { archon } from './archon';
import { brute } from './brute';
import { kai } from './kai';
import { raven } from './raven';
import { titan } from './titan';
import { vera } from './vera';
import { wraith } from './wraith';

/** Registry of every fighter. Adding a character means adding one config here. */
export const CHARACTERS: Record<CharacterId, CharacterConfig> = { raven, vera, brute, kai, wraith, titan, archon };

/** Order used by the character select grid. */
export const ROSTER: CharacterId[] = ['raven', 'vera', 'brute', 'kai', 'wraith', 'titan'];

export const BOSS_ID: CharacterId = 'archon';

export const getCharacter = (id: CharacterId): CharacterConfig => CHARACTERS[id];
