import { useEffect, useState } from 'react';
import { ACTIONS, ACTION_LABELS, DEFAULT_P1_BINDINGS, DEFAULT_P2_BINDINGS, keyLabel, type Action } from '@/input/KeyBindings';
import type { GameSettings } from '@/progression/Settings';
import { DEFAULT_SETTINGS } from '@/progression/Settings';
import { useStore } from '@/state/store';
import { audio, progression, settingsStore, sfx } from './services';

type Tab = 'graphics' | 'audio' | 'controls' | 'accessibility' | 'data';
const TABS: { id: Tab; label: string }[] = [
  { id: 'graphics', label: 'Graphics' },
  { id: 'audio', label: 'Audio' },
  { id: 'controls', label: 'Controls' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'data', label: 'Data' },
];

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button className={`toggle${value ? ' on' : ''}`} onClick={() => { onChange(!value); sfx.click(); }} aria-pressed={value}>
    <i />
  </button>
);

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="setting-row">
    <label>
      {label}
      {hint && <small>{hint}</small>}
    </label>
    {children}
  </div>
);

const Slider = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="slider">
    <input type="range" min={0} max={100} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} onMouseUp={() => sfx.hover()} />
    <span>{Math.round(value * 100)}%</span>
  </div>
);

const Seg = <T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) => (
  <div className="seg">
    {options.map((o) => (
      <button key={o} className={`btn${o === value ? ' active' : ''}`} onClick={() => { onChange(o); sfx.click(); }}>
        {o}
      </button>
    ))}
  </div>
);

