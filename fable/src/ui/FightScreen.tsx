import { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from '@/game/Game';
import type { MatchConfig, MatchResult } from '@/game/GameState';
import type { CharacterId } from '@/core/types';
import { useStore, useStoreSelector } from '@/state/store';
import { HUD } from './HUD';
import { PauseMenu } from './PauseMenu';
import { ResultOverlay } from './ResultOverlay';
import { SettingsScreen } from './Settings';
import { TrainingPanel } from './TrainingPanel';
import { TouchControls } from './TouchControls';
import { audio, inputManager, progression, settingsStore, sfx } from './services';

interface Props {
  config: MatchConfig;
  nextOpponent: CharacterId | null;
  ladder: { total: number; index: number } | null;
  onMatchEnd: (result: MatchResult) => void;
  onContinue: () => void;
  onRetry: () => void;
  onRematch: () => void;
  onSelect: () => void;
  onMenu: () => void;
}

const isTouchDevice = () => typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && window.matchMedia('(pointer: coarse)').matches;

/** Hosts the canvas and the Game instance; React only renders overlays around it. */
export const FightScreen = (p: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const settings = useStore(settingsStore);
  const { onMatchEnd } = p;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = new Game(canvas, p.config, inputManager, audio, settingsStore.get(), {
      onMatchEnd: (result) => onMatchEnd(result),
      onPerfectBlock: () => progression.recordPerfectBlock(),
    });
    gameRef.current = g;
    setGame(g);
    inputManager.capture = true;
    g.start();
    return () => {
      g.dispose();
      gameRef.current = null;
      inputManager.capture = false;
    };
    // The game is recreated only when the match config or restart key changes.
  }, [p.config, restartKey, onMatchEnd]);

  useEffect(() => {
    gameRef.current?.applySettings(settings);
  }, [settings]);

  const paused = useStoreSelector(game?.ui ?? dummyStore, (s) => s.paused);
  const result = useStoreSelector(game?.ui ?? dummyStore, (s) => s.result);

  const restart = useCallback(() => {
    sfx.click();
    setShowSettings(false);
    setRestartKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const off = inputManager.onSystem((action) => {
      const g = gameRef.current;
      if (!g) return;
      if (action === 'pause') {
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (g.sim.isOver) return;
        g.togglePause();
        sfx.click();
      } else if (action === 'restart') {
        if (p.config.mode === 'training') g.resetPositions();
        else if (g.paused || g.sim.isOver) restart();
      }
    });
    return off;
  }, [showSettings, restart, p.config.mode]);

  const resume = useCallback(() => {
    gameRef.current?.resume();
  }, []);
  const exit = useCallback(() => {
    p.onMenu();
  }, [p]);

  const bossFight = p.config.p2 === 'archon';
  const rounds = p.config.mode === 'training' ? 0 : Math.min(3, p.config.rounds);

  return (
    <div className={`screen${settings.accessibility.reducedMotion ? ' reduced-motion' : ''}${settings.accessibility.reducedFlashes ? ' reduced-flashes' : ''}`} style={{ background: '#000' }}>
      <div className="stage-box">
        <canvas ref={canvasRef} />
        {game && <HUD store={game.ui} rounds={rounds} colorblind={settings.accessibility.colorblind} subtitles={settings.accessibility.subtitles} p2Human={p.config.p2Human} bossFight={bossFight} />}
        {game && p.config.mode === 'training' && <TrainingPanel store={game.ui} onChange={(partial) => game.setTraining(partial)} onReset={() => game.resetPositions()} />}
        {game && isTouchDevice() && !paused && !result && <TouchControls input={inputManager} onPause={() => game.pause()} />}
        {paused && !showSettings && <PauseMenu onResume={resume} onRestart={restart} onSettings={() => setShowSettings(true)} onExit={exit} />}
        {paused && showSettings && <SettingsScreen embedded onBack={() => setShowSettings(false)} />}
        {result && (
          <ResultOverlay
            mode={p.config.mode}
            result={result}
            p1={p.config.p1}
            p2={p.config.p2}
            nextOpponent={p.nextOpponent}
            ladder={p.ladder}
            onContinue={p.onContinue}
            onRetry={p.onRetry}
            onRematch={p.onRematch}
            onSelect={p.onSelect}
            onMenu={p.onMenu}
          />
        )}
      </div>
    </div>
  );
};

import { Store } from '@/state/store';
import { initialFightUiState } from '@/game/FightUiState';
const dummyStore = new Store(initialFightUiState());
