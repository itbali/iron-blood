import { buildNormals, move, projectile, throwMove } from '../data/attacks';
import { energyFinisher, flurryLock, physicalFinisher } from '../data/finishers';
import type { CharacterDef } from './CharacterDef';
import { derivePhysique } from './CharacterDef';

const stats = { speed: 10, damage: 5, health: 5, difficulty: 'Hard' } as const;

export const VERA: CharacterDef = {
  id: 'vera',
  name: 'Vera',
  title: 'The Silent Circuit',
  faction: 'Kestrel Syndicate',
  bio: 'A cybernetic assassin rebuilt after a contract went wrong. Half her nervous system is fibre-optic; she phases through space with a stolen displacement core and fires monomolecular needles.',
  stats,
  maxHealth: 1000,
  physique: derivePhysique(stats, { scale: 0.94, jump: 16.2, weight: 1.12, pushWidth: 46 }),
  visual: {
    palette: { skin: '#d9b9a6', hair: '#d8dde6', primary: '#1d2230', secondary: '#4b5670', trim: '#9fb3d1', glow: '#2fd9ff', eye: '#7af2ff' },
    altPalette: { primary: '#2a0f22', secondary: '#7b2350', glow: '#ff3fa4', eye: '#ff8fd0' },
    build: { torso: 58, torsoW: 36, upperArm: 33, foreArm: 31, thigh: 46, shin: 46, armW: 11, legW: 14, headR: 13, shoulderW: 14 },
    head: 'visor',
    extras: ['cyberArm'],
    victoryPose: 'hair_flip',
    defeatPose: 'collapse_side',
    idleStyle: 'stalker',
  },
  normals: buildNormals({
    reach: 0.95,
    speed: -1,
    damage: 0.9,
    overrides: {
      lp: { cancelInto: ['lp', 'lk', 'hp', 'special', 'super'] },
      lk: { cancelInto: ['lk', 'hk', 'hp', 'special', 'super'], effect: 'electric' },
      hk: { name: 'Arc Heel', effect: 'electric' },
    },
  }),
  specials: [
    move({
      id: 'voltLash', name: 'Volt Lash', kind: 'special', anim: 'whip', startup: 9, active: 4, recovery: 18,
      damage: 70, hitstun: 22, blockstun: 14, knockback: 6, pushback: 8, hitLevel: 'mid', strength: 'special', effect: 'electric',
      sfx: 'zap', hitboxes: [{ x: 30, y: 90, w: 150, h: 34 }], meterGain: 6,
    }),
    move({
      id: 'needleStorm', name: 'Needle Storm', kind: 'special', anim: 'cast', startup: 10, active: 2, recovery: 18,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'electric',
      sfx: 'projectile', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'vera-needles', visual: 'needle', color: '#2fd9ff', speed: 18, spawnX: 50, spawnY: 112, w: 46, h: 14, lifetime: 70,
        strength: 'medium', effect: 'electric', count: 3, spread: 22,
        attack: { damage: 22, hitstun: 16, blockstun: 10, knockback: 2, pushback: 3, hitLevel: 'mid' },
      }),
    }),
    move({
      id: 'phaseShift', name: 'Phase Shift', kind: 'special', anim: 'teleport_out', startup: 12, active: 1, recovery: 12,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'light', effect: 'electric',
      sfx: 'teleport', hitboxes: [], invuln: [3, 16], teleport: { frame: 11, mode: 'behind', distance: 70 }, meterGain: 2,
    }),
    move({
      id: 'razorStep', name: 'Razor Step', kind: 'special', anim: 'dash', startup: 5, active: 8, recovery: 16,
      damage: 70, hitstun: 22, blockstun: 12, knockback: 6, pushback: 8, hitLevel: 'mid', strength: 'special', effect: 'electric',
      sfx: 'dash', motion: [{ frame: 3, vx: 19, until: 12 }], invuln: [1, 5], hitboxes: [{ x: 0, y: 70, w: 80, h: 80 }],
      trail: '#2fd9ff', meterGain: 6,
    }),
    move({
      id: 'synapseLock', name: 'Synapse Lock', kind: 'special', anim: 'lunge_grab', startup: 8, active: 4, recovery: 28,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'unblockable', strength: 'special', effect: 'electric',
      sfx: 'grab', whiffSfx: 'whoosh', grab: true, motion: [{ frame: 3, vx: 7, until: 10 }], hitboxes: [{ x: 10, y: 50, w: 70, h: 100 }],
      meterGain: 7,
      lock: {
        id: 'vera-synapse', duration: 60, cinematic: true,
        steps: [
          { frame: 0, offsetX: 48, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'zap' },
          { frame: 14, damage: 40, strength: 'medium', effect: 'electric', sfx: 'zap', defenderAnim: 'shock' },
          { frame: 30, damage: 40, strength: 'medium', effect: 'electric', sfx: 'zap' },
          { frame: 46, damage: 60, strength: 'special', effect: 'electric', attackerAnim: 'kick_h', defenderAnim: 'hit', sfx: 'heavy', shake: 7, flash: true },
        ],
        release: { knockback: 10, launch: 7, knockdown: true },
      },
    }),
  ],
  specialInputs: [
    { move: 'razorStep', motion: ['F', 'N', 'F'], button: 's1', notation: '→ → I' },
    { move: 'needleStorm', motion: ['D', 'F'], button: 's1', notation: '↓ → I' },
    { move: 'synapseLock', motion: ['D', 'B'], button: 's2', notation: '↓ ← O' },
    { move: 'voltLash', motion: [], button: 's1', notation: 'I' },
    { move: 'phaseShift', motion: [], button: 's2', notation: 'O' },
  ],
  superMove: move({
    id: 'neuralStorm', name: 'Neural Storm', kind: 'super', anim: 'dash', startup: 6, active: 14, recovery: 28, superFreeze: 40,
    damage: 25, hitstun: 30, blockstun: 20, knockback: 6, pushback: 12, hitLevel: 'mid', strength: 'super', effect: 'electric',
    sfx: 'super', motion: [{ frame: 1, vx: 25, until: 20 }], invuln: [1, 20], meterCost: 100, meterGain: 0,
    hitboxes: [{ x: 0, y: 40, w: 110, h: 130 }], trail: '#2fd9ff',
    lock: flurryLock('vera-neural-storm', { hits: 8, hitDamage: 22, finalDamage: 100, effect: 'electric', anims: ['kick_l', 'punch_l', 'whip', 'kick_h'], finalAnim: 'kick_h', teleport: true }),
  }),
  throwMove: throwMove('vera', 110, 'toss'),
  finishers: [energyFinisher('vera-overclock', 'Overclock', 'electric'), physicalFinisher('vera-wire-cutter', 'Wire Cutter', ['kick_h', 'whip', 'slam'])],
  comboRoutes: ['J → J → L → I', 'L → L → ; → ↓→I', 'J → K → →→I', '↓L → ↓J → ↓K'],
  strengths: ['Fastest walk and jump', 'Teleport mix-ups', 'Long-range needles'],
  weaknesses: ['Lowest damage', 'Low health — dies to big punishes', 'Light, gets carried far by knockback'],
  dialogue: {
    introLines: ['Target acquired.', 'You will not see me twice.', 'Contract terms: lethal.'],
    victoryLines: ['Contract closed.', 'Too slow. Always too slow.', 'Erasing your file.'],
    defeatLines: ['System... failure...', 'Signal lost.'],
    taunts: ['Blink and miss it.'],
  },
};
