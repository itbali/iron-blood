import { useEffect, useState } from 'react';
import type { DummyMode } from '../ai/AIController';
import type { TrainingScene } from '../scenes/TrainingScene';
import { useSfx } from './services';

const DUMMIES: { id: DummyMode; label: string }[] = [
  { id: 'stand', label: 'Stand' },
  { id: 'crouch', label: 'Crouch' },
  { id: 'block', label: 'Block' },
  { id: 'jump', label: 'Jump' },
  { id: 'ai', label: 'AI' },
];

export function TrainingPanel({ scene }: { scene: TrainingScene }): JSX.Element {
  const sfx = useSfx();
  const [st, setSt] = useState({ ...scene.state });
  const [text, setText] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      setText(scene.info());
      setSt({ ...scene.state });
    }, 120);
    return () => clearInterval(id);
  }, [scene]);

  const toggle = (key: 'infiniteHealth' | 'infiniteMeter' | 'hitboxes' | 'frameData'): void => {
    sfx.click();
    scene.set({ [key]: !scene.state[key] });
  };
  const row = (label: string, key: 'infiniteHealth' | 'infiniteMeter' | 'hitboxes' | 'frameData'): JSX.Element => (
    <div className="trow">
      <span>{label}</span>
      <button className={`toggle ${st[key] ? 'on' : ''}`} onClick={() => toggle(key)} aria-pressed={st[key]}><i /></button>
    </div>
  );

  return (
    <div className="training">
      <h3>TRAINING</h3>
      {row('Infinite Health', 'infiniteHealth')}
      {row('Infinite Meter', 'infiniteMeter')}
      {row('Hitboxes (F3)', 'hitboxes')}
      {row('Frame Data', 'frameData')}
      <div>
        <div style={{ marginBottom: 4 }}>Dummy</div>
        <div className="seg">
          {DUMMIES.map((d) => (
            <button key={d.id} className={`chip ${st.dummy === d.id ? 'on' : ''}`} onClick={() => { sfx.click(); scene.set({ dummy: d.id }); }}>{d.label}</button>
          ))}
        </div>
      </div>
      <button className="btn small" onClick={() => { sfx.click(); scene.resetPosition(); }}>Reset Position</button>
      <div className="data">{text}</div>
    </div>
  );
}
