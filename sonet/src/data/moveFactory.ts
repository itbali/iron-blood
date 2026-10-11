import type {
  AttackData, Box, ButtonId, HitLevel, Hurtboxes, MotionDir, MoveDef, PoseId, SfxId,
} from '../combat/types';

export const bx = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

export interface Tune {
  scale: number;
  reachP: number;
  reachK: number;
  /** Frames added to every startup (negative = faster). */
  speed: number;
  power: number;
  /** Frames added to hitstun. */
  stun: number;
  trail: string;
  specials: string[];
  heavyArmor?: boolean;
  heavyPunchPose?: [PoseId, PoseId];
  heavyKickPose?: [PoseId, PoseId];
  lightKickPose?: [PoseId, PoseId];
}

const startupOf = (base: number, t: Tune): number => Math.max(3, base + t.speed);

export function standardMoves(t: Tune): Record<string, MoveDef> {
  const s = t.scale;
  const dmg = (n: number): number => Math.round(n * t.power);
  const cancels = (...ids: string[]): string[] => [...ids, ...t.specials];
  const m: Record<string, MoveDef> = {};

  const atk = (
    startup: number, active: number, recovery: number, damage: number, hitstun: number,
    blockstun: number, knockback: number, pushback: number, hitLevel: HitLevel, cancelInto?: string[],
  ): AttackData => ({
    startup: startupOf(startup, t), active, recovery, damage: dmg(damage), hitstun: hitstun + t.stun,
    blockstun, knockback, pushback, hitLevel, cancelInto,
  });

  m.lightPunch = {
    id: 'lightPunch', name: 'Light Punch', kind: 'normal', stance: 'stand', button: 'lp',
    attack: atk(5, 3, 9, 30, 15, 10, 3, 5, 'high', cancels('lightPunch2', 'heavyPunch', 'lightKick', 'heavyKick')),
    hitboxes: [bx(28 * s, 150 * s, t.reachP, 36 * s)],
    anim: { wind: 'jab_w', strike: 'jab_s' }, sfx: 'punch', trail: t.trail,
  };
  m.lightPunch2 = {
    id: 'lightPunch2', name: 'Light Punch 2', kind: 'normal', stance: 'stand', button: 'lp', chainOnly: true,
    attack: atk(4, 3, 10, 32, 16, 10, 3, 6, 'mid', cancels('heavyPunch', 'heavyKick', 'lightKick')),
    hitboxes: [bx(26 * s, 140 * s, t.reachP, 38 * s)],
    anim: { wind: 'jab2_w', strike: 'jab2_s' }, sfx: 'punch', trail: t.trail,
  };
  m.heavyPunch = {
    id: 'heavyPunch', name: 'Heavy Punch', kind: 'normal', stance: 'stand', button: 'hp',
    attack: atk(10, 4, 18, 80, 24, 14, 8, 8, 'mid', cancels('heavyKick')),
    hitboxes: [bx(28 * s, 130 * s, t.reachP + 14 * s, 50 * s)],
    anim: { wind: t.heavyPunchPose?.[0] ?? 'cross_w', strike: t.heavyPunchPose?.[1] ?? 'cross_s' },
    sfx: 'heavy-hit', trail: t.trail,
    armor: t.heavyArmor ? { from: 4, to: 12, hits: 1 } : undefined,
    lunge: [{ from: 6, to: 11, vx: 3.2 }],
  };
  m.lightKick = {
    id: 'lightKick', name: 'Light Kick', kind: 'normal', stance: 'stand', button: 'lk',
    attack: atk(6, 3, 10, 35, 16, 10, 4, 6, 'mid', cancels('heavyPunch', 'heavyKick')),
    hitboxes: [bx(26 * s, 70 * s, t.reachK, 50 * s)],
    anim: { wind: t.lightKickPose?.[0] ?? 'front_w', strike: t.lightKickPose?.[1] ?? 'front_s' }, sfx: 'kick', trail: t.trail,
  };
  m.heavyKick = {
    id: 'heavyKick', name: 'Heavy Kick', kind: 'normal', stance: 'stand', button: 'hk',
    attack: atk(11, 4, 20, 85, 26, 15, 10, 10, 'high', t.specials),
    hitboxes: [bx(20 * s, 100 * s, t.reachK + 16 * s, 70 * s)],
    anim: { wind: t.heavyKickPose?.[0] ?? 'round_w', strike: t.heavyKickPose?.[1] ?? 'round_s' },
    sfx: 'heavy-hit', trail: t.trail, launch: { vx: 6, vy: 9 },
    armor: t.heavyArmor ? { from: 5, to: 14, hits: 1 } : undefined,
  };

  m.crouchLP = {
    id: 'crouchLP', name: 'Crouch Light Punch', kind: 'normal', stance: 'crouch', button: 'lp',
    attack: atk(5, 3, 8, 26, 14, 9, 2, 4, 'mid', cancels('crouchLP', 'crouchHP', 'crouchLK')),
    hitboxes: [bx(28 * s, 60 * s, t.reachP - 8 * s, 34 * s)],
    anim: { wind: 'cjab_w', strike: 'cjab_s' }, sfx: 'punch', trail: t.trail,
  };
  m.crouchHP = {
    id: 'crouchHP', name: 'Uppercut', kind: 'normal', stance: 'crouch', button: 'hp',
    attack: atk(8, 4, 20, 72, 24, 14, 3, 5, 'mid', t.specials),
    hitboxes: [bx(10 * s, 70 * s, 60 * s, 130 * s)],
    anim: { wind: 'upper_w', strike: 'upper_s' }, sfx: 'heavy-hit', trail: t.trail,
    launch: { vx: 3, vy: 14 }, invuln: undefined,
  };
  m.crouchLK = {
    id: 'crouchLK', name: 'Crouch Light Kick', kind: 'normal', stance: 'crouch', button: 'lk',
    attack: atk(6, 3, 10, 28, 15, 10, 2, 5, 'low', cancels('crouchLK', 'crouchHK', 'lightPunch')),
    hitboxes: [bx(26 * s, 0, t.reachK, 26 * s)],
    anim: { wind: 'clow_w', strike: 'clow_s' }, sfx: 'kick', trail: t.trail,
  };
  m.crouchHK = {
    id: 'crouchHK', name: 'Sweep', kind: 'normal', stance: 'crouch', button: 'hk',
    attack: atk(11, 4, 22, 62, 26, 15, 4, 8, 'low', t.specials),
    hitboxes: [bx(20 * s, 0, t.reachK + 22 * s, 30 * s)],
    anim: { wind: 'sweep_w', strike: 'sweep_s' }, sfx: 'heavy-hit', trail: t.trail,
    launch: { vx: 5, vy: 6 },
  };

  m.jumpP = {
    id: 'jumpP', name: 'Jump Punch', kind: 'normal', stance: 'air', button: 'lp',
    attack: atk(4, 10, 10, 45, 18, 12, 5, 6, 'mid'),
    hitboxes: [bx(20 * s, 40 * s, t.reachP - 10 * s, 70 * s)],
    anim: { wind: 'airp_w', strike: 'airp_s' }, sfx: 'punch', trail: t.trail, landCancel: true,
  };
  m.jumpK = {
    id: 'jumpK', name: 'Jump Kick', kind: 'normal', stance: 'air', button: 'lk',
    attack: atk(6, 10, 10, 52, 20, 12, 7, 7, 'mid'),
    hitboxes: [bx(10 * s, 10 * s, t.reachK, 70 * s)],
    anim: { wind: 'airk_w', strike: 'airk_s' }, sfx: 'kick', trail: t.trail, landCancel: true,
  };

  m.grab = {
    id: 'grab', name: 'Grab', kind: 'grab', stance: 'stand',
    attack: { startup: startupOf(6, t), active: 3, recovery: 24, damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid' },
    hitboxes: [],
    anim: { wind: 'grab_w', strike: 'grab_w' }, sfx: 'whoosh',
    grab: {
      range: 92 * s, duration: 40, hits: [{ frame: 20, damage: dmg(90), fx: 'slam' }],
      launch: { vx: 7, vy: 9 }, techable: true,
    },
  };
  return m;
}

export interface ProjectileOpts {
  id: string; name: string; seq: MotionDir[]; button: ButtonId; startup: number; recovery: number;
  speed: number; w: number; h: number; y: number; damage: number; color: string; kind: 'slash' | 'orb' | 'wave';
  hitLevel?: HitLevel; life?: number; hitstun?: number; knockback?: number; pose?: [PoseId, PoseId]; meterGain?: number;
  cooldown?: number; minPhase?: number; sfx?: SfxId; launch?: { vx: number; vy: number };
}

export function projectileMove(o: ProjectileOpts): MoveDef {
  return {
    id: o.id, name: o.name, kind: 'special', stance: 'stand',
    command: { seq: o.seq, button: o.button },
    attack: {
      startup: o.startup, active: 1, recovery: o.recovery, damage: o.damage, hitstun: o.hitstun ?? 22,
      blockstun: 14, knockback: o.knockback ?? 8, pushback: 7, hitLevel: o.hitLevel ?? 'mid',
    },
    hitboxes: [],
    anim: { wind: o.pose?.[0] ?? 'cast_w', strike: o.pose?.[1] ?? 'cast_s' },
    projectile: { frame: o.startup, speed: o.speed, x: 60, y: o.y, w: o.w, h: o.h, life: o.life ?? 80, color: o.color, kind: o.kind, damage: o.damage },
    sfx: 'projectile', trail: o.color, cooldown: o.cooldown ?? 36, minPhase: o.minPhase, launch: o.launch,
  };
}

export interface LungeOpts {
  id: string; name: string; seq?: MotionDir[]; button: ButtonId; startup: number; active: number; recovery: number;
  damage: number; speed: number; lungeFrom: number; lungeTo: number; hitbox: Box; color: string;
  hitLevel?: HitLevel; invuln?: [number, number]; armor?: { from: number; to: number; hits: number };
  pose?: [PoseId, PoseId]; knockback?: number; hitstun?: number; blockstun?: number; launch?: { vx: number; vy: number };
  cooldown?: number; minPhase?: number; stance?: 'stand'; cancelInto?: string[]; chargeFx?: [number, number];
}

export function lungeMove(o: LungeOpts): MoveDef {
  return {
    id: o.id, name: o.name, kind: 'special', stance: 'stand',
    command: o.seq ? { seq: o.seq, button: o.button } : undefined,
    button: o.seq ? undefined : o.button,
    attack: {
      startup: o.startup, active: o.active, recovery: o.recovery, damage: o.damage, hitstun: o.hitstun ?? 24,
      blockstun: o.blockstun ?? 16, knockback: o.knockback ?? 10, pushback: 9, hitLevel: o.hitLevel ?? 'mid',
      cancelInto: o.cancelInto,
    },
    hitboxes: [o.hitbox],
    anim: { wind: o.pose?.[0] ?? 'dash_w', strike: o.pose?.[1] ?? 'dash_s' },
    lunge: [{ from: o.lungeFrom, to: o.lungeTo, vx: o.speed }],
    invuln: o.invuln, armor: o.armor, launch: o.launch,
    sfx: 'special', trail: o.color, cooldown: o.cooldown ?? 30, minPhase: o.minPhase, charge: o.chargeFx,
  };
}

export interface RiseOpts {
  id: string; name: string; button: ButtonId; seq?: MotionDir[]; startup: number; active: number; recovery: number;
  damage: number; color: string; invuln?: [number, number]; pose?: [PoseId, PoseId]; hitbox: Box; cooldown?: number; minPhase?: number;
}

export function riseMove(o: RiseOpts): MoveDef {
  return {
    id: o.id, name: o.name, kind: 'special', stance: 'stand',
    command: o.seq ? { seq: o.seq, button: o.button } : undefined,
    button: o.seq ? undefined : o.button,
    attack: {
      startup: o.startup, active: o.active, recovery: o.recovery, damage: o.damage, hitstun: 30,
      blockstun: 18, knockback: 4, pushback: 6, hitLevel: 'mid',
    },
    hitboxes: [o.hitbox],
    anim: { wind: o.pose?.[0] ?? 'rise_w', strike: o.pose?.[1] ?? 'rise_s' },
    lunge: [{ from: o.startup, to: o.startup + 3, vx: 2.5, vy: 11 }],
    invuln: o.invuln ?? [1, o.startup + 2],
    launch: { vx: 3, vy: 15 }, sfx: 'special', trail: o.color, cooldown: o.cooldown ?? 50, minPhase: o.minPhase,
  };
}

export interface CounterOpts {
  id: string; name: string; button: ButtonId; seq?: MotionDir[]; duration: number; from: number; to: number;
  response: string; color: string; cooldown?: number;
}

export function counterMove(o: CounterOpts): MoveDef {
  return {
    id: o.id, name: o.name, kind: 'special', stance: 'stand',
    command: o.seq ? { seq: o.seq, button: o.button } : undefined,
    button: o.seq ? undefined : o.button,
    attack: { startup: o.duration, active: 0, recovery: 14, damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid' },
    hitboxes: [],
    anim: { wind: 'counter_w', strike: 'counter_w' },
    counter: { from: o.from, to: o.to, response: o.response },
    sfx: 'whoosh', trail: o.color, cooldown: o.cooldown ?? 50,
  };
}

export interface GrabOpts {
  id: string; name: string; seq: MotionDir[]; button: ButtonId; range: number; damage: number;
  hits: number; color?: string; cinematic?: boolean; duration?: number; launch?: { vx: number; vy: number }; minPhase?: number;
}

export function commandGrab(o: GrabOpts): MoveDef {
  const duration = o.duration ?? 56;
  const hits: { frame: number; damage: number; fx: 'strike' | 'slam' | 'slash' }[] = [];
  const strikeDmg = Math.round((o.damage * 0.5) / Math.max(1, o.hits - 1));
  for (let i = 0; i < o.hits - 1; i++) {
    hits.push({ frame: 12 + i * Math.floor((duration - 24) / Math.max(1, o.hits - 1)), damage: strikeDmg, fx: i % 2 ? 'slash' : 'strike' });
  }
  hits.push({ frame: duration - 6, damage: Math.round(o.damage * 0.5), fx: 'slam' });
  return {
    id: o.id, name: o.name, kind: 'grab', stance: 'stand',
    command: { seq: o.seq, button: o.button },
    attack: { startup: 9, active: 3, recovery: 30, damage: 0, hitstun: 0, blockstun: 0, knockback: 0, pushback: 0, hitLevel: 'mid' },
    hitboxes: [],
    anim: { wind: 'grab_w', strike: 'grab_w' },
    grab: { range: o.range, duration, hits, launch: o.launch ?? { vx: 8, vy: 10 }, techable: false, cinematic: o.cinematic ?? true },
    sfx: 'grab', trail: o.color, cooldown: 60, minPhase: o.minPhase,
  };
}

export interface TeleportOpts {
  id: string; name: string; button: ButtonId; seq?: MotionDir[]; startup: number; active: number; recovery: number;
  damage: number; color: string; mode: 'behind' | 'front'; dist: number; teleportFrame: number; hitbox: Box;
  pose?: [PoseId, PoseId]; cooldown?: number; hitstun?: number; minPhase?: number; knockback?: number;
  launch?: { vx: number; vy: number }; multi?: { interval: number; finalBonus: number };
}

export function teleportMove(o: TeleportOpts): MoveDef {
  return {
    id: o.id, name: o.name, kind: 'special', stance: 'stand',
    command: o.seq ? { seq: o.seq, button: o.button } : undefined,
    button: o.seq ? undefined : o.button,
    attack: {
      startup: o.startup, active: o.active, recovery: o.recovery, damage: o.damage, hitstun: o.hitstun ?? 22,
      blockstun: 14, knockback: o.knockback ?? 8, pushback: 7, hitLevel: 'mid',
    },
    hitboxes: [o.hitbox],
    anim: { wind: o.pose?.[0] ?? 'vanish', strike: o.pose?.[1] ?? 'slash_s' },
    teleport: { frame: o.teleportFrame, mode: o.mode, dist: o.dist },
    invuln: [1, o.teleportFrame + 1], sfx: 'teleport', trail: o.color, cooldown: o.cooldown ?? 60,
    launch: o.launch, minPhase: o.minPhase, multiHit: o.multi,
  };
}

export interface SuperOpts {
  id: string; name: string; damage: number; hits: number; color: string; interval?: number; charge?: number;
  teleportDist?: number; finalBonus?: number; pose?: [PoseId, PoseId]; hitbox: Box;
}

export function superMove(o: SuperOpts): MoveDef {
  const charge = o.charge ?? 26;
  const interval = o.interval ?? 4;
  return {
    id: o.id, name: o.name, kind: 'super', stance: 'stand', superInput: true,
    attack: {
      startup: charge + 2, active: interval * o.hits, recovery: 34, damage: o.damage, hitstun: 20,
      blockstun: 14, knockback: 3, pushback: 4, hitLevel: 'mid',
    },
    hitboxes: [o.hitbox],
    anim: { wind: o.pose?.[0] ?? 'charge', strike: o.pose?.[1] ?? 'flurry_s' },
    teleport: { frame: charge, mode: 'front', dist: o.teleportDist ?? 70 },
    invuln: [0, charge + 2], charge: [0, charge], meterCost: 100,
    multiHit: { interval, finalBonus: o.finalBonus ?? 130 },
    launch: { vx: 9, vy: 12 }, sfx: 'super', trail: o.color, cooldown: 0, noCancel: true,
  };
}

export function hurtboxesFor(h: number, w: number): Hurtboxes {
  const half = w / 2;
  return {
    stand: [
      bx(-half * 0.8, h * 0.8, half * 1.6, h * 0.2),
      bx(-half, h * 0.4, w, h * 0.42),
      bx(-half * 0.95, 0, w * 0.95, h * 0.42),
    ],
    crouch: [
      bx(-half * 0.8, h * 0.52, half * 1.6, h * 0.18),
      bx(-half, h * 0.24, w, h * 0.3),
      bx(-half, 0, w, h * 0.26),
    ],
    air: [
      bx(-half * 0.8, h * 0.75, half * 1.6, h * 0.22),
      bx(-half, h * 0.3, w, h * 0.46),
      bx(-half * 0.9, 0, w * 0.9, h * 0.32),
    ],
    down: [bx(-h * 0.45, 0, h * 0.9, h * 0.14)],
  };
}
