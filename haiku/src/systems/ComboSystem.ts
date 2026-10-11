export interface ComboSequence {
  inputs: string[]
  specialId: string
}

export class ComboSystem {
  private inputBuffer: string[] = []
  private bufferSize = 15
  private bufferTimeout = 150
  private lastInputTime = 0
  private comboTimer = 0
  private maxComboTime = 2000

  private combos: Record<string, ComboSequence[]> = {
    raven: [
      { inputs: ['j', 'j'], specialId: 'combo_1' },
      { inputs: ['j', 'k'], specialId: 'combo_2' },
      { inputs: ['j', 'j', 'k'], specialId: 'combo_3' },
      { inputs: ['ArrowRight', 'ArrowRight', 'i'], specialId: 'bloodDash' },
      { inputs: ['ArrowDown', 'ArrowRight', 'i'], specialId: 'crimsonSlash' },
      { inputs: ['ArrowDown', 'ArrowLeft', 'o'], specialId: 'executionGrab' }
    ],
    brute: [
      { inputs: ['j', 'j'], specialId: 'combo_1' },
      { inputs: ['k', 'k'], specialId: 'combo_2' },
      { inputs: ['ArrowDown', 'ArrowRight', 'i'], specialId: 'earthShaker' },
      { inputs: ['ArrowDown', 'ArrowLeft', 'o'], specialId: 'grabAttack' }
    ]
  }

  addInput(key: string) {
    const now = Date.now()

    // Reset if timeout
    if (now - this.lastInputTime > this.bufferTimeout) {
      this.inputBuffer = []
      this.comboTimer = 0
    }

    this.inputBuffer.push(key.toLowerCase())
    if (this.inputBuffer.length > this.bufferSize) {
      this.inputBuffer.shift()
    }

    this.lastInputTime = now
    this.comboTimer = now
  }

  getBuffer(): string[] {
    return [...this.inputBuffer]
  }

  clearBuffer() {
    this.inputBuffer = []
    this.comboTimer = 0
  }

  checkCombo(characterId: string): string | null {
    const combos = this.combos[characterId] || []

    for (const combo of combos) {
      if (this.matchesSequence(combo.inputs)) {
        this.clearBuffer()
        return combo.specialId
      }
    }

    return null
  }

  private matchesSequence(sequence: string[]): boolean {
    if (this.inputBuffer.length < sequence.length) return false

    const start = this.inputBuffer.length - sequence.length
    for (let i = 0; i < sequence.length; i++) {
      if (this.inputBuffer[start + i] !== sequence[i]) {
        return false
      }
    }

    return true
  }

  isComboActive(): boolean {
    return Date.now() - this.comboTimer < this.maxComboTime
  }

  reset() {
    this.inputBuffer = []
    this.comboTimer = 0
  }
}
