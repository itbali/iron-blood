import { useEffect, useRef } from 'react'
import { AudioManager } from '../systems/AudioManager'
import './scenes.css'

interface MainMenuProps {
  onNavigate: (scene: string, data?: any) => void
}

export function MainMenu({ onNavigate }: MainMenuProps) {
  const audioRef = useRef<AudioManager | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    audioRef.current = new AudioManager()
    audioRef.current.playMusic('menu')

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let animationFrame: number
    let time = 0

    const render = () => {
      time += 1 / 60

      ctx.fillStyle = '#08090C'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Animated background
      ctx.fillStyle = 'rgba(213, 31, 43, 0.1)'
      for (let i = 0; i < 5; i++) {
        const y = (time * 20 + i * 100) % canvas.height
        ctx.fillRect(0, y, canvas.width, 50)
      }

      // Title
      ctx.fillStyle = '#D51F2B'
      ctx.font = 'bold 80px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('IRON BLOOD', canvas.width / 2, 100)

      ctx.fillStyle = '#E7E7E7'
      ctx.font = '20px sans-serif'
      ctx.fillText('ENTER THE ARENA', canvas.width / 2, 150)

      animationFrame = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrame)
      audioRef.current?.stopMusic()
    }
  }, [])

  const menuItems = [
    { label: 'ARCADE', action: 'characterSelect' },
    { label: 'VERSUS', action: 'versus' },
    { label: 'TRAINING', action: 'training' },
    { label: 'SETTINGS', action: 'settings' }
  ]

  return (
    <div className="full-screen">
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      <div className="menu-container">
        <div className="menu-title">IRON BLOOD</div>
        <div className="menu-subtitle">2D FIGHTING GAME</div>

        <div className="menu-items">
          {menuItems.map((item, i) => (
            <button
              key={i}
              className="menu-btn"
              onClick={() => {
                audioRef.current?.playSound('menu')
                onNavigate(item.action)
              }}
              onMouseEnter={() => audioRef.current?.playSound('menu')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="menu-footer">
          <p>Version 1.0.0</p>
          <p style={{ fontSize: '12px', marginTop: '10px' }}>
            Press WASD or Arrow Keys to move | J/K/L/; for attacks | Space to block
          </p>
        </div>
      </div>
    </div>
  )
}
