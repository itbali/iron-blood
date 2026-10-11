import { useEffect, useState } from 'react';
import { DIFFICULTY_LABEL } from '../ai/Difficulty';
import { getCharacter } from '../data/characters';
import type { ArcadeStats } from '../game/ArcadeRun';
import type { FightResult } from '../game/FightConfig';
import type { ArcadeReward } from '../progression/Progression';
import { Portrait } from './Portrait';
import { useServices, useSfx } from './services';

function useEnterKey(fn: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fn, enabled]);
}

const fmtTime = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Between Arcade fights: victory stats, healing, and the next opponent. */
export function ArcadeIntermission({ result, playerName, nextId, index, total, onContinue }: {
  result: FightResult; playerName: string; nextId: string; index: number; total: number; onContinue: () => void;
}): JSX.Element {
  const sfx = useSfx();
  const { audio } = useServices();
  const [heal, setHeal] = useState(0.35);
  useEffect(() => {
    audio.setTrack('victory');
    const t = setInterval(() => setHeal((h) => Math.min(1, h + 0.03)), 50);
    return () => clearInterval(t);
  }, [audio]);
  useEnterKey(onContinue);
  const next = getCharacter(nextId);
  return (
    <div className="screen results">
      <h2>Fight {index} of {total} cleared</h2>
      <h1>{playerName} Wins</h1>
      <div className="stats">
        <div className="stat">Time <b>{fmtTime(result.timeSec)}</b></div>
        <div className="stat">Rounds <b>{result.p1Wins}-{result.p2Wins}</b></div>
        <div className="stat">Max Combo <b>{result.maxCombo[0]}</b></div>
        <div className="stat">Damage Dealt <b>{result.damage[0]}</b></div>
      </div>
      <div className="heal">
        <div className="hint" style={{ marginBottom: 4 }}>Recovering · {Math.round(heal * 100)}%</div>
        <div className="progress"><div style={{ width: `${heal * 100}%` }} /></div>
      </div>
      <h2 style={{ marginTop: 14 }}>{index + 1 === total ? 'Final Opponent' : 'Next Opponent'}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Portrait charId={nextId} width={150} height={190} zoom={1} facing={-1} silhouette={false} />
        <div style={{ textAlign: 'left' }}>
          <div className="display" style={{ fontSize: 36 }}>{next.name}</div>
          <div className="hint" style={{ textAlign: 'left' }}>{next.title}</div>
        </div>
      </div>
      <div className="row"><button className="btn" onMouseEnter={sfx.hover} onClick={() => { sfx.click(); onContinue(); }}>Continue</button></div>
    </div>
  );
}

