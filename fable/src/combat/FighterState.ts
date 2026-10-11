export enum FighterState {
  IDLE = 'IDLE',
  WALK = 'WALK',
  CROUCH = 'CROUCH',
  JUMP = 'JUMP',
  ATTACK = 'ATTACK',
  SPECIAL = 'SPECIAL',
  BLOCK = 'BLOCK',
  BLOCKSTUN = 'BLOCKSTUN',
  HIT = 'HIT',
  HURT = 'HURT',
  KNOCKDOWN = 'KNOCKDOWN',
  GETUP = 'GETUP',
  GRAB = 'GRAB',
  GRABBED = 'GRABBED',
  THROW = 'THROW',
  DEAD = 'DEAD',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
  INTRO = 'INTRO',
  FINISHER = 'FINISHER',
  FINISHED = 'FINISHED',
}

export const ACTIONABLE_STATES: ReadonlySet<FighterState> = new Set([
  FighterState.IDLE,
  FighterState.WALK,
  FighterState.CROUCH,
  FighterState.BLOCK,
]);

export const STUN_STATES: ReadonlySet<FighterState> = new Set([
  FighterState.BLOCKSTUN,
  FighterState.HIT,
  FighterState.HURT,
  FighterState.KNOCKDOWN,
  FighterState.GETUP,
  FighterState.GRABBED,
  FighterState.FINISHED,
]);

export const ATTACKING_STATES: ReadonlySet<FighterState> = new Set([
  FighterState.ATTACK,
  FighterState.SPECIAL,
  FighterState.GRAB,
  FighterState.THROW,
]);
