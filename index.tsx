
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Basic build stamp to help diagnose cache/deploy issues
// eslint-disable-next-line no-console
console.log('Elevated AI build:', new Date().toISOString());
try {
  const hasUrl = Boolean((import.meta as any).env?.VITE_SUPABASE_URL);
  const hasAnon = Boolean((import.meta as any).env?.VITE_SUPABASE_ANON_KEY);
  console.log('Supabase config present:', { hasUrl, hasAnon });
} catch {}

// Surface unhandled errors to help diagnose production issues faster
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error || e.message || e);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason || e);
});
