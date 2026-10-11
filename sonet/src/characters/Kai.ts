import { buildCharacter } from './CharacterBuilder';
import { FORWARD_TAP, MOTION_QCB, MOTION_QCF } from '../data/motions';
import { bx, commandGrab, counterMove, lungeMove, projectileMove, superMove } from '../data/moveFactory';

const GOLD = '#ffc247';

const counterPalm = {
  ...lungeMove({
    id: 'counterPalm', name: 'Counter Palm', button: 'sp2', startup: 3, active: 4, recovery: 20, damage: 98,
    speed: 12, lungeFrom: 2, lungeTo: 8, hitbox: bx(20, 90, 110, 100), color: GOLD, pose: ['counter_s', 'palm_s'],
    launch: { vx: 6, vy: 12 }, invuln: [0, 6],
  }),
  chainOnly: true,
};

export const KAI = buildCharacter({
  id: 'kai',
  name: 'Kai',
  title: 'Warrior Monk',
  bio: 'Exiled from a mountain temple for breaking the vow of stillness. Kai waits, reads and returns every strike with interest.',
  weapon: 'Open palm · Chi',
  styleText: 'Counters, quick combos, energy',
  stats: { speed: 8, damage: 6, health: 6, difficulty: 'Hard' },
  height: 238,
  pushWidth: 58,
  tune: { reachP: 82, reachK: 94, speed: -1, power: 1, stun: 1, trail: GOLD },
  specials: [
    projectileMove({
      id: 'chiBlast', name: 'Chi Blast', seq: MOTION_QCF, button: 'sp1', startup: 16, recovery: 24, speed: 9.5,
      w: 66, h: 66, y: 128, damage: 60, color: GOLD, kind: 'orb', life: 90, hitstun: 24, knockback: 9,
    }),
    lungeMove({
      id: 'tigerPalm', name: 'Tiger Palm', seq: FORWARD_TAP, button: 'sp1', startup: 8, active: 7, recovery: 20,
      damage: 68, speed: 14, lungeFrom: 8, lungeTo: 17, hitbox: bx(20, 100, 96, 80), color: GOLD,
      knockback: 9, pose: ['dash_w', 'palm_s'],
    }),
    commandGrab({
      id: 'heavenFall', name: "Heaven's Fall", seq: MOTION_QCB, button: 'sp2', range: 94, damage: 165, hits: 3,
      color: GOLD, duration: 52,
    }),
    counterMove({
      id: 'stillWater', name: 'Still Water', button: 'sp2', duration: 38, from: 3, to: 26, response: 'counterPalm', color: GOLD,
    }),
    counterPalm,
    lungeMove({
      id: 'flowingStrike', name: 'Flowing Strike', button: 'sp1', startup: 9, active: 3, recovery: 16, damage: 52,
      speed: 8, lungeFrom: 8, lungeTo: 13, hitbox: bx(24, 100, 100, 70), color: GOLD, pose: ['palm_w', 'palm_s'],
      cancelInto: ['chiBlast', 'tigerPalm'],
    }),
    superMove({
      id: 'thousandPalms', name: 'Thousand Palms', damage: 16, hits: 8, color: GOLD, interval: 3, charge: 24,
      teleportDist: 64, finalBonus: 110, hitbox: bx(10, 70, 108, 130), pose: ['charge', 'palm_s'],
    }),
  ],
  style: {
    scale: 0.99, bulk: 0.95, head: 'bald', body: 'monk', trail: GOLD,
    palette: {
      skin: '#c79868', cloth: '#b4500f', clothDark: '#6a2c08', armor: '#3a3028', armorLight: '#7a6a54',
      accent: '#ffc247', glow: GOLD, hair: '#1a1008', eye: '#fff0b8',
    },
  },
  skins: [
    { id: 'default', name: 'Ember Robe', palette: {}, unlock: 'default' },
    { id: 'ashen', name: 'Ashen Vow', unlock: 'arcade', palette: { cloth: '#d4d0c8', clothDark: '#8a867e', accent: '#7ad8ff', glow: '#b6ecff', armor: '#2a2e36' } },
  ],
  dialogue: {
    intro: ['Breathe. Then bleed.', 'Stillness will not save you.', 'I have waited for this.'],
    victory: ['The wheel turns.', 'Peace... eventually.'],
    defeat: ['The mountain... falls...', 'I was not still enough.'],
    taunts: ['Patience.', 'Strike me.'],
  },
  finisherNames: ['Final Breath', 'Seven Gates', 'Temple Collapse'],
  finisherColor: GOLD,
  aiBias: { zoning: 0.3, rushdown: 0.3, grappler: 0.1 },
});
