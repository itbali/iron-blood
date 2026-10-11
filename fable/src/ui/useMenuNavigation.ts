import { useEffect, useState } from 'react';
import { sfx } from './services';

interface Options {
  count: number;
  onSelect: (index: number) => void;
  onBack?: () => void;
  onLeft?: (index: number) => void;
  onRight?: (index: number) => void;
  initial?: number;
  enabled?: boolean;
  horizontal?: boolean;
}

/** Keyboard navigation shared by every menu: W/S or arrows to move, Enter/Space/J to confirm, Esc to go back. */
export const useMenuNavigation = (o: Options): [number, (i: number) => void] => {
  const [index, setIndex] = useState(o.initial ?? 0);
  const { count, onSelect, onBack, onLeft, onRight, enabled = true, horizontal = false } = o;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const prevKeys = horizontal ? ['ArrowLeft', 'KeyA'] : ['ArrowUp', 'KeyW'];
      const nextKeys = horizontal ? ['ArrowRight', 'KeyD'] : ['ArrowDown', 'KeyS'];
      if (prevKeys.includes(e.code)) {
        e.preventDefault();
        setIndex((i) => (i - 1 + count) % count);
        sfx.hover();
      } else if (nextKeys.includes(e.code)) {
        e.preventDefault();
        setIndex((i) => (i + 1) % count);
        sfx.hover();
      } else if (['Enter', 'Space', 'KeyJ', 'NumpadEnter'].includes(e.code)) {
        e.preventDefault();
        setIndex((i) => {
          onSelect(i);
          return i;
        });
      } else if (e.code === 'Escape' || e.code === 'Backspace') {
        if (onBack) {
          e.preventDefault();
          sfx.back();
          onBack();
        }
      } else if (!horizontal && (e.code === 'ArrowLeft' || e.code === 'KeyA') && onLeft) {
        setIndex((i) => {
          onLeft(i);
          return i;
        });
      } else if (!horizontal && (e.code === 'ArrowRight' || e.code === 'KeyD') && onRight) {
        setIndex((i) => {
          onRight(i);
          return i;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, onSelect, onBack, onLeft, onRight, enabled, horizontal]);
  return [index, setIndex];
};
