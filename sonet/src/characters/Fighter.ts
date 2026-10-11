import {
  FighterState, type Box, type CharacterDef, type GameEvent, type GameEventType, type Hurtboxes, type MoveDef,
} from '../combat/types';
import { toWorld, type Rect } from '../combat/HitboxSystem';
import {
  AIR_CONTROL, GETUP_FRAMES, GETUP_INVULN, GROUND_FRICTION, KNOCKDOWN_FRAMES, LAND_LAG, METER_MAX,
  SUPER_WINDOW, TECH_WINDOW, WALK_ACCEL, WALL_MARGIN,
} from '../data/constants';
import { BUTTON_BIT, Btn, type InputFrame } from '../input/InputFrame';
import { InputBuffer } from '../input/InputBuffer';

export interface FighterCtx {
  opponent: Fighter;
  emit: (type: GameEventType, f: Fighter, strength: GameEvent['strength'], extra?: Partial<GameEvent>) => void;
  spawnProjectile: (owner: Fighter, move: MoveDef) => void;
  stageHalf: number;
}

export interface HitParams {
  damage: number;
  hitstun: number;
  knockback: number;
  fromFacing: 1 | -1;
  launch?: { vx: number; vy: number };
  noStun?: boolean;
}

const NORMAL_ORDER: ('hp' | 'hk' | 'lp' | 'lk')[] = ['hp', 'hk', 'lp', 'lk'];

export class Fighter {
  readonly slot: number;
  def: CharacterDef;
  skin: string;

  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  state: FighterState = FighterState.IDLE;
  stateFrame = 0;
  hp: number;
  maxHp: number;
  meter = 0;
  phase = 1;

  move: MoveDef | null = null;
  moveFrame = 0;
  curFrame = 0;
  moveConnected: 'none' | 'hit' | 'block' = 'none';
  nextHitFrame = 0;
  hitDone = false;
  armorLeft = 0;
  strikeInvuln = false;
  counterActive = false;
  armorActive = false;

  hitstun = 0;
  blockstun = 0;
  blockFrames = 0;
  blockLow = false;
  blockLock = 0;
  invuln = 0;
  landLag = 0;
  flash = 0;
  juggle = 0;
  hitCrouch = false;
  airAttackUsed = false;
  jumpDir = 0;
  kneel = false;
  dissolve = 0;
  walkDir = 0;
  animTime = 0;
  afterimage = 0;
  wallImpact = 0;
  infiniteHealth = false;

  throwFrame = 0;
  throwTarget: Fighter | null = null;
  grabbedBy: Fighter | null = null;
  throwData: NonNullable<MoveDef['grab']> | null = null;
  throwMove: MoveDef | null = null;

  readonly buffer = new InputBuffer();
  input: InputFrame = 0;
  cooldowns: Record<string, number> = {};
  private commandMoves: MoveDef[];
  private neutralSpecials: MoveDef[];
  private superMove: MoveDef | undefined;
  private normals: MoveDef[];

  /** Last executed attack, for the training frame-data panel. */
  lastMove: MoveDef | null = null;
  lastAdvantage: number | null = null;
  lastResult: 'hit' | 'block' | null = null;

  constructor(slot: number, def: CharacterDef, skin = 'default') {
    this.slot = slot;
    this.def = def;
    this.skin = skin;
    this.maxHp = def.maxHealth;
    this.hp = def.maxHealth;
    const all = Object.values(def.moves);
    this.commandMoves = all
      .filter((m) => m.command && !m.chainOnly)
      .sort((a, b) => (b.command?.seq.length ?? 0) - (a.command?.seq.length ?? 0));
    this.neutralSpecials = all.filter((m) => m.kind === 'special' && !m.command && !m.chainOnly);
    this.superMove = all.find((m) => m.kind === 'super');
    this.normals = all.filter((m) => m.kind === 'normal' && !m.chainOnly);
  }

