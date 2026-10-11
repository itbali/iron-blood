import { useEffect, useMemo, useRef, useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../ai/Difficulty';
import type { CharacterDef } from '../../characters/CharacterDef';
import { FighterState } from '../../characters/FighterState';
import { ALL_CHARACTERS } from '../../data/characters';
import { STAGES } from '../../data/stages';
import type { Difficulty, GameMode } from '../../game/GameState';
import { useSave, useServices } from '../context';
import { PortraitCanvas } from '../components/PortraitCanvas';
import { StageThumb } from '../components/StageThumb';

export interface SelectResult {
  p1: string;
  p2: string;
  p1Skin: 'default' | 'alt';
  p2Skin: 'default' | 'alt';
  difficulty: Difficulty;
  stage: string;
}

type Phase = 'chars' | 'opponent' | 'stage';

const P1_KEYS = { left: 'KeyA', right: 'KeyD', ok: 'KeyJ', back: 'KeyK' };
const P2_KEYS = { left: 'ArrowLeft', right: 'ArrowRight', ok: ['Numpad1', 'Enter', 'NumpadEnter'], back: ['Numpad2', 'Backspace'] };

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <div className="stat-bar">
        <div style={{ width: `${value * 10}%` }} />
      </div>
      <span>{value}</span>
    </div>
  );
}

function Preview({ def, side, skin, label }: { def: CharacterDef; side: 'left' | 'right'; skin: 'default' | 'alt'; label: string }) {
  return (
    <div className={`preview ${side}`}>
      <PortraitCanvas
        def={def}
        width={520}
        height={470}
        focusY={105}
        zoom={1.75}
        cxRatio={side === 'left' ? 0.68 : 0.32}
        facing={side === 'left' ? 1 : -1}
        skin={skin}
        animate
        background="glow"
        glow={side === 'left' ? 'rgba(213,31,43,0.35)' : 'rgba(120,130,150,0.25)'}
      />
      <div className="info">
        <div className="hud-player">{label}</div>
        <h2 className="char-name display">{def.name}</h2>
        <div className="char-title">{def.title.toUpperCase()}</div>
        <StatBar label="SPEED" value={def.stats.speed} />
        <StatBar label="DAMAGE" value={def.stats.damage} />
        <StatBar label="HEALTH" value={def.stats.health} />
        <span className="diff-chip">DIFFICULTY · {def.stats.difficulty.toUpperCase()}</span>
      </div>
    </div>
  );
}

