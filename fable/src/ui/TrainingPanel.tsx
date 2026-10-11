import type { Store } from '@/state/store';
import { useStore } from '@/state/store';
import type { FightUiState, TrainingState } from '@/game/FightUiState';

interface Props {
  store: Store<FightUiState>;
  onChange: (partial: Partial<TrainingState>) => void;
  onReset: () => void;
}

const Row = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="row">
    <span>{label}</span>
    <button className={`toggle${value ? ' on' : ''}`} onClick={() => onChange(!value)}>
      <i />
    </button>
  </div>
);

/** Training mode controls and the live frame-data readout. */
export const TrainingPanel = ({ store, onChange, onReset }: Props) => {
  const ui = useStore(store);
  const t = ui.training;
  const fd = ui.frameData;
  return (
    <>
      <div className="training-panel">
        <h4>TRAINING</h4>
        <Row label="Infinite health" value={t.infiniteHealth} onChange={(v) => onChange({ infiniteHealth: v })} />
        <Row label="Infinite meter" value={t.infiniteMeter} onChange={(v) => onChange({ infiniteMeter: v })} />
        <Row label="Dummy AI" value={t.aiEnabled} onChange={(v) => onChange({ aiEnabled: v })} />
        <Row label="Dummy blocks" value={t.dummyBlock} onChange={(v) => onChange({ dummyBlock: v })} />
        <Row label="Show hitboxes" value={t.showHitboxes} onChange={(v) => onChange({ showHitboxes: v })} />
        <Row label="Frame data" value={t.showFrameData} onChange={(v) => onChange({ showFrameData: v })} />
        <button className="btn" onClick={onReset}>
          Reset position (R)
        </button>
      </div>
      {t.showFrameData && fd && (
        <div className="frame-data">
          <div>
            <b>P1</b> FPS {fd.fps} · F {fd.frame}
            <br />
            State {fd.p1.state}
            <br />
            Attack {fd.p1.attack} ({fd.p1.phase} {fd.p1.frame})
            <br />
            Vel {fd.p1.velocity}
            <br />
            HP {fd.p1.hp} · Meter {fd.p1.meter}
            <br />
            Advantage {fd.p1.advantage >= 0 ? '+' : ''}
            {fd.p1.advantage}
          </div>
          <div>
            <b>P2</b>
            <br />
            State {fd.p2.state}
            <br />
            Attack {fd.p2.attack} ({fd.p2.phase} {fd.p2.frame})
            <br />
            Vel {fd.p2.velocity}
            <br />
            HP {fd.p2.hp} · Meter {fd.p2.meter}
            <br />
            Advantage {fd.p2.advantage >= 0 ? '+' : ''}
            {fd.p2.advantage}
          </div>
        </div>
      )}
    </>
  );
};
