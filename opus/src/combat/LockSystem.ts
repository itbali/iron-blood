import type { Fighter, LockState } from '../characters/Fighter';
import { FighterState } from '../characters/FighterState';
import { INPUT_BUFFER_FRAMES, THROW_TECH_WINDOW } from '../core/constants';
import type { GameEvent } from '../game/events';
import { Button } from '../input/InputTypes';
import type { LockSequenceDef, LockStep } from './AttackData';
import type { ComboSystem } from './ComboSystem';
import { applyDamage, computeDamage } from './DamageSystem';

export interface LockStartOptions {
  name: string;
  techable?: boolean;
  finisher?: boolean;
  /** Keep the defender where it stands and move the attacker instead (finishers). */
  anchorDefender?: boolean;
}

const OFFSET_EASE = 0.3;
const FLURRY_GAP = 58;

/**
 * Drives scripted two-fighter sequences (throws, command grabs, cinematic supers, counters,
 * finishers). While a lock runs both fighters ignore physics and normal combat, which is what
 * guarantees regular strikes cannot interrupt a grab animation.
 */
export class LockSystem {
  constructor(
    private readonly combo: ComboSystem,
    private readonly clampX: (x: number) => number,
  ) {}

  start(attacker: Fighter, defender: Fighter, def: LockSequenceDef, opts: LockStartOptions, events: GameEvent[]): void {
    const facing: 1 | -1 = defender.x >= attacker.x ? 1 : -1;
    attacker.facing = facing;
    const first = def.steps[0];
    const firstOff = (first?.offsetX ?? 60) * attacker.scale;
    const anchorX = opts.anchorDefender ? this.clampX(defender.x - facing * firstOff) : attacker.x;
    attacker.x = anchorX;
    attacker.prevX = anchorX;

    const lock: LockState = {
      def,
      target: defender,
      frame: -1,
      anchorX,
      facing,
      offX: (defender.x - anchorX) * facing,
      offY: defender.y,
      targetOffX: firstOff,
      targetOffY: first?.offsetY ?? 0,
      attackerSide: 1,
      damage: 0,
      name: opts.name,
      techable: !!opts.techable,
      finisher: !!opts.finisher,
      nextStep: 0,
    };
    attacker.lock = lock;
    attacker.vx = 0;
    attacker.vy = 0;
    attacker.y = 0;
    attacker.setState(attacker.state === FighterState.GRAB ? FighterState.THROW : FighterState.SPECIAL);
    attacker.lockAnim = null;
    defender.lockedBy = attacker;
    defender.move = null;
    defender.stun = 0;
    defender.vx = 0;
    defender.vy = 0;
    defender.setState(FighterState.THROWN);
    defender.lockAnim = opts.finisher ? 'dazed' : 'grabbed';
    defender.lockAnimFrame = 0;
    events.push({ type: 'lock-start', attacker: attacker.index, cinematic: !!def.cinematic, darken: !!def.darken, tech: !!opts.techable });
  }

  update(attacker: Fighter, events: GameEvent[]): void {
    const lock = attacker.lock;
    if (!lock) return;
    const defender = lock.target;
    lock.frame++;
    attacker.lockAnimFrame++;
    defender.lockAnimFrame++;

    if (lock.techable && lock.frame <= THROW_TECH_WINDOW && defender.buffer.findPress(Button.GRAB, INPUT_BUFFER_FRAMES) >= 0) {
      defender.buffer.consume(Button.GRAB, INPUT_BUFFER_FRAMES);
      this.tech(attacker, defender, events);
      return;
    }

    const steps = lock.def.steps;
    while (lock.nextStep < steps.length && steps[lock.nextStep].frame <= lock.frame) {
      this.applyStep(attacker, defender, lock, steps[lock.nextStep], events);
      lock.nextStep++;
    }

    lock.offX += (lock.targetOffX - lock.offX) * OFFSET_EASE;
    lock.offY += (lock.targetOffY - lock.offY) * OFFSET_EASE;
    defender.x = this.clampX(lock.anchorX + lock.facing * lock.offX);
    defender.y = Math.max(0, lock.offY);
    if (lock.attackerSide === -1 || attacker.x !== lock.anchorX) {
      const ax = defender.x - lock.facing * lock.attackerSide * FLURRY_GAP * attacker.scale;
      attacker.x = this.clampX(ax);
      attacker.facing = defender.x >= attacker.x ? 1 : -1;
    }
    defender.facing = attacker.x >= defender.x ? 1 : -1;

    if (lock.frame >= lock.def.duration) this.release(attacker, defender, lock, events);
  }