export function CharacterSelect({ mode, onConfirm, onBack }: { mode: GameMode; onConfirm: (r: SelectResult) => void; onBack: () => void }) {
  const services = useServices();
  const save = useSave();
  const progress = save.progress;
  const unlocked = (id: string) => progress.unlockedCharacters.includes(id);
  const roster = ALL_CHARACTERS;
  const [phase, setPhase] = useState<Phase>('chars');
  const [c1, setC1] = useState(0);
  const [c2, setC2] = useState(mode === 'versus' ? 2 : 2);
  const [lock1, setLock1] = useState(false);
  const [lock2, setLock2] = useState(false);
  const [stage, setStage] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(save.settings.gameplay.difficulty);
  const [skin1, setSkin1] = useState<'default' | 'alt'>('default');
  const diffs = useMemo(() => DIFFICULTY_ORDER.filter((d) => progress.unlockedDifficulties.includes(d)), [progress.unlockedDifficulties]);
  const hasAlt = (id: string) => progress.unlockedSkins.includes(`${id}:alt`);
  const state = useRef({ phase, c1, c2, lock1, lock2, stage, difficulty, skin1 });
  state.current = { phase, c1, c2, lock1, lock2, stage, difficulty, skin1 };

  const finish = (s: typeof state.current) => {
    const p1 = roster[s.c1].id;
    const p2 = mode === 'arcade' ? '' : roster[s.c2].id;
    const p2Skin: 'default' | 'alt' = p1 === p2 && s.skin1 === 'default' ? 'alt' : 'default';
    services.audio.play('confirm');
    onConfirm({ p1, p2, p1Skin: s.skin1, p2Skin, difficulty: s.difficulty, stage: STAGES[s.stage].id });
  };

  const move = (cur: number, dir: number) => {
    let n = cur;
    for (let i = 0; i < roster.length; i++) {
      n = (n + dir + roster.length) % roster.length;
      if (unlocked(roster[n].id)) return n;
    }
    return cur;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const s = state.current;
      const code = e.code;
      const play = (id: string) => services.audio.play(id);
      if (s.phase === 'stage') {
        if (code === P1_KEYS.left || code === 'ArrowLeft') {
          setStage((v) => (v + STAGES.length - 1) % STAGES.length);
          play('hover');
        } else if (code === P1_KEYS.right || code === 'ArrowRight') {
          setStage((v) => (v + 1) % STAGES.length);
          play('hover');
        } else if (code === P1_KEYS.ok || code === 'Enter' || code === 'Space') {
          finish(s);
        } else if (code === P1_KEYS.back || code === 'Escape') {
          play('back');
          setPhase(mode === 'training' ? 'opponent' : 'chars');
          if (mode === 'versus') {
            setLock1(false);
            setLock2(false);
          } else setLock2(false);
        }
        return;
      }
      if (code === 'Escape') {
        play('back');
        if (s.lock1 || s.lock2) {
          setLock1(false);
          setLock2(false);
          setPhase('chars');
        } else onBack();
        return;
      }
      if (code === 'KeyQ' || code === 'KeyE') {
        if (mode !== 'versus') {
          const i = diffs.indexOf(s.difficulty);
          const ni = (i + (code === 'KeyE' ? 1 : -1) + diffs.length) % diffs.length;
          setDifficulty(diffs[ni]);
          play('hover');
        }
        return;
      }
      if (code === 'KeyO' && hasAlt(roster[s.c1].id) && !s.lock1) {
        setSkin1((v) => (v === 'default' ? 'alt' : 'default'));
        play('select');
        return;
      }
      // P1 cursor (also controls the opponent cursor in training).
      const p1Controls = s.phase === 'chars' && !s.lock1;
      const oppControls = s.phase === 'opponent';
      if (code === P1_KEYS.left || (mode !== 'versus' && code === 'ArrowLeft')) {
        if (p1Controls) setC1((v) => move(v, -1));
        else if (oppControls) setC2((v) => move(v, -1));
        play('hover');
      } else if (code === P1_KEYS.right || (mode !== 'versus' && code === 'ArrowRight')) {
        if (p1Controls) setC1((v) => move(v, 1));
        else if (oppControls) setC2((v) => move(v, 1));
        play('hover');
      } else if (code === P1_KEYS.ok || (mode !== 'versus' && (code === 'Enter' || code === 'Space'))) {
        if (p1Controls) {
          setLock1(true);
          play('select');
          if (mode === 'arcade') finish({ ...s, lock1: true });
          else if (mode === 'training') setPhase('opponent');
          else if (s.lock2) setPhase('stage');
        } else if (oppControls) {
          setLock2(true);
          play('select');
          setPhase('stage');
        }
      } else if (code === P1_KEYS.back) {
        if (oppControls) {
          setPhase('chars');
          setLock1(false);
          play('back');
        } else if (s.lock1 && mode === 'versus') {
          setLock1(false);
          play('back');
        } else if (!s.lock1) {
          play('back');
          onBack();
        }
      }
      // P2 cursor (versus only).
      if (mode === 'versus' && s.phase === 'chars') {
        if (code === P2_KEYS.left && !s.lock2) {
          setC2((v) => move(v, -1));
          play('hover');
        } else if (code === P2_KEYS.right && !s.lock2) {
          setC2((v) => move(v, 1));
          play('hover');
        } else if (P2_KEYS.ok.includes(code) && !s.lock2) {
          setLock2(true);
          play('select');
          if (s.lock1) setPhase('stage');
        } else if (P2_KEYS.back.includes(code) && s.lock2) {
          setLock2(false);
          play('back');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, diffs, services]);

  const def1 = roster[c1];
  const def2 = roster[c2];
  const title = mode === 'arcade' ? 'ARCADE' : mode === 'versus' ? 'VERSUS' : 'TRAINING';
  const banner =
    phase === 'stage'
      ? 'SELECT ARENA — A / D, J TO FIGHT'
      : phase === 'opponent'
        ? 'SELECT OPPONENT — A / D, J TO CONFIRM'
        : mode === 'versus'
          ? `P1: A/D + J   ·   P2: ← → + NUM1/ENTER ${lock1 ? '   ·   P1 READY' : ''}${lock2 ? '   ·   P2 READY' : ''}`
          : 'CHOOSE YOUR FIGHTER — A / D, J TO CONFIRM';

  return (
    <div className="screen select-root">
      <h1 className="screen-title display">
        <small>{title}</small>
        {phase === 'stage' ? 'ARENA SELECT' : 'CHARACTER SELECT'}
      </h1>
      {mode !== 'versus' && (
        <div className="select-options">
          <div className="option-pill">
            CPU
            <button onClick={() => setDifficulty(diffs[(diffs.indexOf(difficulty) - 1 + diffs.length) % diffs.length])} aria-label="Lower difficulty">
              ◀
            </button>
            <span className="val">{DIFFICULTIES[difficulty].label}</span>
            <button onClick={() => setDifficulty(diffs[(diffs.indexOf(difficulty) + 1) % diffs.length])} aria-label="Raise difficulty">
              ▶
            </button>
            <kbd>Q</kbd>
            <kbd>E</kbd>
          </div>
          {hasAlt(def1.id) && (
            <div className="option-pill">
              SKIN <span className="val">{skin1 === 'alt' ? 'ALTERNATE' : 'DEFAULT'}</span>
              <kbd>O</kbd>
            </div>
          )}
        </div>
      )}
      <div className="confirm-banner">{banner}</div>

      {phase === 'stage' ? (
        <div className="stage-select">
          {STAGES.map((st, i) => (
            <div
              key={st.id}
              className={`stage-card ${i === stage ? 'active' : ''}`}
              onMouseEnter={() => setStage(i)}
              onClick={() => finish({ ...state.current, stage: i })}
            >
              <StageThumb id={st.id} width={300} height={220} />
              <div className="label">
                <b>{st.name.toUpperCase()}</b>
                <span>{st.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <Preview def={def1} side="left" skin={skin1} label="PLAYER 1" />
          {mode === 'arcade' ? (
            <div className="preview right">
              <PortraitCanvas def={roster[(c1 + 3) % 6]} width={520} height={470} focusY={105} zoom={1.75} cxRatio={0.32} facing={-1} silhouette="#14161c" animate background="glow" glow="rgba(80,80,90,0.25)" />
              <div className="info">
                <div className="hud-player">THE LADDER</div>
                <h2 className="char-name display">4 + BOSS</h2>
                <div className="char-title">UNDERGROUND TOURNAMENT</div>
                <p style={{ fontSize: 13, color: '#a0a6b2', lineHeight: 1.5 }}>
                  Defeat four challengers, then face the master of the pit. Health is restored between fights.
                </p>
              </div>
            </div>
          ) : (
            <Preview def={def2} side="right" skin={def1.id === def2.id && skin1 === 'default' ? 'alt' : 'default'} label={mode === 'versus' ? 'PLAYER 2' : 'OPPONENT'} />
          )}
          {mode !== 'arcade' && <div className="vs-badge">VS</div>}
        </>
      )}

      {phase !== 'stage' && (
        <div className="select-grid">
          {roster.map((d, i) => {
            const isLocked = !unlocked(d.id);
            const p1 = i === c1;
            const p2 = mode !== 'arcade' && i === c2;
            return (
              <div
                key={d.id}
                className={`slot ${p1 ? 'p1' : ''} ${p2 ? 'p2' : ''} ${isLocked ? 'locked' : ''}`}
                onMouseEnter={() => {
                  if (isLocked) return;
                  if (phase === 'opponent') setC2(i);
                  else if (!lock1) setC1(i);
                }}
                onClick={() => {
                  if (isLocked) return;
                  if (phase === 'opponent') {
                    setC2(i);
                    setLock2(true);
                    setPhase('stage');
                  } else if (!lock1) {
                    setC1(i);
                    setLock1(true);
                    if (mode === 'arcade') finish({ ...state.current, c1: i, lock1: true });
                    else if (mode === 'training') setPhase('opponent');
                    else if (lock2) setPhase('stage');
                  } else if (mode === 'versus' && !lock2) {
                    setC2(i);
                    setLock2(true);
                    setPhase('stage');
                  }
                  services.audio.play('select');
                }}
              >
                {!isLocked && <PortraitCanvas def={d} width={104} height={128} focusY={135} zoom={1.25} state={FighterState.IDLE} />}
                {p1 && <span className="tag t1">{lock1 ? '✔ P1' : 'P1'}</span>}
                {p2 && <span className="tag t2">{lock2 ? '✔ ' : ''}{mode === 'versus' ? 'P2' : 'CPU'}</span>}
                <div className="slot-name">{isLocked ? '' : d.name.replace('The ', '').toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className="back-hint">
        <kbd>Esc</kbd> back
      </div>
    </div>
  );
}
