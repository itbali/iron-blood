import { FighterState, type AttackData, type GameEvent, type GameEventType, type MoveDef } from './types';
import { Fighter, type FighterCtx } from '../characters/Fighter';
import { anyOverlap, contactPoint, type Rect } from './HitboxSystem';
import { applyChip, chipDamage, comboScale, computeDamage } from './DamageSystem';
import { ComboSystem, type ComboEnd } from './ComboSystem';
import type { Projectile } from './Projectile';
import {
  HITSTOP_FINISHER, HITSTOP_HEAVY, HITSTOP_LIGHT, HITSTOP_SPECIAL, MAX_JUGGLES, METER_MAX, METER_ON_BLOCK,
  METER_ON_DEAL, METER_ON_PERFECT, METER_ON_TAKE, PERFECT_BLOCK_FRAMES,
} from '../data/constants';

export interface CombatWorld {
  fighters: [Fighter, Fighter];
  projectiles: Projectile[];
  combo: ComboSystem;
  ctxFor(f: Fighter): FighterCtx;
  emit(type: GameEventType, f: Fighter, strength: GameEvent['strength'], extra?: Partial<GameEvent>): void;
  addHitstop(frames: number): void;
  onComboEnd(end: ComboEnd): void;
}

type Outcome = 'miss' | 'hit' | 'block' | 'perfect' | 'armor' | 'counter';

interface StrikeSource {
  attacker: Fighter;
  attack: AttackData;
  damage: number;
  launch?: { vx: number; vy: number };
  strength: GameEvent['strength'];
  moveId: string;
  move?: MoveDef;
  noBlock: boolean;
  isSuper: boolean;
  multiFinal: boolean;
  projectile: boolean;
  point: { x: number; y: number };
  attackerFacing: 1 | -1;
  hitstop?: number;
  color?: string;
}

interface Pending {
  attacker: Fighter;
  defender: Fighter;
  src: StrikeSource;
}

export class CombatSystem {
  /** Resolves one tick of combat. Both fighters' hits are gathered first so trades are symmetric. */
  resolve(world: CombatWorld): void {
    const [a, b] = world.fighters;
    const pending: Pending[] = [];

    for (const attacker of world.fighters) {
      const defender = attacker === a ? b : a;
      if (attacker.state === FighterState.GRAB && attacker.move?.grab && attacker.isActiveFrame()) {
        this.tryGrab(world, attacker, defender);
        continue;
      }
      const hit = this.collectStrike(attacker, defender);
      if (hit) pending.push({ attacker, defender, src: hit });
    }
    for (const p of pending) this.applyStrike(world, p.attacker, p.defender, p.src);

    this.resolveProjectiles(world);
  }

  private collectStrike(attacker: Fighter, defender: Fighter): StrikeSource | null {
    const m = attacker.move;
    if (!m || !attacker.isAttacking || m.hitboxes.length === 0) return null;
    if (!attacker.isActiveFrame()) return null;
    if (m.multiHit) {
      if (attacker.curFrame < attacker.nextHitFrame) return null;
    } else if (attacker.hitDone) return null;
    const hit = attacker.hitRects();
    const hurt = defender.hurtRects();
    if (!anyOverlap(hit, hurt)) return null;

    const a = m.attack;
    const last = m.multiHit ? attacker.curFrame >= a.startup + a.active - m.multiHit.interval : true;
    return {
      attacker,
      attack: a,
      damage: a.damage,
      launch: last ? m.launch : undefined,
      strength: m.kind === 'super' ? 'super' : m.kind === 'special' ? 'special' : a.damage >= 60 ? 'heavy' : 'light',
      moveId: m.id,
      move: m,
      noBlock: !!m.noBlock,
      isSuper: m.kind === 'super',
      multiFinal: !!m.multiHit && last,
      projectile: false,
      point: contactPoint(hit, hurt),
      attackerFacing: attacker.facing,
      hitstop: m.hitstop,
      color: m.trail,
    };
  }

