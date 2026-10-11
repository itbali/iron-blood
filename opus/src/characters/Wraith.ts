import { buildNormals, move, projectile, throwMove } from '../data/attacks';
import { cinematicFinisher, energyFinisher, flurryLock } from '../data/finishers';
import type { CharacterDef } from './CharacterDef';
import { derivePhysique } from './CharacterDef';

const stats = { speed: 9, damage: 6, health: 5, difficulty: 'Very Hard' } as const;

export const WRAITH: CharacterDef = {
  id: 'wraith',
  name: 'Wraith',
  title: 'The Hollow Saint',
  faction: 'Unknown',
  bio: 'No records exist. Tournament cameras capture only static where its face should be. Witnesses describe a cold wind, a second shadow, and fighters who forget their own names.',
  stats,
  maxHealth: 1000,
  physique: derivePhysique(stats, { scale: 1.02, jump: 15.2, gravity: 0.84, weight: 1.05, pushWidth: 48 }),
  visual: {
    palette: { skin: '#9aa3b8', hair: '#0b0b10', primary: '#121019', secondary: '#2c2440', trim: '#5f5487', glow: '#9b6bff', eye: '#d4c2ff' },
    altPalette: { primary: '#e6e6ea', secondary: '#9a9aa8', trim: '#ffffff', glow: '#ffffff', eye: '#ff2238' },
    build: { torso: 64, torsoW: 38, upperArm: 36, foreArm: 36, thigh: 46, shin: 46, armW: 11, legW: 13, headR: 14, shoulderW: 14 },
    head: 'hood',
    extras: ['tatters', 'cape'],
    victoryPose: 'float',
    defeatPose: 'dissolve_kneel',
    idleStyle: 'phantom',
  },
  normals: buildNormals({
    reach: 1.08,
    speed: 0,
    damage: 0.95,
    overrides: {
      lp: { name: 'Grave Touch', effect: 'shadow' },
      hp: { name: 'Hollow Claw', effect: 'shadow', anim: 'claw' },
      hk: { name: 'Shade Arc', effect: 'shadow' },
      jhk: { name: 'Falling Veil', effect: 'shadow' },
    },
  }),
  specials: [
    move({
      id: 'shadeClaw', name: 'Shade Claw', kind: 'special', anim: 'claw', startup: 9, active: 5, recovery: 16,
      damage: 75, hitstun: 22, blockstun: 14, knockback: 6, pushback: 8, hitLevel: 'mid', strength: 'special', effect: 'shadow',
      sfx: 'slash', motion: [{ frame: 2, vx: 5, until: 9 }], hitboxes: [{ x: 20, y: 70, w: 110, h: 80 }], meterGain: 6,
    }),
    move({
      id: 'soulBolt', name: 'Soul Bolt', kind: 'special', anim: 'cast', startup: 12, active: 2, recovery: 20,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'shadow',
      sfx: 'projectile', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'wraith-bolt', visual: 'bolt', color: '#9b6bff', speed: 12, spawnX: 55, spawnY: 110, w: 54, h: 30, lifetime: 100,
        strength: 'special', effect: 'shadow',
        attack: { damage: 70, hitstun: 22, blockstun: 14, knockback: 5, pushback: 7, hitLevel: 'mid' },
      }),
    }),
    move({
      id: 'veilStep', name: 'Veil Step', kind: 'special', anim: 'teleport_out', startup: 14, active: 1, recovery: 10,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'light', effect: 'shadow',
      sfx: 'teleport', hitboxes: [], invuln: [3, 18], teleport: { frame: 13, mode: 'behind', distance: 80 }, meterGain: 2,
    }),
    move({
      id: 'mirage', name: 'Mirage', kind: 'special', anim: 'summon', startup: 12, active: 2, recovery: 24,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'shadow',
      sfx: 'teleport', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'wraith-phantom', visual: 'phantom', color: '#9b6bff', speed: 8.5, spawnX: 30, spawnY: 0, w: 60, h: 170, lifetime: 80,
        strength: 'heavy', effect: 'shadow', hits: 2, hitInterval: 10,
        attack: { damage: 40, hitstun: 22, blockstun: 12, knockback: 4, pushback: 6, hitLevel: 'mid' },
      }),
    }),
    move({
      id: 'hollowGrasp', name: 'Hollow Grasp', kind: 'special', anim: 'summon', startup: 14, active: 2, recovery: 26,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'low', strength: 'special', effect: 'shadow',
      sfx: 'summon', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'wraith-grasp', visual: 'pillar', color: '#9b6bff', speed: 0, spawnX: 0, spawnY: 0, w: 70, h: 150, lifetime: 24,
        targeted: true, telegraph: 34, strength: 'special', effect: 'shadow',
        attack: { damage: 85, hitstun: 28, blockstun: 16, knockback: 2, pushback: 6, hitLevel: 'low' },
        launch: 13, knockdown: true,
      }),
    }),
  ],
  specialInputs: [
    { move: 'shadeClaw', motion: ['F', 'N', 'F'], button: 's1', notation: '→ → I' },
    { move: 'soulBolt', motion: ['D', 'F'], button: 's1', notation: '↓ → I' },
    { move: 'veilStep', motion: ['D', 'B'], button: 's1', notation: '↓ ← I' },
    { move: 'hollowGrasp', motion: ['D', 'B'], button: 's2', notation: '↓ ← O' },
    { move: 'shadeClaw', motion: [], button: 's1', notation: 'I' },
    { move: 'mirage', motion: [], button: 's2', notation: 'O' },
  ],
  superMove: move({
    id: 'requiem', name: 'Requiem', kind: 'super', anim: 'dash', startup: 8, active: 14, recovery: 30, superFreeze: 44,
    damage: 25, hitstun: 30, blockstun: 20, knockback: 6, pushback: 12, hitLevel: 'mid', strength: 'super', effect: 'shadow',
    sfx: 'super', motion: [{ frame: 1, vx: 24, until: 20 }], invuln: [1, 22], meterCost: 100, meterGain: 0,
    hitboxes: [{ x: 0, y: 40, w: 120, h: 130 }], trail: '#9b6bff',
    lock: flurryLock('wraith-requiem', { hits: 8, hitDamage: 22, finalDamage: 110, effect: 'shadow', anims: ['claw', 'kick_h', 'claw', 'slash'], finalAnim: 'slash_finish', teleport: true }),
  }),
  throwMove: throwMove('wraith', 110, 'knee'),
  finishers: [energyFinisher('wraith-soul-harvest', 'Soul Harvest', 'shadow', 'summon'), cinematicFinisher('wraith-eclipse', 'Eclipse', 'shadow')],
  comboRoutes: ['J → K → I', 'L → ; → ↓→I', 'J → J → ↓←O', 'jump ; → ↓; (sweep)'],
  strengths: ['Floaty jumps and teleports cross up', 'Illusions control space', 'Pillar hits from anywhere'],
  weaknesses: ['Low health', 'Slow projectiles leave it open', 'Hard to execute'],
  dialogue: {
    introLines: ['...your name tastes of rust.', 'I have already watched you die.', 'Hush.'],
    victoryLines: ['One more voice for the choir.', 'Forget.', 'Sleep, little candle.'],
    defeatLines: ['...I will remember you.', 'The veil... thins...'],
    taunts: ['...'],
  },
};
