import type { Fighter } from '../characters/Fighter';
import { FighterState } from '../characters/FighterState';
import { METER_PER_BLOCK, PERFECT_BLOCK_WINDOW, STAGE_HALF_WIDTH } from '../core/constants';
import type { Box } from '../core/math';
import { boxesOverlap } from '../core/math';
import { STRENGTH_HITSTOP } from '../data/attacks';
import type { GameEvent } from '../game/events';
import type { AttackData, EffectStyle, ImpactStrength, LockSequenceDef, MoveKind } from './AttackData';
import type { ComboSystem } from './ComboSystem';
import { applyDamage, canBlockLevel, chipDamage, computeDamage, whiffsOnCrouch } from './DamageSystem';
import { findOverlap } from './HitboxSystem';
import type { LockSystem } from './LockSystem';
import type { Projectile } from './Projectile';

/** Everything the resolver needs to know about the thing that hit, for moves and projectiles alike. */
export interface StrikeData extends AttackData {
  name: string;
  kind: MoveKind;
  strength: ImpactStrength;
  effect: EffectStyle;
  launch: number;
  knockdown: boolean;
  meterGain: number;
  lock?: LockSequenceDef;
  sourceX: number;
  isProjectile: boolean;
}

export type StrikeOutcome = 'hit' | 'blocked' | 'armor' | 'countered' | 'absorbed';

export interface CombatContext {
  events: GameEvent[];
  frame: number;
  addHitstop: (frames: number) => void;
}

interface PendingHit {
  attacker: Fighter;
  defender: Fighter;
  point: { x: number; y: number };
  grab: boolean;
}

const WALL_MARGIN = 8;

export class CombatSystem {
  constructor(
    private readonly combo: ComboSystem,
    readonly locks: LockSystem,
  ) {}

  /** Collects all hits first and applies them afterwards so simultaneous hits trade. */
  resolveFighters(fighters: [Fighter, Fighter], ctx: CombatContext): void {
    const pending: PendingHit[] = [];
    for (let i = 0; i < 2; i++) {
      const a = fighters[i];
      const d = fighters[1 - i];
      if (a.isLocked || d.isLocked || !a.move) continue;
      const boxes = a.getActiveHitboxes();
      if (!boxes.length) continue;
      if (a.move.grab) {
        if (!this.isGrabbable(d)) continue;
        const target: Box[] = [d.getPushbox(), ...d.getHurtboxes()];
        const point = findOverlap(boxes, target);
        if (point) pending.push({ attacker: a, defender: d, point, grab: true });
        continue;
      }
      if (d.isInvulnerable()) continue;
      if (whiffsOnCrouch(a.move.hitLevel, d.crouching && d.grounded, !a.grounded)) continue;
      const point = findOverlap(boxes, d.getHurtboxes());
      if (point) pending.push({ attacker: a, defender: d, point, grab: false });
    }

    if (pending.length === 2 && pending[0].grab && pending[1].grab) {
      const [a, b] = fighters;
      a.move = null;
      b.move = null;
      a.setState(FighterState.IDLE);
      b.setState(FighterState.IDLE);
      a.vx = -a.facing * 7;
      b.vx = -b.facing * 7;
      ctx.events.push({ type: 'throw-tech', x: (a.x + b.x) / 2, y: 120 });
      return;
    }

    for (const p of pending) {
      const m = p.attacker.move;
      if (!m) continue;
      p.attacker.moveHits++;
      p.attacker.lastHitFrame = p.attacker.moveFrame;
      p.attacker.moveConnected = true;
      if (p.grab) {
        if (p.defender.isLocked) continue;
        this.locks.start(p.attacker, p.defender, m.lock!, { name: m.name, techable: m.kind === 'grab' }, ctx.events);
        ctx.addHitstop(STRENGTH_HITSTOP.light);
        continue;
      }
      const outcome = this.resolveStrike(p.attacker, p.defender, this.fromMove(p.attacker), p.point, ctx);
      if (outcome === 'blocked') p.attacker.moveBlocked = true;
    }
  }

