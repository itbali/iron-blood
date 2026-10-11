import { useEffect, useRef, useState } from 'react';
import type { Store } from '@/state/store';
import { useStore } from '@/state/store';
import type { FightUiState } from '@/game/FightUiState';
import type { FighterSnapshot } from '@/game/GameState';
import { COMBO_DISPLAY_MIN_HITS } from '@/core/constants';

const HealthBar = ({ f }: { f: FighterSnapshot }) => {
  const ratio = f.maxHp > 0 ? f.hp / f.maxHp : 0;
  const [lag, setLag] = useState(ratio);
  const lagTimer = useRef(0);
  useEffect(() => {
    window.clearTimeout(lagTimer.current);
    lagTimer.current = window.setTimeout(() => setLag(ratio), 350);
    return () => window.clearTimeout(lagTimer.current);
  }, [ratio]);
  return (
    <div className="health">
      <div className="lag" style={{ transform: `scaleX(${Math.max(ratio, lag)})` }} />
      <div className={`fill${ratio < 0.25 ? ' low' : ''}`} style={{ transform: `scaleX(${ratio})` }} />
      <div className="ticks" />
      <div className="gloss" />
    </div>
  );
};

const Side = ({ f, right, label, rounds, superReady, boss }: { f: FighterSnapshot; right: boolean; label: string; rounds: number; superReady: boolean; boss: boolean }) => (
  <div className={`hud-side${right ? ' right' : ''}`}>
    <div className="hud-name-row">
      <span className={`hud-name${boss ? ' boss' : ''}`}>{f.name}</span>
      <span className="hud-player">{label}</span>
    </div>
    <HealthBar f={f} />
    <div className="meter-wrap">
      <div className={`meter${superReady ? ' full' : ''}`}>
        <i style={{ transform: `scaleX(${Math.min(1, f.meter / f.meterMax)})` }} />
      </div>
      <div className="rounds">
        {Array.from({ length: rounds }, (_, i) => (
          <span key={i} className={`round-pip${i < f.roundsWon ? ' won' : ''}`} />
        ))}
      </div>
    </div>
    {superReady && <div className="super-ready">SUPER READY</div>}
  </div>
);

const Combo = ({ f, right }: { f: FighterSnapshot; right: boolean }) => {
  if (f.comboHits < COMBO_DISPLAY_MIN_HITS) return null;
  return (
    <div className={`combo ${right ? 'right' : 'left'}`} key={f.comboHits}>
      <span className="combo-hits">{f.comboHits}</span>
      <span className="combo-label">{f.comboHits >= 8 ? `${f.comboHits} HIT COMBO` : 'HITS'}</span>
      <span className="combo-dmg">DAMAGE {f.comboDamage}</span>
      {f.maxCombo >= 3 && <span className="combo-dmg">MAX {f.maxCombo}</span>}
    </div>
  );
};

interface Props {
  store: Store<FightUiState>;
  rounds: number;
  colorblind: boolean;
  subtitles: boolean;
  p2Human: boolean;
  bossFight: boolean;
}

/** Fight HUD. Reads the throttled fight store; never touches the simulation. */
export const HUD = ({ store, rounds, colorblind, subtitles, p2Human, bossFight }: Props) => {
  const ui = useStore(store);
  const hud = ui.hud;
  if (!hud) return null;
  const main = hud.announcement;
  const cls = main === 'FIGHT' ? ' fight' : main === 'K.O.' ? ' ko' : main === 'END HIM' ? ' finisher' : '';
  const timerLow = hud.timerEnabled && hud.timer <= 10;
  return (
    <div className={`hud${colorblind ? ' colorblind' : ''}`}>
      <div className="hud-top">
        <Side f={hud.p1} right={false} label="Player 1" rounds={rounds} superReady={hud.superReady[0]} boss={false} />
        <div className="hud-center">
          <div className={`timer${timerLow ? ' low' : ''}${hud.timerEnabled ? '' : ' inf'}`}>{hud.timerEnabled ? String(hud.timer).padStart(2, '0') : '∞'}</div>
          <div className="round-label">{hud.phase === 'match-end' ? 'FINAL' : `ROUND ${hud.round}`}</div>
        </div>
        <Side f={hud.p2} right label={p2Human ? 'Player 2' : bossFight ? 'Boss' : 'CPU'} rounds={rounds} superReady={hud.superReady[1]} boss={bossFight} />
      </div>
      <Combo f={hud.p1} right={false} />
      <Combo f={hud.p2} right />
      {main && (
        <div className="announce" key={`${main}-${hud.round}-${hud.phase}`}>
          <div className={`announce-main${cls}`}>{main}</div>
          {hud.subtitle && <div className="announce-sub">{hud.subtitle}</div>}
        </div>
      )}
      {!main && hud.subtitle && hud.phase === 'finisher' && (
        <div className="announce">
          <div className="announce-sub">{hud.subtitle}</div>
        </div>
      )}
      {ui.banners.map((b) => (
        <div key={b.id} className={`banner ${b.side === 0 ? 'left' : 'right'} ${b.kind}`}>
          {b.text}
        </div>
      ))}
      {ui.superSummary && (
        <div className="super-summary">
          <b>{ui.superSummary.damage}</b>
          <span>
            DAMAGE · {ui.superSummary.hits} HITS
          </span>
        </div>
      )}
      {subtitles && hud.dialogue && (
        <div className={`dialogue${hud.dialogue.side === 1 ? ' p2' : ''}`}>
          <b>{hud.dialogue.speaker.toUpperCase()}</b>
          {hud.dialogue.text}
        </div>
      )}
      {(hud.phase === 'intro' || hud.phase === 'finisher') && <div className="hud-hint">PRESS ANY BUTTON TO SKIP</div>}
      {hud.phase === 'fight' && hud.round === 1 && hud.phaseFrame < 420 && <div className="hud-hint">A/D MOVE · W JUMP · S CROUCH · J K L ; ATTACK · I O SPECIAL · SPACE BLOCK · E GRAB · ESC PAUSE</div>}
    </div>
  );
};
