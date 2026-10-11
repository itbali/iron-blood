import { buildNormals, move, projectile, throwMove } from '../data/attacks';
import { energyFinisher, physicalFinisher } from '../data/finishers';
import type { CharacterDef } from './CharacterDef';
import { derivePhysique } from './CharacterDef';

const stats = { speed: 4, damage: 10, health: 9, difficulty: 'Medium' } as const;

export const TITAN: CharacterDef = {
  id: 'titan',
  name: 'Titan',
  title: 'Model T-9 Siege Frame',
  faction: 'Ironwork Directorate',
  bio: 'A decommissioned siege mech whose pilot fused with its control core. Its hydraulic limbs hit like a pile-driver and its plating shrugs off blows that would fold a lesser frame.',
  stats,
  maxHealth: 1000,
  physique: derivePhysique(stats, { scale: 1.18, jump: 14.2, gravity: 1.1, weight: 0.68, pushWidth: 70, armor: 0.08 }),
  visual: {
    palette: { skin: '#5b6270', hair: '#22262e', primary: '#3a3f4a', secondary: '#6b7280', trim: '#b9a46a', glow: '#ffcc33', eye: '#ffe680' },
    altPalette: { primary: '#5a1a1a', secondary: '#8f2a2a', trim: '#e0e0e0', glow: '#ff4a2e', eye: '#ff9a80' },
    build: { torso: 70, torsoW: 62, upperArm: 37, foreArm: 37, thigh: 42, shin: 42, armW: 22, legW: 24, headR: 14, shoulderW: 34 },
    head: 'helmet',
    extras: ['mechPlates', 'exhaust', 'shoulderPads'],
    victoryPose: 'arms_crossed',
    defeatPose: 'shutdown',
    idleStyle: 'mech',
  },
  normals: buildNormals({
    reach: 1.2,
    speed: 2,
    damage: 1.2,
    overrides: {
      lp: { name: 'Piston Jab', cancelInto: ['hp', 'lk', 'special', 'super'], effect: 'blunt' },
      hp: { name: 'Hydraulic Cross', armor: { from: 1, to: 10, hits: 1 }, effect: 'blunt' },
      hk: { name: 'Siege Kick', effect: 'blunt', armor: { from: 1, to: 11, hits: 1 } },
    },
  }),
  specials: [
    move({
      id: 'pistonPunch', name: 'Piston Punch', kind: 'special', anim: 'punch_h', startup: 14, active: 5, recovery: 20,
      damage: 120, hitstun: 26, blockstun: 18, knockback: 12, pushback: 12, hitLevel: 'mid', strength: 'special', effect: 'blunt',
      sfx: 'heavy', armor: { from: 1, to: 14, hits: 1 }, motion: [{ frame: 10, vx: 8, until: 16 }],
      hitboxes: [{ x: 20, y: 100, w: 110, h: 46 }], knockdown: true, launch: 5, meterGain: 7,
    }),
    move({
      id: 'rocketFist', name: 'Rocket Fist', kind: 'special', anim: 'cast', startup: 16, active: 2, recovery: 22,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'fire',
      sfx: 'rocket', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'titan-fist', visual: 'fist', color: '#ffcc33', speed: 11, spawnX: 60, spawnY: 116, w: 60, h: 36, lifetime: 100,
        strength: 'heavy', effect: 'fire',
        attack: { damage: 100, hitstun: 24, blockstun: 16, knockback: 8, pushback: 9, hitLevel: 'mid' },
      }),
    }),
    move({
      id: 'steamCharge', name: 'Steam Charge', kind: 'special', anim: 'shoulder', startup: 12, active: 14, recovery: 22,
      damage: 110, hitstun: 26, blockstun: 16, knockback: 12, pushback: 12, hitLevel: 'mid', strength: 'special', effect: 'blunt',
      sfx: 'charge', armor: { from: 1, to: 24, hits: 2 }, motion: [{ frame: 10, vx: 11, until: 26 }], launch: 6, knockdown: true,
      hitboxes: [{ x: 10, y: 60, w: 90, h: 110 }], trail: '#ffcc33', meterGain: 8,
    }),
    move({
      id: 'seismicStomp', name: 'Seismic Stomp', kind: 'special', anim: 'stomp', startup: 15, active: 4, recovery: 22,
      damage: 85, hitstun: 26, blockstun: 16, knockback: 6, pushback: 10, hitLevel: 'low', strength: 'special', effect: 'blunt',
      sfx: 'slam', launch: 10, knockdown: true, hitboxes: [{ x: -90, y: 0, w: 260, h: 34 }], meterGain: 6,
    }),
    move({
      id: 'hydraulicClamp', name: 'Hydraulic Clamp', kind: 'special', anim: 'lunge_grab', startup: 10, active: 5, recovery: 30,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'unblockable', strength: 'special', effect: 'blunt',
      sfx: 'grab', whiffSfx: 'whoosh', grab: true, hitboxes: [{ x: 10, y: 40, w: 104, h: 130 }], meterGain: 8,
      lock: {
        id: 'titan-clamp', duration: 70, cinematic: true,
        steps: [
          { frame: 0, offsetX: 64, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'servo' },
          { frame: 16, damage: 50, strength: 'heavy', effect: 'blunt', sfx: 'crush', shake: 6, blood: 6 },
          { frame: 32, damage: 50, strength: 'heavy', effect: 'blunt', sfx: 'crush', shake: 6, blood: 6 },
          { frame: 54, damage: 90, strength: 'special', effect: 'fire', attackerAnim: 'punch_h', defenderAnim: 'hit', sfx: 'rocket', flash: true, shake: 12 },
        ],
        release: { knockback: 13, launch: 8, knockdown: true },
      },
    }),
  ],
  specialInputs: [
    { move: 'steamCharge', motion: ['F', 'N', 'F'], button: 's1', notation: '→ → I' },
    { move: 'rocketFist', motion: ['D', 'F'], button: 's1', notation: '↓ → I' },
    { move: 'hydraulicClamp', motion: ['D', 'B'], button: 's2', notation: '↓ ← O' },
    { move: 'pistonPunch', motion: [], button: 's1', notation: 'I' },
    { move: 'seismicStomp', motion: [], button: 's2', notation: 'O' },
  ],
  superMove: move({
    id: 'overload', name: 'Overload', kind: 'super', anim: 'shoulder', startup: 8, active: 14, recovery: 32, superFreeze: 44,
    damage: 30, hitstun: 30, blockstun: 20, knockback: 6, pushback: 12, hitLevel: 'mid', strength: 'super', effect: 'fire',
    sfx: 'super', motion: [{ frame: 1, vx: 20, until: 20 }], armor: { from: 1, to: 22, hits: 5 }, meterCost: 100, meterGain: 0,
    hitboxes: [{ x: 0, y: 40, w: 120, h: 140 }], trail: '#ffcc33',
    lock: {
      id: 'titan-overload', duration: 110, cinematic: true, darken: true,
      steps: [
        { frame: 0, offsetX: 64, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'servo', zoom: 1.3 },
        { frame: 14, damage: 45, strength: 'heavy', effect: 'blunt', attackerAnim: 'punch_h', sfx: 'heavy', shake: 6 },
        { frame: 30, damage: 45, strength: 'heavy', effect: 'blunt', attackerAnim: 'punch_l', sfx: 'heavy', shake: 6 },
        { frame: 46, damage: 45, strength: 'heavy', effect: 'blunt', attackerAnim: 'punch_h', sfx: 'heavy', shake: 6 },
        { frame: 64, attackerAnim: 'charge', sfx: 'charge', zoom: 1.6, text: 'CORE OVERLOAD' },
        { frame: 92, damage: 150, strength: 'super', effect: 'fire', attackerAnim: 'burst', defenderAnim: 'hit_air', offsetY: 40, sfx: 'explosion', flash: true, shake: 16, slowmo: 18 },
      ],
      release: { knockback: 14, launch: 12, knockdown: true },
    },
  }),
  throwMove: throwMove('titan', 140, 'slam'),
  finishers: [energyFinisher('titan-reactor', 'Reactor Burst', 'fire', 'burst'), physicalFinisher('titan-compactor', 'Compactor', ['punch_h', 'punch_h', 'slam'])],
  comboRoutes: ['J → K → I', 'J → L → ↓→I', 'K (armor) → →→I', '↓J → ↓K'],
  strengths: ['Armor on heavies and specials', 'Huge damage', 'Strong zoning with Rocket Fist'],
  weaknesses: ['Very slow movement', 'Large target', 'Long recovery on whiffs'],
  dialogue: {
    introLines: ['THREAT ASSESSED. DISMANTLING.', 'Compliance is optional. Defeat is not.', 'Engaging siege protocol.'],
    victoryLines: ['TARGET NEUTRALISED.', 'Structural integrity: yours, zero.', 'Archive this.'],
    defeatLines: ['Core... venting...', 'Shutting... down...'],
    taunts: ['RECALIBRATING.'],
  },
};
