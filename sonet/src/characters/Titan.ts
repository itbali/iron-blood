import { buildCharacter } from './CharacterBuilder';
import { FORWARD_TAP, MOTION_QCB, MOTION_QCF } from '../data/motions';
import { bx, commandGrab, lungeMove, projectileMove, superMove } from '../data/moveFactory';

const AMBER = '#ffb13b';

export const TITAN = buildCharacter({
  id: 'titan',
  name: 'Titan',
  title: 'Siege Frame',
  bio: 'A demolition exo-frame bolted to a pilot who stopped asking when it would be switched off. Titan advances like a wall and hits like a collapsing one.',
  weapon: 'Hydraulic fists · Plating',
  styleText: 'Armored, powerful, slow',
  stats: { speed: 4, damage: 10, health: 9, difficulty: 'Medium' },
  height: 296,
  pushWidth: 100,
  tune: {
    reachP: 94, reachK: 100, speed: 2, power: 1, stun: 2, trail: AMBER, heavyArmor: true,
    heavyPunchPose: ['hammer_w', 'hammer_s'], heavyKickPose: ['stomp_w', 'stomp_s'],
  },
  specials: [
    projectileMove({
      id: 'rocketFist', name: 'Rocket Fist', seq: MOTION_QCF, button: 'sp1', startup: 22, recovery: 36, speed: 8.5,
      w: 96, h: 64, y: 135, damage: 96, color: AMBER, kind: 'orb', life: 90, hitstun: 30, knockback: 11,
    }),
    lungeMove({
      id: 'ramCharge', name: 'Ram Charge', seq: FORWARD_TAP, button: 'sp1', startup: 14, active: 14, recovery: 28,
      damage: 102, speed: 10.5, lungeFrom: 14, lungeTo: 30, hitbox: bx(30, 40, 125, 190), color: AMBER,
      armor: { from: 2, to: 18, hits: 1 }, knockback: 13, hitstun: 30, pose: ['dash_w', 'dash_s'],
    }),
    commandGrab({
      id: 'crushGrab', name: 'Crush Grab', seq: MOTION_QCB, button: 'sp2', range: 112, damage: 245, hits: 3,
      color: AMBER, duration: 60,
    }),
    lungeMove({
      id: 'pistonPunch', name: 'Piston Punch', button: 'sp1', startup: 14, active: 4, recovery: 26, damage: 108,
      speed: 4.5, lungeFrom: 10, lungeTo: 18, hitbox: bx(34, 110, 130, 90), color: AMBER,
      armor: { from: 3, to: 16, hits: 1 }, pose: ['cross_w', 'cross_s'], knockback: 12, hitstun: 28,
    }),
    lungeMove({
      id: 'quakeStomp', name: 'Quake Stomp', button: 'sp2', startup: 16, active: 4, recovery: 28, damage: 82,
      speed: 0, lungeFrom: 0, lungeTo: 0, hitbox: bx(0, 0, 175, 46), color: AMBER, hitLevel: 'low',
      pose: ['stomp_w', 'stomp_s'], launch: { vx: 4, vy: 10 }, knockback: 6,
    }),
    superMove({
      id: 'overdrive', name: 'Overdrive Barrage', damage: 40, hits: 5, color: AMBER, interval: 6, charge: 30,
      teleportDist: 96, finalBonus: 170, hitbox: bx(10, 40, 140, 190),
    }),
  ],
  style: {
    scale: 1.26, bulk: 1.6, head: 'helmet', body: 'mech', trail: AMBER,
    palette: {
      skin: '#6a727e', cloth: '#262a32', clothDark: '#15181d', armor: '#5d6573', armorLight: '#9aa4b4',
      accent: '#ffb13b', glow: AMBER, hair: '#101216', eye: '#ffb13b',
    },
  },
  skins: [
    { id: 'default', name: 'Siege Grey', palette: {}, unlock: 'default' },
    { id: 'crimson', name: 'Hazard Red', unlock: 'arcade', palette: { armor: '#8e1018', armorLight: '#d51f2b', accent: '#ffffff', glow: '#ffd0d0' } },
  ],
  dialogue: {
    intro: ['Systems online.', 'Stand clear.', 'Demolition begins.'],
    victory: ['Target flattened.', 'Cycle complete.'],
    defeat: ['Hydraulics... failing...', 'Power loss...'],
    taunts: ['Impact imminent.', 'Resistance noted.'],
  },
  finisherNames: ['Piston Verdict', 'Frame Collapse', 'Meltdown Protocol'],
  finisherColor: AMBER,
  aiBias: { zoning: 0.2, rushdown: 0.3, grappler: 0.5 },
});
