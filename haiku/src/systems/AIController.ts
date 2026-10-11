import type { FighterState } from '../types/GameState'

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'nightmare'

export class AIController {
  private difficulty: AIDifficulty
  private reactionTime: number
  private blockChance: number
  private comboChance: number
  private nextActionTime = 0
  private currentAction = 'idle'

  constructor(difficulty: AIDifficulty = 'normal') {
    this.difficulty = difficulty
    this.reactionTime = this.getReactionTime()
    this.blockChance = this.getBlockChance()
    this.comboChance = this.getComboChance()
  }

  private getReactionTime(): number {
    const times: Record<AIDifficulty, number> = {
      'easy': 300,
      'normal': 150,
      'hard': 80,
      'nightmare': 30
    }
    return times[this.difficulty]
  }

  private getBlockChance(): number {
    const chances: Record<AIDifficulty, number> = {
      'easy': 0.2,
      'normal': 0.5,
      'hard': 0.8,
      'nightmare': 0.95
    }
    return chances[this.difficulty]
  }

  private getComboChance(): number {
    const chances: Record<AIDifficulty, number> = {
      'easy': 0,
      'normal': 0.3,
      'hard': 0.7,
      'nightmare': 0.95
    }
    return chances[this.difficulty]
  }

  getNextAction(ai: FighterState, opponent: FighterState, now: number): { input: { x: number; y: number }; action: string } {
    if (now < this.nextActionTime) {
      return { input: { x: 0, y: 0 }, action: this.currentAction }
    }

    const distance = Math.abs(ai.x - opponent.x)
    const healthPercent = ai.health / ai.maxHealth

    let action = 'idle'
    let input = { x: 0, y: 0 }

    if (distance > 300) {
      action = 'approach'
      input.x = opponent.x > ai.x ? 1 : -1
    } else if (distance < 150) {
      if (Math.random() < this.blockChance) {
        action = 'block'
      } else {
        action = 'attack'
      }
    } else {
      if (Math.random() < this.comboChance && ai.combo > 0) {
        action = 'combo'
      } else {
        action = 'attack'
      }
    }

    if (healthPercent < 0.3 && Math.random() < 0.5) {
      action = 'special'
    }

    this.currentAction = action
    this.nextActionTime = now + this.reactionTime
    return { input, action }
  }

  resetForRound() {
    this.nextActionTime = 0
    this.currentAction = 'idle'
  }
}
