import { useEffect, useState } from 'react';
import { getCharacter } from '../../data/characters';
import { getStage } from '../../data/stages';
import type { MatchConfig } from '../../game/GameState';
import { useServices } from '../context';
import { PortraitCanvas } from '../components/PortraitCanvas';
import { renderStageFrame } from '../components/StageThumb';

const MIN_DURATION_MS = 1400;
const BAR_CELLS = 24;

interface Step {
  label: string;
  run: () => Promise<void> | void;
}

/** Loads (or procedurally builds) everything a fight needs, with graceful fallbacks. */
export function LoadingScreen({ config, onDone }: { config: MatchConfig; onDone: () => void }) {
  const services = useServices();
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('ASSETS');
  const p1 = getCharacter(config.p1);
  const p2 = getCharacter(config.p2);
  const stage = getStage(config.stage);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    const steps: Step[] = [
      { label: 'CHARACTER DATA', run: () => void [p1, p2].forEach((c) => c.specials.length) },
      { label: 'STAGE', run: () => void renderStageFrame(config.stage) },
      { label: 'AUDIO', run: () => services.audio.unlock() },
      {
        label: 'FONTS',
        run: () =>
          Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 800))]).then(() => undefined),
      },
      { label: 'ARENA', run: () => new Promise<void>((r) => setTimeout(r, 120)) },
    ];
    (async () => {
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;
        setLabel(steps[i].label);
        try {
          await steps[i].run();
        } catch (err) {
          console.error(`Loading step "${steps[i].label}" failed, continuing with fallback`, err);
        }
        setProgress((i + 1) / steps.length);
      }
      const wait = Math.max(0, MIN_DURATION_MS - (performance.now() - start));
      setTimeout(() => !cancelled && onDone(), wait);
    })();
    return () => {
      cancelled = true;
    };
  }, [config, onDone, p1, p2, services]);

  const filled = Math.round(progress * BAR_CELLS);
  return (
    <div className="screen loading">
      <div className="vs-row">
        <PortraitCanvas def={p1} width={260} height={300} focusY={120} zoom={1.7} skin={config.p1Skin} animate background="glow" />
        <div className="vs">VS</div>
        <PortraitCanvas def={p2} width={260} height={300} focusY={120} zoom={1.7} facing={-1} skin={config.p2Skin} animate background="glow" glow="rgba(120,130,150,0.3)" />
      </div>
      <h2 className="display">{config.isBoss ? 'THE THRONE AWAITS...' : 'LOADING ARENA...'}</h2>
      <div className="bar">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="ascii">{'█'.repeat(filled) + '░'.repeat(BAR_CELLS - filled)}</div>
      <div className="step">
        {stage.name.toUpperCase()} · {label}
      </div>
    </div>
  );
}
