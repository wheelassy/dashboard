import React from 'react';
import { RefreshCw, Menu, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';

export function Header({
  activeTabTitle = 'Wheel Operations Dashboard',
  lastRefreshed,
  isRefreshing,
  countdown = 30,
  onManualRefresh,
  onClearCache,
  onToggleMobile,
  spreadsheetTitle,
  selectedDate
}) {
  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={onToggleMobile} aria-label="Toggle Navigation">
          <Menu size={22} />
        </button>
        <div className="header-title-group">
          <h2>
            {activeTabTitle}
            <span className="header-badge">Live Source</span>
          </h2>
          <p>
            {spreadsheetTitle ? `${spreadsheetTitle} • ` : ''}
            Date: <strong>{selectedDate || 'Latest'}</strong>
          </p>
        </div>
      </div>

      <div className="header-actions">
        <div className="refresh-widget">
          <CheckCircle2 size={15} style={{ color: '#10b981' }} />
          <div className="refresh-text">
            <span>Synced: </span>
            <strong>{formatTime(lastRefreshed)}</strong>
            <span style={{ color: '#94a3b8', marginLeft: '6px' }}>({countdown}s)</span>
          </div>
        </div>

        <button
          className={`btn-icon ${isRefreshing ? 'spinning' : ''}`}
          onClick={onManualRefresh}
          title="Manual Refresh from Google Sheets"
          disabled={isRefreshing}
        >
          <RefreshCw size={16} />
        </button>

        {onClearCache && (
          <button
            className="btn-icon"
            onClick={onClearCache}
            title="Clear Backend Cache & Force Re-fetch"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;

