import { useCallback, useEffect, useMemo } from 'react';
import type { MatchResult, SkinId } from '@/game/GameState';
import type { CharacterId, Difficulty, StageId } from '@/core/types';
import { useStore } from '@/state/store';
import { arcadeAdvance, arcadeComplete, arcadeMatchConfig, arcadeStats, createArcadeRun } from '@/scenes/ArcadeMode';
import { rematch, trainingMatch, versusMatch } from '@/scenes/FightScene';
import { goTo, sceneStore } from '@/scenes/SceneManager';
import { ArcadeComplete } from './ArcadeComplete';
import { CharacterSelect } from './CharacterSelect';
import { CharactersScreen } from './CharactersScreen';
import { FightScreen } from './FightScreen';
import { LoadingScreen } from './LoadingScreen';
import { MainMenu, type MenuAction } from './MainMenu';
import { SettingsScreen } from './Settings';
import { audio, inputManager, progression, settingsStore } from './services';

/** Screen router. All transitions go through goTo() so screens never switch instantly. */
export const App = () => {
  const scene = useStore(sceneStore);
  const settings = useStore(settingsStore);

  useEffect(() => {
    inputManager.attach();
    inputManager.capture = false;
    const unlock = () => {
      audio.unlock();
      if (sceneStore.get().screen === 'boot') goTo('menu');
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      inputManager.detach();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (scene.screen === 'menu' || scene.screen === 'select' || scene.screen === 'characters' || scene.screen === 'settings') audio.playMusic('menu');
    else if (scene.screen === 'arcade-complete') audio.playMusic('victory');
    else if (scene.screen === 'loading') audio.playMusic('none');
  }, [scene.screen]);

  const onMenuAction = useCallback((a: MenuAction) => {
    const s = sceneStore.get();
    switch (a) {
      case 'arcade':
        goTo('select', { mode: 'arcade', selected: { ...s.selected, p1: progression.progress.lastCharacter, difficulty: settingsStore.get().gameplay.difficulty } });
        break;
      case 'versus':
        goTo('select', { mode: 'versus' });
        break;
      case 'training':
        goTo('select', { mode: 'training' });
        break;
      case 'characters':
        goTo('characters');
        break;
      case 'settings':
        goTo('settings');
        break;
    }
  }, []);

  const onSelectConfirm = useCallback((sel: { p1: CharacterId; p2: CharacterId; stage: StageId; difficulty: Difficulty; skin: SkinId }) => {
    const s = sceneStore.get();
    progression.setLastCharacter(sel.p1);
    settingsStore.set((cur) => (cur.gameplay.difficulty === sel.difficulty ? cur : { ...cur, gameplay: { ...cur.gameplay, difficulty: sel.difficulty } }));
    if (s.mode === 'arcade') {
      const run = createArcadeRun(sel.p1, sel.difficulty, Date.now(), sel.skin);
      goTo('loading', { arcade: run, match: arcadeMatchConfig(run), selected: sel, lastResult: null });
    } else if (s.mode === 'versus') {
      goTo('loading', { arcade: null, match: versusMatch(sel.p1, sel.p2, sel.stage, [sel.skin, 'default']), selected: sel, lastResult: null });
    } else {
      goTo('loading', { arcade: null, match: trainingMatch(sel.p1, sel.p2, sel.stage, sel.difficulty, [sel.skin, 'default']), selected: sel, lastResult: null });
    }
  }, []);

  const onLoaded = useCallback(() => goTo('fight'), []);

  const onMatchEnd = useCallback((result: MatchResult) => {
    const s = sceneStore.get();
    if (!s.match) return;
    progression.recordMatch(result, 0, s.match.mode === 'versus');
    sceneStore.patch({ lastResult: result });
  }, []);

  const onContinue = useCallback(() => {
    const s = sceneStore.get();
    if (!s.arcade || !s.lastResult) return;
    const run = arcadeAdvance(s.arcade, s.lastResult);
    if (arcadeComplete(run)) {
      const rewards = progression.completeArcade(run.character, run.totalFrames);
      goTo('arcade-complete', { arcade: run, rewards });
      return;
    }
    goTo('loading', { arcade: run, match: arcadeMatchConfig(run), lastResult: null });
  }, []);

  const onRetry = useCallback(() => {
    const s = sceneStore.get();
    if (!s.match) return;
    goTo('loading', { match: rematch(s.match), lastResult: null });
  }, []);

  const onRematch = onRetry;
  const onSelect = useCallback(() => goTo('select', { lastResult: null, match: null }), []);
  const onMenu = useCallback(() => goTo('menu', { lastResult: null, match: null, arcade: null }), []);
  const onBack = useCallback(() => goTo('menu'), []);

  const nextOpponent = useMemo(() => {
    const run = scene.arcade;
    if (!run) return null;
    return run.ladder[run.index + 1] ?? null;
  }, [scene.arcade]);

  const ladder = scene.arcade ? { total: scene.arcade.ladder.length, index: scene.arcade.index } : null;

  let content: React.ReactNode = null;
  switch (scene.screen) {
    case 'boot':
      content = (
        <div className="screen boot-screen">
          <h1 className="logo">
            Iron <span>Blood</span>
          </h1>
          <div className="tagline">Press any key</div>
        </div>
      );
      break;
    case 'menu':
      content = <MainMenu onAction={onMenuAction} />;
      break;
    case 'select':
      content = <CharacterSelect mode={scene.mode} initial={scene.selected} onConfirm={onSelectConfirm} onBack={onBack} />;
      break;
    case 'loading':
      content = scene.match ? <LoadingScreen p1={scene.match.p1} p2={scene.match.p2} stage={scene.match.stage} onDone={onLoaded} /> : null;
      break;
    case 'fight':
      content = scene.match ? (
        <FightScreen
          config={scene.match}
          nextOpponent={nextOpponent}
          ladder={ladder}
          onMatchEnd={onMatchEnd}
          onContinue={onContinue}
          onRetry={onRetry}
          onRematch={onRematch}
          onSelect={onSelect}
          onMenu={onMenu}
        />
      ) : null;
      break;
    case 'arcade-complete':
      content = scene.arcade ? (
        <ArcadeComplete
          character={scene.arcade.character}
          stats={arcadeStats(scene.arcade)}
          rewards={scene.rewards}
          onMenu={onMenu}
          onAgain={() => goTo('select', { mode: 'arcade', arcade: null, match: null })}
        />
      ) : null;
      break;
    case 'characters':
      content = <CharactersScreen onBack={onBack} />;
      break;
    case 'settings':
      content = <SettingsScreen onBack={onBack} />;
      break;
    case 'victory':
      content = null;
      break;
  }

  return (
    <div className={`app${settings.accessibility.reducedMotion ? ' reduced-motion' : ''}${settings.accessibility.reducedFlashes ? ' reduced-flashes' : ''}`}>
      {content}
      <div className={`fade-cover${scene.transitioning ? ' on' : ''}`} />
    </div>
  );
};
