import { useState } from 'react'
import { MainMenu } from './scenes/MainMenu'
import { CharacterSelect } from './scenes/CharacterSelect'
import { FightSceneV2 } from './scenes/FightSceneV2'
import { TrainingScene } from './scenes/TrainingScene'
import { VersusSelect } from './scenes/VersusSelect'
import { SettingsScene } from './scenes/SettingsScene'
import type { GameState } from './types/GameState'

export function App() {
  const [gameState, setGameState] = useState<GameState>({
    scene: 'menu',
    player1Character: 'raven',
    player2Character: 'brute',
    difficulty: 'normal',
    matchWins: [0, 0],
    currentRound: 1,
  })

  const handleSceneChange = (scene: string, data?: any) => {
    setGameState(prev => ({
      ...prev,
      scene: scene as GameState['scene'],
      ...data
    }))
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {gameState.scene === 'menu' && (
        <MainMenu onNavigate={handleSceneChange} />
      )}
      {gameState.scene === 'characterSelect' && (
        <CharacterSelect
          onSelectCharacters={(p1, p2) =>
            handleSceneChange('fight', { player1Character: p1, player2Character: p2 })
          }
          onBack={() => handleSceneChange('menu')}
        />
      )}
      {gameState.scene === 'fight' && (
        <FightSceneV2
          player1Char={gameState.player1Character}
          player2Char={gameState.player2Character}
          difficulty={gameState.difficulty}
          round={gameState.currentRound}
          matchWins={gameState.matchWins}
          isVersus={(gameState as any).isVersus}
          onMatchEnd={(p1Wins, p2Wins) => {
            if (p1Wins === 2 || p2Wins === 2) {
              handleSceneChange('menu')
            } else {
              handleSceneChange('fight', {
                currentRound: gameState.currentRound + 1,
                matchWins: [p1Wins, p2Wins]
              })
            }
          }}
        />
      )}
      {gameState.scene === 'training' && (
        <TrainingScene
          onBack={() => handleSceneChange('menu')}
        />
      )}
      {gameState.scene === 'versus' && (
        <VersusSelect
          onStart={(p1, p2) => {
            handleSceneChange('fight', {
              player1Character: p1,
              player2Character: p2,
              isVersus: true
            })
          }}
          onBack={() => handleSceneChange('menu')}
        />
      )}
      {gameState.scene === 'settings' && (
        <SettingsScene
          onBack={() => handleSceneChange('menu')}
        />
      )}
    </div>
  )
}
