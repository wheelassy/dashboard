import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading live wheel operations data...' }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{message}</p>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
        Fetching latest Google Sheets updates
      </span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner">
      <div className="error-banner-content">
        <AlertCircle size={20} />
        <div>
          <strong>Unable to load dashboard data</strong>
          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{message}</div>
        </div>
      </div>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry} style={{ padding: '0.35rem 0.75rem' }}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export default LoadingSpinner;

