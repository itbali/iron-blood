import { useEffect, useRef, useState } from 'react';
import { MenuBackground } from '../scenes/MenuBackground';
import { useServices, useSfx } from './services';

export type MenuAction = 'arcade' | 'versus' | 'training' | 'characters' | 'settings';

const ITEMS: { id: MenuAction; label: string }[] = [
  { id: 'arcade', label: 'Arcade' },
  { id: 'versus', label: 'Versus' },
  { id: 'training', label: 'Training' },
  { id: 'characters', label: 'Characters' },
  { id: 'settings', label: 'Settings' },
];

export function MainMenu({ onPick }: { onPick: (a: MenuAction) => void }): JSX.Element {
  const { audio } = useServices();
  const sfx = useSfx();
  const [sel, setSel] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const selRef = useRef(0);
  selRef.current = sel;

  useEffect(() => {
    audio.setTrack('menu');
    const cv = canvas.current;
    if (!cv) return;
    const bg = new MenuBackground(cv);
    bg.start();
    return () => bg.stop();
  }, [audio]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setSel((s) => (s + 1) % ITEMS.length);
        sfx.hover();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setSel((s) => (s + ITEMS.length - 1) % ITEMS.length);
        sfx.hover();
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        sfx.click();
        onPick(ITEMS[selRef.current].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPick]);

  return (
    <div className="screen menu">
      <canvas className="bg" ref={canvas} />
      <div className="menu-inner">
        <h1 className="logo">Iron Blood</h1>
        <div className="tagline">Enter the Arena</div>
        <div className="menu-list" role="menu">
          {ITEMS.map((it, i) => (
            <button
              key={it.id}
              role="menuitem"
              className={`menu-item ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => {
                if (sel !== i) sfx.hover();
                setSel(i);
              }}
              onClick={() => {
                sfx.click();
                onPick(it.id);
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
      <div className="menu-foot">
        <span>
          <b>A/D</b> Move · <b>W</b> Jump · <b>S</b> Crouch · <b>J/K</b> Punch · <b>L/;</b> Kick · <b>I/O</b> Special · <b>Space</b> Block · <b>E</b> Grab
        </span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
