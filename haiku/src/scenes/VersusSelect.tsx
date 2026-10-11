import { useState } from 'react'
import { CHARACTER_LIST, CHARACTERS } from '../data/characters'
import './scenes.css'

interface VersusSelectProps {
  onStart: (p1: string, p2: string) => void
  onBack: () => void
}

export function VersusSelect({ onStart, onBack }: VersusSelectProps) {
  const [player1, setPlayer1] = useState('raven')
  const [player2, setPlayer2] = useState('brute')
  const [phase, setPhase] = useState<'p1' | 'p2' | 'confirm'>('p1')

  const handleSelectP1 = (char: string) => {
    setPlayer1(char)
    setPhase('p2')
  }

  const handleSelectP2 = (char: string) => {
    setPlayer2(char)
    setPhase('confirm')
  }

  return (
    <div className="full-screen">
      <div style={{ padding: '40px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px', color: '#D51F2B' }}>
          {phase === 'p1' ? 'PLAYER 1 SELECT' : phase === 'p2' ? 'PLAYER 2 SELECT' : 'VS BATTLE'}
        </h1>

        {phase === 'confirm' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '40px' }}>
              <div>
                <h2>PLAYER 1</h2>
                <h3>{CHARACTERS[player1].name}</h3>
                <div style={{ width: '150px', height: '150px', background: '#242832', margin: '0 auto' }} />
              </div>
              <div style={{ fontSize: '32px', color: '#D51F2B', alignSelf: 'center' }}>VS</div>
              <div>
                <h2>PLAYER 2</h2>
                <h3>{CHARACTERS[player2].name}</h3>
                <div style={{ width: '150px', height: '150px', background: '#242832', margin: '0 auto' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button className="menu-btn" onClick={() => onStart(player1, player2)}>FIGHT!</button>
              <button className="menu-btn" onClick={() => setPhase('p2')}>CHANGE</button>
              <button className="menu-btn" onClick={onBack}>BACK</button>
            </div>
          </div>
        ) : (
          <div className="character-select">
            {CHARACTER_LIST.map(charId => (
              <div
                key={charId}
                className={`character-card ${phase === 'p1' && player1 === charId ? 'selected' : ''} ${phase === 'p2' && player2 === charId ? 'selected' : ''}`}
                onClick={() => phase === 'p1' ? handleSelectP1(charId) : handleSelectP2(charId)}
              >
                <div style={{ height: '120px', background: '#12151B', marginBottom: '10px' }} />
                <div className="character-name">{CHARACTERS[charId].name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {phase !== 'confirm' && (
        <button
          className="menu-btn"
          onClick={onBack}
          style={{ position: 'absolute', bottom: '20px', left: '20px' }}
        >
          BACK
        </button>
      )}
    </div>
  )
}
