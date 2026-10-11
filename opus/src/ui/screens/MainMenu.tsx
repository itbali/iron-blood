import { useServices } from '../context';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { useMenuNav } from '../components/useMenuNav';

export type MainMenuChoice = 'arcade' | 'versus' | 'training' | 'characters' | 'settings';

const ITEMS: { id: MainMenuChoice; label: string; sub: string }[] = [
  { id: 'arcade', label: 'ARCADE', sub: 'Climb the ladder' },
  { id: 'versus', label: 'VERSUS', sub: '2 players, 1 keyboard' },
  { id: 'training', label: 'TRAINING', sub: 'Frame data & combos' },
  { id: 'characters', label: 'CHARACTERS', sub: 'Bios & move lists' },
  { id: 'settings', label: 'SETTINGS', sub: 'Video, audio, keys' },
];

export const GAME_VERSION = 'v1.0.0';

export function MainMenu({ onChoose }: { onChoose: (c: MainMenuChoice) => void }) {
  const services = useServices();
  const [index, setIndex] = useMenuNav({ count: ITEMS.length, onSelect: (i) => onChoose(ITEMS[i].id) });
  return (
    <div className="screen menu-root">
      <MenuBackdrop />
      <div className="logo-wrap">
        <h1 className="logo">
          IRON <span className="blood">BLOOD</span>
        </h1>
        <div className="tagline">ENTER THE ARENA</div>
      </div>
      <nav className="main-menu" aria-label="Main menu">
        {ITEMS.map((it, i) => (
          <button
            key={it.id}
            className={`menu-item ${i === index ? 'active' : ''}`}
            style={{ animationDelay: `${300 + i * 60}ms` }}
            onMouseEnter={() => {
              if (i !== index) services.audio.play('hover');
              setIndex(i);
            }}
            onClick={() => {
              services.audio.play('click');
              onChoose(it.id);
            }}
          >
            <span>{it.label}</span>
            <span className="sub">{it.sub}</span>
          </button>
        ))}
      </nav>
      <div className="hint-bar">
        <span>
          <kbd>W</kbd>
          <kbd>S</kbd>navigate
        </span>
        <span>
          <kbd>Enter</kbd>
          <kbd>J</kbd>select
        </span>
        <span>
          Fight: <kbd>A</kbd>
          <kbd>D</kbd>move <kbd>W</kbd>jump <kbd>J</kbd>
          <kbd>K</kbd>
          <kbd>L</kbd>
          <kbd>;</kbd>attack <kbd>I</kbd>
          <kbd>O</kbd>special <kbd>Space</kbd>block
        </span>
      </div>
      <div className="corner-info left">IRON BLOOD {GAME_VERSION} · original fighting game</div>
      <div className="corner-info right">F3 debug · Esc pause</div>
    </div>
  );
}
