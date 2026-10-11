import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCharacter } from '../data/characters';
import type { ArcadeRun } from '../game/Arcade';
import { advanceArcade, arcadeComplete, arcadeMatchConfig, createArcadeRun } from '../game/Arcade';
import { GameServices } from '../game/Game';
import type { GameMode, MatchConfig, MatchResult } from '../game/GameState';
import type { ArcadeUnlocks } from '../progression/Progression';
import { applyArcadeClear, recordMatch } from '../progression/Progression';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScaledStage } from './components/ScaledStage';
import { ServicesContext, useSave } from './context';
import { CharactersGallery } from './screens/CharactersGallery';
import type { SelectResult } from './screens/CharacterSelect';
import { CharacterSelect } from './screens/CharacterSelect';
import { FightScreen } from './screens/FightScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import type { MainMenuChoice } from './screens/MainMenu';
import { MainMenu } from './screens/MainMenu';
import { formatTime, ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/Settings';
import { PortraitCanvas } from './components/PortraitCanvas';

type Screen =
  | { id: 'menu' }
  | { id: 'select'; mode: GameMode }
  | { id: 'loading'; config: MatchConfig }
  | { id: 'fight'; config: MatchConfig }
  | { id: 'result'; config: MatchConfig; result: MatchResult }
  | { id: 'ending'; run: ArcadeRun; unlocks: ArcadeUnlocks }
  | { id: 'characters' }
  | { id: 'settings' };

/** Dev-only deep link: ?fight=raven,archon,temple jumps straight into a CPU fight. */
const devInitialScreen = (): Screen => {
  if (!import.meta.env.DEV) return { id: 'menu' };
  const q = new URLSearchParams(window.location.search).get('fight');
  if (!q) return { id: 'menu' };
  const [p1 = 'raven', p2 = 'brute', stage = 'industrial'] = q.split(',');
  return {
    id: 'loading',
    config: { mode: 'arcade', p1, p2, stage, controllers: ['human1', 'cpu'], difficulty: 'normal', isBoss: p2 === 'archon', arcadeStage: p2 === 'archon' ? 5 : 1 },
  };
};

const MENU_THEME_SCREENS = new Set(['menu', 'select', 'characters', 'settings']);

function Router() {
  const [services] = useState(() => new GameServices());
  return (
    <ServicesContext.Provider value={services}>
      <Screens services={services} />
    </ServicesContext.Provider>
  );
}

function Screens({ services }: { services: GameServices }) {
  const save = useSave();
  const [screen, setScreen] = useState<Screen>(devInitialScreen);
  const [nonce, setNonce] = useState(0);
  const [arcade, setArcade] = useState<ArcadeRun | null>(null);

  const go = useCallback((s: Screen) => {
    setScreen(s);
    setNonce((n) => n + 1);
  }, []);

  // Browsers keep audio locked until a user gesture; unlock on the first one.
  useEffect(() => {
    const unlock = () => services.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [services]);

  useEffect(() => {
    if (MENU_THEME_SCREENS.has(screen.id)) services.audio.playMusic('menu');
  }, [screen.id, services]);

  const onMenu = (c: MainMenuChoice) => {
    if (c === 'characters') go({ id: 'characters' });
    else if (c === 'settings') go({ id: 'settings' });
    else go({ id: 'select', mode: c });
  };

  const onSelected = (mode: GameMode, r: SelectResult) => {
    services.update((d) => (d.settings.gameplay.difficulty = r.difficulty));
    if (mode === 'arcade') {
      const run = createArcadeRun(r.p1, r.p1Skin, r.difficulty, Date.now() & 0xffffff);
      setArcade(run);
      go({ id: 'loading', config: arcadeMatchConfig(run) });
      return;
    }
    const config: MatchConfig = {
      mode,
      p1: r.p1,
      p2: r.p2,
      stage: r.stage,
      controllers: mode === 'versus' ? ['human1', 'human2'] : ['human1', 'dummy'],
      difficulty: r.difficulty,
      p1Skin: r.p1Skin,
      p2Skin: r.p2Skin,
      skipIntro: mode === 'training',
    };
    go({ id: 'loading', config });
  };

  const onMatchOver = (config: MatchConfig, result: MatchResult) => {
    const humanWon = config.mode === 'versus' ? result.winner !== -1 : result.winner === 0;
    services.update((d) => recordMatch(d.progress, humanWon, Math.max(result.maxCombo[0], config.mode === 'versus' ? result.maxCombo[1] : 0), result.damageDealt[0], !!result.finisher && result.winner === 0));
    if (config.mode === 'training') {
      go({ id: 'fight', config });
      return;
    }
    if (config.mode === 'arcade' && arcade) {
      const next = advanceArcade(arcade, result);
      setArcade(next);
      if (arcadeComplete(next)) {
        let unlocks: ArcadeUnlocks = { skin: null, difficulty: null, art: null, character: null };
        services.update((d) => {
          unlocks = applyArcadeClear(d.progress, next.character, next.stats.timeSeconds);
        });
        go({ id: 'ending', run: next, unlocks });
        return;
      }
    }
    go({ id: 'result', config, result });
  };

  const content = useMemo(() => {
    switch (screen.id) {
      case 'menu':
        return <MainMenu onChoose={onMenu} />;
      case 'select':
        return <CharacterSelect mode={screen.mode} onConfirm={(r) => onSelected(screen.mode, r)} onBack={() => go({ id: 'menu' })} />;
      case 'loading':
        return <LoadingScreen config={screen.config} onDone={() => go({ id: 'fight', config: screen.config })} />;
      case 'fight':
        return <FightScreen config={screen.config} onMatchOver={(r) => onMatchOver(screen.config, r)} onExit={() => go({ id: 'menu' })} />;
      case 'result':
        return <MatchResultView config={screen.config} result={screen.result} arcade={arcade} go={go} />;
      case 'ending':
        return <ArcadeEnding run={screen.run} unlocks={screen.unlocks} onDone={() => go({ id: 'menu' })} />;
      case 'characters':
        return <CharactersGallery onBack={() => go({ id: 'menu' })} />;
      case 'settings':
        return <SettingsScreen onBack={() => go({ id: 'menu' })} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, nonce, arcade]);

  const a = save.settings.accessibility;
  return (
    <div className={`${a.reducedMotion ? 'reduced-motion' : ''} ${a.colorblind ? 'cb' : ''}`} style={{ position: 'absolute', inset: 0 }}>
      <ErrorBoundary onReset={() => go({ id: 'menu' })}>
        <div key={nonce} style={{ position: 'absolute', inset: 0 }}>
          {content}
        </div>
      </ErrorBoundary>
    </div>
  );
}

function MatchResultView({ config, result, arcade, go }: { config: MatchConfig; result: MatchResult; arcade: ArcadeRun | null; go: (s: Screen) => void }) {
  const p1 = getCharacter(config.p1);
  const p2 = getCharacter(config.p2);
  const winnerDef = result.winner === 1 ? p2 : p1;
  const stats = [
    { label: 'ROUNDS', value: `${result.roundsWon[0]} – ${result.roundsWon[1]}` },
    { label: 'TIME', value: formatTime(result.timeSeconds) },
    { label: 'MAX COMBO', value: Math.max(result.maxCombo[0], config.mode === 'versus' ? result.maxCombo[1] : 0) },
    { label: 'DAMAGE DEALT', value: Math.round(result.winner === 1 && config.mode === 'versus' ? result.damageDealt[1] : result.damageDealt[0]) },
  ];
  if (config.mode === 'arcade' && arcade) {
    const won = result.winner === 0;
    const nextDef = won ? getCharacter(arcade.ladder[arcade.index]) : null;
    const ladder = (
      <div className="ladder">
        {arcade.ladder.map((id, i) => (
          <div key={id} className={i < arcade.index ? 'done' : i === arcade.index ? 'current' : ''}>
            {i === arcade.ladder.length - 1 ? 'BOSS' : getCharacter(id).name.toUpperCase()}
          </div>
        ))}
      </div>
    );
    if (won && nextDef) {
      return (
        <ResultScreen
          title={`${p1.name.toUpperCase()} WINS`}
          kicker={`ARCADE · FIGHT ${arcade.index} CLEARED${result.finisher ? ` · ${result.finisher.toUpperCase()}` : ''}`}
          quote={p1.dialogue.victoryLines[arcade.index % p1.dialogue.victoryLines.length]}
          portrait={p1}
          skin={config.p1Skin}
          stats={[...stats.slice(1), { label: 'HEALTH', value: 'RESTORED' }]}
          actions={[
            { label: 'NEXT OPPONENT', run: () => go({ id: 'loading', config: arcadeMatchConfig(arcade) }) },
            { label: 'QUIT', run: () => go({ id: 'menu' }) },
          ]}
        >
          {ladder}
          <div className="next-opp">
            <PortraitCanvas def={nextDef} width={120} height={120} focusY={150} zoom={1.6} facing={-1} />
            <div>
              <div className="hud-player">{arcade.index >= arcade.ladder.length - 1 ? 'FINAL BATTLE' : 'NEXT OPPONENT'}</div>
              <div className="char-name" style={{ fontSize: 40 }}>
                {nextDef.name.toUpperCase()}
              </div>
            </div>
          </div>
        </ResultScreen>
      );
    }
    return (
      <ResultScreen
        title="DEFEATED"
        lose
        kicker={`ARCADE · FIGHT ${arcade.index + 1}`}
        quote={p2.dialogue.victoryLines[0]}
        portrait={p1}
        skin={config.p1Skin}
        stats={stats}
        actions={[
          { label: 'CONTINUE', run: () => go({ id: 'loading', config: arcadeMatchConfig(arcade) }) },
          { label: 'QUIT', run: () => go({ id: 'menu' }) },
        ]}
      >
        {ladder}
      </ResultScreen>
    );
  }
  const draw = result.winner === -1;
  return (
    <ResultScreen
      title={draw ? 'DRAW GAME' : `${winnerDef.name.toUpperCase()} WINS`}
      kicker={draw ? 'VERSUS' : `${config.mode === 'versus' ? `PLAYER ${result.winner + 1}` : 'VERSUS'} VICTORY${result.perfect ? ' · FLAWLESS' : ''}${result.finisher ? ` · ${result.finisher.toUpperCase()}` : ''}`}
      quote={draw ? undefined : winnerDef.dialogue.victoryLines[1 % winnerDef.dialogue.victoryLines.length]}
      portrait={winnerDef}
      skin={result.winner === 1 ? config.p2Skin : config.p1Skin}
      stats={stats}
      actions={[
        { label: 'REMATCH', run: () => go({ id: 'loading', config: { ...config, skipIntro: true } }) },
        { label: 'CHARACTER SELECT', run: () => go({ id: 'select', mode: config.mode }) },
        { label: 'MAIN MENU', run: () => go({ id: 'menu' }) },
      ]}
    />
  );
}

function ArcadeEnding({ run, unlocks, onDone }: { run: ArcadeRun; unlocks: ArcadeUnlocks; onDone: () => void }) {
  const def = getCharacter(run.character);
  const list = [
    unlocks.skin && `New skin: ${def.name} — Alternate palette`,
    unlocks.difficulty && 'New difficulty: NIGHTMARE',
    unlocks.art && `Concept art: ${def.name}`,
    unlocks.character && 'Character information: The Archon (playable)',
  ].filter(Boolean) as string[];
  return (
    <ResultScreen
      title={`${def.name.toUpperCase()} WINS`}
      kicker="THE ARCHON HAS FALLEN"
      quote={def.dialogue.victoryLines[0]}
      portrait={def}
      skin={run.skin}
      stats={[
        { label: 'TIME', value: formatTime(run.stats.timeSeconds) },
        { label: 'WINS', value: run.stats.wins },
        { label: 'MAX COMBO', value: run.stats.maxCombo },
        { label: 'DAMAGE DEALT', value: Math.round(run.stats.damage) },
      ]}
      actions={[{ label: 'CONTINUE', run: onDone }]}
    >
      <div className="complete-banner">ARCADE COMPLETE</div>
      {list.length > 0 ? (
        <div className="unlocks">
          <h3>UNLOCKED</h3>
          <ul>{list.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      ) : (
        <div className="unlocks">
          <h3>ALL REWARDS COLLECTED</h3>
          <ul>
            <li>Continues used: {run.stats.continues}</li>
          </ul>
        </div>
      )}
    </ResultScreen>
  );
}

export function App() {
  return (
    <>
      <ScaledStage>
        <Router />
      </ScaledStage>
      <div className="rotate-hint">ROTATE YOUR DEVICE TO LANDSCAPE</div>
    </>
  );
}
