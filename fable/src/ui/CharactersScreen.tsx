import { useEffect, useMemo, useState } from 'react';
import type { CharacterId } from '@/core/types';
import { BOSS_ID, CHARACTERS, ROSTER } from '@/data/characters';
import { useStore } from '@/state/store';
import { Portrait } from './Portrait';
import { progression, sfx } from './services';

/** Roster gallery: bios, stats, command lists and unlock status. */
export const CharactersScreen = ({ onBack }: { onBack: () => void }) => {
  const progress = useStore(progression.store);
  const list = useMemo<CharacterId[]>(() => [...ROSTER, BOSS_ID], []);
  const [selected, setSelected] = useState<CharacterId>('raven');
  const c = CHARACTERS[selected];
  const unlocked = progress.unlockedCharacters.includes(selected);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        sfx.back();
        onBack();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setSelected((s) => list[(list.indexOf(s) + 1) % list.length]!);
        sfx.hover();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setSelected((s) => list[(list.indexOf(s) - 1 + list.length) % list.length]!);
        sfx.hover();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack, list]);
  return (
    <div className="screen select-screen">
      <div className="top-bar">
        <h2 className="screen-title">
          <small>Roster</small>Characters
        </h2>
        <button className="btn ghost" onClick={() => { sfx.back(); onBack(); }}>
          ← Back
        </button>
      </div>
      <div className="chars-body">
        <div className="char-list">
          {list.map((id) => (
            <button key={id} className={`btn${selected === id ? ' active' : ''}`} onMouseEnter={() => { if (selected !== id) sfx.hover(); setSelected(id); }} onClick={() => setSelected(id)}>
              {CHARACTERS[id].name}
              {!progress.unlockedCharacters.includes(id) ? ' 🔒' : ''}
            </button>
          ))}
          <div className="stat-block">
            <div>Total wins: {progress.totalWins}</div>
            <div>Total losses: {progress.totalLosses}</div>
            <div>Highest combo: {progress.highestCombo}</div>
            <div>Perfect blocks: {progress.perfectBlocks}</div>
            <div>Finishers: {progress.finishers}</div>
            <div>Arcade clears: {progress.arcadeClears}</div>
            {progress.galleryUnlocked && <div style={{ color: '#ffd166' }}>Concept gallery unlocked</div>}
          </div>
        </div>
        <div className="fighter-card">
          <Portrait config={c} className="portrait-big" anim={unlocked ? 'introStand' : 'idle'} animate size={360} />
          <div className="fighter-name">{c.name}</div>
          <div className="fighter-title">{c.title}</div>
          <div className="fighter-desc">{unlocked || progress.galleryUnlocked ? c.description : 'Complete Arcade mode to reveal.'}</div>
          <div className="stat-rows">
            {(['speed', 'damage', 'health'] as const).map((k) => (
              <div className="stat-row" key={k}>
                <span>{k}</span>
                <div className="stat-bar">
                  <i style={{ width: `${c.stats[k] * 10}%` }} />
                </div>
              </div>
            ))}
            <div className="stat-row">
              <span>Difficulty</span>
              <span style={{ color: '#e7e7e7', letterSpacing: '0.2em' }}>{c.stats.difficulty}</span>
            </div>
            <div className="stat-row">
              <span>Health</span>
              <span style={{ color: '#e7e7e7', letterSpacing: '0.2em' }}>{c.maxHealth} HP</span>
            </div>
          </div>
        </div>
        <div className="command-list">
          <div className="hud-player" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.3em', fontSize: 11, color: 'var(--c-red)', marginBottom: 8 }}>
            COMMAND LIST
          </div>
          {c.commandList.map((cmd) => (
            <div className="command-row" key={cmd.name}>
              <div>
                <b>{cmd.name}</b>
                <small>{cmd.description}</small>
              </div>
              <kbd>{cmd.input}</kbd>
            </div>
          ))}
          <div className="command-row">
            <div>
              <b>Finisher: {c.finisher.name}</b>
              <small>After the final KO, move close and press SPECIAL</small>
            </div>
            <kbd>{c.finisher.type}</kbd>
          </div>
          {progress.galleryUnlocked && (
            <div className="command-row" style={{ borderLeftColor: '#ffd166' }}>
              <div>
                <b>Concept notes</b>
                <small>
                  {c.name} — faction palette {c.palette.accent}, silhouette height {c.body.height} units, head style {c.body.headStyle}. Lines: “{c.lines.intro[0]}”
                </small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
