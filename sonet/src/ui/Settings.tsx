import { useEffect, useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from '../ai/Difficulty';
import { ACTIONS, DEFAULT_BINDINGS, cloneBindings, keyLabel, type ActionId, type BindingSet } from '../input/KeyBindings';
import type { Settings } from '../progression/Settings';
import { useProgress, useServices, useSettings, useSfx } from './services';

type Tab = 'graphics' | 'audio' | 'controls' | 'accessibility' | 'game';

const TABS: { id: Tab; label: string }[] = [
  { id: 'graphics', label: 'Graphics' },
  { id: 'audio', label: 'Audio' },
  { id: 'controls', label: 'Controls' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'game', label: 'Game' },
];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }): JSX.Element {
  const sfx = useSfx();
  return (
    <button className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => { sfx.click(); onChange(!on); }}>
      <i />
    </button>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; locked?: boolean }[]; onChange: (v: T) => void }): JSX.Element {
  const sfx = useSfx();
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.id} disabled={o.locked} className={`chip ${value === o.id ? 'on' : ''} ${o.locked ? 'locked' : ''}`} onClick={() => { sfx.click(); onChange(o.id); }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input className="slider" type="range" min={0} max={100} value={Math.round(value * 100)} aria-label={label} onChange={(e) => onChange(Number(e.target.value) / 100)} />
      <span className="display" style={{ width: 44, textAlign: 'right' }}>{Math.round(value * 100)}</span>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="setting">
      <label>
        {label}
        {hint && <small>{hint}</small>}
      </label>
      {children}
    </div>
  );
}

