export enum FighterState {
  INTRO = 'INTRO',
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
  THROWN = 'THROWN',
  SPECIAL = 'SPECIAL',
  DAZED = 'DAZED',
  DEAD = 'DEAD',
  VICTORY = 'VICTORY',
}

/** States in which the fighter accepts new movement / attack commands. */
export const ACTIONABLE_STATES: ReadonlySet<FighterState> = new Set([
  FighterState.IDLE,
  FighterState.WALK,
  FighterState.CROUCH,
  FighterState.BLOCK,
]);