const Bindings = ({ side }: { side: 0 | 1 }) => {
  const settings = useStore(settingsStore);
  const bindings = side === 0 ? settings.controls.p1 : settings.controls.p2;
  const [listening, setListening] = useState<Action | null>(null);
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListening(null);
        return;
      }
      const next = { ...bindings, [listening]: e.code };
      settingsStore.set((s) => ({ ...s, controls: { ...s.controls, [side === 0 ? 'p1' : 'p2']: next } }));
      sfx.select();
      setListening(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, bindings, side]);
  return (
    <>
      <div className="bind-grid">
        {ACTIONS.map((a) => (
          <div key={a} className="bind-row">
            <span>{ACTION_LABELS[a]}</span>
            <kbd className={listening === a ? 'listening' : ''} onClick={() => { setListening(a); sfx.click(); }}>
              {listening === a ? '...' : keyLabel(bindings[a])}
            </kbd>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          className="btn"
          onClick={() => {
            settingsStore.set((s) => ({ ...s, controls: { ...s.controls, [side === 0 ? 'p1' : 'p2']: { ...(side === 0 ? DEFAULT_P1_BINDINGS : DEFAULT_P2_BINDINGS) } } }));
            sfx.click();
          }}
        >
          Reset defaults
        </button>
      </div>
    </>
  );
};

/** Full settings screen; every change persists immediately through the settings store. */
export const SettingsScreen = ({ onBack, embedded = false }: { onBack: () => void; embedded?: boolean }) => {
  const settings = useStore(settingsStore);
  const [tab, setTab] = useState<Tab>('graphics');
  const [side, setSide] = useState<0 | 1>(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const update = (fn: (s: GameSettings) => GameSettings) => settingsStore.set(fn);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        sfx.back();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);
  return (
    <div className={embedded ? 'overlay' : 'screen settings-screen'}>
      <div className={embedded ? 'panel' : ''} style={embedded ? { width: 'min(900px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', textAlign: 'left' } : { display: 'contents' }}>
        <div className="top-bar">
          <h2 className="screen-title">
            <small>Configure</small>Settings
          </h2>
          <button className="btn ghost" onClick={() => { sfx.back(); onBack(); }}>
            ← Back
          </button>
        </div>
        <div className="settings-body">
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`btn${tab === t.id ? ' active' : ''}`} onClick={() => { setTab(t.id); sfx.hover(); }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="settings-content">
            {tab === 'graphics' && (
              <>
                <Row label="Quality" hint="Render resolution and particle density">
                  <Seg value={settings.graphics.quality} options={['low', 'medium', 'high']} onChange={(v) => update((s) => ({ ...s, graphics: { ...s.graphics, quality: v } }))} />
                </Row>
                <Row label="Particles">
                  <Toggle value={settings.graphics.particles} onChange={(v) => update((s) => ({ ...s, graphics: { ...s.graphics, particles: v } }))} />
                </Row>
                <Row label="Screen shake">
                  <Toggle value={settings.graphics.screenShake} onChange={(v) => update((s) => ({ ...s, graphics: { ...s.graphics, screenShake: v } }))} />
                </Row>
                <Row label="Motion blur" hint="Dash trails and afterimages">
                  <Toggle value={settings.graphics.motionBlur} onChange={(v) => update((s) => ({ ...s, graphics: { ...s.graphics, motionBlur: v } }))} />
                </Row>
                <Row label="Effects" hint="Impact flashes, aberration, block shields">
                  <Toggle value={settings.graphics.effects} onChange={(v) => update((s) => ({ ...s, graphics: { ...s.graphics, effects: v } }))} />
                </Row>
              </>
            )}
            {tab === 'audio' && (
              <>
                <Row label="Master volume">
                  <Slider value={settings.audio.master} onChange={(v) => update((s) => ({ ...s, audio: { ...s.audio, master: v } }))} />
                </Row>
                <Row label="Music volume">
                  <Slider value={settings.audio.music} onChange={(v) => update((s) => ({ ...s, audio: { ...s.audio, music: v } }))} />
                </Row>
                <Row label="SFX volume">
                  <Slider value={settings.audio.sfx} onChange={(v) => update((s) => ({ ...s, audio: { ...s.audio, sfx: v } }))} />
                </Row>
                <Row label="Test" hint="Play a sample hit">
                  <button className="btn" onClick={() => audio.play('heavy-hit')}>
                    Play
                  </button>
                </Row>
              </>
            )}
            {tab === 'controls' && (
              <>
                <Row label="Player" hint="Click a key to rebind, Esc to cancel">
                  <Seg value={side === 0 ? 'Player 1' : 'Player 2'} options={['Player 1', 'Player 2']} onChange={(v) => setSide(v === 'Player 1' ? 0 : 1)} />
                </Row>
                <Bindings side={side} />
              </>
            )}
            {tab === 'accessibility' && (
              <>
                <Row label="Colorblind mode" hint="Neutral indicator colors for P2">
                  <Toggle value={settings.accessibility.colorblind} onChange={(v) => update((s) => ({ ...s, accessibility: { ...s.accessibility, colorblind: v } }))} />
                </Row>
                <Row label="Reduced motion" hint="Disables camera shake, trails and UI animation">
                  <Toggle value={settings.accessibility.reducedMotion} onChange={(v) => update((s) => ({ ...s, accessibility: { ...s.accessibility, reducedMotion: v } }))} />
                </Row>
                <Row label="Reduced flashes" hint="Removes screen flashes and hit strobe">
                  <Toggle value={settings.accessibility.reducedFlashes} onChange={(v) => update((s) => ({ ...s, accessibility: { ...s.accessibility, reducedFlashes: v } }))} />
                </Row>
                <Row label="Subtitles" hint="Shows intro and victory lines">
                  <Toggle value={settings.accessibility.subtitles} onChange={(v) => update((s) => ({ ...s, accessibility: { ...s.accessibility, subtitles: v } }))} />
                </Row>
                <Row label="Finishers" hint="Allow the END HIM sequence after the final KO">
                  <Toggle value={settings.gameplay.finishers} onChange={(v) => update((s) => ({ ...s, gameplay: { ...s.gameplay, finishers: v } }))} />
                </Row>
              </>
            )}
            {tab === 'data' && (
              <>
                <Row label="Reset settings">
                  <button className="btn" onClick={() => { settingsStore.set(structuredClone(DEFAULT_SETTINGS)); sfx.click(); }}>
                    Reset
                  </button>
                </Row>
                <Row label="Reset progress" hint="Clears unlocks and statistics">
                  {confirmReset ? (
                    <div className="seg">
                      <button className="btn primary" onClick={() => { progression.reset(); setConfirmReset(false); sfx.click(); }}>
                        Confirm
                      </button>
                      <button className="btn" onClick={() => setConfirmReset(false)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="btn" onClick={() => setConfirmReset(true)}>
                      Reset
                    </button>
                  )}
                </Row>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