export function VsSplash({ p1, p2, subtitle, onDone }: { p1: string; p2: string; subtitle: string; onDone: () => void }): JSX.Element {
  const { audio } = useServices();
  useEffect(() => {
    audio.play('announce');
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [audio, onDone]);
  useEnterKey(onDone);
  const a = getCharacter(p1);
  const b = getCharacter(p2);
  return (
    <div className="screen vs">
      <div className="side">
        <Portrait charId={p1} width={300} height={400} zoom={1} />
        <div className="nm">{a.name}</div>
        <div className="sub">{a.title}</div>
      </div>
      <div className="vs-mark">VS</div>
      <div className="side r">
        <Portrait charId={p2} width={300} height={400} zoom={1} facing={-1} />
        <div className="nm">{b.name}</div>
        <div className="sub">{b.title}</div>
      </div>
      <div className="hint" style={{ position: 'absolute', bottom: 24, left: 0, right: 0 }}>{subtitle}</div>
    </div>
  );
}

export function ArcadeDefeat({ onContinue, onQuit, continues }: { onContinue: () => void; onQuit: () => void; continues: number }): JSX.Element {
  const sfx = useSfx();
  const { audio } = useServices();
  useEffect(() => audio.setTrack('none'), [audio]);
  useEnterKey(onContinue);
  return (
    <div className="screen results">
      <h1 style={{ color: 'var(--red)' }}>Defeated</h1>
      <h2>The arena claims another</h2>
      <div className="hint">Continues used: {continues}</div>
      <div className="row">
        <button className="btn" onMouseEnter={sfx.hover} onClick={() => { sfx.click(); onContinue(); }}>Continue</button>
        <button className="btn ghost" onMouseEnter={sfx.hover} onClick={() => { sfx.click(); onQuit(); }}>Main Menu</button>
      </div>
    </div>
  );
}

export function ArcadeEnding({ playerName, playerId, stats, reward, difficulty, onDone }: {
  playerName: string; playerId: string; stats: ArcadeStats; reward: ArcadeReward; difficulty: keyof typeof DIFFICULTY_LABEL; onDone: () => void;
}): JSX.Element {
  const { audio } = useServices();
  const sfx = useSfx();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    audio.setTrack('victory');
    const a = setTimeout(() => setStage(1), 1800);
    return () => clearTimeout(a);
  }, [audio]);
  useEnterKey(() => (stage === 0 ? setStage(1) : onDone()));
  return (
    <div className="screen results" style={{ background: 'radial-gradient(circle at 50% 30%, #3a0c14 0%, #040507 75%)' }}>
      {stage === 0 ? (
        <>
          <Portrait charId={playerId} width={260} height={340} zoom={1} />
          <h1>{playerName} Wins</h1>
        </>
      ) : (
        <>
          <h2>Arcade Complete · {DIFFICULTY_LABEL[difficulty]}</h2>
          <h1 style={{ fontSize: 'clamp(40px, 7vw, 90px)' }}>Arcade Complete</h1>
          <div className="stats">
            <div className="stat">Time <b>{fmtTime(stats.timeSec)}</b></div>
            <div className="stat">Wins <b>{stats.wins}</b></div>
            <div className="stat">Max Combo <b>{stats.maxCombo}</b></div>
            <div className="stat">Damage Dealt <b>{stats.damage}</b></div>
          </div>
          <div className="unlocks">
            {reward.newSkin && <div className="unlock">Unlocked · Skin · {reward.newSkin}</div>}
            {reward.nightmare && <div className="unlock">Unlocked · Nightmare Difficulty</div>}
            {reward.conceptArt && <div className="unlock">Unlocked · Concept Art &amp; Character Dossiers</div>}
            {reward.archon && <div className="unlock">Unlocked · The Archon (Versus / Training)</div>}
            {!reward.newSkin && !reward.nightmare && !reward.conceptArt && !reward.archon && <div className="hint">Progress saved · all rewards already unlocked</div>}
          </div>
          <div className="row"><button className="btn" onMouseEnter={sfx.hover} onClick={() => { sfx.click(); onDone(); }}>Main Menu</button></div>
        </>
      )}
    </div>
  );
}

export function VersusResult({ winnerName, result, onRematch, onSelect, onMenu }: {
  winnerName: string; result: FightResult; onRematch: () => void; onSelect: () => void; onMenu: () => void;
}): JSX.Element {
  const sfx = useSfx();
  const { audio } = useServices();
  useEffect(() => audio.setTrack('victory'), [audio]);
  useEnterKey(onRematch);
  const btn = (label: string, fn: () => void, ghost = false): JSX.Element => (
    <button className={`btn ${ghost ? 'ghost' : ''}`} onMouseEnter={sfx.hover} onClick={() => { sfx.click(); fn(); }}>{label}</button>
  );
  return (
    <div className="screen results">
      <h2>Match Complete</h2>
      <h1>{winnerName} Wins</h1>
      <div className="stats">
        <div className="stat">Rounds <b>{result.p1Wins}-{result.p2Wins}</b></div>
        <div className="stat">Time <b>{fmtTime(result.timeSec)}</b></div>
        <div className="stat">P1 Max Combo <b>{result.maxCombo[0]}</b></div>
        <div className="stat">P2 Max Combo <b>{result.maxCombo[1]}</b></div>
      </div>
      <div className="row">{btn('Rematch', onRematch)}{btn('Change Fighters', onSelect, true)}{btn('Main Menu', onMenu, true)}</div>
    </div>
  );
}
