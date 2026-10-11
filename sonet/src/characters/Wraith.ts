import { buildCharacter } from './CharacterBuilder';
import { FORWARD_TAP, MOTION_QCB, MOTION_QCF } from '../data/motions';
import { bx, commandGrab, lungeMove, projectileMove, riseMove, superMove, teleportMove } from '../data/moveFactory';

const VIOLET = '#b36bff';

export const WRAITH = buildCharacter({
  id: 'wraith',
  name: 'Wraith',
  title: 'Restless Spirit',
  bio: 'Something that died in the arena long ago and never left. Wraith wears a stolen shape and plays with the fighters who feed it.',
  weapon: 'Spectral scythe · Illusion',
  styleText: 'Teleport, illusion, projectiles',
  stats: { speed: 9, damage: 6, health: 5, difficulty: 'Very Hard' },
  height: 246,
  pushWidth: 56,
  tune: { reachP: 86, reachK: 100, speed: 0, power: 1, stun: 0, trail: VIOLET },
  specials: [
    projectileMove({
      id: 'soulBolt', name: 'Soul Bolt', seq: MOTION_QCF, button: 'sp1', startup: 14, recovery: 24, speed: 10.5,
      w: 60, h: 60, y: 135, damage: 58, color: VIOLET, kind: 'orb', life: 85, hitstun: 22, knockback: 8,
    }),
    teleportMove({
      id: 'shadowStep', name: 'Shadow Step', seq: FORWARD_TAP, button: 'sp1', startup: 18, active: 3, recovery: 22,
      damage: 68, color: VIOLET, mode: 'behind', dist: 76, teleportFrame: 8, hitbox: bx(20, 100, 96, 90),
      pose: ['vanish', 'slash_s'], launch: { vx: 4, vy: 9 },
    }),
    commandGrab({
      id: 'soulDrain', name: 'Soul Drain', seq: MOTION_QCB, button: 'sp2', range: 96, damage: 175, hits: 3,
      color: VIOLET, duration: 56,
    }),
    lungeMove({
      id: 'phantomLunge', name: 'Phantom Lunge', button: 'sp1', startup: 10, active: 4, recovery: 20, damage: 58,
      speed: 11, lungeFrom: 9, lungeTo: 16, hitbox: bx(24, 90, 110, 90), color: VIOLET, pose: ['slash_w', 'slash_s'],
      knockback: 8, cancelInto: ['soulBolt'],
    }),
    riseMove({
      id: 'reapRise', name: 'Reap Rise', button: 'sp2', startup: 8, active: 6, recovery: 26, damage: 82,
      color: VIOLET, hitbox: bx(0, 30, 100, 210), pose: ['rise_w', 'rise_s'],
    }),
    superMove({
      id: 'nightTerror', name: 'Night Terror', damage: 22, hits: 6, color: VIOLET, interval: 4, charge: 24,
      teleportDist: 66, finalBonus: 130, hitbox: bx(10, 70, 110, 130), pose: ['charge', 'slash_s'],
    }),
  ],
  style: {
    scale: 1.04, bulk: 0.88, head: 'hood', body: 'wraith', cape: true, trail: VIOLET,
    palette: {
      skin: '#8fa0b8', cloth: '#1b1030', clothDark: '#0e0818', armor: '#3a2a58', armorLight: '#6a5a96',
      accent: '#a35bff', glow: VIOLET, hair: '#0a0612', eye: '#e8d4ff',
    },
  },
  skins: [
    { id: 'default', name: 'Veiled', palette: {}, unlock: 'default' },
    { id: 'pyre', name: 'Pyre Phantom', unlock: 'arcade', palette: { cloth: '#2a1008', armor: '#7a2a10', accent: '#ff7a2a', glow: '#ffb070', eye: '#ffe0b0' } },
  ],
  dialogue: {
    intro: ['You smell of fear.', 'Dance with me.', 'Death is patient.'],
    victory: ['Another soul.', 'Delicious.'],
    defeat: ['Fading... again...', 'Not the end...'],
    taunts: ['Boo.', 'Catch me.'],
  },
  finisherNames: ['Soul Harvest', 'Veil Rend', 'Eclipse of Ash'],
  finisherColor: VIOLET,
  aiBias: { zoning: 0.4, rushdown: 0.35, grappler: 0.25 },
});
