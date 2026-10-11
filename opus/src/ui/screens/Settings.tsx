import { useEffect, useRef, useState } from 'react';
import type { Action } from '../../input/InputTypes';
import { ACTION_LABELS, ACTIONS } from '../../input/InputTypes';
import { DEFAULT_P1_BINDINGS, DEFAULT_P2_BINDINGS, cloneBindings, keyLabel, withoutCode } from '../../input/KeyBindings';
import type { Quality, Settings as SettingsData } from '../../progression/Settings';
import { useSave, useServices } from '../context';

type Tab = 'graphics' | 'audio' | 'controls' | 'accessibility' | 'data';
const TABS: { id: Tab; label: string }[] = [
  { id: 'graphics', label: 'GRAPHICS' },
  { id: 'audio', label: 'AUDIO' },
  { id: 'controls', label: 'CONTROLS' },
  { id: 'accessibility', label: 'ACCESSIBILITY' },
  { id: 'data', label: 'DATA' },
];

interface Row {
  label: string;
  desc?: string;
  kind: 'toggle' | 'range' | 'seg';
  get: (s: SettingsData) => boolean | number | string;
  set: (s: SettingsData, v: boolean | number | string) => void;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

const QUALITIES: { value: Quality; label: string }[] = [
  { value: 'low', label: 'LOW' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'high', label: 'HIGH' },
];

const ROWS: Record<Exclude<Tab, 'controls' | 'data'>, Row[]> = {
  graphics: [
    { label: 'Quality', desc: 'Render resolution, glow and reflections', kind: 'seg', options: QUALITIES, get: (s) => s.graphics.quality, set: (s, v) => (s.graphics.quality = v as Quality) },
    { label: 'Particles', desc: 'Density of sparks, blood and smoke', kind: 'range', min: 0, max: 1, step: 0.1, get: (s) => s.graphics.particles, set: (s, v) => (s.graphics.particles = Number(v)) },
    { label: 'Screen Shake', kind: 'toggle', get: (s) => s.graphics.screenShake, set: (s, v) => (s.graphics.screenShake = Boolean(v)) },
    { label: 'Shake Intensity', kind: 'range', min: 0.2, max: 1.5, step: 0.1, get: (s) => s.graphics.shakeIntensity, set: (s, v) => (s.graphics.shakeIntensity = Number(v)) },
    { label: 'Motion Blur', desc: 'Afterimage trails on dashes and supers', kind: 'toggle', get: (s) => s.graphics.motionBlur, set: (s, v) => (s.graphics.motionBlur = Boolean(v)) },
    { label: 'Post Effects', desc: 'Vignette and chromatic aberration', kind: 'toggle', get: (s) => s.graphics.effects, set: (s, v) => (s.graphics.effects = Boolean(v)) },
  ],
  audio: [
    { label: 'Master Volume', kind: 'range', min: 0, max: 1, step: 0.05, get: (s) => s.audio.master, set: (s, v) => (s.audio.master = Number(v)) },
    { label: 'Music Volume', kind: 'range', min: 0, max: 1, step: 0.05, get: (s) => s.audio.music, set: (s, v) => (s.audio.music = Number(v)) },
    { label: 'SFX Volume', kind: 'range', min: 0, max: 1, step: 0.05, get: (s) => s.audio.sfx, set: (s, v) => (s.audio.sfx = Number(v)) },
  ],
  accessibility: [
    { label: 'Colorblind Mode', desc: 'Blue P2 markers, gold round pips', kind: 'toggle', get: (s) => s.accessibility.colorblind, set: (s, v) => (s.accessibility.colorblind = Boolean(v)) },
    { label: 'Reduced Motion', desc: 'No shake, tilt or cinematic zoom', kind: 'toggle', get: (s) => s.accessibility.reducedMotion, set: (s, v) => (s.accessibility.reducedMotion = Boolean(v)) },
    { label: 'Flash Effects', desc: 'Screen flashes on big hits', kind: 'toggle', get: (s) => s.accessibility.flashes, set: (s, v) => (s.accessibility.flashes = Boolean(v)) },
    { label: 'Subtitles', desc: 'Show pre-fight dialogue', kind: 'toggle', get: (s) => s.accessibility.subtitles, set: (s, v) => (s.accessibility.subtitles = Boolean(v)) },
    { label: 'Damage Numbers', kind: 'toggle', get: (s) => s.accessibility.damageNumbers, set: (s, v) => (s.accessibility.damageNumbers = Boolean(v)) },
  ],
};

export function SettingsScreen({ onBack, overlay = false }: { onBack: () => void; overlay?: boolean }) {
  const services = useServices();
  const save = useSave();
  const s = save.settings;
  const [tab, setTab] = useState<Tab>('graphics');
  const [focus, setFocus] = useState(0);
  const [listening, setListening] = useState<{ player: 0 | 1; action: Action } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const stateRef = useRef({ tab, focus, listening });
  stateRef.current = { tab, focus, listening };

  const update = (fn: (d: SettingsData) => void) => services.update((d) => fn(d.settings));

  const rows = tab === 'controls' || tab === 'data' ? [] : ROWS[tab];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (st.listening) {
        e.preventDefault();
        e.stopPropagation();
        if (e.code !== 'Escape') {
          const { player, action } = st.listening;
          services.update((d) => {
            const key = player === 0 ? 'p1' : 'p2';
            const other = player === 0 ? 'p2' : 'p1';
            d.settings.controls[key] = withoutCode(d.settings.controls[key], e.code);
            d.settings.controls[other] = withoutCode(d.settings.controls[other], e.code);
            d.settings.controls[key][action] = [e.code];
          });
          services.audio.play('select');
        }
        setListening(null);
        return;
      }
      const tabIdx = TABS.findIndex((t) => t.id === st.tab);
      const list = st.tab === 'controls' || st.tab === 'data' ? [] : ROWS[st.tab];
      switch (e.code) {
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          services.audio.play('back');
          onBack();
          break;
        case 'KeyQ':
          setTab(TABS[(tabIdx + TABS.length - 1) % TABS.length].id);
          setFocus(0);
          services.audio.play('hover');
          break;
        case 'KeyE':
        case 'Tab':
          e.preventDefault();
          setTab(TABS[(tabIdx + 1) % TABS.length].id);
          setFocus(0);
          services.audio.play('hover');
          break;
        case 'ArrowUp':
        case 'KeyW':
          if (list.length) setFocus((f) => (f - 1 + list.length) % list.length);
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (list.length) setFocus((f) => (f + 1) % list.length);
          break;
        case 'ArrowLeft':
        case 'KeyA':
        case 'ArrowRight':
        case 'KeyD':
        case 'Enter':
        case 'KeyJ': {
          const row = list[st.focus];
          if (!row) break;
          const dir = e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 1;
          services.update((d) => {
            const cur = row.get(d.settings);
            if (row.kind === 'toggle') row.set(d.settings, !cur);
            else if (row.kind === 'range') row.set(d.settings, Math.round(Math.min(row.max!, Math.max(row.min!, Number(cur) + dir * row.step!)) * 100) / 100);
            else if (row.options) {
              const i = row.options.findIndex((o) => o.value === cur);
              row.set(d.settings, row.options[(i + dir + row.options.length) % row.options.length].value);
            }
          });
          services.audio.play('hover');
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [services, onBack]);

  const body = (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${t.id === tab ? 'active' : ''}`}
            onClick={() => {
              setTab(t.id);
              setFocus(0);
              services.audio.play('click');
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="settings-body panel">
        {rows.map((r, i) => {
          const v = r.get(s);
          return (
            <div key={r.label} className={`setting ${i === focus ? 'focus' : ''}`} onMouseEnter={() => setFocus(i)}>
              <div>
                <div className="label">{r.label}</div>
                {r.desc && <div className="desc">{r.desc}</div>}
              </div>
              <div>
                {r.kind === 'toggle' && (
                  <div className={`toggle ${v ? 'on' : ''}`} role="switch" aria-checked={Boolean(v)} onClick={() => update((d) => r.set(d, !r.get(d)))} />
                )}
                {r.kind === 'range' && (
                  <input type="range" min={r.min} max={r.max} step={r.step} value={Number(v)} onChange={(e) => update((d) => r.set(d, Number(e.target.value)))} aria-label={r.label} />
                )}
                {r.kind === 'seg' && (
                  <div className="seg">
                    {r.options!.map((o) => (
                      <button key={o.value} className={o.value === v ? 'on' : ''} onClick={() => update((d) => r.set(d, o.value))}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', color: '#8a909c', fontSize: 13 }}>
                {r.kind === 'range' ? `${Math.round(Number(v) * 100)}%` : r.kind === 'toggle' ? (v ? 'ON' : 'OFF') : ''}
              </div>
            </div>
          );
        })}
        {tab === 'controls' && (
          <>
            <div className="bind-grid">
              <div className="head">ACTION</div>
              <div className="head">PLAYER 1</div>
              <div className="head">PLAYER 2</div>
              {ACTIONS.map((a) => (
                <BindRow key={a} action={a} p1={s.controls.p1[a]} p2={s.controls.p2[a]} listening={listening} onListen={(player) => setListening({ player, action: a })} />
              ))}
            </div>
            <div className="row-buttons" style={{ marginTop: 18 }}>
              <button
                className="btn"
                onClick={() =>
                  update((d) => {
                    d.controls.p1 = cloneBindings(DEFAULT_P1_BINDINGS);
                    d.controls.p2 = cloneBindings(DEFAULT_P2_BINDINGS);
                  })
                }
              >
                RESET TO DEFAULT
              </button>
              <span style={{ fontSize: 12, color: '#8a909c', alignSelf: 'center' }}>Click a key, then press the new key. Esc cancels. System keys: Esc pause, R restart, F3 debug.</span>
            </div>
          </>
        )}
        {tab === 'data' && (
          <div>
            <p style={{ color: '#c9ccd3' }}>
              Wins {save.progress.totalWins} · Losses {save.progress.totalLosses} · Highest combo {save.progress.highestCombo} · Matches {save.progress.matchesPlayed} · Finishers{' '}
              {save.progress.finishersPerformed}
            </p>
            <p style={{ color: '#8a909c', fontSize: 13 }}>Progress and settings are stored locally in this browser.</p>
            {!confirmReset ? (
              <button className="btn" onClick={() => setConfirmReset(true)}>
                RESET SAVE DATA
              </button>
            ) : (
              <div className="row-buttons">
                <span style={{ alignSelf: 'center', color: '#ff6a73' }}>Erase all progress and settings?</span>
                <button
                  className="btn"
                  onClick={() => {
                    services.resetAll();
                    setConfirmReset(false);
                  }}
                >
                  YES, ERASE
                </button>
                <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                  CANCEL
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="back-hint">
        <kbd>Q</kbd>
        <kbd>E</kbd> tabs · <kbd>W</kbd>
        <kbd>S</kbd> select · <kbd>A</kbd>
        <kbd>D</kbd> change · <kbd>Esc</kbd> back
      </div>
    </>
  );

  return (
    <div className={`screen settings-root ${overlay ? 'overlay-settings' : ''}`} style={overlay ? { zIndex: 30 } : undefined}>
      <h1 className="screen-title display">
        <small>OPTIONS</small>SETTINGS
      </h1>
      {body}
    </div>
  );
}

function BindRow({
  action,
  p1,
  p2,
  listening,
  onListen,
}: {
  action: Action;
  p1: string[];
  p2: string[];
  listening: { player: 0 | 1; action: Action } | null;
  onListen: (p: 0 | 1) => void;
}) {
  const is = (p: 0 | 1) => listening?.player === p && listening.action === action;
  return (
    <>
      <div style={{ fontSize: 14, color: '#c9ccd3' }}>{ACTION_LABELS[action]}</div>
      <button className={`bind ${is(0) ? 'listening' : ''}`} onClick={() => onListen(0)}>
        {is(0) ? 'PRESS A KEY…' : p1.map(keyLabel).join(' / ') || '—'}
      </button>
      <button className={`bind ${is(1) ? 'listening' : ''}`} onClick={() => onListen(1)}>
        {is(1) ? 'PRESS A KEY…' : p2.map(keyLabel).join(' / ') || '—'}
      </button>
    </>
  );
}