  resetForRound(x: number, facing: 1 | -1): void {
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.state = FighterState.IDLE;
    this.stateFrame = 0;
    this.move = null;
    this.moveFrame = 0;
    this.curFrame = 0;
    this.moveConnected = 'none';
    this.hitstun = 0;
    this.blockstun = 0;
    this.blockFrames = 0;
    this.blockLock = 0;
    this.invuln = 0;
    this.landLag = 0;
    this.flash = 0;
    this.juggle = 0;
    this.kneel = false;
    this.dissolve = 0;
    this.cooldowns = {};
    this.throwTarget = null;
    this.grabbedBy = null;
    this.throwData = null;
    this.strikeInvuln = false;
    this.armorActive = false;
    this.counterActive = false;
    this.afterimage = 0;
    this.buffer.clear();
  }

  get airborne(): boolean {
    return this.y > 0.01 || this.vy > 0;
  }

  get inStun(): boolean {
    return this.state === FighterState.HIT || this.state === FighterState.HURT;
  }

  get isAttacking(): boolean {
    return this.state === FighterState.ATTACK || this.state === FighterState.SPECIAL || this.state === FighterState.GRAB;
  }

  get isFree(): boolean {
    return (
      this.state === FighterState.IDLE || this.state === FighterState.WALK || this.state === FighterState.CROUCH ||
      this.state === FighterState.BLOCK || this.state === FighterState.JUMP
    );
  }

  get invulnerable(): boolean {
    const getupSafe = this.state === FighterState.GETUP && this.stateFrame < GETUP_INVULN;
    return this.invuln > 0 || this.strikeInvuln || this.state === FighterState.KNOCKDOWN || getupSafe;
  }

  get isCrouching(): boolean {
    if (this.state === FighterState.CROUCH) return true;
    if (this.state === FighterState.BLOCK && this.blockLow) return true;
    if (this.move && this.move.stance === 'crouch' && this.isAttacking) return true;
    if (this.state === FighterState.HIT && this.hitCrouch) return true;
    return this.kneel;
  }

  hurtboxKey(): keyof Hurtboxes {
    if (this.state === FighterState.KNOCKDOWN || (this.state === FighterState.DEAD && !this.kneel) || this.state === FighterState.GETUP) return 'down';
    if (this.state === FighterState.HURT || this.airborne) return 'air';
    if (this.isCrouching) return 'crouch';
    return 'stand';
  }

  hurtRects(): Rect[] {
    const boxes = this.def.hurtboxes[this.hurtboxKey()];
    return boxes.map((b) => toWorld(b, this.x, this.y, this.facing));
  }

  /** Hitboxes exist only during active frames of the current move. */
  hitRects(): Rect[] {
    const m = this.move;
    if (!m || !this.isAttacking || m.hitboxes.length === 0) return [];
    if (!this.isActiveFrame()) return [];
    return m.hitboxes.map((b: Box) => toWorld(b, this.x, this.y, this.facing));
  }

  isActiveFrame(): boolean {
    const m = this.move;
    if (!m) return false;
    const a = m.attack;
    return this.curFrame >= a.startup && this.curFrame < a.startup + a.active;
  }

  pushRect(): Rect {
    const half = this.def.pushWidth / 2;
    const lying = this.state === FighterState.KNOCKDOWN || (this.state === FighterState.DEAD && !this.kneel);
    return { x1: this.x - half, x2: this.x + half, y1: this.y, y2: this.y + (lying ? 30 : this.def.height * 0.9) };
  }

  loseHp(n: number): void {
    this.hp = Math.max(this.infiniteHealth ? 1 : 0, this.hp - n);
  }

  canUse(m: MoveDef): boolean {
    if (m.minPhase && this.phase < m.minPhase) return false;
    if ((this.cooldowns[m.id] ?? 0) > 0) return false;
    if (m.meterCost && this.meter < m.meterCost) return false;
    return true;
  }

  setState(s: FighterState): void {
    if (this.state !== s) {
      this.state = s;
      this.stateFrame = 0;
    }
  }

