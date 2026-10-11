import { useState } from 'react'
import { CHARACTER_LIST, CHARACTERS } from '../data/characters'
import './scenes.css'

interface CharacterSelectProps {
  onSelectCharacters: (p1: string, p2: string) => void
  onBack: () => void
}

export function CharacterSelect({ onSelectCharacters, onBack }: CharacterSelectProps) {
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

  const confirm = () => {
    onSelectCharacters(player1, player2)
  }

  const chars = phase === 'p1' ? CHARACTER_LIST : phase === 'p2' ? CHARACTER_LIST : [player1, player2]

  return (
    <div className="full-screen">
      <div style={{ padding: '40px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px', color: '#D51F2B' }}>
          {phase === 'p1' ? 'SELECT PLAYER 1' : phase === 'p2' ? 'SELECT PLAYER 2' : 'CONFIRM SELECTION'}
        </h1>

        {phase === 'confirm' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '40px' }}>
              <div>
                <h2>{CHARACTERS[player1].name}</h2>
                <div className="character-card" style={{ width: '150px', margin: '0 auto' }}>
                  <div style={{ height: '150px', background: '#242832' }} />
                </div>
              </div>
              <div style={{ fontSize: '32px', color: '#D51F2B', alignSelf: 'center' }}>VS</div>
              <div>
                <h2>{CHARACTERS[player2].name}</h2>
                <div className="character-card" style={{ width: '150px', margin: '0 auto' }}>
                  <div style={{ height: '150px', background: '#242832' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button className="menu-btn" onClick={confirm}>START FIGHT</button>
              <button className="menu-btn" onClick={() => setPhase('p2')}>CHANGE</button>
              <button className="menu-btn" onClick={onBack}>BACK</button>
            </div>
          </div>
        ) : (
          <div className="character-select">
            {chars.map(charId => (
              <div
                key={charId}
                className={`character-card ${phase === 'p1' && player1 === charId ? 'selected' : ''} ${phase === 'p2' && player2 === charId ? 'selected' : ''}`}
                onClick={() => phase === 'p1' ? handleSelectP1(charId) : handleSelectP2(charId)}
              >
                <div style={{ height: '120px', background: '#12151B', marginBottom: '10px' }} />
                <div className="character-name">{CHARACTERS[charId].name}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {CHARACTERS[charId].difficulty}
                </div>
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
