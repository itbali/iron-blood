import type { LockSequenceDef } from '../combat/AttackData';
import { buildNormals, move, projectile, throwMove } from '../data/attacks';
import type { CharacterDef } from './CharacterDef';
import { derivePhysique } from './CharacterDef';

const stats = { speed: 8, damage: 7, health: 7, difficulty: 'Medium' } as const;

const executionLock: LockSequenceDef = {
  id: 'raven-execution-grab',
  duration: 78,
  cinematic: true,
  steps: [
    { frame: 0, offsetX: 50, attackerAnim: 'grab_hold', defenderAnim: 'grabbed', sfx: 'grab', zoom: 1.35 },
    { frame: 14, damage: 30, strength: 'medium', effect: 'strike', attackerAnim: 'knee', sfx: 'kick', blood: 6 },
    { frame: 28, damage: 40, strength: 'heavy', effect: 'blade', attackerAnim: 'slash', sfx: 'slash', blood: 10, flash: true },
    { frame: 42, offsetX: 30, offsetY: 110, attackerAnim: 'lift', defenderAnim: 'thrown_up' },
    { frame: 60, offsetX: 70, offsetY: 0, damage: 100, strength: 'special', effect: 'blade', attackerAnim: 'slam', defenderAnim: 'knockdown', sfx: 'throw', shake: 12, slowmo: 12, blood: 22 },
  ],
  release: { knockback: 6, launch: 5, knockdown: true },
};

const bloodRushLock: LockSequenceDef = {
  id: 'raven-blood-rush',
  duration: 100,
  cinematic: true,
  darken: true,
  steps: [
    { frame: 0, offsetX: 62, damage: 20, strength: 'medium', effect: 'blade', attackerAnim: 'slash', defenderAnim: 'hit', sfx: 'slash', zoom: 1.3 },
    { frame: 10, attackerSide: -1, damage: 20, strength: 'medium', effect: 'blade', attackerAnim: 'slash', sfx: 'slash', blood: 4 },
    { frame: 20, attackerSide: 1, damage: 22, strength: 'medium', effect: 'strike', attackerAnim: 'punch_h', sfx: 'punch' },
    { frame: 30, attackerSide: -1, damage: 24, strength: 'heavy', effect: 'strike', attackerAnim: 'kick_h', sfx: 'kick', blood: 4 },
    { frame: 40, attackerSide: 1, damage: 24, strength: 'heavy', effect: 'blade', attackerAnim: 'slash', sfx: 'slash' },
    { frame: 50, attackerSide: -1, damage: 26, strength: 'heavy', effect: 'blade', attackerAnim: 'slash', sfx: 'slash', blood: 6 },
    { frame: 62, attackerSide: 1, attackerAnim: 'charge', sfx: 'charge', zoom: 1.5 },
    { frame: 74, offsetY: 70, damage: 30, strength: 'heavy', effect: 'blade', attackerAnim: 'rising', defenderAnim: 'hit_air', sfx: 'heavy' },
    { frame: 88, offsetY: 30, damage: 110, strength: 'super', effect: 'blade', attackerAnim: 'slash_finish', sfx: 'superhit', flash: true, shake: 10, slowmo: 18, blood: 26 },
  ],
  release: { knockback: 11, launch: 12, knockdown: true },
};

