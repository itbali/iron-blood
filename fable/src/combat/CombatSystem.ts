import {
  BLOCK_METER_GAIN,
  DAMAGE_TAKEN_METER_RATIO,
  HITSTUN_AIR_BONUS,
  PERFECT_BLOCK_ADVANTAGE,
  PERFECT_BLOCK_METER,
  PERFECT_BLOCK_WINDOW,
  PROJECTILE_HITSTOP,
  STAGE_HALF_WIDTH,
} from '@/core/constants';
import type { Emitter } from '@/core/events';
import { attackTotalFrames, type AttackData } from './AttackData';
import { ComboSystem } from './ComboSystem';
import { calculateDamage, chipRatioFor } from './DamageSystem';
import type { Fighter } from './Fighter';
import { FighterState, STUN_STATES } from './FighterState';
import { boxesOverlap, getHitboxes, getHurtboxes, overlapCenter } from './HitboxSystem';
import type { Projectile } from './Projectile';
import type { SimContext, SimEvents } from './SimContext';
import { Btn, hasButton } from '@/input/InputFrame';

export interface HitOutcome {
  blocked: boolean;
  perfect: boolean;
  armored: boolean;
  damage: number;
}

/** Resolves collisions between attacks and bodies and applies the resulting state changes. */
export class CombatSystem {
  private ctx: SimContext | null = null;

  constructor(
    private events: Emitter<SimEvents>,
    private combos: ComboSystem,
  ) {}

  setContext(ctx: SimContext): void {
    this.ctx = ctx;
  }

  /** Checks melee hitboxes of `attacker` against `defender`. Returns the hit stop to apply, 0 if nothing happened. */
  resolveMelee(attacker: Fighter, defender: Fighter, frame: number): number {
    if (!attacker.hitboxesActive || !attacker.currentAttack) return 0;
    const hitboxes = getHitboxes(attacker);
    const hurtboxes = getHurtboxes(defender);
    for (const hb of hitboxes) {
      for (const hurt of hurtboxes) {
        if (!boxesOverlap(hb, hurt)) continue;
        const point = overlapCenter(hb, hurt);
        const attack = attacker.currentAttack;
        attacker.hitsLanded++;
        attacker.lastHitFrame = attacker.attackFrame;
        if (defender.counterActive && attack.category !== 'super') {
          this.triggerCounter(defender, attacker);
          attacker.attackHit = true;
          return attack.hitStop;
        }
        const outcome = this.applyHit(attacker, defender, attack, point.x, point.y, frame);
        if (outcome.blocked) attacker.attackBlocked = true;
        else attacker.attackHit = true;
        return outcome.perfect ? 0 : attack.hitStop;
      }
    }
    return 0;
  }

  resolveProjectile(p: Projectile, owner: Fighter, defender: Fighter, frame: number): number {
    const hurtboxes = getHurtboxes(defender);
    const box = p.box;
    for (const hurt of hurtboxes) {
      if (!boxesOverlap(box, hurt)) continue;
      const point = overlapCenter(box, hurt);
      const attack: AttackData = {
        ...p.attack,
        damage: p.spec.damage,
        hitstun: p.spec.hitstun,
        blockstun: p.spec.blockstun,
        knockback: p.spec.knockback,
        hitLevel: p.spec.hitLevel,
        hitStop: PROJECTILE_HITSTOP,
        grab: undefined,
      };
      if (!p.spec.pierce) p.alive = false;
      const outcome = this.applyHit(owner, defender, attack, point.x, point.y, frame, p);
      return outcome.perfect ? 0 : PROJECTILE_HITSTOP;
    }
    return 0;
  }

  /** Damage pulse from a throw; the final pulse releases the opponent with knockback. */
  resolveThrowHit(attacker: Fighter, defender: Fighter, attack: AttackData, isLast: boolean, frame: number): void {
    const grab = attack.grab;
    if (!grab) return;
    const pulses = grab.pulses ?? 1;
    const base = Math.round(grab.damage / pulses);
    const comboHits = this.combos.tracks[attacker.side].active ? this.combos.tracks[attacker.side].hits : 0;
    const { damage, critical } = calculateDamage({
      baseDamage: base,
      attackerScale: attacker.config.damageScale * attacker.damageBonus,
      comboHits,
      blocked: false,
      perfectBlock: false,
      armored: false,
      chipRatio: 0,
      counterHit: false,
    });
    const dealt = defender.applyDamage(damage);
    attacker.addMeter(attack.meterGain / pulses);
    defender.addMeter(dealt * DAMAGE_TAKEN_METER_RATIO);
    defender.visual.flash = 6;
    this.combos.registerHit(attacker.side, dealt, true);
    this.events.emit('hit', {
      attacker,
      defender,
      attack,
      damage: dealt,
      blocked: false,
      perfect: false,
      armored: false,
      critical: critical && isLast,
      counterHit: false,
      x: defender.x,
      y: defender.y + defender.config.pushbox.h * 0.6,
    });
    void frame;
  }

  private triggerCounter(defender: Fighter, attacker: Fighter): void {
    const spec = defender.currentAttack?.counter;
    if (!spec) return;
    const counterAttack = defender.config.attacks[spec.attackId];
    if (!counterAttack) return;
    defender.counterActive = false;
    defender.invuln = 4;
    attacker.visual.flash = 4;
    this.events.emit('counter', { fighter: defender });
    if (this.ctx) defender.startAttack(counterAttack, this.ctx);
  }

