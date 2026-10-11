import { buildCharacter } from './CharacterBuilder';
import { FORWARD_TAP, MOTION_QCB, MOTION_QCF } from '../data/motions';
import { bx, commandGrab, lungeMove, projectileMove, riseMove, superMove, teleportMove } from '../data/moveFactory';

const CYAN = '#4fe8ff';

export const VERA = buildCharacter({
  id: 'vera',
  name: 'Vera',
  title: 'Cybernetic Assassin',
  bio: 'A corporate kill-unit that outlived its owners. Vera blinks through shadows and picks fights apart with surgical speed, but her chassis shatters under pressure.',
  weapon: 'Mono-wire blades · Phase coil',
  styleText: 'Fastest striker, teleport, ranged',
  stats: { speed: 10, damage: 5, health: 5, difficulty: 'Hard' },
  height: 232,
  pushWidth: 54,
  tune: { reachP: 88, reachK: 106, speed: -1, power: 1, stun: 0, trail: CYAN },
  specials: [
    projectileMove({
      id: 'pulseShot', name: 'Pulse Shot', seq: MOTION_QCF, button: 'sp1', startup: 11, recovery: 22, speed: 17,
      w: 44, h: 44, y: 130, damage: 50, color: CYAN, kind: 'orb', life: 60, hitstun: 18, knockback: 6,
    }),
    teleportMove({
      id: 'phaseStep', name: 'Phase Step', seq: FORWARD_TAP, button: 'sp1', startup: 18, active: 3, recovery: 22,
      damage: 64, color: CYAN, mode: 'behind', dist: 74, teleportFrame: 8, hitbox: bx(20, 100, 92, 80), pose: ['vanish', 'slash_s'],
    }),
    commandGrab({
      id: 'neuralOverload', name: 'Neural Overload', seq: MOTION_QCB, button: 'sp2', range: 94, damage: 160, hits: 3,
      color: CYAN, duration: 52,
    }),
    lungeMove({
      id: 'wireLash', name: 'Wire Lash', button: 'sp1', startup: 9, active: 3, recovery: 16, damage: 54,
      speed: 10, lungeFrom: 8, lungeTo: 13, hitbox: bx(24, 90, 118, 80), color: CYAN, pose: ['slash_w', 'slash_s'],
      knockback: 7, cancelInto: ['pulseShot'],
    }),
    riseMove({
      id: 'flipKick', name: 'Flip Kick', button: 'sp2', startup: 6, active: 5, recovery: 24, damage: 66,
      color: CYAN, hitbox: bx(10, 40, 80, 190), pose: ['rise_w', 'rise_s'],
    }),
    superMove({
      id: 'zeroHour', name: 'Zero Hour', damage: 18, hits: 7, color: CYAN, interval: 3, charge: 22, teleportDist: 60,
      finalBonus: 110, hitbox: bx(10, 70, 110, 130),
    }),
  ],
  style: {
    scale: 0.97, bulk: 0.85, head: 'visor', body: 'cyber', trail: CYAN,
    palette: {
      skin: '#d9b9a0', cloth: '#0f1829', clothDark: '#080c16', armor: '#2b3a55', armorLight: '#6f86ad',
      accent: '#35c8e6', glow: CYAN, hair: '#0b0e14', eye: CYAN,
    },
  },
  skins: [
    { id: 'default', name: 'Unit 07', palette: {}, unlock: 'default' },
    { id: 'rogue', name: 'Rogue Signal', unlock: 'arcade', palette: { cloth: '#26102a', armor: '#5a2a6a', accent: '#ff4fd8', glow: '#ff8ae8', eye: '#ff8ae8' } },
  ],
  dialogue: {
    intro: ['Target acquired.', 'Calculating your end.', 'You are slow.'],
    victory: ['Threat neutralized.', 'Efficiency: optimal.'],
    defeat: ['System... failing...', 'Error. Error.'],
    taunts: ['Predictable.', 'Try again.'],
  },
  finisherNames: ['Zero Point', 'Wire Dissection', 'Blackout Protocol'],
  finisherColor: CYAN,
  aiBias: { zoning: 0.45, rushdown: 0.4, grappler: 0.15 },
});