  private applyStep(attacker: Fighter, defender: Fighter, lock: LockState, step: LockStep, events: GameEvent[]): void {
    if (step.offsetX !== undefined) lock.targetOffX = step.offsetX * attacker.scale;
    if (step.offsetY !== undefined) lock.targetOffY = step.offsetY * attacker.scale;
    if (step.attackerSide !== undefined) lock.attackerSide = step.attackerSide;
    if (step.attackerAnim) {
      attacker.lockAnim = step.attackerAnim;
      attacker.lockAnimFrame = 0;
    }
    if (step.defenderAnim) {
      defender.lockAnim = step.defenderAnim;
      defender.lockAnimFrame = 0;
    }
    const cx = defender.x;
    const cy = defender.y + 110 * defender.scale;
    if (step.damage) {
      const dmg = computeDamage({
        base: step.damage,
        attackerMult: attacker.damageMult,
        defenderMult: defender.def.physique.defenseMult,
        comboHits: 0,
        counterHit: false,
      });
      const dealt = applyDamage(attacker, defender, dmg);
      lock.damage += dealt;
      attacker.stats.hits++;
      defender.flash = 6;
      this.combo.addLockHit(attacker.index, dealt, events);
      events.push({
        type: 'hit',
        x: cx,
        y: cy,
        attacker: attacker.index,
        strength: step.strength ?? 'heavy',
        effect: step.effect ?? 'strike',
        damage: dealt,
        counter: false,
        dir: lock.facing,
        crit: step.strength === 'super',
        sfx: step.sfx,
      });
    }
    events.push({
      type: 'lock-step',
      attacker: attacker.index,
      x: cx,
      y: cy,
      sfx: step.damage ? undefined : step.sfx,
      flash: step.flash,
      shake: step.shake,
      slowmo: step.slowmo,
      zoom: step.zoom,
      blood: step.blood,
      text: step.text,
      effect: step.effect,
      strength: step.strength,
    });
  }

  private release(attacker: Fighter, defender: Fighter, lock: LockState, events: GameEvent[]): void {
    const r = lock.def.release;
    const dir: 1 | -1 = r.swapSides ? (-lock.facing as 1 | -1) : lock.facing;
    if (r.swapSides) {
      defender.x = this.clampX(attacker.x - lock.facing * 70 * attacker.scale);
    }
    attacker.lock = null;
    attacker.lockAnim = null;
    attacker.move = null;
    attacker.setState(FighterState.IDLE);
    attacker.facing = defender.x >= attacker.x ? 1 : -1;
    defender.lockedBy = null;
    defender.lockAnim = null;

    if (lock.finisher) {
      defender.setState(FighterState.DEAD);
      defender.y = 0;
      defender.finisherOutcome = lock.def.finisherOutcome ?? 'collapse';
      defender.outcomeFrame = 0;
      events.push({ type: 'finisher-outcome', fighter: defender.index, outcome: defender.finisherOutcome, x: defender.x });
    } else if (r.knockdown) {
      defender.receiveHit({ hitstun: 0, knockback: r.knockback, launch: Math.max(4, r.launch), knockdown: true, dir });
    } else {
      defender.receiveHit({ hitstun: 20, knockback: r.knockback, launch: r.launch, knockdown: false, dir });
    }
    events.push({
      type: 'lock-end',
      attacker: attacker.index,
      name: lock.name,
      damage: Math.round(lock.damage),
      showSummary: !!lock.def.cinematic && lock.damage > 0 && !lock.finisher,
    });
  }

  private tech(attacker: Fighter, defender: Fighter, events: GameEvent[]): void {
    const f = attacker.lock!.facing;
    attacker.lock = null;
    attacker.lockAnim = null;
    attacker.move = null;
    defender.lockedBy = null;
    defender.lockAnim = null;
    attacker.setState(FighterState.IDLE);
    defender.setState(FighterState.IDLE);
    attacker.vx = -f * 7;
    defender.vx = f * 7;
    events.push({ type: 'throw-tech', x: (attacker.x + defender.x) / 2, y: 120 });
  }

  /** Abort any lock (round reset). */
  static clear(f: Fighter): void {
    f.lock = null;
    f.lockedBy = null;
    f.lockAnim = null;
  }
}
