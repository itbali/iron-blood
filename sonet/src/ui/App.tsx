import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTY_LABEL, type Difficulty } from '../ai/Difficulty';
import { getCharacter } from '../data/characters';
import type { StageId } from '../data/stages';
import { advance, createRun, fightConfig, isBossFight, recordWin, type ArcadeRun } from '../game/ArcadeRun';
import type { FightConfig, FightResult } from '../game/FightConfig';
import { completeArcade, recordFightResult, type ArcadeReward } from '../progression/Progression';
import { CharacterSelect, type Selection } from './CharacterSelect';
import { CharactersScreen } from './Characters';
import { FightHost } from './FightHost';
import { LoadingScreen } from './Loading';
import { MainMenu, type MenuAction } from './MainMenu';
import { ArcadeDefeat, ArcadeEnding, ArcadeIntermission, VersusResult, VsSplash } from './Results';
import { SettingsScreen } from './Settings';
import { useProgress, useServices, useSettings } from './services';

type Mode = 'arcade' | 'versus' | 'training';

type Screen =
  | { name: 'boot' }
  | { name: 'menu' }
  | { name: 'settings' }
  | { name: 'characters' }
  | { name: 'select'; mode: Mode }
  | { name: 'vs'; cfg: FightConfig; run?: ArcadeRun }
  | { name: 'fight'; cfg: FightConfig; run?: ArcadeRun; key: number }
  | { name: 'intermission'; run: ArcadeRun; result: FightResult }
  | { name: 'defeat'; run: ArcadeRun }
  | { name: 'ending'; run: ArcadeRun; reward: ArcadeReward }
  | { name: 'versus-result'; cfg: FightConfig; result: FightResult };

function devScreen(): Screen | null {
  if (!import.meta.env.DEV) return null;
  const q = new URLSearchParams(window.location.search);
  if (!q.has('fight')) return null;
  const mode = (q.get('mode') as Mode) ?? 'versus';
  const cfg: FightConfig = {
    mode,
    p1: { charId: q.get('p1') ?? 'raven', skin: 'default' },
    p2: { charId: q.get('p2') ?? 'brute', skin: 'default' },
    humanSlots: mode === 'versus' ? [0, 1] : [0],
    stage: (q.get('stage') as StageId) ?? 'industrial',
    difficulty: (q.get('ai') as Difficulty) ?? 'normal',
    bossFight: q.get('boss') === '1',
    finishers: q.get('finishers') !== '0',
  };
  return { name: 'fight', cfg, key: 1 };
}

