import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RetroButton } from '@/components/ui/RetroButton';

interface WindowErrorBoundaryProps {
  children: ReactNode;
}

interface WindowErrorBoundaryState {
  error: Error | null;
}

/**
 * Keeps one app's crash inside its own window. Without this, an exception in
 * any window content unmounts the whole desktop.
 */
export class WindowErrorBoundary extends Component<WindowErrorBoundaryProps, WindowErrorBoundaryState> {
  state: WindowErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WindowErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Window] Content crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="window-crash" role="alert">
        <strong>This app hit a problem.</strong>
        <span>{error.message}</span>
        <RetroButton size="sm" onClick={() => this.setState({ error: null })}>Try again</RetroButton>
      </div>
    );
  }
}
