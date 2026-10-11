import type { EffectStyle, LockSequenceDef, LockStep } from '../combat/AttackData';
import type { FinisherDef } from '../characters/CharacterDef';

/** Energy finisher: the loser is overloaded with energy and disintegrates into embers. */
export const energyFinisher = (id: string, name: string, effect: EffectStyle, anim = 'cast'): FinisherDef => ({
  id,
  name,
  type: 'energy',
  motion: ['D', 'D'],
  button: 's1',
  notation: '↓ ↓ I',
  range: Infinity,
  lock: {
    id,
    duration: 170,
    cinematic: true,
    darken: true,
    finisherOutcome: 'disintegrate',
    steps: [
      { frame: 0, offsetX: 170, attackerAnim: 'charge', defenderAnim: 'dazed', zoom: 1.5, sfx: 'charge', text: name.toUpperCase() },
      { frame: 40, attackerAnim: anim, sfx: 'projectile', effect, strength: 'special', zoom: 1.7 },
      { frame: 56, defenderAnim: 'energy_lift', offsetY: 40, effect, strength: 'super', sfx: 'superhit', flash: true, shake: 8, slowmo: 30 },
      { frame: 100, offsetY: 60, effect, strength: 'super', sfx: 'superhit', flash: true, shake: 14, zoom: 1.25 },
      { frame: 130, defenderAnim: 'dissolve' },
    ],
    release: { knockback: 0, launch: 0, knockdown: false },
  },
});

/** Physical finisher: close-range brutal sequence ending in a slam. */
export const physicalFinisher = (id: string, name: string, anims: [string, string, string] = ['punch_h', 'kick_h', 'slam']): FinisherDef => ({
  id,
  name,
  type: 'physical',
  motion: ['B', 'F'],
  button: 's2',
  notation: '← → O',
  range: 300,
  lock: {
    id,
    duration: 140,
    cinematic: true,
    finisherOutcome: 'collapse',
    steps: [
      { frame: 0, offsetX: 58, attackerAnim: 'grab_hold', defenderAnim: 'dazed', zoom: 1.5, sfx: 'grab', text: name.toUpperCase() },
      { frame: 20, attackerAnim: anims[0], strength: 'heavy', sfx: 'heavy', shake: 6, blood: 12 },
      { frame: 42, attackerAnim: anims[1], strength: 'heavy', sfx: 'heavy', shake: 8, blood: 12 },
      { frame: 64, offsetY: 100, attackerAnim: 'lift', defenderAnim: 'thrown_up' },
      { frame: 88, offsetX: -70, offsetY: 0, attackerAnim: anims[2], defenderAnim: 'knockdown', strength: 'super', sfx: 'throw', flash: true, shake: 14, slowmo: 20, blood: 34 },
    ],
    release: { knockback: 0, launch: 0, knockdown: true },
  },
});

/** Cinematic finisher with a teleport flurry. */
export const cinematicFinisher = (id: string, name: string, effect: EffectStyle): FinisherDef => ({
  id,
  name,
  type: 'cinematic',
  motion: ['B', 'F'],
  button: 's2',
  notation: '← → O',
  range: Infinity,
  lock: {
    id,
    duration: 170,
    cinematic: true,
    darken: true,
    finisherOutcome: 'shatter',
    steps: [
      { frame: 0, offsetX: 120, attackerAnim: 'teleport_out', defenderAnim: 'dazed', zoom: 1.6, sfx: 'teleport', text: name.toUpperCase() },
      { frame: 30, attackerSide: -1, attackerAnim: 'claw', effect, strength: 'heavy', sfx: 'slash', blood: 12, shake: 5 },
      { frame: 52, attackerSide: 1, attackerAnim: 'claw', effect, strength: 'heavy', sfx: 'slash', blood: 12, shake: 5 },
      { frame: 74, attackerSide: -1, attackerAnim: 'claw', effect, strength: 'heavy', sfx: 'slash', blood: 12, shake: 5 },
      { frame: 104, attackerSide: 1, attackerAnim: 'slash_finish', effect, strength: 'super', sfx: 'superhit', flash: true, slowmo: 30, shake: 14, blood: 40, zoom: 1.9 },
      { frame: 140, defenderAnim: 'collapse' },
    ],
    release: { knockback: 0, launch: 0, knockdown: true },
  },
});

/** Generic cinematic super: alternating-side flurry ending with a big launcher. */
export const flurryLock = (
  id: string,
  opts: { hits: number; hitDamage: number; finalDamage: number; effect: EffectStyle; anims: string[]; finalAnim: string; teleport?: boolean },
): LockSequenceDef => {
  const steps: LockStep[] = [];
  const interval = 10;
  for (let i = 0; i < opts.hits; i++) {
    steps.push({
      frame: i * interval,
      offsetX: i === 0 ? 62 : undefined,
      attackerSide: opts.teleport ? (i % 2 === 0 ? 1 : -1) : undefined,
      damage: opts.hitDamage,
      strength: i < 2 ? 'medium' : 'heavy',
      effect: opts.effect,
      attackerAnim: opts.anims[i % opts.anims.length],
      defenderAnim: 'hit',
      sfx: i % 2 ? 'punch' : 'kick',
      zoom: i === 0 ? 1.3 : undefined,
      blood: i % 3 === 2 ? 5 : undefined,
    });
  }
  const end = opts.hits * interval;
  steps.push({ frame: end + 4, attackerSide: opts.teleport ? 1 : undefined, attackerAnim: 'charge', sfx: 'charge', zoom: 1.5 });
  steps.push({
    frame: end + 20,
    offsetY: 40,
    damage: opts.finalDamage,
    strength: 'super',
    effect: opts.effect,
    attackerAnim: opts.finalAnim,
    defenderAnim: 'hit_air',
    sfx: 'superhit',
    flash: true,
    shake: 11,
    slowmo: 18,
    blood: 20,
  });
  return {
    id,
    duration: end + 34,
    cinematic: true,
    darken: true,
    steps,
    release: { knockback: 11, launch: 12, knockdown: true },
  };
};
