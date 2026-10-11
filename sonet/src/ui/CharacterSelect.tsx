import { useEffect, useMemo, useRef, useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from '../ai/Difficulty';
import type { CharacterDef } from '../combat/types';
import { CHARACTERS, ROSTER_IDS, getCharacter } from '../data/characters';
import { STAGES, type StageId } from '../data/stages';
import type { FighterChoice } from '../game/FightConfig';
import { isSkinUnlocked } from '../progression/Progression';
import { Portrait } from './Portrait';
import { useProgress, useSettings, useSfx } from './services';

export interface Selection {
  p1: FighterChoice;
  p2?: FighterChoice;
  stage?: StageId;
  difficulty: Difficulty;
}

type Mode = 'arcade' | 'versus' | 'training';
type Step = 'p1' | 'p2' | 'stage';

const COLS = 3;

function Stat({ label, value, text }: { label: string; value: number; text?: string }): JSX.Element {
  return (
    <div className="statrow">
      <span className="l">{label}</span>
      <div className="bar"><i style={{ width: `${value * 10}%` }} /></div>
      <span className="v">{text ?? value}</span>
    </div>
  );
}

function Preview({ def, skin, tag, p2 }: { def: CharacterDef | null; skin: string; tag: string; p2?: boolean }): JSX.Element {
  return (
    <div className={`sel-preview ${p2 ? 'p2' : ''}`}>
      <div className="tag">{tag}</div>
      <div className="glow" />
      {def ? (
        <Portrait charId={def.id} skin={skin} width={300} height={370} zoom={1.05} facing={p2 ? -1 : 1} />
      ) : (
        <div style={{ height: 370, display: 'flex', alignItems: 'center', fontFamily: 'var(--font-display)', fontSize: 120, color: '#2a2e39' }}>?</div>
      )}
      <div className="info">
        <h3 className="cname">{def?.name ?? 'Unknown'}</h3>
        <div className="ctitle">{def?.title ?? 'Opponent revealed in the arena'}</div>
        {def && (
          <>
            <Stat label="Speed" value={def.stats.speed} />
            <Stat label="Damage" value={def.stats.damage} />
            <Stat label="Health" value={def.stats.health} />
            <Stat label="Level" value={{ Easy: 3, Medium: 5, Hard: 7, 'Very Hard': 9, Boss: 10 }[def.stats.difficulty] ?? 5} text={def.stats.difficulty} />
            <div className="hint" style={{ marginTop: 8 }}>{def.weapon}</div>
          </>
        )}
      </div>
    </div>
  );
}

export function CharacterSelect({ mode, onConfirm, onBack }: { mode: Mode; onConfirm: (s: Selection) => void; onBack: () => void }): JSX.Element {
  const sfx = useSfx();
  const [progress] = useProgress();
  const [settings] = useSettings();
  const roster = useMemo(() => {
    const ids: string[] = [...ROSTER_IDS];
    if (progress.unlockedCharacters.includes('archon')) ids.push('archon');
    return ids;
  }, [progress.unlockedCharacters]);

  const [step, setStep] = useState<Step>('p1');
  const [hover, setHover] = useState(0);
  const [p1, setP1] = useState<FighterChoice>({ charId: 'raven', skin: 'default' });
  const [p2, setP2] = useState<FighterChoice>({ charId: 'brute', skin: 'default' });
  const [stageIdx, setStageIdx] = useState(0);
  const initialDiff = settings.difficulty === 'nightmare' && !progress.nightmareUnlocked ? 'hard' : settings.difficulty;
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDiff);
  const [skinP1, setSkinP1] = useState('default');
  const [skinP2, setSkinP2] = useState('default');
  const state = useRef({ step, hover, roster, p1, p2, stageIdx, difficulty, skinP1, skinP2 });
  state.current = { step, hover, roster, p1, p2, stageIdx, difficulty, skinP1, skinP2 };

  const hoverDef = getCharacter(roster[hover] ?? 'raven');
  const p1Def = getCharacter(step === 'p1' ? hoverDef.id : p1.charId);
  const p2Def = step === 'p2' ? hoverDef : mode === 'arcade' ? null : getCharacter(p2.charId);

  const confirm = (): void => {
    const s = state.current;
    sfx.click();
    if (s.step === 'p1') {
      const choice = { charId: s.roster[s.hover], skin: s.skinP1 };
      setP1(choice);
      if (mode === 'arcade') {
        onConfirm({ p1: choice, difficulty: s.difficulty });
        return;
      }
      setStep('p2');
      setHover(Math.min(s.hover === 2 ? 0 : 2, s.roster.length - 1));
    } else if (s.step === 'p2') {
      setP2({ charId: s.roster[s.hover], skin: s.skinP2 });
      setStep('stage');
    } else {
      onConfirm({ p1: s.p1, p2: { ...s.p2 }, stage: STAGES[s.stageIdx].id, difficulty: s.difficulty });
    }
  };

  const back = (): void => {
    sfx.click();
    if (step === 'stage') setStep('p2');
    else if (step === 'p2') setStep('p1');
    else onBack();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const s = state.current;
      if (e.code === 'Escape' || e.code === 'Backspace') {
        back();
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        confirm();
        return;
      }
      const dir: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
      };
      const d = dir[e.code];
      if (!d) return;
      sfx.hover();
      if (s.step === 'stage') {
        setStageIdx((i) => (i + d[0] + STAGES.length) % STAGES.length);
        return;
      }
      setHover((h) => {
        const n = s.roster.length;
        let next = h + d[0] + d[1] * COLS;
        if (d[1] !== 0 && (next < 0 || next >= n)) next = h;
        if (d[0] !== 0) next = (h + d[0] + n) % n;
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const activeSkin = step === 'p2' ? skinP2 : skinP1;
  const setActiveSkin = step === 'p2' ? setSkinP2 : setSkinP1;
  const skinDef = hoverDef;

  const title = step === 'p1' ? (mode === 'arcade' ? 'Choose Your Fighter' : 'Player 1') : step === 'p2' ? (mode === 'training' ? 'Choose Dummy' : 'Player 2') : 'Select Arena';

  return (
    <div className="screen panel-screen">
      <h2 className="screen-title">Character Select <small>{title}</small></h2>
      <button className="btn small ghost back" onClick={back} onMouseEnter={sfx.hover}>Back</button>

      {step !== 'stage' ? (
        <div className="select">
          <Preview def={p1Def} skin={step === 'p1' ? skinP1 : skinP1} tag="PLAYER 1" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div className="grid">
              {roster.map((id, i) => {
                const def = CHARACTERS[id];
                const chosen = step === 'p2' && p1.charId === id;
                return (
                  <button
                    key={id}
                    className={`card ${i === hover ? 'sel' : ''} ${chosen ? 'p2sel' : ''}`}
                    onMouseEnter={() => { if (hover !== i) sfx.hover(); setHover(i); }}
                    onClick={() => { setHover(i); setTimeout(confirm, 0); state.current.hover = i; }}
                  >
                    {chosen && <span className="badge">P1</span>}
                    <Portrait charId={id} width={132} height={170} zoom={1} pulse={i === hover} />
                    <span className="nm">{def.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="opts">
              {skinDef.skins.map((sk) => {
                const unlocked = isSkinUnlocked(progress, skinDef, sk.id);
                return (
                  <button key={sk.id} className={`chip ${activeSkin === sk.id ? 'on' : ''} ${unlocked ? '' : 'locked'}`} title={unlocked ? sk.name : 'Complete Arcade to unlock'} onClick={() => { if (unlocked) { sfx.click(); setActiveSkin(sk.id); } }}>
                    {unlocked ? sk.name : `🔒 ${sk.name}`}
                  </button>
                );
              })}
            </div>
            {mode === 'arcade' && step === 'p1' && (
              <div className="opts">
                <span className="hint">Difficulty</span>
                {DIFFICULTIES.map((d) => {
                  const locked = d === 'nightmare' && !progress.nightmareUnlocked;
                  return (
                    <button key={d} className={`chip ${difficulty === d ? 'on' : ''} ${locked ? 'locked' : ''}`} title={locked ? 'Complete Arcade to unlock' : ''} onClick={() => { if (!locked) { sfx.click(); setDifficulty(d); } }}>
                      {locked ? '🔒 ' : ''}{DIFFICULTY_LABEL[d]}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="hint"><kbd>←↑↓→</kbd> Move · <kbd>Enter</kbd> Confirm · <kbd>Esc</kbd> Back</div>
          </div>
          <Preview def={p2Def} skin={skinP2} tag={mode === 'arcade' ? 'OPPONENT' : mode === 'training' ? 'DUMMY' : 'PLAYER 2'} p2 />
        </div>
      ) : (
        <>
          <div className="stages">
            {STAGES.map((st, i) => (
              <button key={st.id} className={`stage-card ${i === stageIdx ? 'sel' : ''}`} onMouseEnter={() => { if (stageIdx !== i) sfx.hover(); setStageIdx(i); }} onClick={() => { setStageIdx(i); state.current.stageIdx = i; confirm(); }}>
                <div style={{ position: 'absolute', inset: 0, background: stagePreview(st.id) }} />
                <div className="meta">
                  <h3>{st.name}</h3>
                  <p>{st.blurb}</p>
                  <div className="hint" style={{ textAlign: 'left', marginTop: 6, color: st.accent }}>{st.mood}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="hint"><kbd>←→</kbd> Choose · <kbd>Enter</kbd> Fight · <kbd>Esc</kbd> Back</div>
        </>
      )}
    </div>
  );
}

function stagePreview(id: StageId): string {
  switch (id) {
    case 'industrial':
      return 'linear-gradient(180deg, #08090c 0%, #2a0d12 55%, #5a1418 75%, #14161c 76%, #07080b 100%)';
    case 'station':
      return 'linear-gradient(180deg, #05090d 0%, #10303a 60%, #1c4752 74%, #0b1418 75%, #05090c 100%)';
    default:
      return 'radial-gradient(circle at 70% 25%, #f2b8a0 0 4%, transparent 5%), linear-gradient(180deg, #08040f 0%, #2a0f2a 60%, #4a1a26 74%, #140c1a 75%, #07050c 100%)';
  }
}
