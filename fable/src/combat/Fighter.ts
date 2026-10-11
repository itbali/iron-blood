import {
  AIR_DRAG,
  GRAVITY,
  GETUP_FRAMES,
  GETUP_INVULN_FRAMES,
  GROUND_FRICTION,
  INPUT_BUFFER_FRAMES,
  KNOCKDOWN_FRAMES,
  MAX_FALL_SPEED,
  METER_MAX,
  MOTION_WINDOW_FRAMES,
  STAGE_HALF_WIDTH,
  WALK_ACCEL,
  WALL_PUSHBACK,
} from '@/core/constants';
import type { Facing, PlayerSide } from '@/core/types';
import { clamp } from '@/core/math';
import { Btn, hasButton, type InputFrame } from '@/input/InputFrame';
import type { CharacterConfig, CharacterPalette } from '@/characters/CharacterConfig';
import { attackPhaseAt, attackTotalFrames, type AttackData, type Stance } from './AttackData';
import { FighterState, ACTIONABLE_STATES, ATTACKING_STATES } from './FighterState';
import { dirCode, matchesMotion, type DirCode } from './MotionInput';
import type { SimContext } from './SimContext';

interface BufferedPress {
  button: number;
  frame: number;
}

/** Visual-only state the renderer reads; never affects simulation outcomes. */
export interface FighterVisual {
  flash: number;
  trail: boolean;
  afterimages: { x: number; y: number; life: number; anim: string; frame: number; facing: Facing }[];
}

/**
 * Runtime fighter: position, state machine, input buffer and attack execution.
 * Everything here is deterministic given the input stream.
 */
export class Fighter {
  readonly side: PlayerSide;
  readonly config: CharacterConfig;
  /** Palette used by the renderer (default or an unlocked skin). Visual only. */
  palette: CharacterPalette;

  x = 0;
  /** Height above the floor (0 = standing on the ground). */
  y = 0;
  vx = 0;
  vy = 0;
  facing: Facing = 1;

  state: FighterState = FighterState.IDLE;
  stateFrame = 0;
  hp: number;
  maxHp: number;
  meter = 0;
  roundsWon = 0;

  currentAttack: AttackData | null = null;
  /** Frames since the current attack started. */
  attackFrame = 0;
  attackHit = false;
  attackBlocked = false;
  hitsLanded = 0;
  lastHitFrame = -1;
  projectileSpawned = 0;
  teleported = false;
  hopDone = false;
  counterActive = false;

  stun = 0;
  wasCrouching = false;
  invuln = 0;
  armorHits = 0;
  /** Frames of self-imposed frame disadvantage after being perfect blocked. */
  extraRecovery = 0;

  grabTarget: Fighter | null = null;
  grabbedBy: Fighter | null = null;
  grabFrame = 0;

  infiniteHealth = false;
  infiniteMeter = false;
  /** Runtime multipliers (boss phase 2, training). */
  speedScale = 1;
  damageBonus = 1;
  phase2 = false;

  lastAttackId = '';
  lastFrameAdvantage = 0;
  /** Timestamp (sim frame) at which block was last pressed; used for perfect block. */
  blockPressedFrame = -1000;

  /** Visual-only. */
  readonly visual: FighterVisual = { flash: 0, trail: false, afterimages: [] };

  readonly input: InputFrame = { x: 0, y: 0, held: 0, pressed: 0 };

  private buffer: BufferedPress[] = [];
  private dirHistory: DirCode[] = [];
  private readonly attackList: AttackData[];
  /** Standing attacks with motion inputs: they may still trigger while the stick is held down (e.g. down-forward). */
  private readonly motionAttackIds: string[];

  constructor(side: PlayerSide, config: CharacterConfig) {
    this.side = side;
    this.config = config;
    this.palette = config.palette;
    this.maxHp = config.maxHealth;
    this.hp = config.maxHealth;
    this.attackList = Object.values(config.attacks).sort((a, b) => attackPriority(b) - attackPriority(a));
    this.motionAttackIds = this.attackList.filter((a) => a.input.motion && (a.input.stance ?? 'stand') === 'stand').map((a) => a.id);
  }

  get airborne(): boolean {
    return this.y > 0 || this.vy > 0;
  }

  get stance(): Stance {
    if (this.airborne) return 'air';
    if (this.state === FighterState.CROUCH || (this.state === FighterState.BLOCK && this.wasCrouching)) return 'crouch';
    return 'stand';
  }

