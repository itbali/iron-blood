import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/** Last line of defense: logs the error and shows a recoverable screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unrecoverable UI error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen boot-screen" onClick={() => window.location.reload()}>
        <h1 className="logo">
          Iron <span>Blood</span>
        </h1>
        <div className="tagline">Something broke in the arena. Click to restart.</div>
      </div>
    );
  }
}
