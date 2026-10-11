import { useEffect, useState } from 'react';
import { useServices } from './services';

interface Props {
  label?: string;
  progress?: number;
  waitForKey?: boolean;
  onDone?: () => void;
}

export function LoadingScreen({ label = 'LOADING ARENA...', progress, waitForKey, onDone }: Props): JSX.Element {
  const { audio } = useServices();
  const [ready, setReady] = useState(false);
  const pct = Math.round((progress ?? 0) * 100);

  useEffect(() => {
    if (!waitForKey || progress === undefined || progress < 1) return;
    setReady(true);
    const go = (): void => {
      audio.unlock();
      onDone?.();
    };
    window.addEventListener('keydown', go, { once: true });
    window.addEventListener('pointerdown', go, { once: true });
    return () => {
      window.removeEventListener('keydown', go);
      window.removeEventListener('pointerdown', go);
    };
  }, [waitForKey, progress, audio, onDone]);

  return (
    <div className="screen loading">
      <div className="title display">IRON BLOOD</div>
      <div className="label">{ready ? 'SYSTEMS ONLINE' : label}</div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%` }} />
      </div>
      {ready ? <div className="press-key">PRESS ANY KEY</div> : <div className="label">{pct}%</div>}
    </div>
  );
}
