import type { FighterState, Particle } from '../types/GameState'

export class DrawEngine {
  private screenShake = { intensity: 0, duration: 0 }

  drawGame(
    ctx: CanvasRenderingContext2D,
    p1: FighterState,
    p2: FighterState,
    particles: Particle[],
    timer: number,
    round: number
  ) {
    const { width, height } = ctx.canvas

    // Apply screen shake
    if (this.screenShake.intensity > 0) {
      const shake = Math.random() * this.screenShake.intensity - this.screenShake.intensity / 2
      ctx.save()
      ctx.translate(shake, 0)
    }

    // Background
    this.drawBackground(ctx, width, height)

    // Arena
    this.drawArena(ctx, width)

    // Fighters
    this.drawFighter(ctx, p1)
    this.drawFighter(ctx, p2)

    // Particles
    this.drawParticles(ctx, particles)

    // HUD
    this.drawHUD(ctx, p1, p2, timer, round)

    if (this.screenShake.intensity > 0) {
      ctx.restore()
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#08090C'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(213, 31, 43, 0.03)'
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(0, i * 200, width, 100)
    }
  }

  private drawArena(ctx: CanvasRenderingContext2D, width: number) {
    const floorY = 400
    ctx.strokeStyle = '#D51F2B'
    ctx.lineWidth = 2
    ctx.strokeRect(50, floorY, width - 100, 100)

    ctx.fillStyle = 'rgba(213, 31, 43, 0.05)'
    ctx.fillRect(50, floorY, width - 100, 100)
  }

  private drawFighter(ctx: CanvasRenderingContext2D, fighter: FighterState) {
    const x = fighter.x
    const y = fighter.y
    const isRaven = fighter.characterId === 'raven'

    // Draw different silhouettes
    if (isRaven) {
      this.drawRaven(ctx, x, y, fighter.state === 'knockdown')
    } else {
      this.drawBrute(ctx, x, y, fighter.state === 'knockdown')
    }

    // Block glow
    if (fighter.state === 'block') {
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'
      ctx.shadowBlur = 10
      if (isRaven) {
        ctx.strokeRect(x - 30, y - 45, 60, 90)
      } else {
        ctx.strokeRect(x - 40, y - 50, 80, 100)
      }
      ctx.shadowColor = 'transparent'
    }

    // Health indicator (above head)
    const healthBarW = 50
    const healthBarH = 5
    const healthBarX = x - healthBarW / 2
    const healthBarY = y - 60

    ctx.fillStyle = '#242832'
    ctx.fillRect(healthBarX, healthBarY, healthBarW, healthBarH)
    ctx.fillStyle = '#D51F2B'
    ctx.fillRect(healthBarX, healthBarY, (fighter.health / fighter.maxHealth) * healthBarW, healthBarH)
    ctx.strokeStyle = '#8E1018'
    ctx.strokeRect(healthBarX, healthBarY, healthBarW, healthBarH)

    // Meter bar
    const meterW = 40
    const meterX = x - meterW / 2
    const meterY = y + 50

    ctx.fillStyle = '#1a3a1a'
    ctx.fillRect(meterX, meterY, meterW, 4)
    ctx.fillStyle = '#00FF00'
    ctx.fillRect(meterX, meterY, (fighter.meter / fighter.maxMeter) * meterW, 4)

    // Character ID
    ctx.fillStyle = '#E7E7E7'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(fighter.characterId.toUpperCase(), x, y + 70)
  }

  private drawRaven(ctx: CanvasRenderingContext2D, x: number, y: number, isHurt: boolean) {
    // Raven: узкий, быстрый силуэт
    const color = isHurt ? '#8E1018' : '#D51F2B'

    // Head
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y - 30, 12, 0, Math.PI * 2)
    ctx.fill()

    // Torso (узкий)
    ctx.fillRect(x - 15, y - 18, 30, 35)

    // Left arm
    ctx.fillRect(x - 20, y - 15, 8, 40)
    ctx.beginPath()
    ctx.arc(x - 16, y + 25, 6, 0, Math.PI * 2)
    ctx.fill()

    // Right arm
    ctx.fillRect(x + 12, y - 15, 8, 40)
    ctx.beginPath()
    ctx.arc(x + 16, y + 25, 6, 0, Math.PI * 2)
    ctx.fill()

    // Legs
    ctx.fillRect(x - 10, y + 17, 8, 35)
    ctx.fillRect(x + 2, y + 17, 8, 35)

