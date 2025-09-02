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
        <div style={{ padding: 16, color: '#fff', background: '#0D0B14', minHeight: '100vh', fontFamily: 'Inter, system-ui, Arial' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong.</h1>
          <p style={{ opacity: 0.85, marginBottom: 12 }}>Check the browser console for details. Below is a quick summary to help diagnose:</p>
          {this.state.error && (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Error:</div>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{String(this.state.error.message || this.state.error)}</pre>
              {this.state.error.stack && (
                <>
                  <div style={{ fontWeight: 700, marginTop: 10, marginBottom: 6 }}>Stack (first lines):</div>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

export default ErrorBoundary;
