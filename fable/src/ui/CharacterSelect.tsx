import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CharacterId, Difficulty, GameMode, StageId } from '@/core/types';
import { DIFFICULTIES } from '@/core/types';
import { CHARACTERS, ROSTER, BOSS_ID } from '@/data/characters';
import { STAGES, STAGE_ORDER } from '@/data/stages';
import { useStore } from '@/state/store';
import { Portrait } from './Portrait';
import { progression, sfx } from './services';
import type { SkinId } from '@/game/GameState';

interface Props {
  mode: GameMode;
  initial: { p1: CharacterId; p2: CharacterId; stage: StageId; difficulty: Difficulty; skin: SkinId };
  onConfirm: (sel: { p1: CharacterId; p2: CharacterId; stage: StageId; difficulty: Difficulty; skin: SkinId }) => void;
  onBack: () => void;
}

const StatRow = ({ label, value }: { label: string; value: number }) => (
  <div className="stat-row">
    <span>{label}</span>
    <div className="stat-bar">
      <i style={{ width: `${value * 10}%` }} />
    </div>
  </div>
);

/**
 * Character select: P1 picks with WASD + J, P2 (versus) with arrows + Numpad 1.
 * Arcade/Training pick the opponent automatically / via the second cursor.
 */
export const CharacterSelect = ({ mode, initial, onConfirm, onBack }: Props) => {
  const progress = useStore(progression.store);
  const roster = useMemo<CharacterId[]>(() => (progress.unlockedCharacters.includes(BOSS_ID) ? [...ROSTER, BOSS_ID] : [...ROSTER]), [progress.unlockedCharacters]);
  const [cursor1, setCursor1] = useState(Math.max(0, roster.indexOf(initial.p1)));
  const [cursor2, setCursor2] = useState(Math.max(0, roster.indexOf(initial.p2)));
  const [locked1, setLocked1] = useState(false);
  const [locked2, setLocked2] = useState(false);
  const [stage, setStage] = useState<StageId>(initial.stage);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);
  const [skin, setSkin] = useState<SkinId>(initial.skin);
  const cols = 3;
  const needsP2 = mode !== 'arcade';
  const p1 = roster[cursor1]!;
  const p2 = roster[cursor2]!;
  const unlockedDifficulties = progress.unlockedDifficulties;
  const skinUnlocked = progress.unlockedSkins.includes(`${p1}:crimson`);
  const activeSkin: SkinId = skinUnlocked ? skin : 'default';

  const confirm = useCallback(() => {
    sfx.select();
    onConfirm({ p1, p2, stage, difficulty, skin: activeSkin });
  }, [onConfirm, p1, p2, stage, difficulty, activeSkin]);

  useEffect(() => {
    if (locked1 && (!needsP2 || locked2)) {
      const t = window.setTimeout(confirm, 420);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [locked1, locked2, needsP2, confirm]);

  useEffect(() => {
    const move = (set: (f: (i: number) => number) => void, dx: number, dy: number) => {
      set((i) => {
        const n = roster.length;
        let next = i + dx + dy * cols;
        if (dx !== 0 && Math.floor(next / cols) !== Math.floor(i / cols)) next = i - dx * (cols - 1);
        if (next < 0) next = (next + n) % n;
        if (next >= n) next = next % n;
        sfx.hover();
        return Math.max(0, Math.min(n - 1, next));
      });
    };
    const onKey = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA':
          if (!locked1) move(setCursor1, -1, 0);
          break;
        case 'KeyD':
          if (!locked1) move(setCursor1, 1, 0);
          break;
        case 'KeyW':
          if (!locked1) move(setCursor1, 0, -1);
          break;
        case 'KeyS':
          if (!locked1) move(setCursor1, 0, 1);
          break;
        case 'KeyJ':
        case 'Enter':
        case 'Space':
          e.preventDefault();
          if (!locked1) {
            sfx.select();
            setLocked1(true);
          } else if (needsP2 && !locked2 && mode !== 'versus') {
            sfx.select();
            setLocked2(true);
          }
          break;
        case 'ArrowLeft':
          if (needsP2 && !locked2) move(setCursor2, -1, 0);
          break;
        case 'ArrowRight':
          if (needsP2 && !locked2) move(setCursor2, 1, 0);
          break;
        case 'ArrowUp':
          if (needsP2 && !locked2) move(setCursor2, 0, -1);
          break;
        case 'ArrowDown':
          if (needsP2 && !locked2) move(setCursor2, 0, 1);
          break;
        case 'Numpad1':
        case 'NumpadEnter':
          if (needsP2 && !locked2) {
            sfx.select();
            setLocked2(true);
          }
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (locked2) setLocked2(false);
          else if (locked1) setLocked1(false);
          else {
            sfx.back();
            onBack();
          }
          break;
        case 'KeyQ':
          setStage((s) => STAGE_ORDER[(STAGE_ORDER.indexOf(s) + 1) % STAGE_ORDER.length]!);
          sfx.hover();
          break;
        case 'KeyZ':
          setSkin((s) => (s === 'default' ? 'crimson' : 'default'));
          sfx.hover();
          break;
        case 'KeyE':
          if (mode !== 'versus') {
            setDifficulty((d) => {
              const list = DIFFICULTIES.filter((x) => unlockedDifficulties.includes(x));
              return list[(list.indexOf(d) + 1) % list.length] ?? d;
            });
            sfx.hover();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roster, locked1, locked2, needsP2, mode, onBack, unlockedDifficulties]);

  const c1 = CHARACTERS[p1];
  const c2 = CHARACTERS[p2];

  return (
    <div className="screen select-screen">
      <div className="top-bar">
        <h2 className="screen-title">
          <small>{mode === 'arcade' ? 'Arcade' : mode === 'versus' ? 'Versus' : 'Training'}</small>Choose your fighter
        </h2>
        <button className="btn ghost" onClick={() => { sfx.back(); onBack(); }}>
          ← Back
        </button>
      </div>
      <div className="select-body">
        <div className="fighter-card p1">
          <Portrait config={c1} className="portrait-big" anim={locked1 ? 'victory' : 'introStand'} t={locked1 ? 1 : 0} animate={!locked1} size={320} palette={activeSkin === 'crimson' ? c1.altPalette : c1.palette} />
          <div className="fighter-name">{c1.name}</div>
          <div className="fighter-title">{c1.title}</div>
          <div className="fighter-desc">{c1.description}</div>
          <div className="stat-rows">
            <StatRow label="Speed" value={c1.stats.speed} />
            <StatRow label="Damage" value={c1.stats.damage} />
            <StatRow label="Health" value={c1.stats.health} />
          </div>
          {skinUnlocked && (
            <div className="option-group" style={{ marginTop: 8 }}>
              <span>Skin (Z)</span>
              {(['default', 'crimson'] as SkinId[]).map((s) => (
                <button key={s} className={`btn${activeSkin === s ? ' active' : ''}`} onClick={() => { setSkin(s); sfx.hover(); }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="roster">
          <div className="vs-badge">VS</div>
          <div className="roster-grid">
            {roster.map((id, i) => {
              const c = CHARACTERS[id];
              const h1 = cursor1 === i;
              const h2 = needsP2 && cursor2 === i;
              return (
                <button
                  key={id}
                  className={`roster-cell${h1 ? ' hover1' : ''}${h2 ? ' hover2' : ''}`}
                  onMouseEnter={() => {
                    if (!locked1) {
                      setCursor1(i);
                      sfx.hover();
                    }
                  }}
                  onClick={() => {
                    if (!locked1) {
                      setCursor1(i);
                      setLocked1(true);
                      sfx.select();
                    } else if (needsP2 && !locked2) {
                      setCursor2(i);
                      setLocked2(true);
                      sfx.select();
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (needsP2 && !locked2) {
                      setCursor2(i);
                      sfx.hover();
                    }
                  }}
                  title={c.name}
                >
                  <Portrait config={c} size={140} glow={h1 || h2} />
                  {h1 && <span className="tag p1">P1</span>}
                  {h2 && <span className="tag p2">{mode === 'versus' ? 'P2' : 'CPU'}</span>}
                  <span className="cell-name">{c.name}</span>
                </button>
              );
            })}
          </div>
          <div className="select-options">
            <div className="option-group">
              <span>Stage</span>
              {STAGE_ORDER.map((s) => (
                <button key={s} className={`btn${stage === s ? ' active' : ''}`} onClick={() => { setStage(s); sfx.hover(); }}>
                  {STAGES[s].name.split(' ')[0]}
                </button>
              ))}
            </div>
            {mode !== 'versus' && (
              <div className="option-group">
                <span>Difficulty</span>
                {DIFFICULTIES.map((d) => (
                  <button key={d} className={`btn${difficulty === d ? ' active' : ''}`} disabled={!unlockedDifficulties.includes(d)} onClick={() => { setDifficulty(d); sfx.hover(); }}>
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="fighter-card p2">
          {needsP2 ? (
            <>
              <Portrait config={c2} className="portrait-big" anim={locked2 ? 'victory' : 'introStand'} t={locked2 ? 1 : 0} animate={!locked2} size={320} />
              <div className="fighter-name">{c2.name}</div>
              <div className="fighter-title">{c2.title}</div>
              <div className="fighter-desc">{c2.description}</div>
              <div className="stat-rows">
                <StatRow label="Speed" value={c2.stats.speed} />
                <StatRow label="Damage" value={c2.stats.damage} />
                <StatRow label="Health" value={c2.stats.health} />
              </div>
            </>
          ) : (
            <>
              <div className="fighter-name" style={{ color: '#5b606b' }}>?</div>
              <div className="fighter-title">Opponents chosen by the tournament</div>
              <div className="fighter-desc">Four challengers, then The Archon. Win best-of-three matches to advance.</div>
            </>
          )}
        </div>
      </div>
      <div className="select-footer">
        <span>P1: WASD move · J confirm{needsP2 ? ' · P2: Arrows move · Numpad 1 confirm' : ''} · Q stage{mode !== 'versus' ? ' · E difficulty' : ''} · Esc back</span>
        <span>
          {locked1 && (!needsP2 || locked2) ? (
            <b style={{ color: '#ffd166' }}>READY</b>
          ) : (
            <button className="btn primary" onClick={() => { setLocked1(true); if (needsP2) setLocked2(true); }}>
              Fight
            </button>
          )}
        </span>
      </div>
    </div>
  );
};
