import type { FighterState, Attack, CombatResult } from '../types/GameState'

export class CombatSystem {

  updateCombat(player: FighterState, opponent: FighterState, currentAttack: Attack | null): CombatResult | null {
    if (!currentAttack) return null

    const playerHitboxes = currentAttack.hitboxes.map(hb => ({
      x: player.x + (player.facing === 1 ? hb.x : -hb.x - hb.width),
      y: player.y + hb.y,
      width: hb.width,
      height: hb.height
    }))

    const opponentHurtboxes = currentAttack.hitboxes.map(hb => ({
      x: opponent.x + hb.x,
      y: opponent.y + hb.y,
      width: hb.width,
      height: hb.height
    }))

    let hitDetected = false
    for (const hitbox of playerHitboxes) {
      for (const hurtbox of opponentHurtboxes) {
        if (this.checkCollision(hitbox, hurtbox)) {
          hitDetected = true
          break
        }
      }
      if (hitDetected) break
    }

    if (!hitDetected) return null

    const isBlocking = opponent.state === 'block'
    const damage = isBlocking ? Math.floor(currentAttack.damage * 0.7) : currentAttack.damage
    const stun = isBlocking ? currentAttack.blockstun : currentAttack.hitstun

    return {
      winner: player.characterId,
      damage,
      hitstun: stun,
      isCombo: true,
      comboCount: player.combo + 1
    }
  }

  private checkCollision(a: any, b: any): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y
  }

  updateFighter(fighter: FighterState, deltaTime: number, input: { x: number; y: number }): FighterState {
    const updated = { ...fighter }

    // Apply gravity
    if (updated.y < 400) {
      updated.velocityY += 0.5
    } else {
      updated.y = 400
      updated.velocityY = 0
    }

    // Update position
    updated.x += updated.velocityX * (deltaTime / 1000)
    updated.y += updated.velocityY * (deltaTime / 1000)

    // Boundary check
    if (updated.x < 100) updated.x = 100
    if (updated.x > 800) updated.x = 800

    // Handle input
    if (updated.state === 'idle' || updated.state === 'walk') {
      if (input.x !== 0) {
        updated.velocityX = input.x * (fighter.characterId === 'brute' ? 3 : 6)
        if (input.x > 0 && updated.facing === -1) updated.facing = 1
        if (input.x < 0 && updated.facing === 1) updated.facing = -1
        updated.state = 'walk'
      } else {
        updated.velocityX *= 0.9
        if (Math.abs(updated.velocityX) < 0.5) updated.velocityX = 0
        updated.state = 'idle'
      }

      if (input.y > 0.5 && updated.y >= 399) {
        updated.velocityY = -12
        updated.state = 'jump'
      }
    }

    return updated
  }

  applyDamage(fighter: FighterState, damage: number): FighterState {
    const updated = { ...fighter }
    updated.health = Math.max(0, updated.health - damage)
    updated.lastHitTime = Date.now()
    if (updated.health === 0) {
      updated.state = 'knockdown'
    }
    return updated
  }

  getMeterGain(action: string, damage: number): number {
    const gains: Record<string, number> = {
      'attack': 2,
      'hit': 5,
      'block': 3,
      'takeDamage': damage * 0.5
    }
    return gains[action] || 0
  }
}
