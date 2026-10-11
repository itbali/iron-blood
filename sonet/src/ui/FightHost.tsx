import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FightConfig, FightResult } from '../game/FightConfig';
import { FightScene, type SceneHost } from '../scenes/FightScene';
import { TrainingScene } from '../scenes/TrainingScene';
import { HudController } from './HudController';
import { HUD } from './HUD';
import { LoadingScreen } from './Loading';
import { PauseMenu } from './PauseMenu';
import { useServices, useSettings } from './services';
import { TouchControls } from './TouchControls';
import { TrainingPanel } from './TrainingPanel';

interface Props {
  cfg: FightConfig;
  onEnd: (r: FightResult) => void;
  onExit: () => void;
}

const LOGICAL_W = 1280;
const LOGICAL_H = 720;

export function FightHost({ cfg, onEnd, onExit }: Props): JSX.Element {
  const services = useServices();
  const [settings] = useSettings();
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hudRoot = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FightScene | null>(null);
  const [scene, setScene] = useState<FightScene | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const cbs = useRef({ onEnd, onExit });
  cbs.current = { onEnd, onExit };

  const fit = useCallback(() => {
    const w = wrap.current;
    const f = frame.current;
    if (!w || !f) return;
    const k = Math.min(w.clientWidth / LOGICAL_W, w.clientHeight / LOGICAL_H);
    f.style.transform = `scale(${k})`;
    sceneRef.current?.resize(LOGICAL_W * k, LOGICAL_H * k, window.devicePixelRatio || 1);
  }, []);

  useLayoutEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    if (wrap.current) ro.observe(wrap.current);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [fit]);

  useEffect(() => {
    let cancelled = false;
    const cv = canvas.current;
    const root = hudRoot.current;
    if (!cv || !root) return;
    const hud = new HudController();
    hud.bind(root);
    const host: SceneHost = {
      onMatchEnd: (r) => cbs.current.onEnd(r),
      onPauseChange: (p) => setPaused(p),
      onExit: () => cbs.current.onExit(),
    };
    const deps = { canvas: cv, hud, audio: services.audio, input: services.input, settings: services.settings, host };
    const s = cfg.mode === 'training' ? new TrainingScene(deps, cfg) : new FightScene(deps, cfg);
    sceneRef.current = s;
    services.input.attach();
    services.input.setBindings(services.settings.get().bindings);
    s.load((p) => !cancelled && setProgress(p)).then(() => {
      if (cancelled) return;
      fit();
      s.start();
      setScene(s);
      if (import.meta.env.DEV) (window as unknown as { __ib?: unknown }).__ib = s;
    }).catch((err) => {
      console.error('Failed to start fight', err);
      cbs.current.onExit();
    });
    return () => {
      cancelled = true;
      s.dispose();
      services.input.setVirtual(0, 0);
      services.input.detach();
      sceneRef.current = null;
    };
  }, [cfg]);

  const showTouch = settings.touchControls === 'on' || (settings.touchControls === 'auto' && typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);

  return (
    <div className="screen">
      <div className="frame-wrap" ref={wrap}>
        <div className="frame" ref={frame} data-cb={settings.colorblind === 'off' ? undefined : settings.colorblind}>
          <canvas className="game" ref={canvas} width={LOGICAL_W} height={LOGICAL_H} />
          <div ref={hudRoot} style={{ position: 'absolute', inset: 0 }}>
            <HUD onSkip={() => sceneRef.current?.skip()} />
          </div>
          {scene instanceof TrainingScene && <TrainingPanel scene={scene} />}
          {scene && showTouch && <TouchControls input={services.input} onPause={() => scene.setPaused(true)} />}
        </div>
      </div>
      {!scene && <div style={{ position: 'absolute', inset: 0, zIndex: 60 }}><LoadingScreen progress={progress} /></div>}
      {scene && paused && (
        <PauseMenu
          onResume={() => scene.setPaused(false)}
          onRestart={() => {
            scene.restart();
            scene.setPaused(false);
          }}
          onExit={onExit}
        />
      )}
    </div>
  );
}
