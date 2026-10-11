import type { ReactNode } from 'react';
import type { CharacterDef } from '../../characters/CharacterDef';
import { FighterState } from '../../characters/FighterState';
import { useServices } from '../context';
import { PortraitCanvas } from '../components/PortraitCanvas';
import { useMenuNav } from '../components/useMenuNav';

export interface ResultAction {
  label: string;
  run: () => void;
}

export interface ResultProps {
  title: string;
  lose?: boolean;
  kicker?: string;
  quote?: string;
  portrait: CharacterDef;
  skin?: 'default' | 'alt';
  stats: { label: string; value: string | number }[];
  children?: ReactNode;
  actions: ResultAction[];
}

export function ResultScreen(p: ResultProps) {
  const services = useServices();
  const [index, setIndex] = useMenuNav({ count: p.actions.length, onSelect: (i) => p.actions[i].run(), horizontal: true });
  return (
    <div className="screen result">
      <div className="portrait">
        <PortraitCanvas
          def={p.portrait}
          width={520}
          height={640}
          focusY={115}
          zoom={2.15}
          skin={p.skin}
          animate
          background="glow"
          state={p.lose ? FighterState.DEAD : FighterState.VICTORY}
          silhouette={p.lose ? '#1a1c22' : undefined}
        />
      </div>
      <div className="content">
        {p.kicker && <div className="char-title">{p.kicker}</div>}
        <h1 className={`display ${p.lose ? 'lose' : ''}`}>{p.title}</h1>
        {p.quote && <div className="quote">“{p.quote}”</div>}
        <div className="stats">
          {p.stats.map((s, i) => (
            <div className="stat" key={s.label} style={{ animationDelay: `${200 + i * 80}ms` }}>
              <span>{s.label}</span>
              <b>{s.value}</b>
            </div>
          ))}
        </div>
        {p.children}
        <div className="row-buttons">
          {p.actions.map((a, i) => (
            <button
              key={a.label}
              className={`btn ${i === index ? 'active' : ''}`}
              onMouseEnter={() => {
                if (i !== index) services.audio.play('hover');
                setIndex(i);
              }}
              onClick={() => {
                services.audio.play('click');
                a.run();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: '#6b717c' }}>
          <kbd>A</kbd>
          <kbd>D</kbd> choose · <kbd>Enter</kbd> confirm
        </div>
      </div>
    </div>
  );
}

export const formatTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