function Controls(): JSX.Element {
  const { input } = useServices();
  const [settings, set] = useSettings();
  const [listen, setListen] = useState<{ slot: 'p1' | 'p2'; action: ActionId; index: number } | null>(null);

  useEffect(() => () => input.cancelCapture(), [input]);

  const rebind = (slot: 'p1' | 'p2', action: ActionId, index: number): void => {
    setListen({ slot, action, index });
    input.captureNextKey((code) => {
      setListen(null);
      if (code === 'Escape') return;
      const next: BindingSet = cloneBindings(settings.bindings);
      for (const a of ACTIONS) {
        if (a.id === action) continue;
        next[slot][a.id] = next[slot][a.id].filter((c) => c !== code);
        if (next[slot][a.id].length === 0) next[slot][a.id] = [...DEFAULT_BINDINGS[slot][a.id].filter((c) => c !== code)].slice(0, 1);
      }
      const list = next[slot][action].slice();
      list[index] = code;
      next[slot][action] = list.filter(Boolean);
      set({ bindings: next });
    });
  };

  return (
    <>
      <table className="bind-table">
        <thead>
          <tr><th>Action</th><th>Player 1</th><th>Player 2</th></tr>
        </thead>
        <tbody>
          {ACTIONS.map((a) => (
            <tr key={a.id}>
              <td className="display" style={{ letterSpacing: '0.1em' }}>{a.label}</td>
              {(['p1', 'p2'] as const).map((slot) => (
                <td key={slot}>
                  {[0, 1].map((i) => {
                    const code = settings.bindings[slot][a.id][i];
                    if (!code && i > 0) return null;
                    const active = listen && listen.slot === slot && listen.action === a.id && listen.index === i;
                    return (
                      <button key={i} className={`keycap ${active ? 'listening' : ''}`} onClick={() => rebind(slot, a.id, i)}>
                        {active ? 'PRESS KEY' : keyLabel(code ?? '')}
                      </button>
                    );
                  })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button className="btn small" onClick={() => set({ bindings: cloneBindings(DEFAULT_BINDINGS) })}>Reset to Defaults</button>
      </div>
      <div className="hint" style={{ marginTop: 10 }}>Click a key, then press the new one · <kbd>Esc</kbd> cancels · Special moves: ↓→ + Special 1 (projectile), → → + Special 1 (dash), ↓← + Special 2 (grab), Special 1 + Special 2 (super)</div>
    </>
  );
}

export function SettingsPanel({ onBack }: { onBack: () => void }): JSX.Element {
  const sfx = useSfx();
  const { settings: store, save } = useServices();
  const [s, set] = useSettings();
  const [progress] = useProgress();
  const [tab, setTab] = useState<Tab>('graphics');
  const [confirmReset, setConfirmReset] = useState(false);
  const up = <K extends keyof Settings>(k: K, v: Settings[K]): void => set({ [k]: v } as Partial<Settings>);

  const difficultyOptions = DIFFICULTIES.map((d: Difficulty) => ({ id: d, label: DIFFICULTY_LABEL[d], locked: d === 'nightmare' && !progress.nightmareUnlocked }));

  return (
    <>
      <h2 className="screen-title">Settings</h2>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`chip ${tab === t.id ? 'on' : ''}`} onMouseEnter={sfx.hover} onClick={() => { sfx.click(); setTab(t.id); }}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn small" onClick={() => { sfx.click(); onBack(); }}>Back</button>
      </div>
      <div className="settings-body">
        {tab === 'graphics' && (
          <>
            <Row label="Quality" hint="Reflections, atmosphere density and post effects"><Seg value={s.quality} onChange={(v) => up('quality', v)} options={[{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]} /></Row>
            <Row label="Particles" hint="Sparks, smoke, blood and embers"><Seg value={s.particles} onChange={(v) => up('particles', v)} options={[{ id: 'off', label: 'Off' }, { id: 'low', label: 'Low' }, { id: 'normal', label: 'Normal' }, { id: 'high', label: 'High' }]} /></Row>
            <Row label="Screen Shake"><Toggle label="Screen shake" on={s.screenShake} onChange={(v) => up('screenShake', v)} /></Row>
            <Row label="Motion Effects" hint="Afterimages, trails and chromatic aberration"><Toggle label="Motion effects" on={s.motionBlur} onChange={(v) => up('motionBlur', v)} /></Row>
            <Row label="Effects" hint="Impact rings and extra hit visuals"><Toggle label="Effects" on={s.effects} onChange={(v) => up('effects', v)} /></Row>
          </>
        )}
        {tab === 'audio' && (
          <>
            <Row label="Master Volume"><Slider label="Master volume" value={s.master} onChange={(v) => up('master', v)} /></Row>
            <Row label="Music Volume"><Slider label="Music volume" value={s.music} onChange={(v) => up('music', v)} /></Row>
            <Row label="SFX Volume"><Slider label="SFX volume" value={s.sfx} onChange={(v) => up('sfx', v)} /></Row>
          </>
        )}
        {tab === 'controls' && <Controls />}
        {tab === 'accessibility' && (
          <>
            <Row label="Colorblind Mode" hint="Changes player colours and adds pattern cues to health bars">
              <Seg value={s.colorblind} onChange={(v) => up('colorblind', v)} options={[{ id: 'off', label: 'Off' }, { id: 'deuteranopia', label: 'Deuter.' }, { id: 'protanopia', label: 'Protan.' }, { id: 'tritanopia', label: 'Tritan.' }]} />
            </Row>
            <Row label="Reduced Motion" hint="Softens camera movement, shake and UI animation"><Toggle label="Reduced motion" on={s.reducedMotion} onChange={(v) => up('reducedMotion', v)} /></Row>
            <Row label="Screen Shake"><Toggle label="Screen shake" on={s.screenShake} onChange={(v) => up('screenShake', v)} /></Row>
            <Row label="Flash Effects" hint="Turn off to dim white screen flashes"><Toggle label="Flash effects" on={s.flashEffects} onChange={(v) => up('flashEffects', v)} /></Row>
            <Row label="Subtitles" hint="Show character dialogue as captions"><Toggle label="Subtitles" on={s.subtitles} onChange={(v) => up('subtitles', v)} /></Row>
          </>
        )}
        {tab === 'game' && (
          <>
            <Row label="Default Difficulty"><Seg value={s.difficulty} onChange={(v) => up('difficulty', v)} options={difficultyOptions} /></Row>
            <Row label="Touch Controls" hint="On-screen joystick and buttons"><Seg value={s.touchControls} onChange={(v) => up('touchControls', v)} options={[{ id: 'auto', label: 'Auto' }, { id: 'on', label: 'On' }, { id: 'off', label: 'Off' }]} /></Row>
            <Row label="Reset Settings"><button className="btn small" onClick={() => { sfx.click(); store.reset(); }}>Restore Defaults</button></Row>
            <Row label="Erase Progress" hint="Deletes unlocks, statistics and records">
              {confirmReset ? (
                <div className="seg">
                  <button className="btn small" onClick={() => { save.resetSave(); setConfirmReset(false); }}>Confirm Erase</button>
                  <button className="btn small ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btn small ghost" onClick={() => setConfirmReset(true)}>Erase</button>
              )}
            </Row>
          </>
        )}
      </div>
    </>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);
  return (
    <div className="screen panel-screen">
      <SettingsPanel onBack={onBack} />
    </div>
  );
}
