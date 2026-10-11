import { useState } from 'react';
import { SettingsPanel } from './Settings';
import { useSfx } from './services';

interface Props {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PauseMenu({ onResume, onRestart, onExit }: Props): JSX.Element {
  const sfx = useSfx();
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const btn = (label: string, fn: () => void): JSX.Element => (
    <button className="btn" onMouseEnter={sfx.hover} onClick={() => { sfx.click(); fn(); }}>{label}</button>
  );
  if (view === 'settings') {
    return (
      <div className="overlay">
        <div className="settings-wrap">
          <SettingsPanel onBack={() => setView('menu')} />
        </div>
      </div>
    );
  }
  return (
    <div className="overlay">
      <div className="pause-box">
        <h1>PAUSED</h1>
        {btn('Resume', onResume)}
        {btn('Restart', onRestart)}
        {btn('Settings', () => setView('settings'))}
        {btn('Exit', onExit)}
        <div className="hint" style={{ marginTop: 10 }}>Simulation halted · <kbd>Esc</kbd> to resume</div>
      </div>
    </div>
  );
}
