import type {
  CharacterDef, CharacterDialogue, CharacterStats, CharacterStyle, FinisherDef, MoveDef, SkinDef,
} from '../combat/types';
import { BASE_HP } from '../data/constants';
import { hurtboxesFor, standardMoves, type Tune } from '../data/moveFactory';

export interface BuildSpec {
  id: string;
  name: string;
  title: string;
  bio: string;
  weapon: string;
  styleText: string;
  stats: CharacterStats;
  height: number;
  pushWidth: number;
  tune: Omit<Tune, 'specials' | 'scale'> & { scale?: number };
  specials: MoveDef[];
  overrides?: Record<string, Partial<MoveDef>>;
  style: CharacterStyle;
  skins: SkinDef[];
  dialogue: CharacterDialogue;
  finisherNames: [string, string, string];
  finisherColor: string;
  playable?: boolean;
  boss?: boolean;
  healthOverride?: number;
  passiveArmor?: number;
  phase2?: { aggression: number };
  aiBias: { zoning: number; rushdown: number; grappler: number };
}

export function buildFinishers(names: [string, string, string], color: string): FinisherDef[] {
  return [
    { id: 'energy', name: names[0], kind: 'energy', seq: ['DOWN', 'DOWN', 'FWD'], button: 'sp1', duration: 200, color },
    { id: 'physical', name: names[1], kind: 'physical', seq: ['FWD', 'DOWN', 'FWD'], button: 'hp', duration: 190, color },
    { id: 'cinematic', name: names[2], kind: 'cinematic', seq: ['BACK', 'DOWN', 'BACK'], button: 'sp2', duration: 230, color },
  ];
}

export function buildCharacter(spec: BuildSpec): CharacterDef {
  const comboSpecials = spec.specials.filter((m) => (m.kind === 'special' || m.kind === 'super') && !m.chainOnly && !m.counter).map((m) => m.id);
  const tune: Tune = { ...spec.tune, scale: spec.tune.scale ?? spec.style.scale, specials: comboSpecials };
  const moves = standardMoves(tune);
  for (const m of spec.specials) moves[m.id] = m;
  if (spec.overrides) {
    for (const [id, patch] of Object.entries(spec.overrides)) {
      const base = moves[id];
      if (!base) continue;
      moves[id] = { ...base, ...patch, attack: { ...base.attack, ...(patch.attack ?? {}) } };
    }
  }
  const { speed, damage, health } = spec.stats;
  const walkSpeed = 1.2 + 0.4 * speed;
  return {
    id: spec.id,
    name: spec.name,
    title: spec.title,
    bio: spec.bio,
    weapon: spec.weapon,
    styleText: spec.styleText,
    stats: spec.stats,
    maxHealth: spec.healthOverride ?? Math.round(BASE_HP * (0.65 + 0.05 * health)),
    walkSpeed,
    backSpeed: walkSpeed * 0.78,
    jumpVel: 15 + 0.6 * speed,
    jumpForward: walkSpeed * 1.35,
    gravity: 0.9,
    damageMult: 0.65 + 0.05 * damage,
    height: spec.height,
    pushWidth: spec.pushWidth,
    hurtboxes: hurtboxesFor(spec.height, spec.pushWidth),
    moves,
    style: spec.style,
    skins: spec.skins,
    dialogue: spec.dialogue,
    finishers: buildFinishers(spec.finisherNames, spec.finisherColor),
    playable: spec.playable ?? true,
    boss: spec.boss,
    passiveArmor: spec.passiveArmor,
    phase2: spec.phase2,
    aiBias: spec.aiBias,
  };
}
