export class AudioManager {
  private audioContext: AudioContext | null = null
  private musicGain = 0.7
  private sfxGain = 1
  private currentMusic: OscillatorNode | null = null

  constructor() {
    this.initAudio()
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.warn('AudioContext not available')
    }
  }

  playSound(type: string, duration: number = 0.1) {
    if (!this.audioContext) return

    const ctx = this.audioContext
    const now = ctx.currentTime

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    const freqs: Record<string, number> = {
      'punch': 150,
      'kick': 120,
      'hit': 200,
      'block': 300,
      'special': 250,
      'ko': 80,
      'menu': 400
    }

    oscillator.frequency.value = freqs[type] || 200
    gain.gain.setValueAtTime(this.sfxGain * 0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  playMusic(type: string = 'battle') {
    // Placeholder music
    if (!this.audioContext) return

    if (this.currentMusic) {
      this.currentMusic.stop()
    }

    const ctx = this.audioContext
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    const baseFreq = type === 'menu' ? 110 : 82
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 2)

    gain.gain.setValueAtTime(this.musicGain * 0.2, now)

    this.currentMusic = osc
    osc.start(now)
  }

  stopMusic() {
    if (this.currentMusic) {
      try {
        this.currentMusic.stop()
      } catch (e) {
        // Already stopped
      }
      this.currentMusic = null
    }
  }

  setSFXVolume(vol: number) {
    this.sfxGain = Math.max(0, Math.min(1, vol))
  }

  setMusicVolume(vol: number) {
    this.musicGain = Math.max(0, Math.min(1, vol))
  }
}
