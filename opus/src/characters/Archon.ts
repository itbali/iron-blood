import { buildNormals, move, projectile, throwMove } from '../data/attacks';
import { energyFinisher } from '../data/finishers';
import type { CharacterDef } from './CharacterDef';
import { derivePhysique } from './CharacterDef';

const stats = { speed: 6, damage: 9, health: 10, difficulty: 'Boss' } as const;

export const ARCHON: CharacterDef = {
  id: 'archon',
  name: 'The Archon',
  title: 'Sovereign of the Pit',
  faction: 'The Crown Directorate',
  bio: 'Patron and final champion of the underground tournament. Half god-machine, half tyrant, the Archon feeds on the blood spilled in his arenas to power the city above. No challenger has ever seen his second form and lived.',
  stats,
  maxHealth: 2000,
  physique: derivePhysique(stats, { scale: 1.4, jump: 14.5, gravity: 1.05, weight: 0.5, pushWidth: 84, armor: 0.12 }),
  visual: {
    palette: { skin: '#3a3340', hair: '#0c0a0e', primary: '#17121c', secondary: '#3b2a1c', trim: '#c9a24a', glow: '#ff4a1f', eye: '#ffd27a' },
    altPalette: { primary: '#e8e3d6', secondary: '#9a8a5a', glow: '#47c8ff', eye: '#e6fbff' },
    build: { torso: 72, torsoW: 58, upperArm: 37, foreArm: 37, thigh: 44, shin: 44, armW: 20, legW: 22, headR: 15, shoulderW: 36 },
    head: 'crown',
    extras: ['core', 'cape', 'shoulderPads', 'mechPlates'],
    victoryPose: 'throne',
    defeatPose: 'shatter_kneel',
    idleStyle: 'tyrant',
  },
  normals: buildNormals({
    reach: 1.3,
    speed: 1,
    damage: 1.15,
    overrides: {
      hp: { name: 'Sovereign Fist', armor: { from: 1, to: 10, hits: 1 }, effect: 'energy' },
      hk: { name: 'Crown Breaker', armor: { from: 1, to: 12, hits: 1 }, effect: 'energy' },
      chk: { name: 'Edict Sweep', effect: 'energy' },
    },
  }),
  specials: [
    move({
      id: 'voidLance', name: 'Void Lance', kind: 'special', anim: 'cast', startup: 13, active: 2, recovery: 20,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'energy',
      sfx: 'projectile', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'archon-lance', visual: 'lance', color: '#ff4a1f', speed: 14, spawnX: 70, spawnY: 140, w: 90, h: 26, lifetime: 90,
        strength: 'special', effect: 'energy',
        attack: { damage: 90, hitstun: 24, blockstun: 16, knockback: 7, pushback: 9, hitLevel: 'mid' },
      }),
    }),
    move({
      id: 'judgmentPillar', name: 'Judgment Pillar', kind: 'special', anim: 'summon', startup: 14, active: 2, recovery: 24,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'energy',
      sfx: 'summon', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'archon-pillar', visual: 'pillar', color: '#ff4a1f', speed: 0, spawnX: 0, spawnY: 0, w: 80, h: 320, lifetime: 26,
        targeted: true, telegraph: 38, strength: 'special', effect: 'energy',
        attack: { damage: 110, hitstun: 30, blockstun: 18, knockback: 2, pushback: 8, hitLevel: 'mid' },
        launch: 15, knockdown: true,
      }),
    }),
    move({
      id: 'dominionStep', name: 'Dominion Step', kind: 'special', anim: 'teleport_out', startup: 14, active: 6, recovery: 20,
      damage: 100, hitstun: 26, blockstun: 16, knockback: 10, pushback: 10, hitLevel: 'mid', strength: 'special', effect: 'energy',
      sfx: 'teleport', invuln: [3, 14], teleport: { frame: 12, mode: 'front', distance: 90 }, knockdown: true, launch: 6,
      hitboxes: [{ x: 10, y: 60, w: 110, h: 120 }], meterGain: 6,
    }),
    move({
      id: 'tyrantGrip', name: 'Tyrant Grip', kind: 'special', anim: 'lunge_grab', startup: 10, active: 6, recovery: 30,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'unblockable', strength: 'special', effect: 'energy',
      sfx: 'grab', whiffSfx: 'whoosh', grab: true, motion: [{ frame: 4, vx: 8, until: 12 }], hitboxes: [{ x: 10, y: 40, w: 116, h: 150 }],
      meterGain: 8,
      lock: {
        id: 'archon-grip', duration: 84, cinematic: true,
        steps: [
          { frame: 0, offsetX: 80, offsetY: 60, attackerAnim: 'lift', defenderAnim: 'grabbed', sfx: 'grab', zoom: 1.25 },
          { frame: 18, damage: 50, strength: 'heavy', effect: 'energy', sfx: 'zap', defenderAnim: 'shock', flash: true },
          { frame: 36, damage: 50, strength: 'heavy', effect: 'energy', sfx: 'zap', defenderAnim: 'shock' },
          { frame: 60, offsetX: 100, offsetY: 0, damage: 120, strength: 'special', effect: 'energy', attackerAnim: 'slam', defenderAnim: 'knockdown', sfx: 'throw', shake: 14, blood: 14 },
        ],
        release: { knockback: 8, launch: 6, knockdown: true },
      },
    }),
    move({
      id: 'novaBurst', name: 'Crimson Nova', kind: 'special', anim: 'burst', startup: 14, active: 6, recovery: 26, phase2Only: true,
      damage: 140, hitstun: 30, blockstun: 18, knockback: 14, pushback: 14, hitLevel: 'mid', strength: 'special', effect: 'fire',
      sfx: 'explosion', armor: { from: 1, to: 16, hits: 2 }, launch: 12, knockdown: true,
      hitboxes: [{ x: -140, y: 0, w: 290, h: 260 }], meterGain: 6,
    }),
    move({
      id: 'lanceVolley', name: 'Lance Volley', kind: 'special', anim: 'cast', startup: 16, active: 2, recovery: 22, phase2Only: true,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'energy',
      sfx: 'projectile', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'archon-volley', visual: 'lance', color: '#ffb02e', speed: 13, spawnX: 70, spawnY: 60, w: 84, h: 22, lifetime: 90,
        strength: 'special', effect: 'energy', count: 3, spread: 60,
        attack: { damage: 45, hitstun: 22, blockstun: 12, knockback: 4, pushback: 5, hitLevel: 'mid' },
      }),
    }),
  ],
  specialInputs: [
    { move: 'dominionStep', motion: ['F', 'N', 'F'], button: 's1', notation: '→ → I' },
    { move: 'judgmentPillar', motion: ['D', 'F'], button: 's1', notation: '↓ → I' },
    { move: 'lanceVolley', motion: ['D', 'D'], button: 's1', notation: '↓ ↓ I (Phase 2)' },
    { move: 'novaBurst', motion: ['D', 'B'], button: 's2', notation: '↓ ← O (Phase 2)' },
    { move: 'voidLance', motion: [], button: 's1', notation: 'I' },
    { move: 'tyrantGrip', motion: [], button: 's2', notation: 'O' },
  ],
  superMove: move({
    id: 'apotheosis', name: 'Apotheosis', kind: 'super', anim: 'burst', startup: 10, active: 8, recovery: 34, superFreeze: 50,
    damage: 40, hitstun: 30, blockstun: 20, knockback: 6, pushback: 14, hitLevel: 'mid', strength: 'super', effect: 'fire',
    sfx: 'super', invuln: [1, 18], meterCost: 100, meterGain: 0,
    hitboxes: [{ x: -120, y: 0, w: 320, h: 280 }],
    lock: {
      id: 'archon-apotheosis', duration: 120, cinematic: true, darken: true,
      steps: [
        { frame: 0, offsetX: 120, offsetY: 120, attackerAnim: 'lift', defenderAnim: 'energy_lift', sfx: 'charge', zoom: 1.2, text: 'APOTHEOSIS' },
        { frame: 20, damage: 50, strength: 'heavy', effect: 'fire', sfx: 'zap', defenderAnim: 'shock', flash: true },
        { frame: 40, damage: 50, strength: 'heavy', effect: 'fire', sfx: 'zap', defenderAnim: 'shock' },
        { frame: 60, damage: 50, strength: 'heavy', effect: 'fire', sfx: 'zap', defenderAnim: 'shock' },
        { frame: 94, offsetY: 0, damage: 160, strength: 'super', effect: 'fire', attackerAnim: 'slam', defenderAnim: 'knockdown', sfx: 'explosion', flash: true, shake: 18, slowmo: 20, blood: 20 },
      ],
      release: { knockback: 12, launch: 10, knockdown: true },
    },
  }),
  throwMove: throwMove('archon', 160, 'slam'),
  finishers: [energyFinisher('archon-annihilation', 'Annihilation', 'fire', 'burst')],
  comboRoutes: ['J → K → I', 'K (armor) → ↓→I', 'L → ; → →→I'],
  strengths: ['2000 HP and passive armor', 'Armored heavies', 'Full-screen pillars'],
  weaknesses: ['Huge hurtbox', 'Slow recovery on big moves', 'Phase 2 burns its patience'],
  dialogue: {
    introLines: ['Your blood will power this city.', 'Kneel, and I may let you scream.', 'Another offering crawls to my throne.'],
    victoryLines: ['The city thanks you for your blood.', 'Insects. All of you.', 'The throne remains.'],
    defeatLines: ['Impossible... the crown... falls...', 'This city... will burn... without me...'],
    taunts: ['Kneel.'],
  },
  boss: { phase2Threshold: 0.5, phase2SpeedMult: 1.15, phase2DamageMult: 1.15, phase2Glow: '#ff2a12' },
  hidden: true,
};
