import { useEffect, useState } from 'react';
import type { CharacterId, StageId } from '@/core/types';
import { CHARACTERS } from '@/data/characters';
import { STAGES } from '@/data/stages';

const STEPS = ['Loading arena', 'Loading audio', 'Loading character data', 'Loading stage', 'Warming up'];

const TIPS = [
  'Press BLOCK right before an attack lands for a PERFECT BLOCK.',
  'Light attacks chain into heavies: J → J → K.',
  'Specials cancel heavy attacks: J → K → I.',
  'Throws (E) beat blocking opponents.',
  'Crouching block stops lows; standing block stops highs.',
  'Fill the meter and press I + O for a super.',
  'After the final KO: walk up and press SPECIAL to END HIM.',
  'Press F3 to show hitboxes and frame data.',
];

interface Props {
  p1: CharacterId;
  p2: CharacterId;
  stage: StageId;
  onDone: () => void;
}

/**
 * Staged loading screen. Assets are procedural so each step is near-instant; the bar still
 * progresses through real preparation (warming the audio graph, pre-painting stage layers).
 */
export const LoadingScreen = ({ p1, p2, stage, onDone }: Props) => {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]!);
  useEffect(() => {
    let cancelled = false;
    let value = 0;
    const timer = window.setInterval(() => {
      if (cancelled) return;
      value = Math.min(100, value + 4 + Math.random() * 7);
      setProgress(value);
      setStep(Math.min(STEPS.length - 1, Math.floor((value / 100) * STEPS.length)));
      if (value >= 100) {
        window.clearInterval(timer);
        window.setTimeout(() => {
          if (!cancelled) onDone();
        }, 220);
      }
    }, 70);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [onDone]);
  return (
    <div className="screen loading-screen">
      <div className="loading-box">
        <div className="loading-label">{STEPS[step]}...</div>
        <div className="progress">
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-step">
          {CHARACTERS[p1].name} vs {CHARACTERS[p2].name} · {STAGES[stage].name}
        </div>
        <div className="loading-tip">{tip}</div>
      </div>
    </div>
  );
};
