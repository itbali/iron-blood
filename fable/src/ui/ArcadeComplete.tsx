import { useCallback } from 'react';
import type { CharacterId } from '@/core/types';
import { CHARACTERS } from '@/data/characters';
import type { ArcadeRewards } from '@/progression/Progression';
import { MenuBackground } from './MenuBackground';
import { Portrait } from './Portrait';
import { sfx } from './services';
import { useMenuNavigation } from './useMenuNavigation';

interface Props {
  character: CharacterId;
  stats: { wins: number; maxCombo: number; damage: number; frames: number };
  rewards: ArcadeRewards | null;
  onMenu: () => void;
  onAgain: () => void;
}

const fmtTime = (frames: number) => {
  const s = Math.round(frames / 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Ending screen after the boss falls: stats, unlocks and the character's closing line. */
export const ArcadeComplete = ({ character, stats, rewards, onMenu, onAgain }: Props) => {
  const c = CHARACTERS[character];
  const select = useCallback(
    (i: number) => {
      sfx.click();
      (i === 0 ? onAgain : onMenu)();
    },
    [onAgain, onMenu],
  );
  const [index, setIndex] = useMenuNavigation({ count: 2, onSelect: select });
  return (
    <div className="screen menu-screen">
      <MenuBackground reducedMotion={false} />
      <div className="menu-content">
        <div className="display" style={{ fontSize: 'clamp(14px, 2vh, 20px)', letterSpacing: '0.5em', color: 'var(--c-red)' }}>
          Arcade complete
        </div>
        <div className="display result-title" style={{ marginTop: 10 }}>
          {c.name} wins
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Portrait config={c} anim="victory" t={1} size={200} />
          <dl className="result-stats" style={{ margin: 0 }}>
            <div>
              <dt>Time</dt>
              <dd>{fmtTime(stats.frames)}</dd>
            </div>
            <div>
              <dt>Wins</dt>
              <dd>{stats.wins}</dd>
            </div>
            <div>
              <dt>Max combo</dt>
              <dd>{stats.maxCombo}</dd>
            </div>
            <div>
              <dt>Damage dealt</dt>
              <dd>{stats.damage}</dd>
            </div>
          </dl>
        </div>
        <div className="dialogue" style={{ position: 'static', transform: 'none', marginTop: 16 }}>
          <b>{c.name.toUpperCase()}</b>
          {c.lines.victory[0]}
        </div>
        {rewards && (rewards.newCharacters.length > 0 || rewards.newSkins.length > 0 || rewards.newDifficulty || rewards.gallery) && (
          <div style={{ marginTop: 14, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ffd166' }}>
            Unlocked:{' '}
            {[
              ...rewards.newCharacters.map((id) => `${CHARACTERS[id].name} (playable)`),
              ...rewards.newSkins.map((s) => `${s.split(':')[1]} skin`),
              rewards.newDifficulty ? `${rewards.newDifficulty} difficulty` : '',
              rewards.gallery ? 'concept gallery' : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
        <ul className="menu-list">
          {['Play again', 'Main menu'].map((label, i) => (
            <li key={label}>
              <button className={`menu-item${index === i ? ' active' : ''}`} onMouseEnter={() => setIndex(i)} onClick={() => select(i)}>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
