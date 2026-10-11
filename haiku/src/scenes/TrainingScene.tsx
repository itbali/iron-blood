import './scenes.css'

interface TrainingSceneProps {
  onBack: () => void
}

export function TrainingScene({ onBack }: TrainingSceneProps) {
  return (
    <div className="full-screen">
      <div style={{ textAlign: 'center', paddingTop: '100px', color: '#E7E7E7' }}>
        <h1 style={{ color: '#D51F2B', marginBottom: '40px' }}>TRAINING MODE</h1>

        <div className="settings-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '30px' }}>
            <p style={{ marginBottom: '20px' }}>
              Train against a dummy opponent. Perfect your combos and special moves.
            </p>

            <div className="training-ui">
              <div>FPS: 60</div>
              <div>Player Health: ∞</div>
              <div>Meter: ∞</div>
              <div>Opponent State: IDLE</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <input type="checkbox" defaultChecked /> Infinite Health
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <input type="checkbox" defaultChecked /> Infinite Meter
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <input type="checkbox" /> Show Hitboxes
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <input type="checkbox" /> Show Frame Data
            </label>
          </div>

          <div style={{ marginTop: '30px' }}>
            <button className="menu-btn" onClick={onBack} style={{ minWidth: '200px' }}>
              BACK TO MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