export function App(): JSX.Element {
  const { audio, input, settings } = useServices();
  const [s] = useSettings();
  const [progress, setProgress] = useProgress();
  const [screen, setScreen] = useState<Screen>(() => devScreen() ?? { name: 'boot' });
  const [veil, setVeil] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const keyCounter = useRef(2);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const go = useCallback((next: Screen) => {
    setVeil(true);
    setTimeout(() => {
      setScreen(next);
      setTimeout(() => setVeil(false), 30);
    }, 170);
  }, []);

  // boot
  useEffect(() => {
    if (screenRef.current.name !== 'boot') return;
    let cancelled = false;
    (async () => {
      const steps: (() => Promise<unknown>)[] = [
        () => Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]),
        () => new Promise((r) => setTimeout(r, 150)),
        () => Promise.resolve(import('../scenes/render/FighterRenderer')),
        () => Promise.resolve(import('../scenes/MenuBackground')),
        () => new Promise((r) => setTimeout(r, 150)),
      ];
      for (let i = 0; i < steps.length; i++) {
        try {
          await steps[i]();
        } catch (err) {
          console.error('Boot step failed', err);
        }
        if (cancelled) return;
        setBootProgress((i + 1) / steps.length);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // keep input bindings in sync with settings
  useEffect(() => {
    input.setBindings(s.bindings);
  }, [input, s.bindings]);

  // unlock audio on first interaction
  useEffect(() => {
    const unlock = (): void => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [audio]);

  useEffect(() => {
    audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
  }, [audio, s.master, s.music, s.sfx]);

  // global key listener only while no fight owns it
  useEffect(() => {
    if (screen.name === 'fight') return;
    input.attach();
    return () => input.detach();
  }, [input, screen.name]);

  const startArcadeFight = (run: ArcadeRun): void => go({ name: 'vs', cfg: fightConfig(run), run });

  const onMenu = (a: MenuAction): void => {
    if (a === 'settings') go({ name: 'settings' });
    else if (a === 'characters') go({ name: 'characters' });
    else go({ name: 'select', mode: a });
  };

  const onSelected = (mode: Mode, sel: Selection): void => {
    settings.set({ difficulty: sel.difficulty });
    if (mode === 'arcade') {
      startArcadeFight(createRun(sel.p1, sel.difficulty));
      return;
    }
    const cfg: FightConfig = {
      mode,
      p1: sel.p1,
      p2: sel.p2 ?? { charId: 'brute', skin: 'default' },
      humanSlots: mode === 'versus' ? [0, 1] : [0],
      stage: sel.stage ?? 'industrial',
      difficulty: sel.difficulty,
      bossFight: false,
      finishers: true,
    };
    if (mode === 'training') go({ name: 'fight', cfg, key: keyCounter.current++ });
    else go({ name: 'vs', cfg });
  };

  const onFightEnd = (r: FightResult): void => {
    const cur = screenRef.current;
    if (cur.name !== 'fight') return;
    if (cur.run) {
      const run = cur.run;
      setProgress(recordFightResult(progress, r.humanWon, r.maxCombo[0]));
      if (!r.humanWon) {
        go({ name: 'defeat', run });
        return;
      }
      const updated = recordWin(run, r);
      if (isBossFight(run)) {
        const def = getCharacter(run.player.charId);
        const { progress: np, reward } = completeArcade(recordFightResult(progress, true, r.maxCombo[0]), def, updated.stats.timeSec);
        setProgress(np);
        go({ name: 'ending', run: updated, reward });
      } else {
        go({ name: 'intermission', run: updated, result: r });
      }
      return;
    }
    setProgress(recordFightResult(progress, r.winnerSlot === 0, Math.max(r.maxCombo[0], r.maxCombo[1])));
    go({ name: 'versus-result', cfg: cur.cfg, result: r });
  };

  const toMenu = (): void => go({ name: 'menu' });

  let body: JSX.Element;
  switch (screen.name) {
    case 'boot':
      body = <LoadingScreen label="INITIALIZING..." progress={bootProgress} waitForKey onDone={() => go({ name: 'menu' })} />;
      break;
    case 'menu':
      body = <MainMenu onPick={onMenu} />;
      break;
    case 'settings':
      body = <SettingsScreen onBack={toMenu} />;
      break;
    case 'characters':
      body = <CharactersScreen onBack={toMenu} />;
      break;
    case 'select':
      body = <CharacterSelect mode={screen.mode} onBack={toMenu} onConfirm={(sel) => onSelected(screen.mode, sel)} />;
      break;
    case 'vs': {
      const cfg = screen.cfg;
      const run = screen.run;
      body = (
        <VsSplash
          p1={cfg.p1.charId}
          p2={cfg.p2.charId}
          subtitle={run ? `Fight ${run.index + 1} of ${run.ladder.length} · ${DIFFICULTY_LABEL[cfg.difficulty]}${cfg.bossFight ? ' · BOSS' : ''}` : 'Versus'}
          onDone={() => go({ name: 'fight', cfg, run, key: keyCounter.current++ })}
        />
      );
      break;
    }
    case 'fight':
      body = <FightHost key={screen.key} cfg={screen.cfg} onEnd={onFightEnd} onExit={toMenu} />;
      break;
    case 'intermission': {
      const run = screen.run;
      body = (
        <ArcadeIntermission
          result={screen.result}
          playerName={getCharacter(run.player.charId).name.toUpperCase()}
          nextId={run.ladder[run.index + 1]}
          index={run.index + 1}
          total={run.ladder.length}
          onContinue={() => startArcadeFight(advance(run))}
        />
      );
      break;
    }
    case 'defeat': {
      const run = screen.run;
      body = (
        <ArcadeDefeat
          continues={run.stats.continues}
          onContinue={() => startArcadeFight({ ...run, stats: { ...run.stats, continues: run.stats.continues + 1 } })}
          onQuit={toMenu}
        />
      );
      break;
    }
    case 'ending': {
      const def = getCharacter(screen.run.player.charId);
      body = <ArcadeEnding playerName={def.name.toUpperCase()} playerId={def.id} stats={screen.run.stats} reward={screen.reward} difficulty={screen.run.difficulty} onDone={toMenu} />;
      break;
    }
    case 'versus-result': {
      const cfg = screen.cfg;
      const r = screen.result;
      const winner = getCharacter(r.winnerSlot === 0 ? cfg.p1.charId : cfg.p2.charId).name.toUpperCase();
      body = (
        <VersusResult
          winnerName={winner}
          result={r}
          onRematch={() => go({ name: 'fight', cfg: { ...cfg }, key: keyCounter.current++ })}
          onSelect={() => go({ name: 'select', mode: cfg.mode })}
          onMenu={toMenu}
        />
      );
      break;
    }
  }

  return (
    <div className={`app ${s.reducedMotion ? 'reduced' : ''}`} data-cb={s.colorblind === 'off' ? undefined : s.colorblind}>
      {body}
      <div className={`veil ${veil ? 'on' : ''}`} />
      <div className="rotate-note">ROTATE YOUR DEVICE<br />TO LANDSCAPE</div>
    </div>
  );
}
