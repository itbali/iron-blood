import type { HitboxDef, LockSequenceDef, MoveDef, ProjectileDef } from '../combat/AttackData';
import type { Hurtbox, HurtStance } from '../combat/HitboxSystem';
import { buildHurtboxes, hitboxActiveAt, toWorldBox } from '../combat/HitboxSystem';
import {
  AIR_DRAG,
  DASH_WINDOW_FRAMES,
  GETUP_FRAMES,
  GRAVITY,
  GROUND_FRICTION,
  INPUT_BUFFER_FRAMES,
  KNOCKDOWN_FRAMES,
  MAX_CHAIN,
  MAX_METER,
  MOTION_WINDOW_FRAMES,
  SUPER_COST,
  SUPER_SIMULTANEOUS_FRAMES,
  WALK_ACCEL,
  WALK_DECEL,
} from '../core/constants';
import type { Box } from '../core/math';
import { approach, clamp } from '../core/math';
import type { GameEvent } from '../game/events';
import { InputBuffer } from '../input/InputBuffer';
import type { FrameInput } from '../input/InputTypes';
import { Button, EMPTY_INPUT } from '../input/InputTypes';
import type { CharacterDef, FinisherDef, NormalSlot } from './CharacterDef';
import { ACTIONABLE_STATES, FighterState } from './FighterState';

export interface FighterContext {
  events: GameEvent[];
  opponent: Fighter;
  inputEnabled: boolean;
  finisherWindow: boolean;
  spawnProjectile: (owner: Fighter, def: ProjectileDef) => void;
  requestFreeze: (owner: Fighter, move: MoveDef) => void;
  startFinisher: (attacker: Fighter, finisher: FinisherDef) => void;
  clampX: (x: number) => number;
}

/** Runtime lock (throw / cinematic) owned by the attacker. Driven by LockSystem. */
export interface LockState {
  def: LockSequenceDef;
  target: Fighter;
  frame: number;
  anchorX: number;
  facing: 1 | -1;
  offX: number;
  offY: number;
  targetOffX: number;
  targetOffY: number;
  attackerSide: 1 | -1;
  damage: number;
  name: string;
  techable: boolean;
  finisher: boolean;
  nextStep: number;
}

export type FinisherOutcome = 'disintegrate' | 'shatter' | 'collapse';

const NORMAL_BUTTON_ORDER: { bit: Button; key: 'lp' | 'hp' | 'lk' | 'hk' }[] = [
  { bit: Button.HK, key: 'hk' },
  { bit: Button.HP, key: 'hp' },
  { bit: Button.LK, key: 'lk' },
  { bit: Button.LP, key: 'lp' },
];

const SPECIAL_BUTTON_BIT = { s1: Button.S1, s2: Button.S2, grab: Button.GRAB } as const;

export class Fighter {
  readonly buffer = new InputBuffer();
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  prevX = 0;
  prevY = 0;
  facing: 1 | -1 = 1;
  state: FighterState = FighterState.IDLE;
  stateFrame = 0;
  hp: number;
  readonly maxHp: number;
  meter = 0;
  crouching = false;

  move: MoveDef | null = null;
  moveFrame = 0;
  moveHits = 0;
  lastHitFrame = -99;
  moveConnected = false;
  moveBlocked = false;
  chainCount = 0;
  armorHits = 0;
  airAttackUsed = false;

  stun = 0;
  knockdownPending = false;
  invuln = 0;
  blockPressAge = 99;
  input: FrameInput = EMPTY_INPUT;

  lock: LockState | null = null;
  lockedBy: Fighter | null = null;
  lockAnim: string | null = null;
  lockAnimFrame = 0;

  flash = 0;
  phase2 = false;
  finisherOutcome: FinisherOutcome | null = null;
  outcomeFrame = 0;
  /** Shown instead of lying down when a round is lost on time. */
  defeatPose = false;
  infiniteHealth = false;
  infiniteMeter = false;
  skin: 'default' | 'alt' = 'default';