  update(input: InputFrame, ctx: FighterCtx): void {
    this.input = input;
    this.buffer.push(input, this.facing);
    this.stateFrame++;
    this.animTime++;
    if (this.invuln > 0) this.invuln--;
    if (this.flash > 0) this.flash--;
    if (this.afterimage > 0) this.afterimage--;
    if (this.blockLock > 0) this.blockLock--;
    for (const k of Object.keys(this.cooldowns)) if (this.cooldowns[k] > 0) this.cooldowns[k]--;

    switch (this.state) {
      case FighterState.IDLE:
      case FighterState.WALK:
      case FighterState.CROUCH:
      case FighterState.BLOCK:
        this.updateNeutral(ctx);
        break;
      case FighterState.JUMP:
        this.updateJump(ctx);
        break;
      case FighterState.ATTACK:
      case FighterState.SPECIAL:
      case FighterState.GRAB:
        this.updateMove(ctx);
        break;
      case FighterState.THROW:
        this.updateThrow(ctx);
        break;
      case FighterState.HIT:
        this.updateHit(ctx);
        break;
      case FighterState.HURT:
        break;
      case FighterState.KNOCKDOWN:
        this.vx *= GROUND_FRICTION;
        if (this.stateFrame >= KNOCKDOWN_FRAMES) this.setState(FighterState.GETUP);
        break;
      case FighterState.GETUP:
        this.vx *= GROUND_FRICTION;
        if (this.stateFrame >= GETUP_FRAMES) this.setState(FighterState.IDLE);
        break;
      case FighterState.DEAD:
      case FighterState.VICTORY:
        this.vx *= GROUND_FRICTION;
        break;
    }
  }

  private faceOpponent(opp: Fighter): void {
    if (Math.abs(opp.x - this.x) > 4) this.facing = opp.x > this.x ? 1 : -1;
  }

  private updateNeutral(ctx: FighterCtx): void {
    const i = this.input;
    this.faceOpponent(ctx.opponent);

    if (this.blockstun > 0) {
      this.blockstun--;
      this.vx *= GROUND_FRICTION;
      this.blockFrames += 1;
      if (this.blockstun > 0) return;
      if (!(i & Btn.BLOCK)) this.leaveBlock();
      return;
    }
    if (this.landLag > 0) {
      this.landLag--;
      this.vx *= GROUND_FRICTION;
      return;
    }

    if (this.tryStartAction(ctx)) {
      this.stepMove(ctx);
      return;
    }

    if (i & Btn.UP) {
      this.startJump(i, ctx);
      return;
    }

    if ((i & Btn.BLOCK) && this.blockLock === 0) {
      if (this.state !== FighterState.BLOCK) {
        this.setState(FighterState.BLOCK);
        this.blockFrames = 0;
      }
      this.blockLow = (i & Btn.DOWN) !== 0;
      this.blockFrames += 1;
      this.vx *= GROUND_FRICTION;
      return;
    }
    if (this.state === FighterState.BLOCK) this.leaveBlock();

    const dir = ((i & Btn.RIGHT) ? 1 : 0) - ((i & Btn.LEFT) ? 1 : 0);
    if (i & Btn.DOWN) {
      this.setState(FighterState.CROUCH);
      this.vx *= GROUND_FRICTION;
      return;
    }
    if (dir !== 0) {
      const forward = dir === this.facing;
      const speed = forward ? this.def.walkSpeed : this.def.backSpeed;
      const target = dir * speed;
      const delta = target - this.vx;
      this.vx += Math.max(-WALK_ACCEL, Math.min(WALK_ACCEL, delta));
      this.walkDir = forward ? 1 : -1;
      this.setState(FighterState.WALK);
    } else {
      this.vx *= GROUND_FRICTION;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
      this.setState(FighterState.IDLE);
    }
  }

  private leaveBlock(): void {
    this.blockFrames = 0;
    this.blockLock = 4;
    this.setState(FighterState.IDLE);
  }

