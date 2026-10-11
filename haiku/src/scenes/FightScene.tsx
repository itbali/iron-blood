import { useEffect, useRef, useState } from 'react'
import { InputManager } from '../systems/InputManager'
import { CombatSystem } from '../systems/CombatSystem'
import { AIController } from '../systems/AIController'
import { ParticleSystem } from '../systems/ParticleSystem'
import { AudioManager } from '../systems/AudioManager'
import { CHARACTERS } from '../data/characters'
import type { FighterState } from '../types/GameState'
import './scenes.css'

interface FightSceneProps {
  player1Char: string
  player2Char: string
  difficulty: string
  round: number
  matchWins: [number, number]
  onMatchEnd: (p1Wins: number, p2Wins: number) => void
  onMenuBack: () => void
}

export function FightScene({
  player1Char,
  player2Char,
  difficulty = 'normal',
  round = 1,
  matchWins = [0, 0],
  onMatchEnd
}: FightSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<InputManager | null>(null)
  const combatRef = useRef<CombatSystem | null>(null)
  const aiRef = useRef<AIController | null>(null)
  const particlesRef = useRef<ParticleSystem | null>(null)
  const audioRef = useRef<AudioManager | null>(null)
  const gameStateRef = useRef({ timer: 99, player1Wins: matchWins[0], player2Wins: matchWins[1] })

  const [player1State, setPlayer1State] = useState<FighterState>({
    characterId: player1Char,
    health: CHARACTERS[player1Char]?.maxHealth || 1000,
    maxHealth: CHARACTERS[player1Char]?.maxHealth || 1000,
    x: 300,
    y: 400,
    velocityX: 0,
    velocityY: 0,
    facing: 1,
    state: 'idle',
    animation: 'idle',
    frame: 0,
    meter: 0,
    maxMeter: 100,
    combo: 0,
    lastHitTime: 0,
    inHitstun: false,
    inBlockstun: false,
    canMove: true,
    inputBuffer: []
  })

  const [player2State, setPlayer2State] = useState<FighterState>({
    characterId: player2Char,
    health: CHARACTERS[player2Char]?.maxHealth || 1000,
    maxHealth: CHARACTERS[player2Char]?.maxHealth || 1000,
    x: 700,
    y: 400,
    velocityX: 0,
    velocityY: 0,
    facing: -1,
    state: 'idle',
    animation: 'idle',
    frame: 0,
    meter: 0,
    maxMeter: 100,
    combo: 0,
    lastHitTime: 0,
    inHitstun: false,
    inBlockstun: false,
    canMove: true,
    inputBuffer: []
  })

  const [showDialog, setShowDialog] = useState(false)
  const [dialogText, setDialogText] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    inputRef.current = new InputManager()
    combatRef.current = new CombatSystem()
    aiRef.current = new AIController(difficulty as any)
    particlesRef.current = new ParticleSystem()
    audioRef.current = new AudioManager()

    audioRef.current.playMusic('battle')

    const ctx = canvas.getContext('2d')!
    let frameCount = 0
    let animationId: number

    const gameLoop = () => {
      frameCount++
      const now = Date.now()

      // Update
      const input = inputRef.current?.getMovementInput() || { x: 0, y: 0 }
      const p1Updated = combatRef.current?.updateFighter(player1State, 16.67, input) || player1State

      const aiAction = aiRef.current?.getNextAction(player2State, p1Updated, now)
      const p2Updated = combatRef.current?.updateFighter(player2State, 16.67, aiAction?.input || { x: 0, y: 0 }) || player2State

      particlesRef.current?.update(16.67)

      // Draw
      ctx.fillStyle = '#08090C'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Background
      ctx.fillStyle = 'rgba(213, 31, 43, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw fighters
      drawFighter(ctx, p1Updated)
      drawFighter(ctx, p2Updated)

      // Draw particles
      const particles = particlesRef.current?.getParticles() || []
      for (const p of particles) {
        ctx.fillStyle = `rgba(213, 31, 43, ${p.life / p.maxLife})`
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }

      // Draw HUD
      drawHUD(ctx, p1Updated, p2Updated, gameStateRef.current.timer)

      setPlayer1State(p1Updated)
      setPlayer2State(p2Updated)

      animationId = requestAnimationFrame(gameLoop)
    }

    const timerInterval = setInterval(() => {
      gameStateRef.current.timer = Math.max(0, gameStateRef.current.timer - 1)
      if (gameStateRef.current.timer === 0) {
        setShowDialog(true)
        setDialogText(player1State.health > player2State.health ? 'PLAYER 1 WINS' : player2State.health > player1State.health ? 'PLAYER 2 WINS' : 'DRAW')
      }
    }, 1000)

    const handleKO = () => {
      if (player1State.health <= 0) {
        gameStateRef.current.player2Wins++
        setShowDialog(true)
        setDialogText('PLAYER 2 WINS')
      } else if (player2State.health <= 0) {
        gameStateRef.current.player1Wins++
        setShowDialog(true)
        setDialogText('PLAYER 1 WINS')
      }
    }

    if (player1State.health <= 0 || player2State.health <= 0) {
      handleKO()
    }

    return () => {
      cancelAnimationFrame(animationId)
      clearInterval(timerInterval)
      audioRef.current?.stopMusic()
      inputRef.current?.cleanup()
    }
  }, [])

  const drawFighter = (ctx: CanvasRenderingContext2D, fighter: FighterState) => {
    const w = 50
    const h = 80
    const x = fighter.x - w / 2
    const y = fighter.y - h / 2

    ctx.fillStyle = fighter.facing === 1 ? '#D51F2B' : '#8E1018'
    ctx.fillRect(x, y, w, h)

    ctx.strokeStyle = '#E7E7E7'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)

    if (fighter.state === 'block') {
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.strokeRect(x - 5, y - 5, w + 10, h + 10)
    }

    if (fighter.frame > 0 && fighter.state === 'attack') {
      ctx.strokeStyle = '#D51F2B'
      ctx.lineWidth = 2
      ctx.strokeRect(x + fighter.facing * 30, y, 40, 60)
    }
  }

  const drawHUD = (ctx: CanvasRenderingContext2D, p1: FighterState, p2: FighterState, timer: number) => {
    const barWidth = 200
    const barHeight = 30
    const x1 = 20
    const x2 = ctx.canvas.width - barWidth - 20

    // Player 1 Health
    ctx.fillStyle = '#242832'
    ctx.fillRect(x1, 20, barWidth, barHeight)
    ctx.fillStyle = '#D51F2B'
    ctx.fillRect(x1, 20, (p1.health / p1.maxHealth) * barWidth, barHeight)
    ctx.strokeStyle = '#8E1018'
    ctx.strokeRect(x1, 20, barWidth, barHeight)

    // Player 2 Health
    ctx.fillStyle = '#242832'
    ctx.fillRect(x2, 20, barWidth, barHeight)
    const p2HealthWidth = (p2.health / p2.maxHealth) * barWidth
    ctx.fillStyle = '#D51F2B'
    ctx.fillRect(x2 + barWidth - p2HealthWidth, 20, p2HealthWidth, barHeight)
    ctx.strokeStyle = '#8E1018'
    ctx.strokeRect(x2, 20, barWidth, barHeight)

    // Timer
    ctx.fillStyle = '#D51F2B'
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(timer).padStart(2, '0'), ctx.canvas.width / 2, 70)

    // Round
    ctx.fillStyle = '#D51F2B'
    ctx.font = '20px monospace'
    ctx.fillText(`ROUND ${round}`, ctx.canvas.width / 2, 120)
  }

  const handleDialogClose = () => {
    setShowDialog(false)
    if (gameStateRef.current.player1Wins === 2 || gameStateRef.current.player2Wins === 2) {
      onMatchEnd(gameStateRef.current.player1Wins, gameStateRef.current.player2Wins)
    } else {
      onMatchEnd(gameStateRef.current.player1Wins, gameStateRef.current.player2Wins)
    }
  }

  return (
    <div className="full-screen">
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

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
