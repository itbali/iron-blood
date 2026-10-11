import type {
  HitboxDef,
  LockSequenceDef,
  LockStep,
  MoveDef,
  ProjectileDef,
} from '../combat/AttackData';
import type { NormalSlot } from '../characters/CharacterDef';
import { HITSTOP } from '../core/constants';

export type MoveInit = Partial<MoveDef> & Pick<MoveDef, 'id' | 'name'>;

const BASE: Omit<MoveDef, 'id' | 'name'> = {
  kind: 'normal',
  stance: 'stand',
  anim: 'punch_l',
  startup: 6,
  active: 3,
  recovery: 10,
  damage: 40,
  hitstun: 16,
  blockstun: 10,
  knockback: 3,
  pushback: 4,
  hitLevel: 'mid',
  hitboxes: [],
  strength: 'light',
  effect: 'strike',
  sfx: 'punch',
  meterGain: 3,
};

export const move = (init: MoveInit): MoveDef => ({ ...BASE, ...init });

/**
 * Shared frame-data templates for normals. Characters scale reach/speed/damage and
 * override individual fields, so all six fighters share one CombatSystem but differ in feel.
 */
const NORMAL_TEMPLATES: Record<NormalSlot, MoveInit> = {
  lp: {
    id: 'lp', name: 'Jab', anim: 'punch_l', startup: 5, active: 3, recovery: 9, damage: 40, hitstun: 17, blockstun: 11,
    knockback: 2.5, pushback: 3.5, hitLevel: 'high', strength: 'light', sfx: 'punch',
    hitboxes: [{ x: 18, y: 120, w: 72, h: 26 }], cancelInto: ['lp', 'hp', 'lk', 'special', 'super'],
  },
  hp: {
    id: 'hp', name: 'Heavy Straight', anim: 'punch_h', startup: 10, active: 4, recovery: 18, damage: 90, hitstun: 24, blockstun: 16,
    knockback: 5.5, pushback: 6, hitLevel: 'high', strength: 'heavy', sfx: 'heavy', meterGain: 6,
    hitboxes: [{ x: 20, y: 112, w: 88, h: 34 }], cancelInto: ['special', 'super'],
  },
  lk: {
    id: 'lk', name: 'Snap Kick', anim: 'kick_l', startup: 7, active: 3, recovery: 12, damage: 50, hitstun: 18, blockstun: 12,
    knockback: 3.5, pushback: 4.5, hitLevel: 'mid', strength: 'medium', sfx: 'kick',
    hitboxes: [{ x: 16, y: 55, w: 92, h: 34 }], cancelInto: ['hp', 'hk', 'special', 'super'],
  },
  hk: {
    id: 'hk', name: 'Roundhouse', anim: 'kick_h', startup: 12, active: 4, recovery: 20, damage: 100, hitstun: 22, blockstun: 16,
    knockback: 8, pushback: 7, hitLevel: 'high', strength: 'heavy', sfx: 'heavy', launch: 0, meterGain: 6,
    hitboxes: [{ x: 18, y: 108, w: 104, h: 44 }], cancelInto: ['special', 'super'],
  },
  clp: {
    id: 'clp', name: 'Low Jab', stance: 'crouch', anim: 'cpunch_l', startup: 5, active: 3, recovery: 9, damage: 35, hitstun: 16, blockstun: 10,
    knockback: 2.5, pushback: 3.5, hitLevel: 'mid', strength: 'light', sfx: 'punch',
    hitboxes: [{ x: 18, y: 62, w: 72, h: 24 }], cancelInto: ['clp', 'clk', 'chp', 'special', 'super'],
  },
  chp: {
    id: 'chp', name: 'Uppercut', stance: 'crouch', anim: 'uppercut', startup: 9, active: 5, recovery: 20, damage: 95, hitstun: 30, blockstun: 15,
    knockback: 3, pushback: 6, hitLevel: 'mid', strength: 'heavy', sfx: 'heavy', launch: 15, knockdown: true, antiAir: true, meterGain: 6,
    hitboxes: [{ x: 6, y: 70, w: 62, h: 130 }], cancelInto: ['special', 'super'],
  },
  clk: {
    id: 'clk', name: 'Shin Kick', stance: 'crouch', anim: 'ckick_l', startup: 6, active: 3, recovery: 11, damage: 40, hitstun: 16, blockstun: 11,
    knockback: 3, pushback: 4, hitLevel: 'low', strength: 'light', sfx: 'kick',
    hitboxes: [{ x: 16, y: 0, w: 96, h: 30 }], cancelInto: ['clp', 'chp', 'chk', 'special', 'super'],
  },
  chk: {
    id: 'chk', name: 'Sweep', stance: 'crouch', anim: 'sweep', startup: 11, active: 4, recovery: 24, damage: 80, hitstun: 30, blockstun: 14,
    knockback: 4, pushback: 6, hitLevel: 'low', strength: 'heavy', sfx: 'kick', launch: 5, knockdown: true, meterGain: 5,
    hitboxes: [{ x: 10, y: 0, w: 120, h: 30 }], cancelInto: ['super'],
  },
  jlp: {
    id: 'jlp', name: 'Air Jab', stance: 'air', anim: 'jpunch', startup: 5, active: 6, recovery: 6, damage: 45, hitstun: 18, blockstun: 12,
    knockback: 3, pushback: 4, hitLevel: 'mid', strength: 'light', sfx: 'punch',
    hitboxes: [{ x: 14, y: 50, w: 66, h: 44 }],
  },
  jhp: {
    id: 'jhp', name: 'Hammer Fist', stance: 'air', anim: 'jpunch_h', startup: 8, active: 6, recovery: 8, damage: 85, hitstun: 22, blockstun: 15,
    knockback: 4.5, pushback: 5, hitLevel: 'mid', strength: 'heavy', sfx: 'heavy', meterGain: 5,
    hitboxes: [{ x: 8, y: 20, w: 78, h: 64 }],
  },
  jlk: {
    id: 'jlk', name: 'Knee', stance: 'air', anim: 'jkick', startup: 5, active: 7, recovery: 6, damage: 50, hitstun: 18, blockstun: 12,
    knockback: 3, pushback: 4, hitLevel: 'mid', strength: 'medium', sfx: 'kick',
    hitboxes: [{ x: 16, y: 20, w: 66, h: 46 }],
  },
  jhk: {
    id: 'jhk', name: 'Flying Kick', stance: 'air', anim: 'jkick_h', startup: 8, active: 8, recovery: 8, damage: 90, hitstun: 22, blockstun: 15,
    knockback: 6, pushback: 6, hitLevel: 'mid', strength: 'heavy', sfx: 'heavy', meterGain: 5,
    hitboxes: [{ x: 14, y: 0, w: 98, h: 48 }],
  },
};