  private startJump(i: InputFrame, ctx: FighterCtx): void {
    const dir = ((i & Btn.RIGHT) ? 1 : 0) - ((i & Btn.LEFT) ? 1 : 0);
    this.vy = this.def.jumpVel;
    this.vx = dir * this.def.jumpForward;
    this.jumpDir = dir === 0 ? 0 : dir === this.facing ? 1 : -1;
    this.y = 0.5;
    this.airAttackUsed = false;
    this.setState(FighterState.JUMP);
    ctx.emit('jump', this, 'light');
  }

  private updateJump(ctx: FighterCtx): void {
    const i = this.input;
    const dir = ((i & Btn.RIGHT) ? 1 : 0) - ((i & Btn.LEFT) ? 1 : 0);
    if (dir !== 0) {
      const cap = this.def.jumpForward * 1.1;
      this.vx = Math.max(-cap, Math.min(cap, this.vx + dir * AIR_CONTROL * 0.35));
    }
    if (!this.airAttackUsed) {
      for (const b of NORMAL_ORDER) {
        if (!this.buffer.pressed(BUTTON_BIT[b])) continue;
        const air = this.def.moves[b === 'lp' || b === 'hp' ? 'jumpP' : 'jumpK'];
        if (!air) continue;
        this.buffer.consume(BUTTON_BIT[b]);
        this.airAttackUsed = true;
        this.startMove(air, ctx);
        this.stepMove(ctx);
        return;
      }
    }
  }

  private tryStartAction(ctx: FighterCtx): boolean {
    const b = this.buffer;
    if (this.superMove && this.meter >= METER_MAX && this.canUse(this.superMove) && b.chord(Btn.SP1, Btn.SP2, SUPER_WINDOW)) {
      b.consume(Btn.SP1 | Btn.SP2);
      this.startMove(this.superMove, ctx);
      return true;
    }
    if (b.pressed(Btn.GRAB)) {
      const g = this.def.moves.grab;
      if (g) {
        b.consume(Btn.GRAB);
        this.startMove(g, ctx);
        return true;
      }
    }
    for (const m of this.commandMoves) {
      if (!m.command || !this.canUse(m)) continue;
      if (b.command(m.command.seq, m.command.button)) {
        this.startMove(m, ctx);
        return true;
      }
    }
    for (const m of this.neutralSpecials) {
      if (!m.button || !this.canUse(m)) continue;
      if (b.pressed(BUTTON_BIT[m.button])) {
        this.startMove(m, ctx);
        return true;
      }
    }
    const stance = (this.input & Btn.DOWN) ? 'crouch' : 'stand';
    for (const id of NORMAL_ORDER) {
      if (!b.pressed(BUTTON_BIT[id])) continue;
      const m = this.normals.find((n) => n.stance === stance && n.button === id);
      if (!m) continue;
      b.consume(BUTTON_BIT[id]);
      this.startMove(m, ctx);
      return true;
    }
    return false;
  }

  startMove(m: MoveDef, ctx: FighterCtx): void {
    this.move = m;
    this.moveFrame = 0;
    this.curFrame = 0;
    this.moveConnected = 'none';
    this.hitDone = false;
    this.nextHitFrame = m.attack.startup;
    this.armorLeft = m.armor?.hits ?? 0;
    this.strikeInvuln = false;
    this.counterActive = false;
    this.armorActive = false;
    this.stateFrame = 0;
    this.lastMove = m;
    this.lastAdvantage = null;
    if (m.cooldown) this.cooldowns[m.id] = m.cooldown;
    if (m.meterCost) this.meter = Math.max(0, this.meter - m.meterCost);
    if (m.button && m.kind === 'normal') this.buffer.consume(BUTTON_BIT[m.button]);
    this.state = m.kind === 'grab' ? FighterState.GRAB : m.kind === 'special' || m.kind === 'super' ? FighterState.SPECIAL : FighterState.ATTACK;
    if (m.kind === 'special' || m.kind === 'super') ctx.emit('special', this, m.kind === 'super' ? 'super' : 'special', { moveId: m.id, color: m.trail });
  }

