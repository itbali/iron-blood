import { useCallback } from 'react';
import { GAME_VERSION } from '@/core/constants';
import { useStore } from '@/state/store';
import { MenuBackground } from './MenuBackground';
import { sfx, settingsStore } from './services';
import { useMenuNavigation } from './useMenuNavigation';

export type MenuAction = 'arcade' | 'versus' | 'training' | 'characters' | 'settings';

const ITEMS: { id: MenuAction; label: string }[] = [
  { id: 'arcade', label: 'Arcade' },
  { id: 'versus', label: 'Versus' },
  { id: 'training', label: 'Training' },
  { id: 'characters', label: 'Characters' },
  { id: 'settings', label: 'Settings' },
];

export const MainMenu = ({ onAction }: { onAction: (a: MenuAction) => void }) => {
  const settings = useStore(settingsStore);
  const select = useCallback(
    (i: number) => {
      sfx.click();
      onAction(ITEMS[i]!.id);
    },
    [onAction],
  );
  const [index, setIndex] = useMenuNavigation({ count: ITEMS.length, onSelect: select });
  return (
    <div className="screen menu-screen">
      <MenuBackground reducedMotion={settings.accessibility.reducedMotion} />
      <div className="menu-content">
        <h1 className="logo">
          Iron <span>Blood</span>
        </h1>
        <div className="tagline">Enter the arena</div>
        <ul className="menu-list">
          {ITEMS.map((item, i) => (
            <li key={item.id}>
              <button
                className={`menu-item${i === index ? ' active' : ''}`}
                onMouseEnter={() => {
                  if (index !== i) sfx.hover();
                  setIndex(i);
                }}
                onClick={() => select(i)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="menu-foot">
        <span>
          <kbd>W</kbd>
          <kbd>S</kbd> navigate · <kbd>Enter</kbd> select · <kbd>A</kbd>
          <kbd>D</kbd> move · <kbd>J</kbd>
          <kbd>K</kbd>
          <kbd>L</kbd>
          <kbd>;</kbd> attack · <kbd>I</kbd>
          <kbd>O</kbd> special · <kbd>Space</kbd> block · <kbd>E</kbd> grab
        </span>
        <span>v{GAME_VERSION}</span>
      </div>
    </div>
  );
};
