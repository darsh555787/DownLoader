import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, sans-serif', background: '#f0f4ff', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{
            background: 'white', borderRadius: '1rem', padding: '2.5rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '420px', width: '100%'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#1e293b', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
              Backend not connected
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Darsh Downloader needs a backend server to work.<br />
              Set the <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>VITE_API_URL</code> environment variable in Vercel to your backend URL.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: 'white', border: 'none', borderRadius: '0.75rem',
                padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