  private updateMove(ctx: FighterCtx): void {
    const m = this.move;
    if (!m) {
      this.endMove();
      return;
    }
    const a = m.attack;
    const total = a.startup + a.active + a.recovery;
    if (this.moveFrame >= total) {
      this.endMove();
      return;
    }

    if (this.moveConnected !== 'none' && this.moveFrame >= a.startup && !m.noCancel) {
      const next = this.findCancel(m);
      if (next) {
        this.startMove(next, ctx);
        this.stepMove(ctx);
        return;
      }
    }
    if (this.superMove && m.kind !== 'super' && this.moveFrame <= SUPER_WINDOW + 1 && this.meter >= METER_MAX &&
      m.kind !== 'grab' && this.buffer.chord(Btn.SP1, Btn.SP2, SUPER_WINDOW)) {
      this.buffer.consume(Btn.SP1 | Btn.SP2);
      this.startMove(this.superMove, ctx);
      this.stepMove(ctx);
      return;
    }
    this.stepMove(ctx);
  }

  private findCancel(m: MoveDef): MoveDef | null {
    const list = m.attack.cancelInto;
    if (!list || list.length === 0) return null;
    const b = this.buffer;
    const stance = m.stance === 'air' ? 'air' : (this.input & Btn.DOWN) ? 'crouch' : 'stand';
    if (stance === 'air') return null;
    const candidates = list.map((id) => this.def.moves[id]).filter((c): c is MoveDef => !!c && this.canUse(c));
    const sup = candidates.find((c) => c.kind === 'super');
    if (sup && this.meter >= METER_MAX && b.chord(Btn.SP1, Btn.SP2, SUPER_WINDOW)) {
      b.consume(Btn.SP1 | Btn.SP2);
      return sup;
    }
    for (const c of candidates) {
      if (c.command && !c.chainOnly && b.command(c.command.seq, c.command.button)) return c;
    }
    for (const c of candidates) {
      if (c.kind === 'special' && !c.command && c.button && !c.chainOnly && b.pressed(BUTTON_BIT[c.button])) return c;
    }
    for (const id of NORMAL_ORDER) {
      if (!b.pressed(BUTTON_BIT[id])) continue;
      const c = candidates.find((n) => n.kind === 'normal' && n.button === id && (n.stance === stance || n.chainOnly));
      if (c) {
        b.consume(BUTTON_BIT[id]);
        return c;
      }
    }
    return null;
  }

  /** Processes one frame of the current move: lunges, teleports, projectiles, invulnerability windows. */
  stepMove(ctx: FighterCtx): void {
    const m = this.move;
    if (!m) return;
    const f = this.moveFrame;
    this.curFrame = f;
    const a = m.attack;

    this.strikeInvuln = !!m.invuln && f >= m.invuln[0] && f <= m.invuln[1];
    this.armorActive = !!m.armor && f >= m.armor.from && f <= m.armor.to;
    this.counterActive = !!m.counter && f >= m.counter.from && f <= m.counter.to;

    let lunging = false;
    if (m.lunge) {
      for (const l of m.lunge) {
        if (f >= l.from && f < l.to) {
          this.vx = this.facing * l.vx;
          lunging = true;
          if (l.vy !== undefined && f === l.from) {
            this.vy = l.vy;
            this.y = Math.max(this.y, 0.5);
          }
        }
      }
    }
    if (!lunging && !this.airborne) this.vx *= GROUND_FRICTION;

    if (m.teleport && f === m.teleport.frame) this.doTeleport(m.teleport, ctx);
    if (m.projectile && f === m.projectile.frame) {
      ctx.spawnProjectile(this, m);
      ctx.emit('projectile', this, 'special', { moveId: m.id, color: m.projectile.color });
    }
    if (m.charge && f === m.charge[0] && m.kind === 'super') ctx.emit('super-start', this, 'super', { moveId: m.id, color: m.trail });
    if (m.kind !== 'grab' && f === a.startup && m.hitboxes.length > 0) ctx.emit('swing', this, m.kind === 'normal' ? 'light' : 'special', { moveId: m.id });
    if (m.kind === 'special' && m.lunge && f === m.lunge[0].from && m.lunge[0].vx > 6) {
      this.afterimage = 18;
      ctx.emit('dash', this, 'special', { moveId: m.id, color: m.trail });
    }
    this.moveFrame++;
  }

