import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../core/constants';

/** Renders children in a fixed 1280×720 stage scaled to fit the window (letterboxed, 16:9). */
export function ScaledStage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / VIEW_WIDTH, window.innerHeight / VIEW_HEIGHT));
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
    };
  }, []);
  return (
    <div className="viewport">
      <div className="stage" style={{ width: VIEW_WIDTH, height: VIEW_HEIGHT, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
