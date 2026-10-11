import type { FighterState } from '../types/GameState'
import { CHARACTERS } from '../data/characters'

export class GameEngine {
  private roundTimer = 99
  private player1State: FighterState
  private player2State: FighterState

  constructor(p1Char: string, p2Char: string) {
    this.player1State = this.initFighter(p1Char, 300)
    this.player2State = this.initFighter(p2Char, 700)
  }

  private initFighter(charId: string, x: number): FighterState {
    const char = CHARACTERS[charId]
    return {
      characterId: charId,
      health: char.maxHealth,
      maxHealth: char.maxHealth,
      x,
      y: 400,
      velocityX: 0,
      velocityY: 0,
      facing: charId === 'raven' ? 1 : -1,
      state: 'idle',
      animation: 'idle',
      frame: 0,
      meter: 0,
      maxMeter: 100,
      combo: 0,
      lastHitTime: 0,
      inHitstun: false,
      inBlockstun: false,
      canMove: true,
      inputBuffer: []
    }
  }

  update(deltaTime: number, p1Input: { x: number; y: number; jump: boolean; attack?: string }, p2Input: { x: number; y: number; jump: boolean; attack?: string }) {
    this.roundTimer = Math.max(0, this.roundTimer - deltaTime / 1000)

    // Update movement
    this.player1State = this.updateMovement(this.player1State, p1Input)
    this.player2State = this.updateMovement(this.player2State, p2Input)

    // Keep players facing each other
    if (this.player1State.x < this.player2State.x) {
      this.player1State.facing = 1
      this.player2State.facing = -1
    } else {
      this.player1State.facing = -1
      this.player2State.facing = 1
    }

    // Prevent passing through
    const minDist = 80
    const dist = Math.abs(this.player1State.x - this.player2State.x)
    if (dist < minDist) {
      if (this.player1State.x < this.player2State.x) {
        this.player1State.x = this.player2State.x - minDist
      } else {
        this.player1State.x = this.player2State.x + minDist
      }
      this.player1State.velocityX *= 0.5
      this.player2State.velocityX *= 0.5
    }

    // Meter regeneration
    this.player1State.meter = Math.min(this.player1State.maxMeter, this.player1State.meter + 0.3)
    this.player2State.meter = Math.min(this.player2State.maxMeter, this.player2State.meter + 0.3)
  }

  private updateMovement(fighter: FighterState, input: { x: number; y: number; jump: boolean }): FighterState {
    const updated = { ...fighter }

    // Gravity
    if (updated.y < 400) {
      updated.velocityY += 0.6
    } else {
      updated.y = 400
      updated.velocityY = 0
    }

    // Position update
    updated.x += updated.velocityX
    updated.y += updated.velocityY

    // Boundary
    updated.x = Math.max(100, Math.min(800, updated.x))

    // Movement
    if (updated.state === 'idle' || updated.state === 'walk') {
      if (input.x !== 0) {
        const charSpeed = CHARACTERS[fighter.characterId]?.speed || 5
        updated.velocityX = input.x * (charSpeed / 1.5)
        updated.state = 'walk'
      } else {
        updated.velocityX *= 0.85
        if (Math.abs(updated.velocityX) < 0.2) {
          updated.velocityX = 0
          updated.state = 'idle'
        }
      }

      if (input.jump && updated.y >= 399) {
        updated.velocityY = -14
        updated.state = 'jump'
      }
    } else if (updated.state === 'jump') {
      if (updated.y >= 399) {
        updated.state = 'idle'
        updated.velocityX *= 0.8
      }
    }

    return updated
  }

  getPlayer1State(): FighterState {
    return this.player1State
  }

  getPlayer2State(): FighterState {
    return this.player2State
  }

  getRoundTimer(): number {
    return Math.ceil(this.roundTimer)
  }

  setRoundTimer(time: number) {
    this.roundTimer = time
  }

  reset() {
    this.player1State = this.initFighter(this.player1State.characterId, 300)
    this.player2State = this.initFighter(this.player2State.characterId, 700)
    this.roundTimer = 99
  }

  applyHit(attacker: FighterState, defender: FighterState, damage: number, hitstun: number): { attacker: FighterState; defender: FighterState } {
    const updatedAttacker = { ...attacker }
    const updatedDefender = { ...defender }

    if (updatedDefender.state === 'block') {
      updatedDefender.meter = Math.max(0, updatedDefender.meter - 5)
      damage = Math.floor(damage * 0.6)
    } else {
      updatedDefender.combo = Math.max(0, updatedDefender.combo + 1)
      updatedDefender.meter = Math.min(updatedDefender.maxMeter, updatedDefender.meter + 3)
    }

    updatedDefender.health = Math.max(0, updatedDefender.health - damage)
    updatedDefender.inHitstun = true
    updatedDefender.frame = hitstun

    updatedAttacker.meter = Math.min(updatedAttacker.maxMeter, updatedAttacker.meter + 2)

    if (updatedDefender.health === 0) {
      updatedDefender.state = 'knockdown'
    }

    return { attacker: updatedAttacker, defender: updatedDefender }
  }
}
