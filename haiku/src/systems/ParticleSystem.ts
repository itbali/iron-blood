import type { Particle } from '../types/GameState'

export class ParticleSystem {
  private particles: Particle[] = []
  private maxParticles = 500

  emit(x: number, y: number, type: Particle['type'], count: number = 10) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift()
      }

      const angle = (Math.random() * Math.PI * 2)
      const speed = 2 + Math.random() * 4
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed - 2

      const particle: Particle = {
        x,
        y,
        vx,
        vy,
        life: 1,
        maxLife: 1 + Math.random() * 0.5,
        type,
        size: 3 + Math.random() * 3
      }

      this.particles.push(particle)
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= deltaTime / 1000
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.2

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles
  }

  clear() {
    this.particles = []
  }
}
