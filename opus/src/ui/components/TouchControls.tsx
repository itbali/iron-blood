import { useRef, useState } from 'react';
import type { InputManager } from '../../input/InputManager';
import type { Action } from '../../input/InputTypes';

const BUTTONS: { action: Action; label: string; special?: boolean }[] = [
  { action: 'lp', label: 'ATTACK' },
  { action: 'hp', label: 'HEAVY' },
  { action: 's1', label: 'SPECIAL', special: true },
  { action: 'hk', label: 'KICK' },
  { action: 'block', label: 'BLOCK' },
  { action: 'up', label: 'JUMP' },
];

const DEAD_ZONE = 0.35;

export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && ('ontouchstart' in window || (window.matchMedia?.('(pointer: coarse)').matches ?? false));

/** Virtual joystick (left) and large action buttons (right), feeding the same InputManager. */
export function TouchControls({ input, onPause }: { input: InputManager; onPause: () => void }) {
  const stick = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [down, setDown] = useState<Set<Action>>(new Set());
  const pointer = useRef<number | null>(null);

  const setDirs = (nx: number, ny: number) => {
    input.setVirtual('left', nx < -DEAD_ZONE);
    input.setVirtual('right', nx > DEAD_ZONE);
    input.setVirtual('up', ny < -DEAD_ZONE * 1.6);
    input.setVirtual('down', ny > DEAD_ZONE);
  };

  const onStick = (e: React.PointerEvent) => {
    if (pointer.current !== null && pointer.current !== e.pointerId) return;
    const r = stick.current!.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    setKnob({ x: nx, y: ny });
    setDirs(nx, ny);
  };

  const release = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    setDirs(0, 0);
  };

  const press = (a: Action, v: boolean) => {
    input.setVirtual(a, v);
    setDown((prev) => {
      const n = new Set(prev);
      if (v) n.add(a);
      else n.delete(a);
      return n;
    });
  };

  return (
    <div className="touch">
      <div
        ref={stick}
        className="stick"
        onPointerDown={(e) => {
          pointer.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onStick(e);
        }}
        onPointerMove={(e) => pointer.current === e.pointerId && onStick(e)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div className="knob" style={{ transform: `translate(${knob.x * 56}px, ${knob.y * 56}px)` }} />
      </div>
      <div className="tbuttons">
        {BUTTONS.map((b) => (
          <button
            key={b.action}
            className={`tbtn ${b.special ? 'special' : ''} ${down.has(b.action) ? 'down' : ''}`}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              press(b.action, true);
            }}
            onPointerUp={() => press(b.action, false)}
            onPointerCancel={() => press(b.action, false)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <button className="tpause" onClick={onPause}>
        II
      </button>
    </div>
  );
}
