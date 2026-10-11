export interface GameState {
  scene: 'menu' | 'characterSelect' | 'fight' | 'training' | 'versus' | 'settings'
  player1Character: string
  player2Character: string
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare'
  matchWins: [number, number]
  currentRound: number
  isVersus?: boolean
}

export interface Character {
  id: string
  name: string
  maxHealth: number
  speed: number
  damage: number
  difficulty: 'easy' | 'medium' | 'hard' | 'very hard'
  attacks: Record<string, Attack>
  specials: Record<string, SpecialMove>
  introLines: string[]
  victoryLines: string[]
  defeatLines: string[]
}

export interface Attack {
  id: string
  name: string
  startup: number
  active: number
  recovery: number
  damage: number
  hitstun: number
  blockstun: number
  knockback: number
  pushback: number
  hitLevel: 'high' | 'mid' | 'low'
  cancelInto?: string[]
  hitboxes: HitBox[]
  hurtboxes: HurtBox[]
}

export interface SpecialMove extends Attack {
  inputCommand: string[]
  meterRequired: number
  invulnerability: number
}

export interface HitBox {
  x: number
  y: number
  width: number
  height: number
}

export interface HurtBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FighterState {
  characterId: string
  health: number
  maxHealth: number
  x: number
  y: number
  velocityX: number
  velocityY: number
  facing: 1 | -1
  state: CharacterState
  animation: string
  frame: number
  meter: number
  maxMeter: number
  combo: number
  lastHitTime: number
  inHitstun: boolean
  inBlockstun: boolean
  canMove: boolean
  lastAttack?: string
  inputBuffer: string[]
}

export type CharacterState =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'jump'
  | 'attack'
  | 'block'
  | 'hit'
  | 'knockdown'
  | 'getup'
  | 'grab'
  | 'throw'
  | 'special'
  | 'dead'
  | 'victory'

export interface CombatResult {
  winner: string
  damage: number
  hitstun: number
  isCombo: boolean
  comboCount: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  type: 'spark' | 'smoke' | 'blood' | 'impact'
  size: number
}
