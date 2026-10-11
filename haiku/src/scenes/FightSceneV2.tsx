import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../systems/GameEngine'
import { InputManager } from '../systems/InputManager'
import { ComboSystem } from '../systems/ComboSystem'
import { AIController } from '../systems/AIController'
import { ParticleSystem } from '../systems/ParticleSystem'
import { AudioManager } from '../systems/AudioManager'
import { DrawEngine } from '../systems/DrawEngine'
import { CHARACTERS } from '../data/characters'
import './scenes.css'

interface FightSceneV2Props {
  player1Char: string
  player2Char: string
  difficulty: string
  round: number
  matchWins: [number, number]
  onMatchEnd: (p1Wins: number, p2Wins: number) => void
  isVersus?: boolean
}

export function FightSceneV2({
  player1Char,
  player2Char,
  difficulty = 'normal',
  round = 1,
  matchWins = [0, 0],
  onMatchEnd,
  isVersus = false
}: FightSceneV2Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const inputRef = useRef<InputManager | null>(null)
  const comboRef = useRef<ComboSystem | null>(null)
  const aiRef = useRef<AIController | null>(null)
  const particlesRef = useRef<ParticleSystem | null>(null)
  const audioRef = useRef<AudioManager | null>(null)
  const drawRef = useRef<DrawEngine | null>(null)

  const [player1Wins, setPlayer1Wins] = useState(matchWins[0])
  const [player2Wins, setPlayer2Wins] = useState(matchWins[1])
  const [showDialog, setShowDialog] = useState(false)
  const [dialogText, setDialogText] = useState('')
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    gameEngineRef.current = new GameEngine(player1Char, player2Char)
    inputRef.current = new InputManager()
    comboRef.current = new ComboSystem()
    aiRef.current = new AIController(difficulty as any)
    particlesRef.current = new ParticleSystem()
    audioRef.current = new AudioManager()
    drawRef.current = new DrawEngine()

    audioRef.current.playMusic('battle')

    let frameCount = 0
    let animationId: number
    let lastRoundCheckTime = 0

    const gameLoop = () => {
      frameCount++
      const now = Date.now()

      if (!isPaused) {
        const engine = gameEngineRef.current!
        let p1 = engine.getPlayer1State()
        let p2 = engine.getPlayer2State()

        // Get player input
        const keysDown = (inputRef.current as any)?.keys || new Map()
        const input1 = {
          x: (keysDown.get('a') || keysDown.get('ArrowLeft') ? -1 : 0) + (keysDown.get('d') || keysDown.get('ArrowRight') ? 1 : 0),
          y: 0,
          jump: keysDown.get('w') || keysDown.get('ArrowUp')
        }

        // Get AI input for player 2
        const aiAction = aiRef.current?.getNextAction(p2, p1, now)
        const input2 = { ...(aiAction?.input || { x: 0, y: 0 }), jump: false }

        // Update engine
        engine.update(16.67, input1, input2)
        p1 = engine.getPlayer1State()
        p2 = engine.getPlayer2State()

        // Player 1 attacks
        const attackKey = keysDown.get('j') ? 'lightPunch' :
                         keysDown.get('k') ? 'heavyPunch' :
                         keysDown.get('l') ? 'lightKick' :
                         keysDown.get(';') ? 'heavyKick' : null

        if (attackKey && p1.state !== 'attack') {
          p1.state = 'attack'
          p1.frame = 0
          p1.animation = attackKey
          const char = CHARACTERS[player1Char]
          const attack = char.attacks[attackKey]
          if (attack && frameCount % 2 === 0) {
            const dist = Math.abs(p1.x - p2.x)
            if (dist < 100) {
              const result = engine.applyHit(p1, p2, attack.damage, attack.hitstun)
              p1 = result.attacker
              p2 = result.defender
              particlesRef.current?.emit(p2.x, p2.y, 'spark', 10)
              particlesRef.current?.emit(p2.x, p2.y, 'blood', 5)
              audioRef.current?.playSound('hit')
              drawRef.current?.addScreenShake(8, 150)
            }
          }
        } else if (p1.state === 'attack') {
          p1.frame++
          if (p1.frame > 20) {
            p1.state = 'idle'
          }
        }

        // AI attacks
        if (aiAction?.action === 'attack' && p2.state !== 'attack') {
          p2.state = 'attack'
          p2.frame = 0
          const char = CHARACTERS[player2Char]
          const attacks = Object.entries(char.attacks).filter(([key]) => !key.includes('Slash'))
          const randomAttack = attacks[Math.floor(Math.random() * attacks.length)]
          if (randomAttack) {
            const [key, attack] = randomAttack
            p2.animation = key
            const dist = Math.abs(p1.x - p2.x)
            if (dist < 100) {
              const result = engine.applyHit(p2, p1, attack.damage, attack.hitstun)
              p2 = result.attacker
              p1 = result.defender
              particlesRef.current?.emit(p1.x, p1.y, 'spark', 10)
              particlesRef.current?.emit(p1.x, p1.y, 'blood', 5)
              audioRef.current?.playSound('hit')
              drawRef.current?.addScreenShake(8, 150)
            }
          }
        } else if (p2.state === 'attack') {
          p2.frame++
          if (p2.frame > 20) {
            p2.state = 'idle'
          }
        }

        // Handle block
        if (keysDown.get(' ')) {
          p1.state = 'block'
        } else if (p1.state === 'block') {
          p1.state = 'idle'
        }

        if (aiAction?.action === 'block') {
          p2.state = 'block'
        } else if (p2.state === 'block' && aiAction?.action !== 'block') {
          p2.state = 'idle'
        }

        // Update particle system
        particlesRef.current?.update(16.67)
        drawRef.current?.updateScreenShake()
      }

      // Draw
      const p1 = gameEngineRef.current!.getPlayer1State()
      const p2 = gameEngineRef.current!.getPlayer2State()
      const particles = particlesRef.current?.getParticles() || []
      const timer = gameEngineRef.current!.getRoundTimer()

      drawRef.current?.drawGame(ctx, p1, p2, particles, timer, round)

      // Check for round end
      if (now - lastRoundCheckTime > 500) {
        if (p1.health <= 0) {
          setPlayer2Wins(prev => prev + 1)
          setShowDialog(true)
          setDialogText('PLAYER 2 WINS')
          audioRef.current?.stopMusic()
          lastRoundCheckTime = now
        } else if (p2.health <= 0) {
          setPlayer1Wins(prev => prev + 1)
          setShowDialog(true)
          setDialogText('PLAYER 1 WINS')
          audioRef.current?.stopMusic()
          lastRoundCheckTime = now
        } else if (timer === 0) {
          if (p1.health > p2.health) {
            setPlayer1Wins(prev => prev + 1)
            setDialogText('PLAYER 1 WINS')
          } else if (p2.health > p1.health) {
            setPlayer2Wins(prev => prev + 1)
            setDialogText('PLAYER 2 WINS')
          } else {
            setDialogText('DRAW')
          }
          setShowDialog(true)
          audioRef.current?.stopMusic()
          lastRoundCheckTime = now
        }
      }

      animationId = requestAnimationFrame(gameLoop)
    }

    // Pause handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPaused(p => !p)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    gameLoop()

    return () => {
      cancelAnimationFrame(animationId)
      document.removeEventListener('keydown', handleKeyDown)
      audioRef.current?.stopMusic()
      inputRef.current?.cleanup()
    }
  }, [player1Char, player2Char, difficulty, round, isVersus])

  const handleDialogClose = () => {
    setShowDialog(false)
    if (player1Wins === 2 || player2Wins === 2) {
      onMatchEnd(player1Wins, player2Wins)
    } else {
      onMatchEnd(player1Wins, player2Wins)
    }
  }

  return (
    <div className="full-screen">
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />

      {isPaused && (
        <div className="dialog-overlay" onClick={() => setIsPaused(false)}>
          <div className="dialog-box">
            <div className="dialog-title">PAUSED</div>
            <div className="dialog-text">Press Escape to resume</div>
            <button className="menu-btn" onClick={() => setIsPaused(false)}>RESUME</button>
          </div>
        </div>
      )}

      {showDialog && (
        <div className="dialog-overlay" onClick={handleDialogClose}>
          <div className="dialog-box">
            <div className="dialog-title">{dialogText}</div>
            <button className="menu-btn" onClick={handleDialogClose}>CONTINUE</button>
          </div>
        </div>
      )}
    </div>
  )
}