  private tryGrab(world: CombatWorld, attacker: Fighter, defender: Fighter): void {
    const m = attacker.move;
    if (!m?.grab) return;
    const dx = Math.abs(defender.x - attacker.x);
    const front = (defender.x - attacker.x) * attacker.facing > -20;
    const bad =
      defender.airborne || defender.invulnerable || defender.grabbedBy ||
      defender.state === FighterState.HIT || defender.state === FighterState.HURT ||
      defender.state === FighterState.KNOCKDOWN || defender.state === FighterState.GETUP ||
      defender.state === FighterState.DEAD || defender.state === FighterState.THROW ||
      defender.state === FighterState.VICTORY;
    if (bad || !front || dx > m.grab.range + defender.def.pushWidth * 0.3) return;
    if (defender.state === FighterState.GRAB) {
      attacker.vx = -attacker.facing * 6;
      defender.vx = -defender.facing * 6;
      attacker.endMove();
      defender.endMove();
      attacker.landLag = 12;
      defender.landLag = 12;
      world.emit('tech', attacker, 'light', { victim: defender.slot });
      return;
    }
    world.combo.breakCombo(defender.slot);
    attacker.startThrow(defender, m, world.ctxFor(attacker));
    world.addHitstop(HITSTOP_LIGHT);
  }

