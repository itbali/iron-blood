import { Component, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/** Catches render errors: logs them to the console, shows a friendly screen instead of a stack trace. */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('IRON BLOOD encountered an error', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="error-screen">
          <h2>SIGNAL LOST</h2>
          <p style={{ color: '#a0a6b2' }}>Something went wrong. Your progress is safe.</p>
          <button
            className="btn"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onReset();
            }}
          >
            RETURN TO MENU
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
