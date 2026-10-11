import { buildNormals, move, projectile, throwMove } from '../data/attacks';
import { energyFinisher, flurryLock, physicalFinisher } from '../data/finishers';
import type { CharacterDef } from './CharacterDef';
import { derivePhysique } from './CharacterDef';

const stats = { speed: 8, damage: 6, health: 6, difficulty: 'Hard' } as const;

export const KAI: CharacterDef = {
  id: 'kai',
  name: 'Kai',
  title: 'The Last Ember',
  faction: 'Order of the Still Flame',
  bio: 'The final monk of a monastery burned for refusing the corporations. Kai turns aggression against its owner, reading intent like scripture and answering with focused spirit fire.',
  stats,
  maxHealth: 1000,
  physique: derivePhysique(stats, { scale: 0.97, jump: 16.4 }),
  visual: {
    palette: { skin: '#c79a74', hair: '#0f0d0b', primary: '#5b1712', secondary: '#c26a1a', trim: '#e8b04a', glow: '#ffb02e', eye: '#ffd27a' },
    altPalette: { primary: '#123a3a', secondary: '#2a7a6a', trim: '#cfe8e0', glow: '#5effc8', eye: '#b6ffe6' },
    build: { torso: 60, torsoW: 40, upperArm: 33, foreArm: 31, thigh: 44, shin: 44, armW: 13, legW: 16, headR: 14, shoulderW: 16 },
    head: 'topknot',
    extras: ['sash', 'beads'],
    victoryPose: 'bow',
    defeatPose: 'kneel',
    idleStyle: 'monk',
  },
  normals: buildNormals({
    reach: 1,
    speed: -1,
    damage: 0.95,
    overrides: {
      lp: { name: 'Palm Jab', cancelInto: ['lp', 'hp', 'lk', 'hk', 'special', 'super'] },
      lk: { name: 'Crane Kick', cancelInto: ['lk', 'hk', 'hp', 'special', 'super'] },
      hk: { name: 'Tiger Wheel', cancelInto: ['special', 'super'] },
      hp: { name: 'Iron Palm', effect: 'energy', cancelInto: ['hk', 'special', 'super'] },
    },
  }),
  specials: [
    move({
      id: 'lotusKick', name: 'Lotus Kick', kind: 'special', anim: 'rising', startup: 6, active: 12, recovery: 24,
      damage: 50, hitstun: 26, blockstun: 16, knockback: 3, pushback: 7, hitLevel: 'mid', strength: 'special', effect: 'fire',
      sfx: 'kick', hits: 2, rehit: 6, launch: 13, knockdown: true, antiAir: true, invuln: [1, 5],
      motion: [{ frame: 5, vx: 4, vy: 12 }], hitboxes: [{ x: 0, y: 70, w: 74, h: 130 }], trail: '#ffb02e', meterGain: 8,
    }),
    move({
      id: 'spiritPalm', name: 'Spirit Palm', kind: 'special', anim: 'palm', startup: 14, active: 2, recovery: 20,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'fire',
      sfx: 'projectile', hitboxes: [], meterGain: 6,
      projectile: projectile({
        id: 'kai-spirit', visual: 'orb', color: '#ffb02e', speed: 8, spawnX: 60, spawnY: 100, w: 60, h: 60, lifetime: 120,
        strength: 'special', effect: 'fire', hits: 2, hitInterval: 8,
        attack: { damage: 42, hitstun: 22, blockstun: 14, knockback: 4, pushback: 6, hitLevel: 'mid' },
      }),
    }),
    move({
      id: 'stillWater', name: 'Still Water', kind: 'special', anim: 'counter', startup: 2, active: 24, recovery: 18,
      damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid', strength: 'special', effect: 'fire',
      sfx: 'counter', hitboxes: [], meterGain: 2,
      counter: {
        from: 3,
        to: 26,
        lock: {
          id: 'kai-counter', duration: 56, cinematic: true,
          steps: [
            { frame: 0, offsetX: 58, attackerAnim: 'palm', defenderAnim: 'hit', damage: 40, strength: 'heavy', effect: 'fire', sfx: 'perfect', flash: true, slowmo: 10, text: 'COUNTER' },
            { frame: 16, damage: 40, strength: 'heavy', effect: 'fire', attackerAnim: 'kick_l', sfx: 'kick' },
            { frame: 32, damage: 60, strength: 'special', effect: 'fire', attackerAnim: 'kick_h', defenderAnim: 'hit_air', offsetY: 40, sfx: 'heavy', shake: 8 },
          ],
          release: { knockback: 10, launch: 9, knockdown: true },
        },
      },
    }),
    move({
      id: 'hundredPalms', name: 'Hundred Palms', kind: 'special', anim: 'rush_punches', startup: 8, active: 24, recovery: 18,
      damage: 22, hitstun: 18, blockstun: 10, knockback: 1, pushback: 2, hitLevel: 'mid', strength: 'medium', effect: 'fire',
      sfx: 'punch', hits: 5, rehit: 5, motion: [{ frame: 1, vx: 3, until: 30 }],
      hitboxes: [{ x: 10, y: 80, w: 88, h: 70 }], meterGain: 8,
    }),
    move({
      id: 'chiBurst', name: 'Chi Burst', kind: 'special', anim: 'burst', startup: 7, active: 5, recovery: 26,
      damage: 90, hitstun: 26, blockstun: 16, knockback: 12, pushback: 12, hitLevel: 'mid', strength: 'special', effect: 'fire',
      sfx: 'burst', invuln: [1, 9], launch: 8, knockdown: true,
      hitboxes: [{ x: -70, y: 0, w: 170, h: 190 }], meterGain: 6,
    }),
  ],
  specialInputs: [
    { move: 'hundredPalms', motion: ['F', 'N', 'F'], button: 's1', notation: '→ → I' },
    { move: 'spiritPalm', motion: ['D', 'F'], button: 's1', notation: '↓ → I' },
    { move: 'chiBurst', motion: ['D', 'B'], button: 's2', notation: '↓ ← O' },
    { move: 'lotusKick', motion: [], button: 's1', notation: 'I' },
    { move: 'stillWater', motion: [], button: 's2', notation: 'O' },
  ],
  superMove: move({
    id: 'thousandLotus', name: 'Thousand Lotus', kind: 'super', anim: 'dash', startup: 7, active: 14, recovery: 30, superFreeze: 40,
    damage: 25, hitstun: 30, blockstun: 20, knockback: 6, pushback: 12, hitLevel: 'mid', strength: 'super', effect: 'fire',
    sfx: 'super', motion: [{ frame: 1, vx: 22, until: 20 }], invuln: [1, 20], meterCost: 100, meterGain: 0,
    hitboxes: [{ x: 0, y: 40, w: 110, h: 130 }], trail: '#ffb02e',
    lock: flurryLock('kai-thousand-lotus', { hits: 9, hitDamage: 21, finalDamage: 110, effect: 'fire', anims: ['punch_l', 'kick_l', 'palm', 'kick_h', 'punch_h'], finalAnim: 'palm' }),
  }),
  throwMove: throwMove('kai', 115, 'toss'),
  finishers: [energyFinisher('kai-inner-fire', 'Inner Fire', 'fire', 'palm'), physicalFinisher('kai-final-lesson', 'Final Lesson', ['palm', 'kick_h', 'slam'])],
  comboRoutes: ['J → J → L → ; → I', 'L → L → ; → ↓→I', 'K → ; → →→I', 'J → K → ↓→I'],
  strengths: ['Longest combo routes', 'Counter stance punishes predictable attacks', 'Invincible Chi Burst'],
  weaknesses: ['Below-average health', 'Counter is very punishable if read', 'Slow projectile'],
  dialogue: {
    introLines: ['Your anger is a weapon. I will borrow it.', 'Breathe. Then fall.', 'The flame does not hate. It burns.'],
    victoryLines: ['Rest. Reflect.', 'Stillness wins.', 'You fought with your fists. Not your mind.'],
    defeatLines: ['The ember... fades...', 'My lesson... is incomplete.'],
    taunts: ['Again.'],
  },
};