  readonly stats = { damageDealt: 0, maxCombo: 0, hits: 0 };
  lastAttackId = '';
  lastAdvantage = 0;
  /** True while walking or a move's motion step is driving velocity this frame. */
  private driven = false;

  constructor(
    readonly def: CharacterDef,
    readonly index: 0 | 1,
  ) {
    this.maxHp = def.maxHealth;
    this.hp = this.maxHp;
  }

  get scale(): number {
    return this.def.physique.scale;
  }

  get grounded(): boolean {
    return this.y <= 0;
  }

  get speedMult(): number {
    return this.phase2 && this.def.boss ? this.def.boss.phase2SpeedMult : 1;
  }

  get damageMult(): number {
    return this.def.physique.damageMult * (this.phase2 && this.def.boss ? this.def.boss.phase2DamageMult : 1);
  }

  get isActionable(): boolean {
    return ACTIONABLE_STATES.has(this.state) && !(this.state === FighterState.BLOCK && this.stun > 0);
  }

  get isLocked(): boolean {
    return this.lock !== null || this.lockedBy !== null;
  }

  /** Total frames of the current move: startup includes the first active frame (arcade convention). */
  get moveTotalFrames(): number {
    return this.move ? this.move.startup + this.move.active + this.move.recovery - 1 : 0;
  }

  get movePhase(): 'startup' | 'active' | 'recovery' | null {
    if (!this.move) return null;
    if (this.moveFrame < this.move.startup) return 'startup';
    if (this.moveFrame < this.move.startup + this.move.active) return 'active';
    return 'recovery';
  }

  resetForRound(x: number, facing: 1 | -1, keepMeterRatio: number): void {
    this.x = x;
    this.prevX = x;
    this.y = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.meter = Math.floor(this.meter * keepMeterRatio);
    this.setState(FighterState.IDLE);
    this.move = null;
    this.stun = 0;
    this.lock = null;
    this.lockedBy = null;
    this.lockAnim = null;
    this.crouching = false;
    this.knockdownPending = false;
    this.invuln = 0;
    this.flash = 0;
    this.finisherOutcome = null;
    this.defeatPose = false;
    this.phase2 = false;
    this.buffer.clear();
  }

  setState(s: FighterState): void {
    if (this.state !== s) {
      this.state = s;
      this.stateFrame = 0;
    }
  }

  // ---------------------------------------------------------------- update

