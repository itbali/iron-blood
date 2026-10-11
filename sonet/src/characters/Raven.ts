import { buildCharacter } from './CharacterBuilder';
import { FORWARD_TAP, MOTION_QCF, MOTION_QCB } from '../data/motions';
import { bx, commandGrab, lungeMove, projectileMove, riseMove, superMove } from '../data/moveFactory';

const RED = '#ff3a46';

export const RAVEN = buildCharacter({
  id: 'raven',
  name: 'Raven',
  title: 'Former Mercenary',
  bio: 'A burned-out contractor who sold his last conscience to the underground circuit. Raven fights with energy-bladed gauntlets and a debt he can only pay in blood.',
  weapon: 'Combat gauntlets · Energy blades',
  styleText: 'Fast, aggressive, close range',
  stats: { speed: 8, damage: 7, health: 7, difficulty: 'Medium' },
  height: 240,
  pushWidth: 62,
  tune: { reachP: 84, reachK: 96, speed: 0, power: 1, stun: 0, trail: RED },
  specials: [
    lungeMove({
      id: 'bloodDash', name: 'Blood Dash', seq: FORWARD_TAP, button: 'sp1', startup: 6, active: 10, recovery: 18,
      damage: 70, speed: 20, lungeFrom: 6, lungeTo: 17, hitbox: bx(20, 110, 96, 70), color: RED, invuln: [2, 12],
      knockback: 11, hitstun: 26, blockstun: 16, pose: ['dash_w', 'dash_s'],
    }),
    projectileMove({
      id: 'crimsonSlash', name: 'Crimson Slash', seq: MOTION_QCF, button: 'sp1', startup: 14, recovery: 26,
      speed: 12, w: 76, h: 64, y: 120, damage: 72, color: RED, kind: 'slash', life: 70, pose: ['slash_w', 'slash_s'],
    }),
    commandGrab({
      id: 'executionGrab', name: 'Execution Grab', seq: MOTION_QCB, button: 'sp2', range: 100, damage: 190, hits: 4,
      color: RED, cinematic: true, duration: 64,
    }),
    lungeMove({
      id: 'bladeStrike', name: 'Blade Strike', button: 'sp1', startup: 12, active: 4, recovery: 20, damage: 68,
      speed: 7, lungeFrom: 10, lungeTo: 16, hitbox: bx(24, 100, 100, 80), color: RED, pose: ['slash_w', 'slash_s'],
      knockback: 9, cancelInto: ['bloodDash', 'crimsonSlash'],
    }),
    riseMove({
      id: 'risingCutter', name: 'Rising Cutter', button: 'sp2', startup: 7, active: 6, recovery: 26, damage: 78,
      color: RED, hitbox: bx(10, 40, 80, 190), invuln: [1, 9],
    }),
    superMove({
      id: 'bloodRush', name: 'Blood Rush', damage: 26, hits: 5, color: RED, finalBonus: 120, teleportDist: 66,
      hitbox: bx(10, 70, 100, 130),
    }),
  ],
  style: {
    scale: 1, bulk: 1, head: 'short-hair', body: 'tactical', scar: true, trail: RED,
    palette: {
      skin: '#c9a27e', cloth: '#16181e', clothDark: '#0b0c10', armor: '#3b404c', armorLight: '#6a7080',
      accent: '#d51f2b', glow: RED, hair: '#14100e', eye: '#e7e7e7',
    },
  },
  skins: [
    { id: 'default', name: 'Black Ops', palette: {}, unlock: 'default' },
    { id: 'ghost', name: 'Crimson Ghost', unlock: 'arcade', palette: { cloth: '#d8d8de', clothDark: '#a8a8b2', armor: '#8e1018', armorLight: '#d51f2b', accent: '#ff8a1c', glow: '#ffb347' } },
  ],
  dialogue: {
    intro: ["Let's end this.", 'You picked the wrong fight.', 'Make it quick.'],
    victory: ['Another one down.', 'Stay down.', 'The city remembers.'],
    defeat: ['Not... yet...', 'Tell them I tried.'],
    taunts: ['Is that all?', 'Come on!'],
  },
  finisherNames: ['Crimson Execution', 'Gauntlet Breaker', 'Red Eclipse'],
  finisherColor: RED,
  aiBias: { zoning: 0.25, rushdown: 0.6, grappler: 0.15 },
});