  private resolveProjectiles(world: CombatWorld): void {
    const list = world.projectiles;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const attacker = world.fighters[p.owner];
      const defender = world.fighters[1 - p.owner];
      const rect: Rect = { x1: p.x - p.w / 2, x2: p.x + p.w / 2, y1: p.y - p.h / 2, y2: p.y + p.h / 2 };
      const hurt = defender.hurtRects();
      if (!anyOverlap([rect], hurt)) continue;
      const src: StrikeSource = {
        attacker,
        attack: p.attack,
        damage: p.damage,
        launch: p.launch,
        strength: 'special',
        moveId: p.moveId,
        noBlock: false,
        isSuper: false,
        multiFinal: false,
        projectile: true,
        point: contactPoint([rect], hurt),
        attackerFacing: p.facing,
        color: p.color,
      };
      const outcome = this.applyStrike(world, attacker, defender, src);
      if (outcome !== 'miss') list.splice(i, 1);
    }
  }

  private classify(defender: Fighter, src: StrikeSource): Outcome {
    const atk = src.attack;
    if (defender.invulnerable || defender.grabbedBy || defender.state === FighterState.THROW) return 'miss';
    if (defender.state === FighterState.DEAD || defender.state === FighterState.VICTORY) return 'miss';
    if (atk.hitLevel === 'high' && defender.isCrouching) return 'miss';
    if (defender.state === FighterState.HURT && defender.juggle >= MAX_JUGGLES) return 'miss';
    if (defender.counterActive && defender.move?.counter && !src.isSuper) return 'counter';
    if (defender.state === FighterState.BLOCK && !src.noBlock && !defender.airborne) {
      const blocked = atk.hitLevel === 'low' ? defender.blockLow : !defender.blockLow;
      if (blocked) {
        return defender.blockFrames <= PERFECT_BLOCK_FRAMES && defender.blockstun === 0 ? 'perfect' : 'block';
      }
    }
    if (defender.armorActive && defender.armorLeft > 0 && !src.isSuper) return 'armor';
    const passive = defender.def.passiveArmor;
    if (passive && src.damage < passive && !src.launch && !defender.inStun && defender.state !== FighterState.KNOCKDOWN && !src.isSuper) return 'armor';
    return 'hit';
  }

  private applyStrike(world: CombatWorld, attacker: Fighter, defender: Fighter, src: StrikeSource): Outcome {
    const outcome = this.classify(defender, src);
    if (outcome === 'miss') return outcome;
    const m = src.move;
    const pt = src.point;

    if (!src.projectile && m) {
      if (m.multiHit) attacker.nextHitFrame = attacker.curFrame + m.multiHit.interval;
      else attacker.hitDone = true;
    }
    const remaining = m ? m.attack.startup + m.attack.active + m.attack.recovery - attacker.moveFrame : 0;
    const dir = src.attackerFacing;

    switch (outcome) {
      case 'counter': {
        const resp = defender.move?.counter?.response;
        const next = resp ? defender.def.moves[resp] : undefined;
        if (!src.projectile && m) attacker.moveConnected = 'block';
        if (next) {
          defender.startMove(next, world.ctxFor(defender));
          defender.stepMove(world.ctxFor(defender));
          defender.facing = (dir * -1) as 1 | -1;
        }
        world.emit('counter', defender, 'special', { x: pt.x, y: pt.y, victim: attacker.slot, color: defender.move?.trail });
        world.addHitstop(HITSTOP_SPECIAL);
        return outcome;
      }
      case 'perfect': {
        defender.blockstun = 0;
        defender.meter = Math.min(METER_MAX, defender.meter + METER_ON_PERFECT);
        if (!src.projectile && m) {
          attacker.moveConnected = 'block';
          attacker.move = null;
          attacker.moveFrame = 0;
          attacker.strikeInvuln = false;
          attacker.state = FighterState.HIT;
          attacker.stateFrame = 0;
          attacker.hitstun = 26;
          attacker.vx = -dir * 5;
        }
        world.combo.breakCombo(attacker.slot);
        world.emit('perfect-block', defender, 'special', { x: pt.x, y: pt.y, victim: attacker.slot });
        world.addHitstop(HITSTOP_SPECIAL);
        return outcome;
      }
      case 'block': {
        const atk = src.attack;
        defender.blockstun = atk.blockstun;
        defender.vx = dir * atk.pushback;
        defender.hp = applyChip(defender.hp, chipDamage(src.damage * attacker.def.damageMult));
        defender.flash = 3;
        defender.meter = Math.min(METER_MAX, defender.meter + METER_ON_BLOCK);
        if (!src.projectile && m) {
          attacker.moveConnected = 'block';
          attacker.vx = -dir * atk.pushback * 0.5;
          attacker.lastAdvantage = atk.blockstun - remaining;
          attacker.lastResult = 'block';
        }
        world.combo.breakCombo(attacker.slot);
        world.emit('block', defender, src.strength === 'light' ? 'light' : 'heavy', { x: pt.x, y: pt.y, victim: defender.slot, facing: dir });
        world.addHitstop(src.hitstop ?? HITSTOP_LIGHT);
        return outcome;
      }
      case 'armor': {
        const dmg = Math.max(1, Math.round(src.damage * attacker.def.damageMult * 0.6));
        if (defender.armorActive) defender.armorLeft = Math.max(0, defender.armorLeft - 1);
        defender.loseHp(dmg);
        defender.flash = 6;
        if (defender.hp <= 0) {
          defender.applyHit({ damage: 0, hitstun: 0, knockback: 6, fromFacing: dir, launch: { vx: 6, vy: 10 } });
          world.emit('ko', attacker, 'heavy', { x: pt.x, y: pt.y, victim: defender.slot });
          world.addHitstop(HITSTOP_FINISHER);
        } else {
          world.emit('armor', defender, 'heavy', { x: pt.x, y: pt.y, victim: defender.slot, damage: dmg });
          world.addHitstop(HITSTOP_LIGHT);
        }
        if (!src.projectile && m) attacker.moveConnected = 'hit';
        return outcome;
      }
      default:
        break;
    }

    const prior = world.combo.hitsSoFar(attacker.slot);
    let dmg: number;
    if (src.isSuper) {
      const scale = Math.max(0.7, comboScale(prior));
      const bonus = src.multiFinal && m?.multiHit ? 1 + m.multiHit.finalBonus / Math.max(1, src.damage * 4) : 1;
      dmg = Math.max(1, Math.round(src.damage * attacker.def.damageMult * scale * bonus));
    } else {
      dmg = computeDamage(src.damage, attacker.def.damageMult, prior);
    }
    defender.applyHit({
      damage: dmg,
      hitstun: src.attack.hitstun,
      knockback: src.attack.knockback,
      fromFacing: dir,
      launch: src.launch,
    });
    world.combo.breakCombo(defender.slot);
    const hits = world.combo.register(attacker.slot, dmg);

    if (!src.isSuper) attacker.meter = Math.min(METER_MAX, attacker.meter + dmg * METER_ON_DEAL);
    defender.meter = Math.min(METER_MAX, defender.meter + dmg * METER_ON_TAKE);
    if (!src.projectile && m) {
      attacker.moveConnected = 'hit';
      attacker.lastAdvantage = src.attack.hitstun - remaining;
      attacker.lastResult = 'hit';
    }
    const ko = defender.hp <= 0;
    const strength = src.strength;
    world.emit('hit', attacker, strength, {
      x: pt.x, y: pt.y, victim: defender.slot, damage: dmg, moveId: src.moveId, facing: dir,
      color: src.color, combo: hits,
    });
    if (ko) {
      world.emit('ko', attacker, 'heavy', { x: pt.x, y: pt.y, victim: defender.slot, damage: dmg });
      world.addHitstop(HITSTOP_FINISHER);
    } else {
      const mid = !!m?.multiHit && !src.multiFinal;
      const frames = src.hitstop ?? (mid ? 2 : src.strength === 'special' || src.strength === 'super' ? HITSTOP_SPECIAL : src.strength === 'heavy' ? HITSTOP_HEAVY : HITSTOP_LIGHT);
      world.addHitstop(frames);
    }
    return outcome;
  }
}