  update(rawInput: FrameInput, ctx: FighterContext): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.driven = false;
    const input = ctx.inputEnabled ? rawInput : EMPTY_INPUT;
    this.input = input;
    this.buffer.push(input, this.facing);
    this.blockPressAge = input.pressed & Button.BLOCK ? 0 : this.blockPressAge + 1;
    this.stateFrame++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.finisherOutcome) this.outcomeFrame++;
    if (this.isLocked) return;

    switch (this.state) {
      case FighterState.IDLE:
      case FighterState.WALK:
      case FighterState.CROUCH:
      case FighterState.BLOCK:
        this.updateNeutral(input, ctx);
        break;
      case FighterState.JUMP:
        this.updateJump(input, ctx);
        break;
      case FighterState.ATTACK:
      case FighterState.SPECIAL:
      case FighterState.GRAB:
        this.advanceMove(ctx);
        break;
      case FighterState.HIT:
        if (--this.stun <= 0) this.setState(this.crouching ? FighterState.CROUCH : FighterState.IDLE);
        break;
      case FighterState.KNOCKDOWN:
        if (this.stateFrame >= KNOCKDOWN_FRAMES && this.hp > 0) {
          this.setState(FighterState.GETUP);
          this.invuln = GETUP_FRAMES;
        }
        break;
      case FighterState.GETUP:
        if (this.stateFrame >= GETUP_FRAMES) this.setState(this.hp <= 0 ? FighterState.DAZED : FighterState.IDLE);
        break;
      default:
        break;
    }
  }

  private faceOpponent(opp: Fighter): void {
    const dx = opp.x - this.x;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
  }

  private updateNeutral(input: FrameInput, ctx: FighterContext): void {
    if (this.state === FighterState.BLOCK && this.stun > 0) {
      this.stun--;
      return;
    }
    this.faceOpponent(ctx.opponent);
    if (ctx.finisherWindow && this.tryFinisher(ctx)) return;
    if (this.tryStartMove(null, ctx)) return;

    const blockHeld = (input.held & Button.BLOCK) !== 0;
    if (input.y === 1) {
      this.startJump(input, ctx);
      return;
    }
    if (input.y === -1) {
      this.crouching = true;
      this.setState(blockHeld ? FighterState.BLOCK : FighterState.CROUCH);
      this.vx = approach(this.vx, 0, WALK_DECEL * 2);
      return;
    }
    this.crouching = false;
    if (blockHeld) {
      this.setState(FighterState.BLOCK);
      this.vx = approach(this.vx, 0, WALK_DECEL * 2);
      return;
    }
    if (input.x !== 0) {
      this.setState(FighterState.WALK);
      const forward = input.x === this.facing;
      const speed = (forward ? this.def.physique.walkSpeed : this.def.physique.backSpeed) * this.speedMult;
      this.vx = approach(this.vx, input.x * speed, WALK_ACCEL);
      this.driven = true;
    } else {
      this.setState(FighterState.IDLE);
      this.vx = approach(this.vx, 0, WALK_DECEL);
      this.driven = true;
    }
  }

  private startJump(input: FrameInput, ctx: FighterContext): void {
    this.crouching = false;
    this.setState(FighterState.JUMP);
    this.vy = this.def.physique.jumpVelocity;
    this.vx = input.x * this.def.physique.jumpVx * this.speedMult;
    this.y = 0.01;
    this.airAttackUsed = false;
    ctx.events.push({ type: 'jump', fighter: this.index, x: this.x });
  }

  private updateJump(input: FrameInput, ctx: FighterContext): void {
    const maxAir = this.def.physique.jumpVx * this.speedMult;
    this.vx = clamp(this.vx + input.x * 0.12, -maxAir, maxAir);
    if (!this.airAttackUsed) this.tryStartMove(null, ctx);
  }

  // ---------------------------------------------------------------- moves

  private canUse(id: string, kind: MoveDef['kind'], cancelInto: string[] | null): boolean {
    if (!cancelInto) return true;
    if (this.chainCount >= MAX_CHAIN) return false;
    if (cancelInto.includes(id)) return true;
    if (kind === 'special' && cancelInto.includes('special')) return true;
    if (kind === 'super' && cancelInto.includes('super')) return true;
    return false;
  }

  /**
   * Reads the input buffer and starts the highest-priority move available:
   * super → motion specials → button specials → throw → normals.
   * With `cancelInto` set, only moves listed there can start (chain/cancel window).
   */
  tryStartMove(cancelInto: string[] | null, ctx: FighterContext): boolean {
    const b = this.buffer;
    const airborne = !this.grounded;

    if (!airborne && (this.meter >= SUPER_COST || this.infiniteMeter) && this.canUse(this.def.superMove.id, 'super', cancelInto)) {
      if (b.findPress(Button.S1 | Button.S2, SUPER_SIMULTANEOUS_FRAMES) >= 0) {
        b.consume(Button.S1 | Button.S2, SUPER_SIMULTANEOUS_FRAMES);
        this.startMove(this.def.superMove, cancelInto !== null, ctx);
        return true;
      }
    }

    if (!airborne) {
      for (const sp of this.def.specialInputs) {
        const mv = this.findSpecial(sp.move);
        if (!mv || (mv.phase2Only && !this.phase2)) continue;
        const bit = SPECIAL_BUTTON_BIT[sp.button];
        const age = b.findPress(bit, INPUT_BUFFER_FRAMES);
        if (age < 0) continue;
        if (sp.motion.length) {
          const window = sp.motion.includes('N') ? DASH_WINDOW_FRAMES : MOTION_WINDOW_FRAMES;
          if (!b.matchMotion(sp.motion, window, age)) continue;
        }
        if (!this.canUse(mv.id, mv.kind, cancelInto)) continue;
        b.consume(bit, INPUT_BUFFER_FRAMES);
        this.startMove(mv, cancelInto !== null, ctx);
        return true;
      }

      if (cancelInto === null && b.findPress(Button.GRAB, INPUT_BUFFER_FRAMES) >= 0) {
        b.consume(Button.GRAB, INPUT_BUFFER_FRAMES);
        this.startMove(this.def.throwMove, false, ctx);
        return true;
      }
    }

    const prefix = airborne ? 'j' : this.input.y === -1 ? 'c' : '';
    for (const { bit, key } of NORMAL_BUTTON_ORDER) {
      if (b.findPress(bit, INPUT_BUFFER_FRAMES) < 0) continue;
      const slot = `${prefix}${key}` as NormalSlot;
      const mv = this.def.normals[slot];
      if (!this.canUse(mv.id, mv.kind, cancelInto)) continue;
      b.consume(bit, INPUT_BUFFER_FRAMES);
      if (airborne) this.airAttackUsed = true;
      this.startMove(mv, cancelInto !== null, ctx);
      return true;
    }
    return false;
  }

  private findSpecial(id: string): MoveDef | undefined {
    return this.def.specials.find((m) => m.id === id);
  }

  startMove(m: MoveDef, isCancel: boolean, ctx: FighterContext): void {
    if (m.meterCost && !this.infiniteMeter) this.meter = Math.max(0, this.meter - m.meterCost);
    this.move = m;
    this.moveFrame = 0;
    this.moveHits = 0;
    this.lastHitFrame = -99;
    this.moveConnected = false;
    this.moveBlocked = false;
    this.armorHits = m.armor?.hits ?? 0;
    this.chainCount = isCancel ? this.chainCount + 1 : 0;
    this.crouching = m.stance === 'crouch';
    this.setState(m.kind === 'normal' ? FighterState.ATTACK : m.kind === 'grab' ? FighterState.GRAB : FighterState.SPECIAL);
    this.stateFrame = 0;
    if (m.stance !== 'air') this.vx *= 0.25;
    this.lastAttackId = m.id;
    ctx.events.push({ type: 'move-start', fighter: this.index, moveId: m.id, kind: m.kind, sfx: m.sfx, name: m.name });
    if (m.superFreeze) ctx.requestFreeze(this, m);
  }

  private advanceMove(ctx: FighterContext): void {
    const m = this.move;
    if (!m) {
      this.endMove();
      return;
    }
    this.moveFrame++;
    const f = this.moveFrame;

    if (m.motion) {
      for (const step of m.motion) {
        const inRange = step.until !== undefined ? f >= step.frame && f <= step.until : f === step.frame;
        if (!inRange) continue;
        if (step.vx !== undefined) {
          this.vx = step.vx * this.facing * this.speedMult;
          this.driven = true;
        }
        if (step.vy !== undefined && f === step.frame) {
          this.vy = step.vy;
          this.y = Math.max(this.y, 0.01);
        }
      }
    }

    if (m.teleport && f === m.teleport.frame) this.teleport(m.teleport, ctx);
    if (m.projectile && f === (m.projectileFrame ?? m.startup)) ctx.spawnProjectile(this, m.projectile);

    if (f === m.startup + m.active && !this.moveConnected && (m.hitboxes.length > 0 || m.grab)) {
      ctx.events.push({ type: 'whiff', fighter: this.index, sfx: m.whiffSfx ?? 'whoosh' });
    }

    if (this.moveConnected && m.cancelInto && f >= m.startup && this.grounded) {
      if (this.tryStartMove(m.cancelInto, ctx)) return;
    }

    if (f >= this.moveTotalFrames) this.endMove();
  }

  private teleport(t: NonNullable<MoveDef['teleport']>, ctx: FighterContext): void {
    const opp = ctx.opponent;
    const toward: 1 | -1 = opp.x >= this.x ? 1 : -1;
    const from = this.x;
    let nx = this.x;
    if (t.mode === 'behind') nx = opp.x + toward * t.distance * this.scale;
    else if (t.mode === 'front') nx = opp.x - toward * t.distance * this.scale;
    else nx = this.x - this.facing * t.distance;
    this.x = ctx.clampX(nx);
    this.prevX = this.x;
    this.faceOpponent(opp);
    ctx.events.push({ type: 'teleport', fighter: this.index, fromX: from, toX: this.x, y: this.y, color: this.def.visual.palette.glow });
  }

  endMove(): void {
    this.move = null;
    this.moveFrame = 0;
    if (!this.grounded) {
      this.setState(FighterState.JUMP);
      return;
    }
    const down = this.input.y === -1;
    this.crouching = down;
    this.setState(down ? FighterState.CROUCH : FighterState.IDLE);
  }

  private tryFinisher(ctx: FighterContext): boolean {
    for (const fin of this.def.finishers) {
      const bit = SPECIAL_BUTTON_BIT[fin.button];
      const age = this.buffer.findPress(bit, INPUT_BUFFER_FRAMES);
      if (age < 0) continue;
      if (!this.buffer.matchMotion(fin.motion, MOTION_WINDOW_FRAMES, age)) continue;
      if (Math.abs(ctx.opponent.x - this.x) > fin.range) continue;
      this.buffer.consume(bit, INPUT_BUFFER_FRAMES);
      ctx.startFinisher(this, fin);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- physics

  integrate(): void {
    if (this.isLocked) return;
    const airborne = this.y > 0 || this.vy > 0;
    if (airborne) {
      this.vy -= GRAVITY * this.def.physique.gravityMult;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= AIR_DRAG;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.land();
      }
    } else {
      this.x += this.vx;
      if (!this.driven) this.vx *= GROUND_FRICTION;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }
  }

  /** Landing transitions; air attacks end on landing, juggled fighters fall into knockdown. */
  land(events?: GameEvent[]): void {
    switch (this.state) {
      case FighterState.JUMP:
        this.setState(FighterState.IDLE);
        this.vx = 0;
        events?.push({ type: 'land', fighter: this.index, x: this.x, heavy: false });
        break;
      case FighterState.ATTACK:
      case FighterState.SPECIAL:
        if (this.move?.stance === 'air') {
          this.endMove();
          this.vx = 0;
        }
        break;
      case FighterState.HURT:
        this.vx *= 0.4;
        this.setState(this.hp <= 0 ? FighterState.DEAD : FighterState.KNOCKDOWN);
        this.knockdownPending = false;
        this.pendingLandEvent = true;
        break;
      default:
        break;
    }
  }

  /** Set when the fighter hits the floor after a juggle; consumed by the session for dust/sfx. */
  pendingLandEvent = false;

  // ---------------------------------------------------------------- combat queries

  isInvulnerable(): boolean {
    if (this.invuln > 0 || this.isLocked) return true;
    if (
      this.state === FighterState.KNOCKDOWN ||
      this.state === FighterState.GETUP ||
      this.state === FighterState.DEAD ||
      this.state === FighterState.VICTORY ||
      this.state === FighterState.INTRO
    )
      return true;
    const inv = this.move?.invuln;
    return !!inv && this.moveFrame >= inv[0] && this.moveFrame <= inv[1];
  }

  isProjectileInvulnerable(): boolean {
    const inv = this.move?.projectileInvuln;
    return this.isInvulnerable() || (!!inv && this.moveFrame >= inv[0] && this.moveFrame <= inv[1]);
  }

  hurtStance(): HurtStance {
    if (this.state === FighterState.KNOCKDOWN || this.state === FighterState.DEAD) return 'lying';
    if (this.y > 4 || this.state === FighterState.HURT || this.state === FighterState.JUMP) return 'air';
    if (this.crouching) return 'crouch';
    return 'stand';
  }

  /** Hurtboxes exist even while invulnerable for debug drawing; `active` tells combat whether they count. */
  getHurtboxes(): Hurtbox[] {
    const extension: HitboxDef[] =
      this.move && this.move.kind === 'normal' && this.moveFrame >= this.move.startup ? this.move.hitboxes : [];
    return buildHurtboxes(this.hurtStance(), this.x, this.y, this.facing, this.scale, extension);
  }

  getActiveHitboxes(): Box[] {
    const m = this.move;
    if (!m || !m.hitboxes.length) return [];
    const maxHits = m.hits ?? 1;
    if (this.moveHits >= maxHits) return [];
    if (this.moveHits > 0 && this.moveFrame - this.lastHitFrame < (m.rehit ?? 999)) return [];
    const out: Box[] = [];
    for (const hb of m.hitboxes) {
      if (hitboxActiveAt(hb, this.moveFrame, m.startup, m.active)) out.push(toWorldBox(hb, this.x, this.y, this.facing, this.scale));
    }
    return out;
  }

  getPushbox(): Box {
    const w = this.def.physique.pushWidth * this.scale * 0.85;
    const h = (this.crouching ? 105 : this.state === FighterState.KNOCKDOWN || this.state === FighterState.DEAD ? 30 : 165) * this.scale;
    return { x: this.x - w / 2, y: this.y, w, h };
  }

  isBlocking(): boolean {
    return this.state === FighterState.BLOCK && this.grounded;
  }

  counterActive(): boolean {
    const c = this.move?.counter;
    return !!c && this.moveFrame >= c.from && this.moveFrame <= c.to;
  }

  armorActive(): boolean {
    const a = this.move?.armor;
    return !!a && this.armorHits > 0 && this.moveFrame >= a.from && this.moveFrame <= a.to;
  }

  /** Attacking during startup frames means the fighter can be counter-hit. */
  inStartup(): boolean {
    return !!this.move && this.moveFrame < this.move.startup;
  }

  /** Remaining frames until this fighter can act again (used for frame advantage). */
  framesUntilActionable(): number {
    if (this.move) return Math.max(0, this.moveTotalFrames - this.moveFrame);
    return this.stun;
  }

  // ---------------------------------------------------------------- reactions

  receiveHit(p: { hitstun: number; knockback: number; launch: number; knockdown: boolean; dir: 1 | -1 }): void {
    this.move = null;
    this.flash = 8;
    const w = this.def.physique.weight;
    if (!this.grounded || p.launch > 0 || p.knockdown) {
      this.setState(FighterState.HURT);
      this.stateFrame = 0;
      this.vy = p.launch > 0 ? p.launch : this.grounded ? 6 : Math.max(this.vy, 0) + 6;
      this.y = Math.max(this.y, 0.01);
      this.vx = p.dir * p.knockback * w * 0.75;
      this.knockdownPending = true;
      this.stun = 0;
    } else {
      this.setState(FighterState.HIT);
      this.stateFrame = 0;
      this.stun = p.hitstun;
      this.vx = p.dir * p.knockback * w;
    }
  }

  receiveBlock(blockstun: number, pushback: number, dir: 1 | -1): void {
    this.move = null;
    this.setState(FighterState.BLOCK);
    this.stun = blockstun;
    this.vx = dir * pushback * this.def.physique.weight;
  }

  addMeter(amount: number): void {
    this.meter = clamp(this.meter + amount, 0, MAX_METER);
  }

  /** Debug / training snapshot. */
  describe(): Record<string, string | number> {
    return {
      state: this.state,
      frame: this.stateFrame,
      move: this.move ? `${this.move.id} ${this.moveFrame}/${this.moveTotalFrames} (${this.movePhase})` : '-',
      vx: this.vx.toFixed(2),
      vy: this.vy.toFixed(2),
      x: this.x.toFixed(0),
      y: this.y.toFixed(0),
      hp: Math.round(this.hp),
      meter: Math.round(this.meter),
      stun: this.stun,
    };
  }
}