  resolveProjectiles(projectiles: Projectile[], fighters: [Fighter, Fighter], ctx: CombatContext): void {
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (!p.active || p.def.targeted) continue;
      for (let j = i + 1; j < projectiles.length; j++) {
        const q = projectiles[j];
        if (!q.active || q.def.targeted || q.owner === p.owner) continue;
        if (boxesOverlap(p.hitbox(), q.hitbox())) {
          p.dead = true;
          q.dead = true;
          ctx.events.push({ type: 'projectile-clash', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
        }
      }
    }

    for (const p of projectiles) {
      if (!p.active) continue;
      const target = fighters[1 - p.owner.index];
      if (target.isLocked || target.isProjectileInvulnerable()) continue;
      if (p.def.grounded && !target.grounded) continue;
      const point = findOverlap([p.hitbox()], target.getHurtboxes());
      if (!point) continue;
      const strike: StrikeData = {
        ...p.def.attack,
        name: p.def.id,
        kind: 'special',
        strength: p.def.strength,
        effect: p.def.effect,
        launch: p.def.launch ?? 0,
        knockdown: p.def.knockdown ?? false,
        meterGain: 4,
        sourceX: p.x - p.facing * 40,
        isProjectile: true,
      };
      const outcome = this.resolveStrike(p.owner, target, strike, point, ctx);
      if (outcome === 'absorbed') p.dead = true;
      else p.onHit();
    }
  }

  private fromMove(f: Fighter): StrikeData {
    const m = f.move!;
    return {
      ...m,
      launch: m.launch ?? 0,
      knockdown: m.knockdown ?? false,
      meterGain: m.meterGain ?? 3,
      sourceX: f.x,
      isProjectile: false,
    };
  }

  private isGrabbable(d: Fighter): boolean {
    if (!d.grounded || d.isInvulnerable()) return false;
    if (d.state === FighterState.HIT || d.state === FighterState.HURT) return false;
    if (d.state === FighterState.BLOCK && d.stun > 0) return false;
    return true;
  }

  /**
   * Core hit resolution shared by melee and projectiles:
   * counter stance → armor → block (incl. perfect block) → clean hit (combo, scaling, reaction).
   */
  resolveStrike(a: Fighter, d: Fighter, s: StrikeData, point: { x: number; y: number }, ctx: CombatContext): StrikeOutcome {
    const events = ctx.events;
    const dir: 1 | -1 = d.x >= s.sourceX ? 1 : -1;

    if (d.counterActive()) {
      if (s.isProjectile) {
        events.push({ type: 'block', x: point.x, y: point.y, defender: d.index, perfect: true, dir });
        return 'absorbed';
      }
      const counter = d.move!.counter!;
      d.move = null;
      this.locks.start(d, a, counter.lock, { name: 'Counter' }, events);
      ctx.addHitstop(STRENGTH_HITSTOP.special);
      return 'countered';
    }

    if (d.armorActive()) {
      d.armorHits--;
      const dmg = computeDamage({ base: s.damage, attackerMult: a.damageMult, defenderMult: d.def.physique.defenseMult * 0.8, comboHits: 0, counterHit: false });
      applyDamage(a, d, dmg);
      d.flash = 5;
      events.push({ type: 'armor', x: point.x, y: point.y, defender: d.index });
      ctx.addHitstop(STRENGTH_HITSTOP.medium);
      return 'armor';
    }

    const facingSource = Math.abs(s.sourceX - d.x) < 4 || (s.sourceX > d.x ? 1 : -1) === d.facing;
    if (d.isBlocking() && canBlockLevel(s.hitLevel, d.crouching) && facingSource) {
      const perfect = d.blockPressAge <= PERFECT_BLOCK_WINDOW;
      const chip = perfect ? 0 : Math.min(chipDamage(s.damage, s.kind !== 'normal'), Math.max(0, d.hp - 1));
      if (chip > 0) applyDamage(a, d, chip);
      const blockstun = perfect ? Math.ceil(s.blockstun * 0.5) : s.blockstun;
      d.receiveBlock(blockstun, s.pushback, dir);
      if (this.atWall(d, dir)) a.vx -= dir * s.pushback * 0.6;
      d.addMeter(METER_PER_BLOCK + (perfect ? 8 : 0));
      a.addMeter(s.meterGain * 0.5);
      events.push({ type: 'block', x: point.x, y: point.y, defender: d.index, perfect, dir });
      if (perfect) events.push({ type: 'perfect-block', defender: d.index });
      ctx.addHitstop(perfect ? STRENGTH_HITSTOP.special : STRENGTH_HITSTOP.light);
      this.combo.onFailedFollowUp(a.index, ctx.frame, events);
      if (!s.isProjectile) this.reportAdvantage(a, d, true, events);
      return 'blocked';
    }

    const defenderStunned = d.state === FighterState.HIT || d.state === FighterState.HURT;
    const counterHit = d.inStartup() && !defenderStunned;
    const dmg = computeDamage({
      base: s.damage,
      attackerMult: a.damageMult,
      defenderMult: d.def.physique.defenseMult,
      comboHits: defenderStunned ? this.combo.currentHits(a.index) : 0,
      counterHit,
    });
    const dealt = applyDamage(a, d, dmg);
    this.combo.registerHit(a.index, dealt, defenderStunned, events);
    a.stats.hits++;
    a.addMeter(s.meterGain);

    if (s.lock && !s.isProjectile) {
      this.locks.start(a, d, s.lock, { name: s.name }, events);
    } else {
      d.receiveHit({ hitstun: s.hitstun + (counterHit ? 4 : 0), knockback: s.knockback, launch: s.launch, knockdown: s.knockdown, dir });
      if (this.atWall(d, dir)) {
        a.vx -= dir * s.knockback * 0.5;
        if (s.strength !== 'light') events.push({ type: 'wall', fighter: d.index, x: d.x, y: d.y + 100 });
      }
    }

    events.push({
      type: 'hit',
      x: point.x,
      y: point.y,
      attacker: a.index,
      strength: s.strength,
      effect: s.effect,
      damage: dealt,
      counter: counterHit,
      dir,
      crit: counterHit || s.strength === 'super' || (dealt >= 95 && s.strength !== 'light'),
    });
    if (counterHit) events.push({ type: 'counter-hit', attacker: a.index });
    ctx.addHitstop(STRENGTH_HITSTOP[s.strength] + (counterHit ? 2 : 0));
    if (!s.isProjectile) this.reportAdvantage(a, d, false, events);
    return 'hit';
  }

  private atWall(d: Fighter, dir: 1 | -1): boolean {
    const half = (d.def.physique.pushWidth * d.scale) / 2;
    return dir === 1 ? d.x >= STAGE_HALF_WIDTH - half - WALL_MARGIN : d.x <= -STAGE_HALF_WIDTH + half + WALL_MARGIN;
  }

  private reportAdvantage(a: Fighter, d: Fighter, blocked: boolean, events: GameEvent[]): void {
    const m = a.move;
    if (!m) return;
    const advantage = d.isLocked ? 0 : d.framesUntilActionable() - a.framesUntilActionable();
    a.lastAdvantage = advantage;
    events.push({
      type: 'frame-advantage',
      attacker: a.index,
      moveId: m.id,
      advantage,
      startup: m.startup,
      active: m.active,
      recovery: m.recovery,
      blocked,
    });
  }
}
