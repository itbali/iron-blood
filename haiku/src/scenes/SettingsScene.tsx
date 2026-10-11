import { useState } from 'react'
import { SaveManager } from '../systems/SaveManager'
import './scenes.css'

interface SettingsSceneProps {
  onBack: () => void
}

export function SettingsScene({ onBack }: SettingsSceneProps) {
  const save = SaveManager.load()
  const [settings, setSettings] = useState(save.settings)

  const handleVolumeChange = (type: 'master' | 'music' | 'sfx', value: number) => {
    const updated = { ...settings }
    if (type === 'master') updated.masterVolume = value
    if (type === 'music') updated.musicVolume = value
    if (type === 'sfx') updated.sfxVolume = value
    setSettings(updated)
    SaveManager.updateSettings(updated)
  }

  const handleToggle = (key: string) => {
    const updated = { ...settings, [key]: !(settings as any)[key] }
    setSettings(updated)
    SaveManager.updateSettings(updated)
  }

  return (
    <div className="full-screen">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px' }}>
        <h1 style={{ color: '#D51F2B', marginBottom: '40px' }}>SETTINGS</h1>

        <div className="settings-panel">
          <h2 style={{ color: '#D51F2B', marginBottom: '20px' }}>AUDIO</h2>

          <div className="setting-item">
            <span className="setting-label">Master Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.masterVolume * 100}
              onChange={(e) => handleVolumeChange('master', parseInt(e.target.value) / 100)}
            />
          </div>

          <div className="setting-item">
            <span className="setting-label">Music Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.musicVolume * 100}
              onChange={(e) => handleVolumeChange('music', parseInt(e.target.value) / 100)}
            />
          </div>

          <div className="setting-item">
            <span className="setting-label">SFX Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.sfxVolume * 100}
              onChange={(e) => handleVolumeChange('sfx', parseInt(e.target.value) / 100)}
            />
          </div>

          <h2 style={{ color: '#D51F2B', marginBottom: '20px', marginTop: '30px' }}>GRAPHICS</h2>

          <label style={{ display: 'block', marginBottom: '15px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.screenShake}
              onChange={() => handleToggle('screenShake')}
              style={{ marginRight: '10px' }}
            />
            Screen Shake
          </label>

          <label style={{ display: 'block', marginBottom: '15px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.particles}
              onChange={() => handleToggle('particles')}
              style={{ marginRight: '10px' }}
            />
            Particle Effects
          </label>

          <h2 style={{ color: '#D51F2B', marginBottom: '20px', marginTop: '30px' }}>GAMEPLAY</h2>

          <div className="setting-item">
            <span className="setting-label">Difficulty</span>
            <select
              value={settings.difficulty}
              onChange={(e) => {
                const updated = { ...settings, difficulty: e.target.value }
                setSettings(updated)
                SaveManager.updateSettings(updated)
              }}
              style={{
                background: '#242832',
                color: '#D51F2B',
                border: '1px solid #8E1018',
                padding: '5px 10px'
              }}
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
              <option value="nightmare">Nightmare</option>
            </select>
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button className="menu-btn" onClick={onBack}>
              BACK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