  private doTeleport(t: NonNullable<MoveDef['teleport']>, ctx: FighterCtx): void {
    const opp = ctx.opponent;
    const limit = ctx.stageHalf - WALL_MARGIN;
    ctx.emit('teleport', this, 'special', { color: this.move?.trail });
    let nx: number;
    if (t.mode === 'behind') {
      nx = opp.x + this.facing * t.dist;
      if (Math.abs(nx) > limit) nx = opp.x - this.facing * t.dist;
      else this.facing = (this.facing * -1) as 1 | -1;
    } else {
      nx = opp.x - this.facing * t.dist;
    }
    this.x = Math.max(-limit, Math.min(limit, nx));
    this.vx = 0;
    this.afterimage = 20;
    ctx.emit('teleport', this, 'special', { color: this.move?.trail });
  }

  endMove(): void {
    this.move = null;
    this.moveFrame = 0;
    this.strikeInvuln = false;
    this.armorActive = false;
    this.counterActive = false;
    if (this.airborne) {
      this.setState(FighterState.JUMP);
    } else if (this.input & Btn.DOWN) {
      this.setState(FighterState.CROUCH);
    } else {
      this.setState(FighterState.IDLE);
    }
  }

  private updateHit(ctx: FighterCtx): void {
    if (this.grabbedBy) {
      const g = this.grabbedBy;
      if (g.throwData?.techable && g.throwFrame <= TECH_WINDOW && this.buffer.pressed(Btn.GRAB, 3) && !g.throwData.cinematic) {
        g.techThrow(this, ctx);
      }
      return;
    }
    this.vx *= GROUND_FRICTION;
    this.hitstun--;
    if (this.hitstun <= 0) {
      this.juggle = 0;
      this.hitCrouch = false;
      this.setState(FighterState.IDLE);
    }
  }

  startThrow(victim: Fighter, move: MoveDef, ctx: FighterCtx): void {
    const g = move.grab;
    if (!g) return;
    this.move = move;
    this.throwMove = move;
    this.throwData = g;
    this.throwFrame = 0;
    this.throwTarget = victim;
    this.state = FighterState.THROW;
    this.stateFrame = 0;
    this.vx = 0;
    this.strikeInvuln = false;
    victim.grabbedBy = this;
    victim.move = null;
    victim.state = FighterState.HIT;
    victim.stateFrame = 0;
    victim.hitstun = 9999;
    victim.vx = 0;
    victim.vy = 0;
    victim.y = 0;
    victim.facing = (this.facing * -1) as 1 | -1;
    ctx.emit('grab', this, 'special', { victim: victim.slot, moveId: move.id, color: move.trail });
  }

  techThrow(victim: Fighter, ctx: FighterCtx): void {
    this.throwTarget = null;
    this.throwData = null;
    victim.grabbedBy = null;
    this.move = null;
    this.state = FighterState.IDLE;
    victim.state = FighterState.IDLE;
    this.vx = -this.facing * 7;
    victim.vx = this.facing * 7;
    this.landLag = 10;
    victim.landLag = 10;
    victim.hitstun = 0;
    ctx.emit('tech', victim, 'light', { victim: this.slot });
  }

