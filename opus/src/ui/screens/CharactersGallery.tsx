import { useState } from 'react';
import { ALL_CHARACTERS } from '../../data/characters';
import { FighterState } from '../../characters/FighterState';
import { useSave, useServices } from '../context';
import { MoveList } from '../components/MoveList';
import { PortraitCanvas } from '../components/PortraitCanvas';
import { useMenuNav } from '../components/useMenuNav';

/** Character information: bio, stats, strengths, move list and unlockable concept art. */
export function CharactersGallery({ onBack }: { onBack: () => void }) {
  const services = useServices();
  const save = useSave();
  const [art, setArt] = useState(false);
  const list = ALL_CHARACTERS;
  const [index, setIndex] = useMenuNav({
    count: list.length,
    onSelect: () => setArt((a) => !a),
    onBack,
  });
  const def = list[index];
  const unlocked = save.progress.unlockedCharacters.includes(def.id);
  const artUnlocked = save.progress.unlockedArt.includes(`art:${def.id}`);
  const showArt = art && artUnlocked;
  return (
    <div className="screen gallery">
      <h1 className="screen-title display">
        <small>DOSSIERS</small>CHARACTERS
      </h1>
      <div className="gallery-list">
        {list.map((c, i) => {
          const open = save.progress.unlockedCharacters.includes(c.id);
          return (
            <button
              key={c.id}
              className={`menu-item ${i === index ? 'active' : ''}`}
              onMouseEnter={() => {
                if (i !== index) services.audio.play('hover');
                setIndex(i);
              }}
              onClick={() => setIndex(i)}
            >
              <span>{open ? c.name.replace('The ', '').toUpperCase() : '???'}</span>
            </button>
          );
        })}
      </div>
      <div className="gallery-art">
        <PortraitCanvas
          key={`${def.id}-${showArt}`}
          def={def}
          width={400}
          height={590}
          focusY={100}
          zoom={showArt ? 2.6 : 2.1}
          skin={showArt ? 'alt' : 'default'}
          animate
          silhouette={unlocked ? undefined : '#15171c'}
          background="glow"
          glow={showArt ? 'rgba(255,176,46,0.35)' : undefined}
          state={showArt ? FighterState.VICTORY : FighterState.IDLE}
        />
      </div>
      <div className="gallery-info panel">
        {unlocked ? (
          <>
            <div className="char-title">{def.faction.toUpperCase()}</div>
            <h2 className="display">{def.name}</h2>
            <div className="char-title" style={{ color: '#c9ccd3' }}>
              {def.title.toUpperCase()}
            </div>
            <p>{def.bio}</p>
            <div className="two-col">
              <div>
                <div className="section-h">STRENGTHS</div>
                <ul>{def.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <div className="section-h">WEAKNESSES</div>
                <ul>{def.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </div>
            <div className="section-h">
              STATS · SPEED {def.stats.speed} · DAMAGE {def.stats.damage} · HEALTH {def.stats.health} · {def.maxHealth} HP · {def.stats.difficulty.toUpperCase()}
            </div>
            <div className="section-h">CONCEPT ART</div>
            <p style={{ marginTop: 0 }}>
              {artUnlocked ? (
                <button className="btn" onClick={() => setArt((a) => !a)}>
                  {showArt ? 'HIDE CONCEPT ART' : 'VIEW CONCEPT ART'}
                </button>
              ) : (
                'Locked — clear Arcade mode with this character.'
              )}
            </p>
            <MoveList def={def} />
          </>
        ) : (
          <>
            <h2 className="display">CLASSIFIED</h2>
            <p>Defeat the master of the pit in Arcade mode to unlock this dossier.</p>
          </>
        )}
      </div>
      <div className="back-hint">
        <kbd>W</kbd>
        <kbd>S</kbd> browse · <kbd>Enter</kbd> concept art · <kbd>Esc</kbd> back
      </div>
    </div>
  );
}
