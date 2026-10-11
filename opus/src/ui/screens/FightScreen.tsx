import { useEffect, useMemo, useRef, useState } from 'react';
import { DUMMY_MODES } from '../../ai/DummyController';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../core/constants';
import { FightSession } from '../../game/FightSession';
import type { MatchConfig, MatchResult } from '../../game/GameState';
import { GameLoop } from '../../game/GameLoop';
import { HudStore } from '../../game/HudStore';
import { SYSTEM_KEYS } from '../../input/KeyBindings';
import { useSave, useServices } from '../context';
import { MoveList } from '../components/MoveList';
import { isTouchDevice, TouchControls } from '../components/TouchControls';
import { useMenuNav } from '../components/useMenuNav';
import { HUD } from '../hud/HUD';
import { SettingsScreen } from './Settings';

const RESOLUTION = { low: 0.75, medium: 1, high: 1.5 } as const;
const IS_DEV = import.meta.env.DEV;
const DEV_CHEATS = new Set<string>([SYSTEM_KEYS.cheatHealth, SYSTEM_KEYS.cheatMeter, SYSTEM_KEYS.cheatRefill, SYSTEM_KEYS.cheatAI]);

type PauseView = 'menu' | 'settings' | 'moves';

function PauseMenu({ onResume, onRestart, onExit, view, setView, session }: {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  view: PauseView;
  setView: (v: PauseView) => void;
  session: FightSession;
}) {
  const items = [
    { label: 'RESUME', run: onResume },
    { label: 'RESTART', run: onRestart },
    { label: 'MOVE LIST', run: () => setView('moves') },
    { label: 'SETTINGS', run: () => setView('settings') },
    { label: 'EXIT', run: onExit },
  ];
  const [index, setIndex] = useMenuNav({ count: items.length, onSelect: (i) => items[i].run(), onBack: onResume, enabled: view === 'menu' });
  useEffect(() => {
    if (view !== 'moves') return;
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Backspace' || e.code === 'KeyK') {
        e.stopPropagation();
        setView('menu');
      }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [view, setView]);

  if (view === 'settings') return <SettingsScreen overlay onBack={() => setView('menu')} />;
  return (
    <div className="overlay">
      {view === 'moves' ? (
        <div className="panel overlay-panel" style={{ width: 640, maxHeight: 620, overflowY: 'auto' }}>
          <h2 className="overlay-title" style={{ fontSize: 40 }}>
            {session.fighters[0].def.name.toUpperCase()} · MOVES
          </h2>
          <MoveList def={session.fighters[0].def} />
          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => setView('menu')}>
              BACK
            </button>
          </div>
        </div>
      ) : (
        <div className="panel overlay-panel">
          <h2 className="overlay-title">PAUSED</h2>
          <div className="overlay-menu">
            {items.map((it, i) => (
              <button key={it.label} className={`menu-item ${i === index ? 'active' : ''}`} onMouseEnter={() => setIndex(i)} onClick={it.run} style={{ animationDelay: `${i * 40}ms` }}>
                <span>{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrainingPanel({ session, debug, setDebug }: { session: FightSession; debug: boolean; setDebug: (v: boolean) => void }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 150);
    return () => window.clearInterval(id);
  }, []);
  const t = session.training;
  const fd = session.lastFrameData;
  const dummyIdx = DUMMY_MODES.findIndex((m) => m.id === (t.aiEnabled ? 'cpu' : session.dummy.mode));
  const setDummy = (i: number) => {
    const m = DUMMY_MODES[(i + DUMMY_MODES.length) % DUMMY_MODES.length];
    if (m.id === 'cpu') session.setTraining({ aiEnabled: true });
    else {
      session.dummy.mode = m.id;
      session.setTraining({ aiEnabled: false });
    }
    force((n) => n + 1);
  };
  const toggle = (k: 'infiniteHealth' | 'infiniteMeter') => {
    session.setTraining({ [k]: !t[k] });
    force((n) => n + 1);
  };
  const p1 = session.fighters[0];
  return (
    <div className="panel training-panel">
      <h4>TRAINING</h4>
      <div className="row">
        Infinite Health <button className={`mini ${t.infiniteHealth ? 'on' : ''}`} onClick={() => toggle('infiniteHealth')}>{t.infiniteHealth ? 'ON' : 'OFF'}</button>
      </div>
      <div className="row">
        Infinite Meter <button className={`mini ${t.infiniteMeter ? 'on' : ''}`} onClick={() => toggle('infiniteMeter')}>{t.infiniteMeter ? 'ON' : 'OFF'}</button>
      </div>
      <div className="row">
        Dummy
        <span>
          <button className="mini" onClick={() => setDummy(dummyIdx - 1)}>◀</button> {DUMMY_MODES[dummyIdx].label}{' '}
          <button className="mini" onClick={() => setDummy(dummyIdx + 1)}>▶</button>
        </span>
      </div>
      <div className="row">
        Hitboxes (F3) <button className={`mini ${debug ? 'on' : ''}`} onClick={() => setDebug(!debug)}>{debug ? 'ON' : 'OFF'}</button>
      </div>
      <div className="row">
        Reset position <button className="mini" onClick={() => session.resetPositions()}>R</button>
      </div>
      <div className="frame-data">
        <div>STATE {p1.state}{p1.move ? ` · ${p1.move.id} ${p1.moveFrame}/${p1.moveTotalFrames}` : ''}</div>
        {fd ? (
          <>
            <div>LAST {fd.moveId.toUpperCase()}</div>
            <div>
              S/A/R {fd.startup}/{fd.active}/{fd.recovery}
            </div>
            <div>
              ON {fd.blocked ? 'BLOCK' : 'HIT'}:{' '}
              <span className={fd.advantage >= 0 ? 'adv-plus' : 'adv-minus'}>
                {fd.advantage > 0 ? '+' : ''}
                {fd.advantage}
              </span>
            </div>
          </>
        ) : (
          <div>Hit the dummy to see frame data</div>
        )}
        <div>MAX COMBO {session.combo.maxCombo(0)}</div>
      </div>
    </div>
  );
}

function DebugPanel({ session, loop }: { session: FightSession; loop: GameLoop }) {
  const [info, setInfo] = useState<Record<string, string>>({});
  useEffect(() => {
    const id = window.setInterval(() => setInfo(session.debugInfo(loop.fps)), 100);
    return () => window.clearInterval(id);
  }, [session, loop]);
  return (
    <div className="debug-panel">
      {Object.entries(info).map(([k, v]) => (
        <div key={k}>
          <b>{k}</b> {v}
        </div>
      ))}
      {IS_DEV && <div style={{ color: '#888' }}>DEV: F4 inf. health · F5 inf. meter · F6 refill · F7 reset · F8 toggle AI</div>}
    </div>
  );
}

export function FightScreen({ config, onMatchOver, onExit }: { config: MatchConfig; onMatchOver: (r: MatchResult) => void; onExit: () => void }) {
  const services = useServices();
  const save = useSave();
  const settings = save.settings;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [runId, setRunId] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pauseView, setPauseView] = useState<PauseView>('menu');
  const [debug, setDebug] = useState(false);
  const [session, setSession] = useState<FightSession | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const hud = useMemo(() => new HudStore(), [runId]); // eslint-disable-line react-hooks/exhaustive-deps
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onOverRef = useRef(onMatchOver);
  onOverRef.current = onMatchOver;
  const touch = useMemo(isTouchDevice, []);
  const res = RESOLUTION[settings.graphics.quality];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    services.input.attach();
    services.input.flush();
    let s: FightSession;
    try {
      s = new FightSession({
        config,
        input: services.input,
        audio: services.audio,
        hud,
        settings: settingsRef.current,
        seed: Date.now() & 0xffff,
        onMatchOver: (r) => window.setTimeout(() => onOverRef.current(r), 400),
      });
    } catch (err) {
      console.error('Failed to start fight', err);
      onExit();
      return;
    }
    setSession(s);
    if (IS_DEV) (window as unknown as { __IB?: FightSession }).__IB = s;
    const loop = new GameLoop({
      step: () => s.step(),
      render: (interp, now, dt) => {
        s.render(ctx, interp, now, dt);
        hud.flush();
      },
      get timeScale() {
        return s.timeScale;
      },
    });
    loopRef.current = loop;
    loop.start();
    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, [config, runId, hud, services, onExit]);

  useEffect(() => {
    session?.applySettings(settings);
  }, [session, settings]);

  useEffect(() => {
    if (loopRef.current) loopRef.current.paused = paused;
    if (paused) services.input.flush();
  }, [paused, services]);

  useEffect(() => {
    if (session) session.debug = debug;
  }, [session, debug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === SYSTEM_KEYS.pause) {
        if (!paused) {
          e.preventDefault();
          setPauseView('menu');
          setPaused(true);
          services.audio.play('click');
        }
        return;
      }
      if (paused) return;
      if (e.code === SYSTEM_KEYS.debug) {
        e.preventDefault();
        setDebug((d) => !d);
      } else if (e.code === SYSTEM_KEYS.restart && !e.ctrlKey && !e.metaKey) {
        if (config.mode === 'training') session?.resetPositions();
        else setRunId((n) => n + 1);
      } else if (IS_DEV && e.code === SYSTEM_KEYS.cheatReset) {
        e.preventDefault();
        setRunId((n) => n + 1);
      } else if (IS_DEV && DEV_CHEATS.has(e.code)) {
        e.preventDefault();
        session?.cheat(e.code);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, session, services, config.mode]);

  // Keep the canvas sharp: internal resolution follows the quality setting.
  const cw = Math.round(VIEW_WIDTH * res);
  const ch = Math.round(VIEW_HEIGHT * res);

  return (
    <div className={`screen ${settings.accessibility.colorblind ? 'cb' : ''}`}>
      <canvas ref={canvasRef} className="fill" width={cw} height={ch} />
      <HUD store={hud} subtitles={settings.accessibility.subtitles} />
      {session && config.mode === 'training' && <TrainingPanel session={session} debug={debug} setDebug={setDebug} />}
      {session && debug && loopRef.current && <DebugPanel session={session} loop={loopRef.current} />}
      {touch && !paused && <TouchControls input={services.input} onPause={() => setPaused(true)} />}
      {paused && session && (
        <PauseMenu
          session={session}
          view={pauseView}
          setView={setPauseView}
          onResume={() => setPaused(false)}
          onRestart={() => {
            setPaused(false);
            setRunId((n) => n + 1);
          }}
          onExit={() => {
            setPaused(false);
            onExit();
          }}
        />
      )}
    </div>
  );
}