  private updateThrow(ctx: FighterCtx): void {
    const g = this.throwData;
    const v = this.throwTarget;
    if (!g || !v) {
      this.endMove();
      return;
    }
    this.throwFrame++;
    v.x = this.x + this.facing * 58;
    v.y = 0;
    v.vx = 0;
    v.vy = 0;
    for (const h of g.hits) {
      if (h.frame === this.throwFrame) {
        const dmg = Math.round(h.damage * this.def.damageMult);
        v.loseHp(dmg);
        v.flash = 8;
        ctx.emit('throw-hit', this, h.fx === 'slam' ? 'special' : 'heavy', {
          victim: v.slot, damage: dmg, x: v.x, y: v.y + 110, moveId: h.fx,
        });
      }
    }
    if (this.throwFrame >= g.duration) {
      v.grabbedBy = null;
      this.throwTarget = null;
      this.throwData = null;
      v.applyHit({ damage: 0, hitstun: 0, knockback: g.launch.vx, fromFacing: this.facing, launch: g.launch });
      this.endMove();
      this.landLag = 16;
      this.moveConnected = 'hit';
      ctx.emit('knockdown', this, 'special', { victim: v.slot });
    }
  }

  /** Applies a connected hit to this fighter. Armor and blocking are decided by the CombatSystem before this call. */
  applyHit(p: HitParams): void {
    this.loseHp(p.damage);
    this.flash = 8;
    if (this.state === FighterState.KNOCKDOWN || this.state === FighterState.DEAD) return;
    const wasAir = this.airborne || this.state === FighterState.HURT;
    this.hitCrouch = this.isCrouching;
    this.move = null;
    this.moveFrame = 0;
    this.strikeInvuln = false;
    this.armorActive = false;
    this.counterActive = false;
    this.blockstun = 0;
    if (this.grabbedBy) this.grabbedBy = null;
    const dir = p.fromFacing;
    if (this.hp <= 0) {
      this.state = FighterState.HURT;
      this.stateFrame = 0;
      this.vx = dir * 7;
      this.vy = 11;
      this.y = Math.max(this.y, 0.5);
      return;
    }
    if (p.launch || wasAir) {
      this.state = FighterState.HURT;
      this.stateFrame = 0;
      this.vx = dir * (p.launch?.vx ?? p.knockback);
      this.vy = p.launch?.vy ?? 6;
      this.y = Math.max(this.y, 0.5);
      this.juggle++;
    } else {
      this.state = FighterState.HIT;
      this.stateFrame = 0;
      this.hitstun = p.hitstun;
      this.vx = dir * p.knockback;
      this.juggle = 0;
    }
  }

  /** Called by physics when the fighter touches the ground. */
  land(ctx: FighterCtx): void {
    this.y = 0;
    this.vy = 0;
    if (this.state === FighterState.HURT) {
      this.vx *= 0.5;
      if (this.hp <= 0) {
        this.setState(FighterState.DEAD);
        ctx.emit('knockdown', this, 'heavy', { x: this.x });
      } else {
        this.setState(FighterState.KNOCKDOWN);
        this.juggle = 0;
        ctx.emit('knockdown', this, 'heavy', { x: this.x });
      }
      return;
    }
    if (this.state === FighterState.JUMP) {
      this.landLag = LAND_LAG;
      this.setState(FighterState.IDLE);
      ctx.emit('land', this, 'light');
      return;
    }
    if ((this.state === FighterState.ATTACK || this.state === FighterState.SPECIAL) && this.move && (this.move.stance === 'air' || this.move.landCancel)) {
      this.endMove();
      this.landLag = LAND_LAG + 3;
      ctx.emit('land', this, 'light');
      return;
    }
    if (this.state === FighterState.ATTACK || this.state === FighterState.SPECIAL) {
      this.vy = 0;
    }
  }

  integrate(ctx: FighterCtx): void {
    if (this.state === FighterState.THROW) return;
    this.x += this.vx;
    const limit = ctx.stageHalf - WALL_MARGIN;
    if (this.x > limit) {
      this.x = limit;
      if (this.vx > 0) {
        this.wallImpact = this.vx;
        this.vx = 0;
      }
    } else if (this.x < -limit) {
      this.x = -limit;
      if (this.vx < 0) {
        this.wallImpact = -this.vx;
        this.vx = 0;
      }
    }
    if (this.airborne || this.vy !== 0) {
      this.y += this.vy;
      this.vy -= this.def.gravity;
      if (this.y <= 0) this.land(ctx);
    }
  }
}
