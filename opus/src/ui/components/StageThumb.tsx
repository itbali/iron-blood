import { useEffect, useRef } from 'react';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../core/constants';
import { getStage } from '../../data/stages';
import { ScreenShake } from '../../effects/ScreenShake';
import { Camera } from '../../render/Camera';

const cache = new Map<string, HTMLCanvasElement>();

/** Renders one frame of a stage (cached) for menus and loading screens. */
export const renderStageFrame = (id: string): HTMLCanvasElement => {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = VIEW_WIDTH;
  c.height = VIEW_HEIGHT;
  const ctx = c.getContext('2d')!;
  try {
    const stage = getStage(id).create();
    stage.init();
    const cam = new Camera(new ScreenShake());
    cam.reset(0);
    cam.zoom = 0.95;
    const r = { ctx, cam, time: 1000, dt: 1, quality: 'medium' as const, danger: 0, reducedMotion: true };
    stage.renderBackground(r);
    stage.renderFloor(r);
    stage.renderForeground(r);
  } catch (err) {
    console.error(`Stage preview for ${id} failed`, err);
    ctx.fillStyle = '#12151b';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  cache.set(id, c);
  return c;
};

export function StageThumb({ id, width, height }: { id: string; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const frame = renderStageFrame(id);
    const scale = Math.max(width / VIEW_WIDTH, height / VIEW_HEIGHT);
    const w = VIEW_WIDTH * scale;
    const h = VIEW_HEIGHT * scale;
    ctx.drawImage(frame, (width - w) / 2, (height - h) / 2, w, h);
  }, [id, width, height]);
  return <canvas ref={ref} width={width} height={height} />;
}
