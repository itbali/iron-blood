import { useEffect, useRef } from 'react';
import { Btn } from '@/input/InputFrame';
import type { InputManager } from '@/input/InputManager';

interface Props {
  input: InputManager;
  onPause: () => void;
}

/** Virtual joystick + action buttons feeding the InputManager's virtual state for player 1. */
export const TouchControls = ({ input, onPause }: Props) => {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const stick = stickRef.current;
    const knob = knobRef.current;
    if (!stick || !knob) return;
    let pointerId: number | null = null;
    const v = input.virtual[0];
    const reset = () => {
      v.x = 0;
      v.y = 0;
      knob.style.transform = 'translate(0,0)';
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = rect.width / 2;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = max * 0.3;
      v.x = dx > dead ? 1 : dx < -dead ? -1 : 0;
      v.y = dy < -dead ? 1 : dy > dead ? -1 : 0;
    };
    const onDown = (e: PointerEvent) => {
      pointerId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      onMove(e);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      reset();
    };
    stick.addEventListener('pointerdown', onDown);
    stick.addEventListener('pointermove', onMove);
    stick.addEventListener('pointerup', onUp);
    stick.addEventListener('pointercancel', onUp);
    return () => {
      stick.removeEventListener('pointerdown', onDown);
      stick.removeEventListener('pointermove', onMove);
      stick.removeEventListener('pointerup', onUp);
      stick.removeEventListener('pointercancel', onUp);
      reset();
    };
  }, [input]);

  const bind = (mask: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).classList.add('down');
      input.virtual[0].held |= mask;
      input.virtual[0].pressedQueue |= mask;
    },
    onPointerUp: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).classList.remove('down');
      input.virtual[0].held &= ~mask;
    },
    onPointerLeave: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).classList.remove('down');
      input.virtual[0].held &= ~mask;
    },
    onPointerCancel: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).classList.remove('down');
      input.virtual[0].held &= ~mask;
    },
  });

  return (
    <div className="touch">
      <div className="stick" ref={stickRef}>
        <i ref={knobRef} />
      </div>
      <button className="pause-btn" onClick={onPause} aria-label="Pause">
        II
      </button>
      <div className="buttons">
        <button className="tbtn" {...bind(Btn.LP)}>
          ATTACK
        </button>
        <button className="tbtn" {...bind(Btn.HP)}>
          HEAVY
        </button>
        <button className="tbtn" {...bind(Btn.LK)}>
          KICK
        </button>
        <button className="tbtn" {...bind(Btn.SP1)}>
          SPECIAL
        </button>
        <button className="tbtn" {...bind(Btn.SP2)}>
          SP 2
        </button>
        <button className="tbtn" {...bind(Btn.GRAB)}>
          GRAB
        </button>
        <button className="tbtn wide" {...bind(Btn.BLOCK)}>
          BLOCK
        </button>
      </div>
    </div>
  );
};
