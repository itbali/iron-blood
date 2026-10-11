import { memo, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { HudState, HudStore } from '../../game/HudStore';

const useHud = <T,>(store: HudStore, sel: (s: HudState) => T): T =>
  useSyncExternalStore(store.subscribe, () => sel(store.getSnapshot()));

const LOW_HEALTH = 0.25;

const HealthBar = memo(function HealthBar({ store, side }: { store: HudStore; side: 0 | 1 }) {
  const hp = useHud(store, (s) => s.fighters[side].hp);
  const max = useHud(store, (s) => s.fighters[side].maxHp);
  const boss = useHud(store, (s) => side === 1 && s.bossName !== null);
  const [hitKey, setHitKey] = useState(0);
  const prev = useRef(hp);
  useEffect(() => {
    if (hp < prev.current - 0.5) setHitKey((k) => k + 1);
    prev.current = hp;
  }, [hp]);
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const inner = `calc(${pct}% - ${pct > 0 ? 6 * (pct / 100) : 0}px)`;
  return (
    <div key={hitKey} className={`health ${hitKey ? 'hit' : ''}`} role="meter" aria-label={`Player ${side + 1} health`} aria-valuenow={Math.round(hp)} aria-valuemax={max}>
      <div className="ghost" style={{ width: inner }} />
      <div className={`fill ${pct / 100 < LOW_HEALTH ? 'low' : boss ? 'boss' : ''}`} style={{ width: inner }} />
      {[25, 50, 75].map((n) => (
        <div key={n} className="notch" style={side === 0 ? { left: `${n}%` } : { right: `${n}%` }} />
      ))}
    </div>
  );
});

const SidePanel = memo(function SidePanel({ store, side }: { store: HudStore; side: 0 | 1 }) {
  const name = useHud(store, (s) => s.fighters[side].name);
  const controller = useHud(store, (s) => s.fighters[side].controller);
  const wins = useHud(store, (s) => s.fighters[side].wins);
  const toWin = useHud(store, (s) => s.roundsToWin);
  const phase2 = useHud(store, (s) => s.fighters[side].phase2);
  return (
    <div className={`hud-side ${side === 0 ? 'left' : 'right'}`}>
      <div className="hud-label">
        <span className={`hud-name ${side === 1 ? 'p2' : ''}`}>{name.toUpperCase()}</span>
        <span className="hud-player">{controller}{phase2 ? ' · PHASE 2' : ''}</span>
      </div>
      <HealthBar store={store} side={side} />
      <div className="round-pips">
        {Array.from({ length: toWin }, (_, i) => (
          <div key={i} className={`pip ${i < wins ? 'won' : ''}`} />
        ))}
      </div>
    </div>
  );
});

const Timer = memo(function Timer({ store }: { store: HudStore }) {
  const t = useHud(store, (s) => s.timer);
  const visible = useHud(store, (s) => s.timerVisible);
  const round = useHud(store, (s) => s.round);
  return (
    <div className="timer">
      <span className={`num ${t <= 10 && visible ? 'urgent' : ''}`}>{visible ? t : '∞'}</span>
      <span className="rnd">ROUND {round}</span>
    </div>
  );
});

const Meter = memo(function Meter({ store, side }: { store: HudStore; side: 0 | 1 }) {
  const meter = useHud(store, (s) => Math.floor(s.fighters[side].meter));
  const ready = useHud(store, (s) => s.fighters[side].superReady);
  return (
    <div className={`meter-row ${side === 0 ? 'left' : 'right'}`}>
      <span className={`meter-label ${ready ? 'ready' : ''}`}>{ready ? 'SUPER READY · I + O' : `ENERGY ${meter}%`}</span>
      <div className={`meter ${ready ? 'ready' : ''}`}>
        <div style={{ width: `calc(${meter}% - ${(4 * meter) / 100}px)` }} />
      </div>
    </div>
  );
});

const Combo = memo(function Combo({ store, side }: { store: HudStore; side: 0 | 1 }) {
  const combo = useHud(store, (s) => s.combo[side]);
  if (!combo || combo.hits < 2) return null;
  const big = combo.hits >= 6;
  return (
    <div key={`${combo.id}-${combo.ended ? 'e' : combo.hits}`} className={`combo ${side === 0 ? 'left' : 'right'} ${combo.ended ? 'ended' : ''}`}>
      <div className="hits display">
        {combo.hits}
        <small>HITS</small>
      </div>
      {big && <div className="label">{combo.hits} HIT COMBO</div>}
      <div className="dmg">{combo.damage} DAMAGE</div>
    </div>
  );
});

const Announce = memo(function Announce({ store }: { store: HudStore }) {
  const a = useHud(store, (s) => s.announce);
  if (!a) return null;
  return (
    <div key={a.id} className={`announce ${a.style}`} role="status" aria-live="assertive">
      <div className="text">{a.text}</div>
      {a.sub && <div className="sub">{a.sub}</div>}
    </div>
  );
});

const Callout = memo(function Callout({ store }: { store: HudStore }) {
  const c = useHud(store, (s) => s.callout);
  if (!c) return null;
  return (
    <div key={c.id} className={`callout ${c.kind} side-${c.side}`}>
      {c.text}
      {c.sub && <span className="sub">{c.sub}</span>}
    </div>
  );
});

const Subtitle = memo(function Subtitle({ store, enabled }: { store: HudStore; enabled: boolean }) {
  const s = useHud(store, (st) => st.subtitle);
  if (!s || !enabled) return null;
  return (
    <div key={s.id} className={`subtitle side-${s.side}`}>
      <b>{s.speaker}:</b>“{s.text}”
    </div>
  );
});

const FinisherHint = memo(function FinisherHint({ store }: { store: HudStore }) {
  const hint = useHud(store, (s) => s.finisherHint);
  if (!hint) return null;
  return <div className="finisher-hint">FINISHER · {hint}</div>;
});

const PhaseHints = memo(function PhaseHints({ store }: { store: HudStore }) {
  const phase = useHud(store, (s) => s.phase);
  const round = useHud(store, (s) => s.round);
  if (phase === 'intro') return <div className="skip-hint">Press any attack to skip</div>;
  if (phase === 'round-start' && round === 1)
    return (
      <div className="fight-controls-hint">
        <span><kbd>A</kbd><kbd>D</kbd>move</span>
        <span><kbd>W</kbd>jump <kbd>S</kbd>crouch</span>
        <span><kbd>J</kbd><kbd>K</kbd>punch <kbd>L</kbd><kbd>;</kbd>kick</span>
        <span><kbd>I</kbd><kbd>O</kbd>special</span>
        <span><kbd>Space</kbd>block <kbd>E</kbd>grab</span>
        <span>combo: J → J → K → I</span>
      </div>
    );
  return null;
});

const BossTag = memo(function BossTag({ store }: { store: HudStore }) {
  const boss = useHud(store, (s) => s.bossName);
  const stage = useHud(store, (s) => s.arcadeStage);
  return (
    <>
      {boss && <div className="boss-tag">BOSS · {boss}</div>}
      {stage !== null && <div className="stage-tag">ARCADE · {stage < 5 ? `FIGHT ${stage}` : 'FINAL BATTLE'}</div>}
    </>
  );
});

/** Fight HUD. Each part subscribes to its own slice so a hit only re-renders one health bar. */
export function HUD({ store, subtitles }: { store: HudStore; subtitles: boolean }) {
  return (
    <div className="hud">
      <div className="hud-top">
        <SidePanel store={store} side={0} />
        <Timer store={store} />
        <SidePanel store={store} side={1} />
      </div>
      <BossTag store={store} />
      <Meter store={store} side={0} />
      <Meter store={store} side={1} />
      <Combo store={store} side={0} />
      <Combo store={store} side={1} />
      <Callout store={store} />
      <Announce store={store} />
      <Subtitle store={store} enabled={subtitles} />
      <FinisherHint store={store} />
      <PhaseHints store={store} />
    </div>
  );
}
