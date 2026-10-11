import { useCallback } from 'react';
import { sfx } from './services';
import { useMenuNavigation } from './useMenuNavigation';

interface Props {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onExit: () => void;
}

const ITEMS = ['Resume', 'Restart', 'Settings', 'Exit to menu'];

export const PauseMenu = ({ onResume, onRestart, onSettings, onExit }: Props) => {
  const select = useCallback(
    (i: number) => {
      sfx.click();
      [onResume, onRestart, onSettings, onExit][i]?.();
    },
    [onResume, onRestart, onSettings, onExit],
  );
  const [index, setIndex] = useMenuNavigation({ count: ITEMS.length, onSelect: select, onBack: onResume });
  return (
    <div className="overlay">
      <div className="panel">
        <div className="display" style={{ fontSize: 'clamp(32px, 7vh, 72px)' }}>
          Paused
        </div>
        <ul className="menu-list">
          {ITEMS.map((label, i) => (
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
