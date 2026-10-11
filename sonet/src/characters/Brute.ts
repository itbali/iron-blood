import { buildCharacter } from './CharacterBuilder';
import { FORWARD_TAP, MOTION_QCB, MOTION_QCF } from '../data/motions';
import { bx, commandGrab, lungeMove, projectileMove, superMove } from '../data/moveFactory';

const ORANGE = '#ff8a2a';

export const BRUTE = buildCharacter({
  id: 'brute',
  name: 'Brute',
  title: 'Mutant Pit Champion',
  bio: 'Pulled from a toxic waste pit and sold into the ring. Brute does not dodge; he walks through punishment and ends fights with a single grip.',
  weapon: 'Raw strength · Grips',
  styleText: 'Slow, devastating, armored, grabs',
  stats: { speed: 3, damage: 10, health: 10, difficulty: 'Easy' },
  height: 290,
  pushWidth: 98,
  tune: {
    reachP: 96, reachK: 104, speed: 3, power: 1, stun: 2, trail: ORANGE, heavyArmor: true,
    heavyPunchPose: ['hammer_w', 'hammer_s'], heavyKickPose: ['stomp_w', 'stomp_s'],
  },
  specials: [
    projectileMove({
      id: 'quakeWave', name: 'Quake Wave', seq: MOTION_QCF, button: 'sp1', startup: 20, recovery: 34, speed: 7,
      w: 90, h: 44, y: 0, damage: 82, color: ORANGE, kind: 'wave', life: 95, hitLevel: 'low', hitstun: 28, knockback: 7,
      pose: ['stomp_w', 'stomp_s'], launch: { vx: 3, vy: 11 },
    }),
    lungeMove({
      id: 'bullRush', name: 'Bull Rush', seq: FORWARD_TAP, button: 'sp1', startup: 12, active: 14, recovery: 26,
      damage: 96, speed: 11, lungeFrom: 12, lungeTo: 28, hitbox: bx(30, 50, 120, 170), color: ORANGE,
      armor: { from: 2, to: 16, hits: 1 }, knockback: 12, hitstun: 28, pose: ['dash_w', 'dash_s'],
    }),
    commandGrab({
      id: 'bearHug', name: 'Bear Hug', seq: MOTION_QCB, button: 'sp2', range: 112, damage: 240, hits: 3,
      color: ORANGE, duration: 60,
    }),
    lungeMove({
      id: 'skullSmash', name: 'Skull Smash', button: 'sp1', startup: 16, active: 4, recovery: 30, damage: 112,
      speed: 3.5, lungeFrom: 12, lungeTo: 20, hitbox: bx(34, 130, 118, 120), color: ORANGE,
      armor: { from: 3, to: 18, hits: 1 }, pose: ['hammer_w', 'hammer_s'], knockback: 11, hitstun: 28,
    }),
    lungeMove({
      id: 'seismicStomp', name: 'Seismic Stomp', button: 'sp2', startup: 14, active: 4, recovery: 28, damage: 86,
      speed: 0, lungeFrom: 0, lungeTo: 0, hitbox: bx(0, 0, 170, 44), color: ORANGE, hitLevel: 'low',
      pose: ['stomp_w', 'stomp_s'], launch: { vx: 4, vy: 10 }, knockback: 6,
    }),
    superMove({
      id: 'rampage', name: 'Rampage', damage: 42, hits: 4, color: ORANGE, interval: 7, charge: 30, teleportDist: 92,
      finalBonus: 170, hitbox: bx(10, 40, 130, 190),
    }),
  ],
  style: {
    scale: 1.2, bulk: 1.55, head: 'bald', body: 'brute', scar: true, trail: ORANGE,
    palette: {
      skin: '#7e9a5c', cloth: '#3a2a1c', clothDark: '#21170f', armor: '#5a4a3a', armorLight: '#8a7458',
      accent: '#ff7a1a', glow: ORANGE, hair: '#1a1a14', eye: '#ffd24a',
    },
  },
  skins: [
    { id: 'default', name: 'Pit Champion', palette: {}, unlock: 'default' },
    { id: 'toxic', name: 'Toxic Spill', unlock: 'arcade', palette: { skin: '#9ad34f', cloth: '#1c2a14', armor: '#3a5a2a', accent: '#d8ff3a', glow: '#e6ff7a' } },
  ],
  dialogue: {
    intro: ['I break things.', 'Come closer.', 'Small. Fragile.'],
    victory: ['Hah! Weak!', 'Next!'],
    defeat: ['Hurts... good...', 'Grrraah...'],
    taunts: ['Is that it?!', 'Hit me again!'],
  },
  finisherNames: ['Skull Crusher', 'Pit Verdict', 'Wasteland Roar'],
  finisherColor: ORANGE,
  aiBias: { zoning: 0.1, rushdown: 0.4, grappler: 0.5 },
});
