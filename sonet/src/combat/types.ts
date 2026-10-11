export enum FighterState {
  IDLE = 'IDLE',
  WALK = 'WALK',
  CROUCH = 'CROUCH',
  JUMP = 'JUMP',
  ATTACK = 'ATTACK',
  BLOCK = 'BLOCK',
  HIT = 'HIT',
  HURT = 'HURT',
  KNOCKDOWN = 'KNOCKDOWN',
  GETUP = 'GETUP',
  GRAB = 'GRAB',
  THROW = 'THROW',
  SPECIAL = 'SPECIAL',
  DEAD = 'DEAD',
  VICTORY = 'VICTORY',
}

export type HitLevel = 'high' | 'mid' | 'low';
export type Stance = 'stand' | 'crouch' | 'air';
export type ButtonId = 'lp' | 'hp' | 'lk' | 'hk' | 'sp1' | 'sp2';
export type MoveKind = 'normal' | 'special' | 'grab' | 'super';
export type MotionDir = 'FWD' | 'BACK' | 'UP' | 'DOWN';
export type SfxId =
  | 'punch' | 'kick' | 'heavy-hit' | 'block' | 'perfect-block' | 'grab' | 'throw'
  | 'special' | 'projectile' | 'ko' | 'victory' | 'countdown' | 'round-start'
  | 'menu-hover' | 'menu-click' | 'whoosh' | 'wall' | 'jump' | 'land' | 'super'
  | 'teleport' | 'finisher' | 'announce' | 'phase';
export type PoseId = string;

/** Box in fighter-local space, authored facing right. x = left edge offset from origin, y = bottom edge above the ground. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AttackData {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  pushback: number;
  hitLevel: HitLevel;
  cancelInto?: string[];
}

export interface MotionCommand {
  seq: MotionDir[];
  button: ButtonId;
}

export interface ProjectileSpawn {
  frame: number;
  speed: number;
  x: number;
  y: number;
  w: number;
  h: number;
  life: number;
  color: string;
  kind: 'slash' | 'orb' | 'wave';
  damage?: number;
}

export interface GrabData {
  range: number;
  /** Total frames of the throw animation after the grab connects. */
  duration: number;
  hits: { frame: number; damage: number; fx: 'strike' | 'slam' | 'slash' }[];
  launch: { vx: number; vy: number };
  techable: boolean;
  cinematic?: boolean;
}

export interface MoveDef {
  id: string;
  name: string;
  kind: MoveKind;
  stance: Stance;
  button?: ButtonId;
  command?: MotionCommand;
  /** Needs both SP1 and SP2 pressed together. */
  superInput?: boolean;
  chainOnly?: boolean;
  attack: AttackData;
  hitboxes: Box[];
  anim: { wind: PoseId; strike: PoseId; recover?: PoseId };
  hitstop?: number;
  lunge?: { from: number; to: number; vx: number; vy?: number }[];
  invuln?: [number, number];
  projectile?: ProjectileSpawn;
  teleport?: { frame: number; mode: 'behind' | 'front'; dist: number };
  armor?: { from: number; to: number; hits: number };
  counter?: { from: number; to: number; response: string };
  grab?: GrabData;
  multiHit?: { interval: number; finalBonus: number };
  launch?: { vx: number; vy: number };
  meterCost?: number;
  meterGain?: number;
  cooldown?: number;
  sfx: SfxId;
  trail?: string;
  /** Frames during which the move is a cinematic charge (screen dims). */
  charge?: [number, number];
  /** Move is only available in this boss phase or later. */
  minPhase?: number;
  noBlock?: boolean;
  /** Stays grounded and cannot be started from air. */
  landCancel?: boolean;
  /** Move frame at which the fighter is considered "committed" to hold position (no cancel). */
  noCancel?: boolean;
}

export interface Hurtboxes {
  stand: Box[];
  crouch: Box[];
  air: Box[];
  down: Box[];
}

export interface CharacterStats {
  speed: number;
  damage: number;
  health: number;
  difficulty: string;
}

export interface Palette {
  skin: string;
  cloth: string;
  clothDark: string;
  armor: string;
  armorLight: string;
  accent: string;
  glow: string;
  hair: string;
  eye: string;
}

export type HeadStyle = 'short-hair' | 'bald' | 'visor' | 'mask' | 'hood' | 'helmet' | 'crown';
export type BodyStyle = 'tactical' | 'cyber' | 'brute' | 'monk' | 'wraith' | 'mech' | 'archon';

export interface CharacterStyle {
  /** Overall figure scale; 1 = Raven. */
  scale: number;
  bulk: number;
  head: HeadStyle;
  body: BodyStyle;
  palette: Palette;
  trail: string;
  cape?: boolean;
  scar?: boolean;
}

export interface SkinDef {
  id: string;
  name: string;
  palette: Partial<Palette>;
  unlock: 'default' | 'arcade';
}

export interface FinisherDef {
  id: string;
  name: string;
  kind: 'energy' | 'physical' | 'cinematic';
  /** Facing-relative motion followed by a button. */
  seq: MotionDir[];
  button: ButtonId;
  duration: number;
  color: string;
}

export interface CharacterDialogue {
  intro: string[];
  victory: string[];
  defeat: string[];
  taunts: string[];
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  bio: string;
  weapon: string;
  styleText: string;
  stats: CharacterStats;
  maxHealth: number;
  walkSpeed: number;
  backSpeed: number;
  jumpVel: number;
  jumpForward: number;
  gravity: number;
  damageMult: number;
  height: number;
  pushWidth: number;
  hurtboxes: Hurtboxes;
  moves: Record<string, MoveDef>;
  style: CharacterStyle;
  skins: SkinDef[];
  dialogue: CharacterDialogue;
  finishers: FinisherDef[];
  playable: boolean;
  boss?: boolean;
  passiveArmor?: number;
  phase2?: { aggression: number };
  aiBias: { zoning: number; rushdown: number; grappler: number };
}

export type GameEventType =
  | 'hit' | 'block' | 'perfect-block' | 'whiff' | 'ko' | 'grab' | 'throw-hit' | 'tech'
  | 'special' | 'projectile' | 'wall' | 'counter' | 'armor' | 'combo-break' | 'jump' | 'land'
  | 'teleport' | 'super-start' | 'super-hit' | 'phase2' | 'knockdown' | 'dash' | 'swing' | 'finisher-hit';

export interface GameEvent {
  type: GameEventType;
  x: number;
  y: number;
  /** Slot of the fighter that caused the event. */
  slot: number;
  victim?: number;
  damage?: number;
  strength: 'light' | 'heavy' | 'special' | 'super';
  moveId?: string;
  facing: 1 | -1;
  color?: string;
  combo?: number;
}
