import { useEffect, useRef, useState } from 'react';
import { useServices } from '../context';

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const OK = new Set(['Enter', 'KeyJ', 'Space', 'NumpadEnter', 'Numpad1']);
const BACK = new Set(['Escape', 'Backspace', 'KeyK']);

export interface MenuNavOptions {
  count: number;
  onSelect: (index: number) => void;
  onBack?: () => void;
  onLeft?: (index: number) => void;
  onRight?: (index: number) => void;
  enabled?: boolean;
  initial?: number;
  horizontal?: boolean;
}

/** Keyboard navigation for vertical menus with hover/confirm sounds. */
export function useMenuNav(o: MenuNavOptions): [number, (i: number) => void] {
  const services = useServices();
  const [index, setIndex] = useState(o.initial ?? 0);
  const ref = useRef(o);
  ref.current = o;
  const idxRef = useRef(index);
  idxRef.current = index;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const opt = ref.current;
      if (opt.enabled === false || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT') return;
      const prev = opt.horizontal ? LEFT : UP;
      const next = opt.horizontal ? RIGHT : DOWN;
      if (prev.has(e.code)) {
        e.preventDefault();
        setIndex((i) => (i - 1 + opt.count) % opt.count);
        services.audio.play('hover');
      } else if (next.has(e.code)) {
        e.preventDefault();
        setIndex((i) => (i + 1) % opt.count);
        services.audio.play('hover');
      } else if (!opt.horizontal && LEFT.has(e.code) && opt.onLeft) {
        e.preventDefault();
        opt.onLeft(idxRef.current);
      } else if (!opt.horizontal && RIGHT.has(e.code) && opt.onRight) {
        e.preventDefault();
        opt.onRight(idxRef.current);
      } else if (OK.has(e.code)) {
        e.preventDefault();
        services.audio.play('click');
        opt.onSelect(idxRef.current);
      } else if (BACK.has(e.code) && opt.onBack) {
        e.preventDefault();
        services.audio.play('back');
        opt.onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [services]);

  useEffect(() => {
    if (index >= o.count) setIndex(Math.max(0, o.count - 1));
  }, [o.count, index]);

  return [index, setIndex];
}