  get isActionable(): boolean {
    return ACTIONABLE_STATES.has(this.state);
  }

  get isAttacking(): boolean {
    return ATTACKING_STATES.has(this.state);
  }

  get isBlocking(): boolean {
    return this.state === FighterState.BLOCK;
  }

  get isCrouchBlocking(): boolean {
    return this.state === FighterState.BLOCK && this.wasCrouching;
  }

  get isDown(): boolean {
    return this.state === FighterState.KNOCKDOWN || this.state === FighterState.DEAD || this.state === FighterState.GETUP;
  }

  get isInvulnerable(): boolean {
    if (this.invuln > 0) return true;
    if (this.state === FighterState.KNOCKDOWN || this.state === FighterState.GETUP) return true;
    if (this.state === FighterState.GRABBED || this.state === FighterState.THROW || this.state === FighterState.GRAB) return true;
    const a = this.currentAttack;
    if (a?.invuln && (this.state === FighterState.ATTACK || this.state === FighterState.SPECIAL)) {
      return this.attackFrame >= a.invuln[0] && this.attackFrame < a.invuln[1];
    }
    return false;
  }

  get hasArmor(): boolean {
    const a = this.currentAttack;
    if (!a || !this.isAttacking) return false;
    if (a.armor) return this.attackFrame >= a.armor[0] && this.attackFrame < a.armor[1];
    return a.category === 'heavy' && this.armorHits > 0;
  }

  get attackPhase() {
    return this.currentAttack ? attackPhaseAt(this.currentAttack, this.attackFrame) : null;
  }

  get hitboxesActive(): boolean {
    const a = this.currentAttack;
    if (!a || !this.isAttacking || a.grab) return false;
    if (this.attackPhase !== 'active') return false;
    if (a.multiHit) {
      return this.hitsLanded < a.multiHit.count && this.attackFrame - this.lastHitFrame >= a.multiHit.interval;
    }
    return !this.attackHit;
  }

  resetForRound(x: number, facing: Facing, carriedMeter: number): void {
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.meter = carriedMeter;
    this.setState(FighterState.IDLE);
    this.clearAttack();
    this.stun = 0;
    this.invuln = 0;
    this.grabTarget = null;
    this.grabbedBy = null;
    this.buffer = [];
    this.dirHistory = [];
    this.visual.flash = 0;
    this.visual.trail = false;
    this.visual.afterimages.length = 0;
  }

  setState(next: FighterState): void {
    if (this.state === next) return;
    this.state = next;
    this.stateFrame = 0;
  }

  clearAttack(): void {
    this.currentAttack = null;
    this.attackFrame = 0;
    this.attackHit = false;
    this.attackBlocked = false;
    this.hitsLanded = 0;
    this.lastHitFrame = -1;
    this.projectileSpawned = 0;
    this.teleported = false;
    this.hopDone = false;
    this.counterActive = false;
    this.armorHits = 0;
    this.visual.trail = false;
  }

  addMeter(amount: number): void {
    if (this.infiniteMeter) {
      this.meter = METER_MAX;
      return;
    }
    this.meter = clamp(this.meter + amount, 0, METER_MAX);
  }

  spendMeter(amount: number): boolean {
    if (this.infiniteMeter) return true;
    if (this.meter < amount) return false;
    this.meter -= amount;
    return true;
  }

  applyDamage(amount: number): number {
    if (this.infiniteHealth) return amount;
    const dealt = Math.min(this.hp, amount);
    this.hp -= dealt;
    return dealt;
  }

  /** Records input for this tick (buffer, direction history). */
  readInput(input: InputFrame, frame: number): void {
    this.input.x = input.x;
    this.input.y = input.y;
    this.input.held = input.held;
    this.input.pressed = input.pressed;

    if (input.pressed) {
      for (const bit of [Btn.LP, Btn.HP, Btn.LK, Btn.HK, Btn.SP1, Btn.SP2, Btn.GRAB, Btn.BLOCK]) {
        if (hasButton(input.pressed, bit)) this.buffer.push({ button: bit, frame });
      }
      if (hasButton(input.pressed, Btn.BLOCK)) this.blockPressedFrame = frame;
    }
    while (this.buffer.length && frame - (this.buffer[0]?.frame ?? frame) > INPUT_BUFFER_FRAMES) this.buffer.shift();

    const fwd = (input.x * this.facing) as -1 | 0 | 1;
    this.dirHistory.push(dirCode(fwd, input.y));
    if (this.dirHistory.length > MOTION_WINDOW_FRAMES) this.dirHistory.shift();
  }