export interface NormalTuning {
  reach?: number;
  /** Frames added to startup/recovery (negative = faster). */
  speed?: number;
  damage?: number;
  overrides?: Partial<Record<NormalSlot, Partial<MoveDef>>>;
}

const scaleBoxes = (boxes: HitboxDef[], reach: number): HitboxDef[] =>
  boxes.map((b) => ({ ...b, w: Math.round(b.w * reach) }));

export const buildNormals = (t: NormalTuning = {}): Record<NormalSlot, MoveDef> => {
  const reach = t.reach ?? 1;
  const speed = t.speed ?? 0;
  const dmg = t.damage ?? 1;
  const out = {} as Record<NormalSlot, MoveDef>;
  for (const slot of Object.keys(NORMAL_TEMPLATES) as NormalSlot[]) {
    const tpl = NORMAL_TEMPLATES[slot];
    const base = move(tpl);
    const tuned: MoveDef = {
      ...base,
      startup: Math.max(3, base.startup + speed),
      recovery: Math.max(4, base.recovery + speed),
      damage: Math.round(base.damage * dmg),
      hitboxes: scaleBoxes(base.hitboxes, reach),
    };
    out[slot] = { ...tuned, ...(t.overrides?.[slot] ?? {}) };
  }
  return out;
};

export const projectile = (p: Omit<ProjectileDef, 'attack'> & { attack: Partial<ProjectileDef['attack']> }): ProjectileDef => ({
  ...p,
  attack: {
    startup: 0,
    active: p.lifetime,
    recovery: 0,
    damage: 60,
    hitstun: 20,
    blockstun: 14,
    knockback: 4,
    pushback: 5,
    hitLevel: 'mid',
    ...p.attack,
  },
});

