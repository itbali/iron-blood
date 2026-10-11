export interface SaveData {
  unlockedCharacters: string[]
  unlockedSkins: string[]
  completedArcade: boolean
  highestCombo: number
  totalWins: number
  totalLosses: number
  settings: {
    masterVolume: number
    musicVolume: number
    sfxVolume: number
    screenShake: boolean
    particles: boolean
    difficulty: string
  }
}

const SAVE_KEY = 'iron_blood_save'
const DEFAULT_SAVE: SaveData = {
  unlockedCharacters: ['raven', 'brute'],
  unlockedSkins: [],
  completedArcade: false,
  highestCombo: 0,
  totalWins: 0,
  totalLosses: 0,
  settings: {
    masterVolume: 1,
    musicVolume: 0.7,
    sfxVolume: 1,
    screenShake: true,
    particles: true,
    difficulty: 'normal'
  }
}

export class SaveManager {
  static load(): SaveData {
    try {
      const data = localStorage.getItem(SAVE_KEY)
      if (!data) return { ...DEFAULT_SAVE }
      return JSON.parse(data)
    } catch (e) {
      console.error('Failed to load save:', e)
      return { ...DEFAULT_SAVE }
    }
  }

  static save(data: SaveData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save:', e)
    }
  }

  static updateStats(wins: number, losses: number, combo: number) {
    const data = this.load()
    data.totalWins += wins
    data.totalLosses += losses
    if (combo > data.highestCombo) {
      data.highestCombo = combo
    }
    this.save(data)
  }

  static updateSettings(settings: Partial<SaveData['settings']>) {
    const data = this.load()
    data.settings = { ...data.settings, ...settings }
    this.save(data)
  }

  static reset() {
    localStorage.removeItem(SAVE_KEY)
  }
}
