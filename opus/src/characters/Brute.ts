import { buildNormals, move, projectile, throwMove } from '../data/attacks';
import { cinematicFinisher, physicalFinisher } from '../data/finishers';
import type { CharacterDef } from './CharacterDef';
import { derivePhysique } from './CharacterDef';

const stats = { speed: 3, damage: 10, health: 10, difficulty: 'Easy' } as const;

export const BRUTE: CharacterDef = {
  id: 'brute',
  name: 'Brute',
  title: 'The Furnace Mutant',
  faction: 'Slag Pits',
  bio: 'Grown in a chemical vat beneath the foundries, Brute was bred as a living demolition machine. He does not understand the tournament — only that the crowd screams when he breaks things.',
  stats,
  maxHealth: 1000,
  physique: derivePhysique(stats, { scale: 1.22, jump: 14.6, gravity: 1.08, weight: 0.72, pushWidth: 74, armor: 0.05 }),
  visual: {
    palette: { skin: '#7d8b5a', hair: '#262117', primary: '#2a221b', secondary: '#5a4a3a', trim: '#8a7360', glow: '#ff7a1a', eye: '#ffb02e' },
    altPalette: { skin: '#8a6b8f', primary: '#1c2421', secondary: '#3c5a4c', glow: '#7dff3a', eye: '#c4ff6a' },
    build: { torso: 70, torsoW: 66, upperArm: 38, foreArm: 38, thigh: 40, shin: 40, armW: 25, legW: 25, headR: 15, shoulderW: 34 },
    head: 'bald',
    extras: ['mutant', 'spikes'],
    victoryPose: 'flex',
    defeatPose: 'faceplant',
    idleStyle: 'brute',
  },
  normals: buildNormals({
    reach: 1.25,
    speed: 2,
    damage: 1.25,
    overrides: {
      lp: { cancelInto: ['hp', 'special', 'super'], effect: 'blunt' },
      hp: { name: 'Sledge', armor: { from: 1, to: 9, hits: 1 }, effect: 'blunt', knockback: 7 },
      hk: { name: 'Mule Kick', effect: 'blunt', knockback: 10 },
      chp: { name: 'Gut Rip', effect: 'blunt' },
    },
  }),
  specials: [
    move({
      id: 'groundPound', name: 'Ground Pound', kind: 'special', anim: 'ground_pound', startup: 16, active: 2, recovery: 22,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'low', strength: 'special', effect: 'blunt',
      sfx: 'slam', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'brute-quake', visual: 'wave', color: '#ff7a1a', speed: 9, spawnX: 70, spawnY: 0, w: 70, h: 44, lifetime: 70, grounded: true,
        strength: 'heavy', effect: 'blunt',
        attack: { damage: 80, hitstun: 26, blockstun: 16, knockback: 5, pushback: 8, hitLevel: 'low' },
        launch: 9, knockdown: true,
      }),
    }),
    move({
      id: 'bullRush', name: 'Bull Rush', kind: 'special', anim: 'shoulder', startup: 10, active: 14, recovery: 22,
      damage: 115, hitstun: 26, blockstun: 16, knockback: 13, pushback: 12, hitLevel: 'mid', strength: 'special', effect: 'blunt',
      sfx: 'charge', motion: [{ frame: 8, vx: 12, until: 24 }], armor: { from: 1, to: 22, hits: 1 }, launch: 6, knockdown: true,
      hitboxes: [{ x: 10, y: 60, w: 90, h: 110 }], trail: '#ff7a1a', meterGain: 8,
    }),
    move({
      id: 'boneCrusher', name: 'Bonecrusher', kind: 'special', anim: 'lunge_grab', startup: 9, active: 5, recovery: 32,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'unblockable', strength: 'special', effect: 'blunt',
      sfx: 'grab', whiffSfx: 'whoosh', grab: true, hitboxes: [{ x: 10, y: 40, w: 110, h: 130 }], meterGain: 8,
      lock: {
        id: 'brute-bonecrusher', duration: 76, cinematic: true,
        steps: [
          { frame: 0, offsetX: 66, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'grab', zoom: 1.25 },
          { frame: 14, offsetX: 20, offsetY: 150, attackerAnim: 'lift', defenderAnim: 'thrown_up' },
          { frame: 30, offsetX: 70, offsetY: 0, damage: 90, strength: 'heavy', effect: 'blunt', attackerAnim: 'slam', defenderAnim: 'knockdown', sfx: 'throw', shake: 10, blood: 10 },
          { frame: 44, offsetX: 20, offsetY: 150, attackerAnim: 'lift', defenderAnim: 'thrown_up' },
          { frame: 60, offsetX: -80, offsetY: 0, damage: 120, strength: 'special', effect: 'blunt', attackerAnim: 'slam', defenderAnim: 'knockdown', sfx: 'throw', shake: 14, slowmo: 10, blood: 16 },
        ],
        release: { knockback: 5, launch: 6, knockdown: true, swapSides: true },
      },
    }),
    move({
      id: 'hammerDrop', name: 'Hammer Drop', kind: 'special', anim: 'overhead', startup: 18, active: 4, recovery: 20,
      damage: 130, hitstun: 26, blockstun: 18, knockback: 6, pushback: 10, hitLevel: 'mid', strength: 'special', effect: 'blunt',
      sfx: 'slam', armor: { from: 1, to: 16, hits: 1 }, knockdown: true, launch: 4,
      hitboxes: [{ x: 20, y: 0, w: 110, h: 150 }], meterGain: 7,
    }),
    move({
      id: 'boulderToss', name: 'Boulder Toss', kind: 'special', anim: 'toss', startup: 18, active: 2, recovery: 22,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'blunt',
      sfx: 'heavy', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'brute-boulder', visual: 'orb', color: '#6b5a48', speed: 9, vy: 11, gravity: 0.45, spawnX: 40, spawnY: 170, w: 56, h: 56, lifetime: 90,
        strength: 'heavy', effect: 'blunt',
        attack: { damage: 95, hitstun: 26, blockstun: 16, knockback: 7, pushback: 8, hitLevel: 'mid' },
        knockdown: true, launch: 7,
      }),
    }),
  ],
  specialInputs: [
    { move: 'bullRush', motion: ['F', 'N', 'F'], button: 's1', notation: '→ → I' },
    { move: 'boulderToss', motion: ['D', 'F'], button: 's1', notation: '↓ → I' },
    { move: 'boneCrusher', motion: ['D', 'B'], button: 's2', notation: '↓ ← O' },
    { move: 'groundPound', motion: [], button: 's1', notation: 'I' },
    { move: 'hammerDrop', motion: [], button: 's2', notation: 'O' },
  ],
  superMove: move({
    id: 'meatGrinder', name: 'Meat Grinder', kind: 'super', anim: 'lunge_grab', startup: 6, active: 8, recovery: 34, superFreeze: 40,
    damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'unblockable', strength: 'super', effect: 'blunt',
    sfx: 'super', grab: true, motion: [{ frame: 2, vx: 14, until: 12 }], invuln: [1, 8], meterCost: 100, meterGain: 0,
    hitboxes: [{ x: 0, y: 30, w: 130, h: 150 }],
    lock: {
      id: 'brute-meat-grinder', duration: 120, cinematic: true, darken: true,
      steps: [
        { frame: 0, offsetX: 66, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'grab', zoom: 1.3 },
        { frame: 12, damage: 40, strength: 'heavy', effect: 'blunt', attackerAnim: 'punch_h', sfx: 'heavy', blood: 6 },
        { frame: 24, damage: 40, strength: 'heavy', effect: 'blunt', attackerAnim: 'punch_h', sfx: 'heavy', blood: 6 },
        { frame: 36, damage: 40, strength: 'heavy', effect: 'blunt', attackerAnim: 'punch_h', sfx: 'heavy', blood: 6 },
        { frame: 52, offsetX: 10, offsetY: 170, attackerAnim: 'lift', defenderAnim: 'thrown_up', sfx: 'charge', zoom: 1.5 },
        { frame: 76, offsetX: 70, offsetY: 0, damage: 90, strength: 'heavy', effect: 'blunt', attackerAnim: 'slam', defenderAnim: 'knockdown', sfx: 'throw', shake: 10 },
        { frame: 100, damage: 120, strength: 'super', effect: 'blunt', attackerAnim: 'stomp', sfx: 'superhit', flash: true, shake: 14, slowmo: 16, blood: 24 },
      ],
      release: { knockback: 9, launch: 9, knockdown: true },
    },
  }),
  throwMove: throwMove('brute', 150, 'slam'),
  finishers: [cinematicFinisher('brute-earthbreaker', 'Earthbreaker', 'blunt'), physicalFinisher('brute-ragdoll', 'Rag Doll', ['punch_h', 'punch_h', 'slam'])],
  comboRoutes: ['J → K', 'J → ↓→I', 'K (armor) → →→I', '↓L → ↓K'],
  strengths: ['Massive damage', 'Armored attacks absorb a hit', 'Toughest body in the roster'],
  weaknesses: ['Slowest walk and jump', 'Huge hurtbox, easy to combo', 'Projectiles keep him out'],
  dialogue: {
    introLines: ['BRUTE SMASH SMALL MAN.', 'Crowd wants bones.', 'You smell like fear.'],
    victoryLines: ['MORE!', 'Brute still hungry.', 'Small man broke.'],
    defeatLines: ['Brute... tired...', 'Hurts... good.'],
    taunts: ['RRAAAH!'],
  },
};