/** Standard throw sequence: pull in, a couple of strikes, then hurl the opponent away. */
export const throwLock = (id: string, damage: number, opts: { swap?: boolean; style?: 'slam' | 'toss' | 'knee' } = {}): LockSequenceDef => {
  const style = opts.style ?? 'toss';
  const steps: LockStep[] =
    style === 'knee'
      ? [
          { frame: 0, offsetX: 52, offsetY: 0, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'grab' },
          { frame: 12, damage: Math.round(damage * 0.3), strength: 'medium', attackerAnim: 'knee', sfx: 'kick', offsetX: 48 },
          { frame: 24, damage: Math.round(damage * 0.3), strength: 'medium', attackerAnim: 'knee', sfx: 'kick' },
          { frame: 38, damage: Math.round(damage * 0.4), strength: 'heavy', attackerAnim: 'punch_h', sfx: 'throw', shake: 8 },
        ]
      : style === 'slam'
        ? [
            { frame: 0, offsetX: 50, offsetY: 0, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'grab' },
            { frame: 14, offsetX: 10, offsetY: 120, attackerAnim: 'lift', defenderAnim: 'thrown_up' },
            { frame: 30, offsetX: -60, offsetY: 0, damage, strength: 'heavy', attackerAnim: 'slam', defenderAnim: 'knockdown', sfx: 'throw', shake: 10, blood: 10 },
          ]
        : [
            { frame: 0, offsetX: 50, offsetY: 0, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'grab' },
            { frame: 16, damage: Math.round(damage * 0.4), strength: 'medium', attackerAnim: 'punch_h', sfx: 'punch', offsetX: 46 },
            { frame: 30, damage: Math.round(damage * 0.6), strength: 'heavy', attackerAnim: 'throw', defenderAnim: 'thrown_up', offsetX: 30, offsetY: 30, sfx: 'throw', shake: 7 },
          ];
  return {
    id,
    duration: style === 'slam' ? 44 : 44,
    steps,
    release: { knockback: 8, launch: 9, knockdown: true, swapSides: opts.swap ?? style === 'slam' },
  };
};

export const throwMove = (id: string, damage: number, style: 'slam' | 'toss' | 'knee' = 'toss'): MoveDef =>
  move({
    id: 'throw',
    name: 'Throw',
    kind: 'grab',
    anim: 'grab',
    startup: 5,
    active: 3,
    recovery: 26,
    damage: 0,
    hitstun: 0,
    blockstun: 0,
    knockback: 0,
    pushback: 0,
    hitLevel: 'unblockable',
    strength: 'heavy',
    sfx: 'grab',
    whiffSfx: 'whoosh',
    grab: true,
    hitboxes: [{ x: 10, y: 50, w: 62, h: 100 }],
    lock: throwLock(`${id}-throw`, damage, { style }),
    meterGain: 5,
  });

export const STRENGTH_HITSTOP = {
  light: HITSTOP.light,
  medium: Math.round((HITSTOP.light + HITSTOP.heavy) / 2),
  heavy: HITSTOP.heavy,
  special: HITSTOP.special,
  super: HITSTOP.special,
} as const;