  private applyHit(attacker: Fighter, defender: Fighter, attack: AttackData, x: number, y: number, frame: number, projectile?: Projectile): HitOutcome {
    const victimInStun = STUN_STATES.has(defender.state) || defender.state === FighterState.HURT || defender.airborne;
    const blocking = isBlocking(defender);
    const blocked = blocking && blockCovers(defender, attack);
    const perfect = blocked && frame - defender.blockPressedFrame <= PERFECT_BLOCK_WINDOW && defender.state === FighterState.BLOCK;
    const armored = !blocked && defender.hasArmor;
    const counterHit = !blocked && defender.isAttacking && defender.attackPhase === 'startup';
    const comboHits = this.combos.tracks[attacker.side].active ? this.combos.tracks[attacker.side].hits : 0;

    const { damage, critical } = calculateDamage({
      baseDamage: attack.damage,
      attackerScale: attacker.config.damageScale * attacker.damageBonus,
      comboHits,
      blocked,
      perfectBlock: perfect,
      armored,
      chipRatio: chipRatioFor(attack),
      counterHit,
    });
    const dealt = defender.applyDamage(damage);
    // Frame advantage = defender stun minus the attacker's remaining attack frames (for the training display).
    if (attacker.currentAttack && !projectile) {
      const remaining = attackTotalFrames(attacker.currentAttack) - attacker.attackFrame + attacker.extraRecovery;
      const stunApplied = perfect ? -PERFECT_BLOCK_ADVANTAGE : blocked ? attack.blockstun : attack.hitstun;
      attacker.lastFrameAdvantage = stunApplied - remaining;
    }

    const dir = attacker.x <= defender.x ? 1 : -1;
    const defenderAtWall = Math.abs(defender.x) >= STAGE_HALF_WIDTH - defender.config.pushbox.w / 2 - 2;

    if (perfect) {
      defender.addMeter(PERFECT_BLOCK_METER);
      attacker.extraRecovery += PERFECT_BLOCK_ADVANTAGE;
      attacker.addMeter(attack.meterGain * 0.25);
      if (!projectile) attacker.vx = -dir * attack.pushback * 0.5;
      defender.visual.flash = 8;
    } else if (blocked) {
      defender.addMeter(BLOCK_METER_GAIN);
      attacker.addMeter(attack.meterGain * 0.5);
      defender.stun = attack.blockstun;
      defender.wasCrouching = defender.isCrouchBlocking || (defender.state === FighterState.BLOCKSTUN && defender.wasCrouching);
      defender.setState(FighterState.BLOCKSTUN);
      if (defenderAtWall && !projectile) attacker.vx = -dir * attack.pushback * 0.8;
      else defender.vx = dir * attack.pushback * 0.7;
      defender.visual.flash = 3;
    } else if (armored) {
      defender.armorHits = Math.max(0, defender.armorHits - 1);
      defender.addMeter(dealt * DAMAGE_TAKEN_METER_RATIO);
      attacker.addMeter(attack.meterGain * 0.5);
      defender.visual.flash = 6;
      this.events.emit('armorHit', { fighter: defender });
    } else {
      attacker.addMeter(attack.meterGain);
      defender.addMeter(dealt * DAMAGE_TAKEN_METER_RATIO);
      defender.clearAttack();
      defender.visual.flash = 6;
      const airborne = defender.airborne;
      const launches = attack.launch !== undefined || airborne || attack.knockdown || defender.hp <= 0;
      if (launches) {
        defender.vx = dir * attack.knockback;
        defender.vy = defender.hp <= 0 ? Math.max(attack.launch ?? 0, 9) : (attack.launch ?? (airborne ? 7 : attack.knockdown ? 10 : 0));
        if (defender.y <= 0) defender.y = 0.01;
        defender.stun = attack.hitstun + HITSTUN_AIR_BONUS;
        defender.setState(FighterState.HURT);
      } else {
        defender.stun = attack.hitstun;
        defender.wasCrouching = defender.stance === 'crouch';
        defender.setState(FighterState.HIT);
        if (defenderAtWall && !projectile) attacker.vx = -dir * attack.knockback * 0.6;
        else defender.vx = dir * attack.knockback;
      }
      this.combos.registerHit(attacker.side, dealt, victimInStun);
    }

    this.events.emit('hit', {
      attacker,
      defender,
      attack,
      damage: dealt,
      blocked,
      perfect,
      armored,
      critical: critical && !blocked,
      counterHit,
      x,
      y,
      projectile,
    });
    return { blocked, perfect, armored, damage: dealt };
  }
}

const isBlocking = (f: Fighter): boolean => {
  if (f.state === FighterState.BLOCK) return true;
  if (f.state === FighterState.BLOCKSTUN) return hasButton(f.input.held, Btn.BLOCK);
  return false;
};

/** Standing block covers high and mid; crouching block covers low and mid. */
const blockCovers = (f: Fighter, attack: AttackData): boolean => {
  if (attack.grab) return false;
  const crouching = f.wasCrouching;
  if (attack.hitLevel === 'mid') return true;
  if (attack.hitLevel === 'high') return !crouching;
  return crouching;
};
