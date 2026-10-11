import { useEffect, useRef, useState } from 'react';
import { Btn } from '../input/InputFrame';
import type { InputManager } from '../input/InputManager';

interface Props {
  input: InputManager;
  onPause: () => void;
}

interface BtnDef {
  label: string;
  bit: number;
  style: React.CSSProperties;
  small?: boolean;
}

const BUTTONS: BtnDef[] = [
  { label: 'ATTACK', bit: Btn.LP, style: { right: 150, bottom: 150 } },
  { label: 'HEAVY', bit: Btn.HP, style: { right: 40, bottom: 190 } },
  { label: 'SPECIAL', bit: Btn.SP1, style: { right: 245, bottom: 60 } },
  { label: 'BLOCK', bit: Btn.BLOCK, style: { right: 40, bottom: 60 } },
  { label: 'JUMP', bit: Btn.UP, style: { right: 150, bottom: 40 } },
  { label: 'KICK', bit: Btn.LK, style: { right: 250, bottom: 180 }, small: true },
  { label: 'H.KICK', bit: Btn.HK, style: { right: 330, bottom: 130 }, small: true },
  { label: 'SP2', bit: Btn.SP2, style: { right: 330, bottom: 40 }, small: true },
  { label: 'GRAB', bit: Btn.GRAB, style: { right: 40, bottom: 290 }, small: true },
];

/** Virtual joystick (left) + action buttons (right). Writes straight into the InputManager's virtual slot. */
export function TouchControls({ input, onPause }: Props): JSX.Element {
  const joyRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const dirMask = useRef(0);
  const btnMask = useRef(0);
  const pointers = useRef(new Map<number, number>());
  const [down, setDown] = useState(0);

  const push = (): void => input.setVirtual(0, dirMask.current | btnMask.current);

  useEffect(() => () => input.setVirtual(0, 0), [input]);

  const joyMove = (e: React.PointerEvent): void => {
    const el = joyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const max = r.width / 2;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, len / max);
    setKnob({ x: (dx / len) * k * max * 0.6, y: (dy / len) * k * max * 0.6 });
    let m = 0;
    const dead = max * 0.28;
    if (dx > dead) m |= Btn.RIGHT;
    if (dx < -dead) m |= Btn.LEFT;
    if (dy < -dead * 1.1) m |= Btn.UP;
    if (dy > dead * 1.1) m |= Btn.DOWN;
    dirMask.current = m;
    push();
  };
  const joyEnd = (): void => {
    setKnob({ x: 0, y: 0 });
    dirMask.current = 0;
    push();
  };

  return (
    <div className="touch">
      <div
        className="joy"
        ref={joyRef}
        onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); joyMove(e); }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') joyMove(e); }}
        onPointerUp={joyEnd}
        onPointerCancel={joyEnd}
      >
        <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      {BUTTONS.map((b) => (
        <div
          key={b.label}
          className={`tbtn ${b.small ? 'sm' : ''} ${down & b.bit ? 'down' : ''}`}
          style={b.style}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, b.bit);
            btnMask.current |= b.bit;
            setDown(btnMask.current);
            push();
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            btnMask.current &= ~b.bit;
            setDown(btnMask.current);
            push();
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            btnMask.current &= ~b.bit;
            setDown(btnMask.current);
            push();
          }}
        >
          {b.label}
        </div>
      ))}
      <div className="tbtn sm" style={{ right: 20, top: 190 }} onPointerDown={onPause}>PAUSE</div>
    </div>
  );
}