    // Outline
    ctx.strokeStyle = '#E7E7E7'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y - 30, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeRect(x - 15, y - 18, 30, 35)
  }

  private drawBrute(ctx: CanvasRenderingContext2D, x: number, y: number, isHurt: boolean) {
    // Brute: широкий, массивный силуэт
    const color = isHurt ? '#6B0D13' : '#8E1018'

    // Head (большая)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y - 25, 18, 0, Math.PI * 2)
    ctx.fill()

    // Horns/spikes
    ctx.fillRect(x - 15, y - 45, 8, 22)
    ctx.fillRect(x + 7, y - 45, 8, 22)

    // Torso (широкий и мощный)
    ctx.fillRect(x - 25, y - 7, 50, 45)

    // Left arm (толстая)
    ctx.fillRect(x - 30, y - 5, 12, 45)
    ctx.beginPath()
    ctx.arc(x - 24, y + 40, 8, 0, Math.PI * 2)
    ctx.fill()

    // Right arm (толстая)
    ctx.fillRect(x + 18, y - 5, 12, 45)
    ctx.beginPath()
    ctx.arc(x + 24, y + 40, 8, 0, Math.PI * 2)
    ctx.fill()

    // Legs (мощные)
    ctx.fillRect(x - 15, y + 38, 12, 35)
    ctx.fillRect(x + 3, y + 38, 12, 35)

    // Armor details
    ctx.strokeStyle = '#A01820'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y - 25, 18, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeRect(x - 25, y - 7, 50, 45)
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = this.getParticleColor(p.type, alpha)
      ctx.fillRect(p.x, p.y, p.size, p.size)
    }
  }

  private getParticleColor(type: string, alpha: number): string {
    const colors: Record<string, string> = {
      spark: `rgba(255, 200, 0, ${alpha * 0.8})`,
      smoke: `rgba(100, 100, 100, ${alpha * 0.5})`,
      blood: `rgba(213, 31, 43, ${alpha * 0.7})`,
      impact: `rgba(255, 100, 0, ${alpha * 0.8})`
    }
    return colors[type] || `rgba(255, 255, 255, ${alpha})`
  }

  private drawHUD(
    ctx: CanvasRenderingContext2D,
    p1: FighterState,
    p2: FighterState,
    timer: number,
    round: number
  ) {
    const { width } = ctx.canvas

    // Player 1 - Left side
    this.drawPlayerInfo(ctx, 20, 20, p1)

    // Player 2 - Right side
    this.drawPlayerInfo(ctx, width - 320, 20, p2)

    // Center timer
    ctx.fillStyle = '#D51F2B'
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(timer).padStart(2, '0'), width / 2, 60)

    // Round indicator
    ctx.fillStyle = '#D51F2B'
    ctx.font = '24px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`ROUND ${round}`, width / 2, 100)
  }

  private drawPlayerInfo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fighter: FighterState
  ) {
    const barWidth = 250
    const barHeight = 30
    const isLeft = x < 200

    // Name
    ctx.fillStyle = '#E7E7E7'
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = isLeft ? 'left' : 'right'
    const playerNum = isLeft ? '1' : '2'
    ctx.fillText(`P${playerNum}: ${fighter.characterId.toUpperCase()}`, isLeft ? x : x + barWidth, y)

    // Health bar
    ctx.fillStyle = '#242832'
    ctx.fillRect(x, y + 25, barWidth, barHeight)
    ctx.fillStyle = '#D51F2B'
    ctx.fillRect(x, y + 25, (fighter.health / fighter.maxHealth) * barWidth, barHeight)
    ctx.strokeStyle = '#8E1018'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y + 25, barWidth, barHeight)

    // Health text
    ctx.fillStyle = '#E7E7E7'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(
      `${Math.ceil(fighter.health)} / ${fighter.maxHealth}`,
      x + barWidth / 2,
      y + 43
    )

    // Meter bar
    ctx.fillStyle = '#1a3a1a'
    ctx.fillRect(x, y + 60, barWidth, 8)
    ctx.fillStyle = '#00FF00'
    ctx.fillRect(x, y + 60, (fighter.meter / fighter.maxMeter) * barWidth, 8)
    ctx.strokeStyle = '#008000'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y + 60, barWidth, 8)

    // Combo counter
    if (fighter.combo > 0) {
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = isLeft ? 'left' : 'right'
      ctx.fillText(`${fighter.combo} HIT COMBO`, isLeft ? x : x + barWidth, y + 85)
    }
  }

  addScreenShake(intensity: number, duration: number = 100) {
    this.screenShake = { intensity, duration }
  }

  updateScreenShake() {
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= 16.67
      this.screenShake.intensity = Math.max(0, this.screenShake.intensity - 0.5)
    } else {
      this.screenShake.intensity = 0
    }
  }
}
