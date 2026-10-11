import type { CharacterDef } from '../../characters/CharacterDef';

const NORMALS: { slot: keyof CharacterDef['normals']; input: string }[] = [
  { slot: 'lp', input: 'J' },
  { slot: 'hp', input: 'K' },
  { slot: 'lk', input: 'L' },
  { slot: 'hk', input: ';' },
  { slot: 'chp', input: '↓ K' },
  { slot: 'chk', input: '↓ ;' },
];

export function MoveList({ def, compact = false }: { def: CharacterDef; compact?: boolean }) {
  return (
    <div>
      <div className="section-h">SPECIAL MOVES</div>
      <table className="move-list">
        <tbody>
          {def.specialInputs.map((s) => {
            const m = def.specials.find((x) => x.id === s.move);
            return (
              <tr key={`${s.move}-${s.notation}`}>
                <td>{m?.name ?? s.move}</td>
                <td>{s.notation}</td>
              </tr>
            );
          })}
          <tr>
            <td>{def.superMove.name} (SUPER, full meter)</td>
            <td>I + O</td>
          </tr>
          <tr>
            <td>Throw (unblockable, E again to escape)</td>
            <td>E</td>
          </tr>
        </tbody>
      </table>
      <div className="section-h">FINISHERS (END HIM)</div>
      <table className="move-list">
        <tbody>
          {def.finishers.map((f) => (
            <tr key={f.id}>
              <td>
                {f.name} · {f.type}
              </td>
              <td>{f.notation}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compact && (
        <>
          <div className="section-h">NORMALS</div>
          <table className="move-list">
            <tbody>
              {NORMALS.map((n) => {
                const m = def.normals[n.slot];
                return (
                  <tr key={n.slot}>
                    <td>
                      {m.name} <span style={{ color: '#6b717c' }}>· {m.startup}/{m.active}/{m.recovery} · {m.hitLevel}</span>
                    </td>
                    <td>{n.input}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      <div className="section-h">COMBO ROUTES</div>
      <table className="move-list">
        <tbody>
          {def.comboRoutes.map((c) => (
            <tr key={c}>
              <td>Route</td>
              <td>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
