import { useCallback, useRef } from 'react';
import type { MatchResult } from '@/game/GameState';
import { CHARACTERS } from '@/data/characters';
import type { CharacterId, GameMode } from '@/core/types';
import { Portrait } from './Portrait';
import { sfx } from './services';
import { useMenuNavigation } from './useMenuNavigation';

interface Props {
  mode: GameMode;
  result: MatchResult;
  p1: CharacterId;
  p2: CharacterId;
  nextOpponent: CharacterId | null;
  ladder: { total: number; index: number } | null;
  onContinue: () => void;
  onRetry: () => void;
  onRematch: () => void;
  onSelect: () => void;
  onMenu: () => void;
}

const fmtTime = (frames: number) => {
  const s = Math.round(frames / 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Post-match overlay: victory stats + next opponent (arcade), rematch (versus), retry on defeat. */
export const ResultOverlay = (p: Props) => {
  const won = p.result.winner === 0;
  const draw = p.result.winner === null;
  const items: { label: string; fn: () => void }[] = [];
  if (p.mode === 'arcade') {
    if (won && p.nextOpponent) items.push({ label: 'Next opponent', fn: p.onContinue });
    else if (won) items.push({ label: 'Continue', fn: p.onContinue });
    else items.push({ label: 'Retry', fn: p.onRetry });
  } else {
    items.push({ label: 'Rematch', fn: p.onRematch });
    items.push({ label: 'Character select', fn: p.onSelect });
  }
  items.push({ label: 'Main menu', fn: p.onMenu });
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const select = useCallback((i: number) => {
    sfx.click();
    itemsRef.current[i]?.fn();
  }, []);
  const [index, setIndex] = useMenuNavigation({ count: items.length, onSelect: select });
  const winnerName = p.result.winner === null ? '' : CHARACTERS[p.result.winner === 0 ? p.p1 : p.p2].name.toUpperCase();
  const title = draw ? 'DRAW' : p.mode === 'versus' ? `${winnerName} WINS` : won ? `${winnerName} WINS` : 'DEFEATED';
  return (
    <div className="overlay">
      <div className="panel">
        <div className={`display result-title${!won && p.mode !== 'versus' ? ' lose' : ''}`}>{title}</div>
        {p.ladder && (
          <div className="ladder">
            {Array.from({ length: p.ladder.total }, (_, i) => (
              <i key={i} className={i < p.ladder!.index ? 'done' : i === p.ladder!.index ? 'current' : ''} />
            ))}
          </div>
        )}
        <dl className="result-stats">
          <div>
            <dt>Time</dt>
            <dd>{fmtTime(p.result.durationFrames)}</dd>
          </div>
          <div>
            <dt>Rounds</dt>
            <dd>{p.result.rounds.filter((r) => r === 0).length} – {p.result.rounds.filter((r) => r === 1).length}</dd>
          </div>
          <div>
            <dt>Max combo</dt>
            <dd>{p.result.maxCombo}</dd>
          </div>
          <div>
            <dt>Damage dealt</dt>
            <dd>{p.result.damageDealt}</dd>
          </div>
        </dl>
        {p.mode === 'arcade' && won && p.nextOpponent && (
          <div className="next-opp">
            <Portrait config={CHARACTERS[p.nextOpponent]} size={90} />
            <div style={{ textAlign: 'left' }}>
              <div className="hud-player" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.3em', fontSize: 11, color: 'var(--c-muted)' }}>
                NEXT OPPONENT
              </div>
              <div className="display" style={{ fontSize: 28, color: p.nextOpponent === 'archon' ? '#ff6a3d' : '#fff' }}>
                {CHARACTERS[p.nextOpponent].name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>{CHARACTERS[p.nextOpponent].title}</div>
            </div>
          </div>
        )}
        {p.result.finisherUsed && won && <div className="super-ready" style={{ marginTop: 10 }}>EXECUTED</div>}
        <ul className="menu-list">
          {items.map((it, i) => (
            <li key={it.label}>
              <button className={`menu-item${index === i ? ' active' : ''}`} onMouseEnter={() => setIndex(i)} onClick={() => select(i)}>
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
