import { buildCharacter } from './CharacterBuilder';
import { FORWARD_TAP, MOTION_QCB, MOTION_QCF } from '../data/motions';
import { bx, commandGrab, lungeMove, projectileMove, riseMove, superMove, teleportMove } from '../data/moveFactory';

const EMBER = '#ff4a2a';

export const ARCHON = buildCharacter({
  id: 'archon',
  name: 'The Archon',
  title: 'Tournament Overlord',
  bio: 'The cybernetic architect of the Iron Blood circuit. Half machine, half hunger, he does not fight for the title. He fights to harvest.',
  weapon: 'Void plating · Dominion core',
  styleText: 'Armored boss, two phases',
  stats: { speed: 5, damage: 9, health: 10, difficulty: 'Boss' },
  height: 330,
  pushWidth: 110,
  healthOverride: 2000,
  passiveArmor: 28,
  phase2: { aggression: 1.5 },
  playable: false,
  boss: true,
  tune: {
    reachP: 100, reachK: 108, speed: 1, power: 1, stun: 2, trail: EMBER, heavyArmor: true,
    heavyPunchPose: ['hammer_w', 'hammer_s'], heavyKickPose: ['stomp_w', 'stomp_s'],
  },
  specials: [
    projectileMove({
      id: 'voidBolt', name: 'Void Bolt', seq: MOTION_QCF, button: 'sp1', startup: 18, recovery: 30, speed: 10,
      w: 110, h: 110, y: 140, damage: 92, color: EMBER, kind: 'orb', life: 90, hitstun: 28, knockback: 10,
    }),
    lungeMove({
      id: 'hellCharge', name: 'Hell Charge', seq: FORWARD_TAP, button: 'sp1', startup: 12, active: 14, recovery: 26,
      damage: 108, speed: 12, lungeFrom: 12, lungeTo: 28, hitbox: bx(30, 40, 135, 220), color: EMBER,
      armor: { from: 2, to: 16, hits: 1 }, knockback: 13, hitstun: 30, pose: ['dash_w', 'dash_s'],
    }),
    commandGrab({
      id: 'soulCrush', name: 'Soul Crush', seq: MOTION_QCB, button: 'sp2', range: 120, damage: 260, hits: 4,
      color: EMBER, duration: 64,
    }),
    lungeMove({
      id: 'gravityHammer', name: 'Gravity Hammer', button: 'sp1', startup: 15, active: 4, recovery: 28, damage: 118,
      speed: 4, lungeFrom: 10, lungeTo: 18, hitbox: bx(34, 140, 130, 130), color: EMBER,
      armor: { from: 3, to: 18, hits: 1 }, pose: ['hammer_w', 'hammer_s'], knockback: 12, hitstun: 30,
    }),
    riseMove({
      id: 'darkRise', name: 'Dark Rise', button: 'sp2', startup: 8, active: 6, recovery: 26, damage: 92,
      color: EMBER, hitbox: bx(0, 30, 120, 250), pose: ['rise_w', 'rise_s'],
    }),
    projectileMove({
      id: 'infernoWave', name: 'Inferno Wave', seq: MOTION_QCB, button: 'sp1', startup: 14, recovery: 24, speed: 13,
      w: 130, h: 50, y: 0, damage: 98, color: '#ff8a1c', kind: 'wave', life: 80, hitLevel: 'low', hitstun: 28,
      pose: ['stomp_w', 'stomp_s'], minPhase: 2, cooldown: 70,
    }),
    teleportMove({
      id: 'phaseBlink', name: 'Phase Blink', seq: FORWARD_TAP, button: 'sp2', startup: 20, active: 4, recovery: 22,
      damage: 96, color: '#ff8a1c', mode: 'behind', dist: 80, teleportFrame: 9, hitbox: bx(20, 100, 120, 120),
      pose: ['vanish', 'hammer_s'], minPhase: 2, cooldown: 80, launch: { vx: 6, vy: 11 },
    }),
    superMove({
      id: 'annihilation', name: 'Annihilation', damage: 30, hits: 8, color: EMBER, interval: 4, charge: 30,
      teleportDist: 100, finalBonus: 200, hitbox: bx(10, 40, 150, 220),
    }),
  ],
  style: {
    scale: 1.38, bulk: 1.7, head: 'crown', body: 'archon', cape: true, trail: EMBER,
    palette: {
      skin: '#7a6a72', cloth: '#140a16', clothDark: '#0a050c', armor: '#4a1620', armorLight: '#9a2a3c',
      accent: '#ff2a2a', glow: EMBER, hair: '#0a0a0a', eye: '#ff6a3a',
    },
  },
  skins: [
    { id: 'default', name: 'Dominion', palette: {}, unlock: 'default' },
    { id: 'void', name: 'Void Sovereign', unlock: 'arcade', palette: { armor: '#1a2a5a', armorLight: '#3a6ad0', accent: '#5ab0ff', glow: '#9ad0ff', eye: '#9ad0ff' } },
  ],
  dialogue: {
    intro: ['Your blood will power this city.', 'Kneel, contender.', 'Every champion ends here.'],
    victory: ['Harvest complete.', 'Pathetic.'],
    defeat: ['Impossible...', 'The core... fails...'],
    taunts: ['Crawl.', 'Is this all?'],
  },
  finisherNames: ['Core Collapse', 'Dominion Crush', 'Iron Eclipse'],
  finisherColor: EMBER,
  aiBias: { zoning: 0.3, rushdown: 0.5, grappler: 0.2 },
});
