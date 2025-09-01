import React from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, color: '#fff', background: '#0D0B14', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong.</h1>
          <p style={{ opacity: 0.8 }}>Check the browser console for details.</p>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

export default ErrorBoundary;