export const RAVEN: CharacterDef = {
  id: 'raven',
  name: 'Raven',
  title: 'The Red Mercenary',
  faction: 'Ashen Company',
  bio: 'Ex-military contractor who walked away from a massacre he was paid to commit. Now he fights in the pits to buy back the lives he ruined — one purse at a time. His gauntlets channel unstable hemo-energy into blades.',
  stats,
  maxHealth: 1000,
  physique: derivePhysique(stats, { scale: 1, jump: 16 }),
  visual: {
    palette: { skin: '#b98a6e', hair: '#16130f', primary: '#15171c', secondary: '#3a3f4a', trim: '#7a808c', glow: '#ff2238', eye: '#ff4455' },
    altPalette: { primary: '#e9e6df', secondary: '#9aa0a8', glow: '#29d3ff', eye: '#7fe9ff' },
    build: { torso: 64, torsoW: 46, upperArm: 34, foreArm: 32, thigh: 44, shin: 44, armW: 15, legW: 18, headR: 15, shoulderW: 22 },
    head: 'short',
    extras: ['forearmBlades', 'scars', 'shoulderPads'],
    victoryPose: 'blade_salute',
    defeatPose: 'kneel',
    idleStyle: 'boxer',
  },
  normals: buildNormals({
    reach: 1,
    speed: 0,
    damage: 1,
    overrides: {
      lp: { cancelInto: ['lp', 'hp', 'lk', 'special', 'super'] },
      hp: { cancelInto: ['special', 'super'], effect: 'strike' },
    },
  }),
  specials: [
    move({
      id: 'bloodDash', name: 'Blood Dash', kind: 'special', anim: 'dash', startup: 7, active: 10, recovery: 18,
      damage: 95, hitstun: 26, blockstun: 14, knockback: 9, pushback: 9, hitLevel: 'mid', strength: 'special', effect: 'blade',
      sfx: 'dash', motion: [{ frame: 1, vx: 4 }, { frame: 6, vx: 18, until: 16 }], invuln: [1, 9], launch: 7, knockdown: true,
      hitboxes: [{ x: 0, y: 60, w: 92, h: 92 }], trail: '#ff2238', meterGain: 8,
    }),
    move({
      id: 'crimsonSlash', name: 'Crimson Slash', kind: 'special', anim: 'slash', startup: 13, active: 2, recovery: 22,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'blade',
      sfx: 'projectile', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'crimson-crescent', visual: 'crescent', color: '#ff2238', speed: 13, spawnX: 60, spawnY: 92, w: 52, h: 96, lifetime: 90,
        strength: 'special', effect: 'blade',
        attack: { damage: 75, hitstun: 22, blockstun: 16, knockback: 6, pushback: 8, hitLevel: 'mid' },
      }),
    }),
    move({
      id: 'executionGrab', name: 'Execution Grab', kind: 'special', anim: 'lunge_grab', startup: 11, active: 5, recovery: 30,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'unblockable', strength: 'special', effect: 'blade',
      sfx: 'grab', whiffSfx: 'whoosh', grab: true, motion: [{ frame: 4, vx: 9, until: 13 }],
      hitboxes: [{ x: 10, y: 40, w: 78, h: 110 }], lock: executionLock, meterGain: 8,
    }),
    move({
      id: 'redFang', name: 'Red Fang', kind: 'special', anim: 'rising', startup: 4, active: 9, recovery: 26,
      damage: 100, hitstun: 30, blockstun: 18, knockback: 3, pushback: 7, hitLevel: 'mid', strength: 'special', effect: 'blade',
      sfx: 'slash', invuln: [1, 6], launch: 16, knockdown: true, antiAir: true, motion: [{ frame: 1, vx: 6, until: 3 }, { frame: 4, vx: 4, vy: 13 }],
      hitboxes: [{ x: 0, y: 60, w: 92, h: 150 }], trail: '#ff2238', meterGain: 8,
    }),
    move({
      id: 'ripperKick', name: 'Ripper Kick', kind: 'special', anim: 'spin_kick', startup: 13, active: 6, recovery: 17,
      damage: 85, hitstun: 24, blockstun: 16, knockback: 10, pushback: 10, hitLevel: 'mid', strength: 'heavy', effect: 'strike',
      sfx: 'kick', motion: [{ frame: 1, vx: 6, until: 14 }], hitboxes: [{ x: 10, y: 70, w: 110, h: 60 }], meterGain: 6,
    }),
  ],
  specialInputs: [
    { move: 'bloodDash', motion: ['F', 'N', 'F'], button: 's1', notation: '→ → I' },
    { move: 'crimsonSlash', motion: ['D', 'F'], button: 's1', notation: '↓ → I' },
    { move: 'executionGrab', motion: ['D', 'B'], button: 's2', notation: '↓ ← O' },
    { move: 'redFang', motion: [], button: 's1', notation: 'I' },
    { move: 'ripperKick', motion: [], button: 's2', notation: 'O' },
  ],
  superMove: move({
    id: 'bloodRush', name: 'Blood Rush', kind: 'super', anim: 'dash', startup: 8, active: 14, recovery: 30, superFreeze: 42,
    damage: 30, hitstun: 30, blockstun: 20, knockback: 6, pushback: 12, hitLevel: 'mid', strength: 'super', effect: 'blade',
    sfx: 'super', motion: [{ frame: 1, vx: 24, until: 22 }], invuln: [1, 22], meterCost: 100, meterGain: 0,
    hitboxes: [{ x: 0, y: 40, w: 110, h: 130 }], lock: bloodRushLock, trail: '#ff2238',
  }),
  throwMove: throwMove('raven', 120, 'knee'),
  finishers: [
    {
      id: 'crimsonExecution', name: 'Crimson Execution', type: 'cinematic', motion: ['D', 'D'], button: 's1', notation: '↓ ↓ I', range: Infinity,
      lock: {
        id: 'crimson-execution', duration: 176, cinematic: true, darken: true, finisherOutcome: 'shatter',
        steps: [
          { frame: 0, offsetX: 110, attackerAnim: 'charge', defenderAnim: 'dazed', zoom: 1.7, sfx: 'charge', text: 'CRIMSON EXECUTION' },
          { frame: 42, attackerAnim: 'blade_ready', sfx: 'blade', zoom: 1.9 },
          { frame: 72, attackerSide: -1, attackerAnim: 'slash', strength: 'super', effect: 'blade', sfx: 'slash', flash: true, blood: 34, slowmo: 40, shake: 6 },
          { frame: 116, attackerSide: 1, attackerAnim: 'slash_finish', strength: 'super', effect: 'blade', sfx: 'superhit', flash: true, blood: 60, shake: 14, zoom: 1.3 },
          { frame: 140, defenderAnim: 'collapse' },
        ],
        release: { knockback: 0, launch: 0, knockdown: true },
      },
    },
    {
      id: 'ironVerdict', name: 'Iron Verdict', type: 'physical', motion: ['B', 'F'], button: 's2', notation: '← → O', range: 280,
      lock: {
        id: 'iron-verdict', duration: 140, cinematic: true, finisherOutcome: 'collapse',
        steps: [
          { frame: 0, offsetX: 56, attackerAnim: 'grab_hold', defenderAnim: 'dazed', zoom: 1.5, sfx: 'grab', text: 'IRON VERDICT' },
          { frame: 18, attackerAnim: 'punch_h', strength: 'heavy', sfx: 'heavy', shake: 6, blood: 10 },
          { frame: 36, attackerAnim: 'punch_l', strength: 'heavy', sfx: 'heavy', shake: 6, blood: 10 },
          { frame: 56, attackerAnim: 'uppercut', offsetY: 90, defenderAnim: 'hit_air', strength: 'super', sfx: 'superhit', shake: 10, blood: 16 },
          { frame: 84, offsetX: 90, offsetY: 0, attackerAnim: 'slam', defenderAnim: 'knockdown', strength: 'super', sfx: 'throw', flash: true, shake: 14, slowmo: 20, blood: 30 },
        ],
        release: { knockback: 0, launch: 0, knockdown: true },
      },
    },
  ],
  comboRoutes: ['J → J → K', 'J → K → I', 'J → J → K → I', 'L → K → ↓→I', '↓L → ↓J → ↓K'],
  strengths: ['Fast, reliable normals', 'Invincible reversal (Red Fang)', 'Strong mix of projectile and dash pressure'],
  weaknesses: ['Average health', 'Red Fang is very punishable on block', 'Needs meter for big damage'],
  dialogue: {
    introLines: ["Let's end this.", 'You picked the wrong fight.', "I've buried better than you."],
    victoryLines: ['Stay down. It is mercy.', 'Another debt paid.', 'You fought. That counts for something.'],
    defeatLines: ['Not... like this.', 'The debt... still stands.'],
    taunts: ['Come on.', 'Is that all?'],
  },
};