  /** Debug view of the pending buffer. */
  get bufferDebug(): string {
    return this.buffer.map((b) => buttonLabel(b.button)).join(' ');
  }

  get motionDebug(): string {
    const seq: DirCode[] = [];
    for (const c of this.dirHistory) if (seq[seq.length - 1] !== c) seq.push(c);
    return seq.slice(-6).join(' ');
  }

  private hasBufferedPress(button: number, frame: number, window = INPUT_BUFFER_FRAMES): BufferedPress | null {
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const p = this.buffer[i]!;
      if (p.button === button && frame - p.frame <= window) return p;
    }
    return null;
  }

  private consumePress(press: BufferedPress): void {
    const idx = this.buffer.indexOf(press);
    if (idx >= 0) this.buffer.splice(idx, 1);
  }

  private consumeButton(button: number): void {
    this.buffer = this.buffer.filter((b) => b.button !== button);
  }

  /**
   * Finds the highest-priority attack whose input is satisfied by the buffer.
   * `allowed` restricts the candidates (used for cancels).
   */
  findAttack(frame: number, stance: Stance, allowed?: readonly string[]): AttackData | null {
    for (const attack of this.attackList) {
      if (allowed && !allowed.includes(attack.id)) continue;
      const stanceReq = attack.input.stance ?? 'stand';
      if (stanceReq !== stance) continue;
      if (attack.input.meter && !this.infiniteMeter && this.meter < attack.input.meter) continue;
      if (attack.input.twoButton) {
        const a = this.hasBufferedPress(Btn.SP1, frame, 4);
        const b = this.hasBufferedPress(Btn.SP2, frame, 4);
        if (!a || !b) continue;
        this.consumeButton(Btn.SP1);
        this.consumeButton(Btn.SP2);
        return attack;
      }
      const press = this.hasBufferedPress(attack.input.button, frame);
      if (!press) continue;
      if (attack.input.motion && !matchesMotion(this.dirHistory, attack.input.motion)) continue;
      this.consumePress(press);
      return attack;
    }
    return null;
  }

  startAttack(attack: AttackData, ctx: SimContext): void {
    if (attack.input.meter) this.spendMeter(attack.input.meter);
    this.clearAttack();
    this.currentAttack = attack;
    this.attackFrame = 0;
    this.lastAttackId = attack.id;
    this.armorHits = attack.category === 'heavy' ? this.config.passiveArmor : 0;
    this.visual.trail = attack.trail === true;
    if (attack.grab && !attack.projectile) {
      this.setState(FighterState.GRAB);
    } else if (attack.category === 'special' || attack.category === 'super') {
      this.setState(FighterState.SPECIAL);
    } else {
      this.setState(FighterState.ATTACK);
    }
    ctx.events.emit('attackStart', { fighter: this, attack });
  }

  /** Main per-tick update. Input must have been read already. */
  update(opponent: Fighter, ctx: SimContext): void {
    this.stateFrame++;
    if (this.invuln > 0) this.invuln--;
    if (this.visual.flash > 0) this.visual.flash--;
    for (let i = this.visual.afterimages.length - 1; i >= 0; i--) {
      const img = this.visual.afterimages[i]!;
      img.life--;
      if (img.life <= 0) this.visual.afterimages.splice(i, 1);
    }

    this.updateFacing(opponent);

    switch (this.state) {
      case FighterState.IDLE:
      case FighterState.WALK:
      case FighterState.CROUCH:
      case FighterState.BLOCK:
        this.updateActionable(ctx);
        break;
      case FighterState.JUMP:
        this.updateJump(ctx);
        break;
      case FighterState.ATTACK:
      case FighterState.SPECIAL:
      case FighterState.GRAB:
        this.updateAttack(opponent, ctx);
        break;
      case FighterState.THROW:
        this.updateThrow(opponent, ctx);
        break;
      case FighterState.GRABBED:
        this.updateGrabbed();
        break;
      case FighterState.BLOCKSTUN:
      case FighterState.HIT:
        this.updateStun();
        break;
      case FighterState.HURT:
        this.updateHurt();
        break;
      case FighterState.KNOCKDOWN:
        if (this.stateFrame >= KNOCKDOWN_FRAMES) {
          this.setState(FighterState.GETUP);
          this.invuln = GETUP_FRAMES + GETUP_INVULN_FRAMES;
        }
        break;
      case FighterState.GETUP:
        if (this.stateFrame >= GETUP_FRAMES) this.setState(FighterState.IDLE);
        break;
      case FighterState.DEAD:
      case FighterState.VICTORY:
      case FighterState.DEFEAT:
      case FighterState.INTRO:
      case FighterState.FINISHER:
      case FighterState.FINISHED:
        break;
    }

    this.applyPhysics(ctx);
  }

  private updateFacing(opponent: Fighter): void {
    if (this.isAttacking || this.state === FighterState.GRABBED || this.state === FighterState.THROW) return;
    if (this.airborne) return;
    if (this.state === FighterState.HIT || this.state === FighterState.HURT || this.state === FighterState.KNOCKDOWN) return;
    const dx = opponent.x - this.x;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
  }

  private updateActionable(ctx: SimContext): void {
    const input = this.input;
    const crouching = input.y < 0;
    const blocking = hasButton(input.held, Btn.BLOCK);
    const frame = ctx.frame;

    const stance: Stance = crouching ? 'crouch' : 'stand';
    const attack = this.findAttack(frame, stance) ?? (crouching ? this.findAttack(frame, 'stand', this.motionAttackIds) : null);
    if (attack) {
      this.wasCrouching = crouching;
      this.startAttack(attack, ctx);
      return;
    }

    if (input.y > 0 && !blocking) {
      this.vy = this.config.jumpVelocity;
      this.vx = input.x * this.config.jumpForwardSpeed;
      this.y = 0.01;
      this.setState(FighterState.JUMP);
      this.wasCrouching = false;
      ctx.events.emit('jump', { fighter: this });
      return;
    }

    if (blocking) {
      this.wasCrouching = crouching;
      this.setState(FighterState.BLOCK);
      this.vx *= GROUND_FRICTION;
      return;
    }

    if (crouching) {
      this.wasCrouching = true;
      this.setState(FighterState.CROUCH);
      this.vx *= GROUND_FRICTION;
      return;
    }
    this.wasCrouching = false;

    if (input.x !== 0) {
      const forward = input.x === this.facing;
      const target = input.x * (forward ? this.config.walkSpeed : this.config.backSpeed) * this.speedScale;
      this.vx += clamp(target - this.vx, -WALK_ACCEL, WALK_ACCEL);
      this.setState(FighterState.WALK);
    } else {
      this.vx *= GROUND_FRICTION;
      if (Math.abs(this.vx) < 0.2) this.vx = 0;
      this.setState(FighterState.IDLE);
    }
  }

  private updateJump(ctx: SimContext): void {
    const attack = this.findAttack(ctx.frame, 'air');
    if (attack) {
      this.startAttack(attack, ctx);
      return;
    }
    this.vx += this.input.x * 0.12;
    if (this.y <= 0 && this.vy <= 0) {
      this.y = 0;
      this.vy = 0;
      this.setState(FighterState.IDLE);
      ctx.events.emit('land', { fighter: this });
    }
  }

  private updateAttack(opponent: Fighter, ctx: SimContext): void {
    const a = this.currentAttack;
    if (!a) {
      this.setState(FighterState.IDLE);
      return;
    }
    this.attackFrame++;
    const phase = attackPhaseAt(a, this.attackFrame);
    const total = attackTotalFrames(a) + this.extraRecovery;

    // Self movement per phase (dash attacks, lunges).
    const mv = a.movement?.[phase];
    if (mv !== undefined) this.vx = mv * this.facing * this.speedScale;

    if (a.hop && !this.hopDone && this.attackFrame >= a.hop.frame) {
      this.hopDone = true;
      this.vy = a.hop.vy;
      if (this.y <= 0) this.y = 0.01;
    }

    if (a.teleport && !this.teleported && this.attackFrame >= a.teleport.frame) {
      this.teleported = true;
      this.performTeleport(a.teleport.target, a.teleport.distance ?? 0, opponent, ctx);
    }

    if (a.projectile) {
      const spec = a.projectile;
      const count = spec.count ?? 1;
      const interval = spec.interval ?? 0;
      while (this.projectileSpawned < count && this.attackFrame >= spec.spawnFrame + this.projectileSpawned * interval) {
        ctx.spawnProjectile(this, spec, a);
        this.projectileSpawned++;
      }
    }

    if (a.counter) {
      this.counterActive = this.attackFrame >= a.counter.window[0] && this.attackFrame < a.counter.window[1];
    }

    if (a.grab && this.state === FighterState.GRAB && phase === 'active') {
      if (this.tryGrab(opponent, a, ctx)) return;
    }

    // Chain / special cancels: allowed once the attack has connected.
    const canCancel = (this.attackHit || (a.cancelOnBlock && this.attackBlocked)) && phase !== 'startup';
    if (canCancel && a.cancelInto && a.cancelInto.length) {
      const stance: Stance = this.airborne ? 'air' : this.wasCrouching ? 'crouch' : 'stand';
      const next = this.findAttack(ctx.frame, stance, a.cancelInto) ?? (stance !== 'air' ? this.findAttack(ctx.frame, 'stand', a.cancelInto) : null);
      if (next) {
        this.extraRecovery = 0;
        this.startAttack(next, ctx);
        return;
      }
    }

    // Aerial attacks end on landing; grounded ones when the frame budget runs out.
    const stanceReq = a.input.stance ?? 'stand';
    if (stanceReq === 'air') {
      if (this.y <= 0 && this.vy <= 0) {
        this.y = 0;
        this.vy = 0;
        this.extraRecovery = 0;
        this.clearAttack();
        this.setState(FighterState.IDLE);
        ctx.events.emit('land', { fighter: this });
      }
      return;
    }

    if (this.attackFrame >= total) {
      this.extraRecovery = 0;
      this.clearAttack();
      this.setState(this.airborne ? FighterState.JUMP : this.wasCrouching && this.input.y < 0 ? FighterState.CROUCH : FighterState.IDLE);
    }
  }

  private performTeleport(target: 'behind' | 'forward' | 'back', distance: number, opponent: Fighter, ctx: SimContext): void {
    this.visual.afterimages.push({ x: this.x, y: this.y, life: 18, anim: this.currentAttack?.anim ?? 'idle', frame: this.stateFrame, facing: this.facing });
    const from = this.x;
    if (target === 'behind') {
      const gap = this.config.pushbox.w / 2 + opponent.config.pushbox.w / 2 + 20;
      // The opponent faces us, so "behind" is away from its facing direction.
      this.x = opponent.x - opponent.facing * gap;
      this.facing = this.x < opponent.x ? 1 : -1;
    } else if (target === 'forward') {
      this.x += this.facing * distance;
    } else {
      this.x -= this.facing * distance;
    }
    this.x = clamp(this.x, -STAGE_HALF_WIDTH + 60, STAGE_HALF_WIDTH - 60);
    ctx.events.emit('teleport', { fighter: this, fromX: from, toX: this.x });
  }

  private tryGrab(opponent: Fighter, a: AttackData, ctx: SimContext): boolean {
    const grab = a.grab!;
    // Range is measured to the opponent's body edge so bulky characters are not harder to grab.
    const dist = Math.abs(opponent.x - this.x) - opponent.config.pushbox.w / 2;
    const facingOpponent = (opponent.x - this.x) * this.facing >= 0;
    const grabbable = !opponent.airborne && !opponent.isInvulnerable && !opponent.isDown && opponent.state !== FighterState.GRABBED;
    if (dist > grab.range || !facingOpponent || !grabbable) return false;
    this.grabTarget = opponent;
    this.grabFrame = 0;
    opponent.grabbedBy = this;
    opponent.setState(FighterState.GRABBED);
    opponent.clearAttack();
    opponent.vx = 0;
    opponent.vy = 0;
    opponent.y = 0;
    opponent.facing = this.facing > 0 ? -1 : 1;
    this.vx = 0;
    this.setState(FighterState.THROW);
    ctx.events.emit('grab', { attacker: this, defender: opponent, attack: a });
    return true;
  }

  private updateThrow(opponent: Fighter, ctx: SimContext): void {
    const a = this.currentAttack;
    const grab = a?.grab;
    if (!a || !grab || this.grabTarget !== opponent) {
      this.clearAttack();
      this.setState(FighterState.IDLE);
      return;
    }
    this.grabFrame++;
    const holdX = this.x + this.facing * (this.config.pushbox.w / 2 + opponent.config.pushbox.w / 2 - 6);
    opponent.x = clamp(holdX, -STAGE_HALF_WIDTH + 40, STAGE_HALF_WIDTH - 40);
    opponent.y = Math.max(0, Math.sin((this.grabFrame / grab.holdFrames) * Math.PI) * 40);

    const pulses = grab.pulses ?? 1;
    const pulseInterval = Math.floor(grab.holdFrames / pulses);
    if (this.grabFrame % pulseInterval === 0 && this.grabFrame <= pulseInterval * pulses) {
      const index = this.grabFrame / pulseInterval;
      const isLast = index >= pulses;
      ctx.resolveThrowHit(this, opponent, a, isLast);
      if (isLast) {
        opponent.grabbedBy = null;
        this.grabTarget = null;
        opponent.vx = this.facing * grab.throwVelocity.x;
        opponent.vy = grab.throwVelocity.y;
        opponent.y = Math.max(opponent.y, 1);
        opponent.setState(FighterState.HURT);
        opponent.invuln = 0;
        this.clearAttack();
        this.currentAttack = a;
        this.attackFrame = a.startup + a.active;
        this.setState(FighterState.ATTACK);
      }
    }
  }

  private updateGrabbed(): void {
    this.vx = 0;
    this.vy = 0;
    if (!this.grabbedBy || this.grabbedBy.state !== FighterState.THROW) {
      this.grabbedBy = null;
      this.setState(FighterState.IDLE);
    }
  }

  private updateStun(): void {
    this.stun--;
    if (this.stun <= 0) {
      this.stun = 0;
      this.setState(this.wasCrouching && this.input.y < 0 ? FighterState.CROUCH : FighterState.IDLE);
    }
  }

  private updateHurt(): void {
    if (this.y <= 0 && this.vy <= 0 && this.stateFrame > 2) {
      this.y = 0;
      this.vy = 0;
      this.vx = 0;
      this.setState(this.hp <= 0 ? FighterState.DEAD : FighterState.KNOCKDOWN);
    }
  }

  private applyPhysics(ctx: SimContext): void {
    const frozenStates = this.state === FighterState.GRABBED || this.state === FighterState.THROW;
    if (frozenStates) return;

    if (this.y > 0 || this.vy > 0) {
      this.vy -= GRAVITY;
      if (this.vy < -MAX_FALL_SPEED) this.vy = -MAX_FALL_SPEED;
      this.vx *= AIR_DRAG;
      this.y += this.vy;
      if (this.y < 0) {
        this.y = 0;
        this.vy = 0;
      }
    } else if (!this.isAttacking && this.state !== FighterState.WALK) {
      this.vx *= GROUND_FRICTION;
      if (Math.abs(this.vx) < 0.15) this.vx = 0;
    } else if (this.isAttacking && this.currentAttack?.movement?.[this.attackPhase ?? 'startup'] === undefined) {
      this.vx *= GROUND_FRICTION;
    }

    this.x += this.vx;

    const half = this.config.pushbox.w / 2;
    const limit = STAGE_HALF_WIDTH - half;
    if (this.x < -limit) {
      const impact = Math.abs(this.vx);
      this.x = -limit;
      this.vx = impact > WALL_PUSHBACK ? WALL_PUSHBACK * 0.5 : 0;
      if (impact > 6) ctx.events.emit('wall', { fighter: this, impact });
    } else if (this.x > limit) {
      const impact = Math.abs(this.vx);
      this.x = limit;
      this.vx = impact > WALL_PUSHBACK ? -WALL_PUSHBACK * 0.5 : 0;
      if (impact > 6) ctx.events.emit('wall', { fighter: this, impact });
    }

    if (this.y === 0 && this.vy === 0 && this.state === FighterState.HURT && this.stateFrame > 2) {
      this.setState(this.hp <= 0 ? FighterState.DEAD : FighterState.KNOCKDOWN);
    }
  }
}

const attackPriority = (a: AttackData): number => {
  switch (a.category) {
    case 'super':
      return 100;
    case 'special':
      return a.input.motion ? 80 : 60;
    case 'grab':
      return 50;
    case 'heavy':
      return 20;
    default:
      return 10;
  }
};

export const buttonLabel = (button: number): string => {
  switch (button) {
    case Btn.LP:
      return 'LP';
    case Btn.HP:
      return 'HP';
    case Btn.LK:
      return 'LK';
    case Btn.HK:
      return 'HK';
    case Btn.SP1:
      return 'SP1';
    case Btn.SP2:
      return 'SP2';
    case Btn.BLOCK:
      return 'BLK';
    case Btn.GRAB:
      return 'GRB';
    default:
      return '?';
  }
};
