import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, ROSTER_IDS, getCharacter } from '../data/characters';
import type { MoveDef } from '../combat/types';
import { isSkinUnlocked } from '../progression/Progression';
import { Portrait } from './Portrait';
import { useProgress, useSfx } from './services';

const ARROW: Record<string, string> = { FWD: '→', BACK: '←', DOWN: '↓', UP: '↑' };
const BTN: Record<string, string> = { sp1: 'I', sp2: 'O', lp: 'J', hp: 'K', lk: 'L', hk: ';' };

function inputOf(m: MoveDef): string {
  if (m.superInput) return 'I + O';
  if (m.command) return `${m.command.seq.map((d) => ARROW[d]).join(' ')} ${BTN[m.command.button]}`;
  if (m.kind === 'grab') return 'E';
  const prefix = m.stance === 'crouch' ? '↓ ' : m.stance === 'air' ? 'Air ' : '';
  return m.button ? prefix + BTN[m.button] : '-';
}

function ConceptArt({ charId, skin }: { charId: string; skin: string }): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const w = (cv.width = 560);
    const h = (cv.height = 420);
    const def = getCharacter(charId);
    ctx.fillStyle = '#0c0e13';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(213,31,43,0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = '#d51f2b';
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#d51f2b';
    ctx.font = '700 14px Oswald, sans-serif';
    ctx.fillText(`CONCEPT ART  //  ${def.name.toUpperCase()}  //  ${def.title.toUpperCase()}`, 28, 38);
    ctx.fillStyle = '#8a8f9c';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`SKIN: ${skin.toUpperCase()}   HEIGHT: ${def.height}u   WEAPON: ${def.weapon}`, 28, h - 26);
  }, [charId, skin]);
  return (
    <>
      <canvas ref={ref} className="concept" style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
        <Portrait charId={charId} skin={skin} width={170} height={250} zoom={1} />
        <Portrait charId={charId} skin={skin} width={170} height={250} zoom={1} facing={-1} state={undefined} />
      </div>
    </>
  );
}

export function CharactersScreen({ onBack }: { onBack: () => void }): JSX.Element {
  const sfx = useSfx();
  const [progress] = useProgress();
  const ids = progress.unlockedCharacters.includes('archon') ? [...ROSTER_IDS, 'archon'] : [...ROSTER_IDS];
  const [sel, setSel] = useState('raven');
  const [skin, setSkin] = useState('default');
  const [art, setArt] = useState(false);
  const def = CHARACTERS[sel];

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') onBack();
      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        const i = ids.indexOf(sel);
        setSel(ids[(i + (e.code === 'ArrowDown' ? 1 : ids.length - 1)) % ids.length]);
        setSkin('default');
        sfx.hover();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, ids.length, onBack]);

  const moves = Object.values(def.moves).filter((m) => !m.chainOnly || m.kind !== 'normal').filter((m) => m.kind !== 'normal' || ['lightPunch', 'heavyPunch', 'lightKick', 'heavyKick'].includes(m.id) || m.stance === 'crouch');

  return (
    <div className="screen panel-screen">
      <h2 className="screen-title">Characters <small>Roster &amp; Dossiers</small></h2>
      <button className="btn small ghost back" onClick={() => { sfx.click(); onBack(); }}>Back</button>
      <div className="gallery">
        <div className="gal-list">
          {ids.map((id) => (
            <button key={id} className={`chip ${sel === id ? 'on' : ''}`} style={{ textAlign: 'left', padding: '10px 14px' }} onMouseEnter={sfx.hover} onClick={() => { sfx.click(); setSel(id); setSkin('default'); }}>
              {CHARACTERS[id].name}
            </button>
          ))}
        </div>
        <div className="gal-detail">
          <div className="gal-art">
            {art && progress.conceptArtUnlocked ? <ConceptArt charId={sel} skin={skin} /> : <Portrait charId={sel} skin={skin} width={300} height={420} zoom={1.05} />}
          </div>
          <div className="gal-info">
            <div className="hint" style={{ textAlign: 'left', color: 'var(--red)' }}>{def.title}</div>
            <h2>{def.name}</h2>
            <p>{def.bio}</p>
            <div className="opts" style={{ justifyContent: 'flex-start' }}>
              {def.skins.map((s) => {
                const unlocked = isSkinUnlocked(progress, def, s.id);
                return <button key={s.id} className={`chip ${skin === s.id ? 'on' : ''} ${unlocked ? '' : 'locked'}`} onClick={() => unlocked && (sfx.click(), setSkin(s.id))}>{unlocked ? s.name : `🔒 ${s.name}`}</button>;
              })}
              <button className={`chip ${art ? 'on' : ''} ${progress.conceptArtUnlocked ? '' : 'locked'}`} onClick={() => { if (progress.conceptArtUnlocked) { sfx.click(); setArt(!art); } }}>
                {progress.conceptArtUnlocked ? 'Concept Art' : '🔒 Concept Art'}
              </button>
            </div>
            <div className="statrow"><span className="l">Speed</span><div className="bar"><i style={{ width: `${def.stats.speed * 10}%` }} /></div><span className="v">{def.stats.speed}</span></div>
            <div className="statrow"><span className="l">Damage</span><div className="bar"><i style={{ width: `${def.stats.damage * 10}%` }} /></div><span className="v">{def.stats.damage}</span></div>
            <div className="statrow"><span className="l">Health</span><div className="bar"><i style={{ width: `${def.stats.health * 10}%` }} /></div><span className="v">{def.maxHealth}</span></div>
            <p style={{ marginBottom: 4 }}><b className="display">Style</b> · {def.styleText} · <span className="dim">{def.weapon}</span></p>
            {progress.conceptArtUnlocked ? (
              <p className="dim" style={{ marginTop: 0 }}>Dossier: &ldquo;{def.dialogue.intro[0]}&rdquo; — {def.name}</p>
            ) : (
              <p className="locked-note">Dossier locked · complete Arcade to unlock character files and concept art.</p>
            )}
            <div className="moves">
              {moves.map((m) => (
                <div key={m.id}><span>{m.name}</span><b>{inputOf(m)}</b></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
