export class InputManager {
  private keys: Map<string, boolean> = new Map()
  private inputBuffer: string[] = []
  private bufferSize = 10
  private lastInputTime = 0
  private bufferTimeout = 100

  constructor() {
    this.setupListeners()
  }

  private setupListeners() {
    document.addEventListener('keydown', (e) => {
      const key = e.key
      this.keys.set(key, true)

      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
        const now = Date.now()
        if (now - this.lastInputTime > this.bufferTimeout) {
          this.inputBuffer = []
        }
        this.inputBuffer.push(key)
        if (this.inputBuffer.length > this.bufferSize) {
          this.inputBuffer.shift()
        }
        this.lastInputTime = now
      }
    })

    document.addEventListener('keyup', (e) => {
      this.keys.set(e.key, false)
    })
  }

  isKeyDown(key: string): boolean {
    return this.keys.get(key) ?? false
  }

  isKeyPressed(key: string): boolean {
    return this.isKeyDown(key)
  }

  getInputBuffer(): string[] {
    return [...this.inputBuffer]
  }

  clearBuffer() {
    this.inputBuffer = []
  }

  getMovementInput(): { x: number; y: number } {
    let x = 0
    let y = 0

    if (this.isKeyDown('a') || this.isKeyDown('ArrowLeft')) x -= 1
    if (this.isKeyDown('d') || this.isKeyDown('ArrowRight')) x += 1
    if (this.isKeyDown('w') || this.isKeyDown('ArrowUp')) y -= 1
    if (this.isKeyDown('s') || this.isKeyDown('ArrowDown')) y += 1

    return { x, y }
  }

  cleanup() {
    document.removeEventListener('keydown', () => {})
    document.removeEventListener('keyup', () => {})
  }
}

export class InputManager2 extends InputManager {
  isKeyDown2(key: string): boolean {
    const keyMap: Record<string, string> = {
      'ArrowUp': 'w',
      'ArrowLeft': 'a',
      'ArrowDown': 's',
      'ArrowRight': 'd'
    }
    return super.isKeyDown(keyMap[key] || key)
  }
}
