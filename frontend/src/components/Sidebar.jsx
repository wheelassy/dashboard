import React from 'react';
import {
  LayoutDashboard,
  Factory,
  Truck,
  Layers,
  Database,
  Info,
  X
} from 'lucide-react';

export function Sidebar({
  activeTab,
  setActiveTab,
  counts = {},
  isMobileOpen,
  setIsMobileOpen,
  onOpenDiagnostics
}) {
  const navItems = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      badge: counts.totalParts ? `${counts.totalParts} Parts` : null
    },
    {
      id: 'plants-all',
      label: 'Plant Operations',
      icon: Layers,
      badge: 'All'
    },
    {
      id: 'vallam',
      label: 'Vallam Plant',
      icon: Factory,
      badge: counts.vallamParts ? `${counts.vallamParts}` : null
    },
    {
      id: 'oragadam',
      label: 'Oragadam Plant',
      icon: Factory,
      badge: counts.oragadamParts ? `${counts.oragadamParts}` : null
    },
    {
      id: 'suppliers',
      label: 'Supplier Dispatch',
      icon: Truck,
      badge: counts.suppliers ? `${counts.suppliers}` : null
    }
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 95 }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-container">
            <div className="brand-emblem">RE</div>
            <div className="brand-info">
              <h1>Royal Enfield</h1>
              <span>Wheel Operations</span>
            </div>
          </div>
          {isMobileOpen && (
            <button
              className="btn-icon"
              style={{ background: 'transparent', color: '#fff', border: 'none' }}
              onClick={() => setIsMobileOpen(false)}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation</div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge && <span className="badge">{item.badge}</span>}
              </button>
            );
          })}

          <div className="nav-section-title" style={{ marginTop: '1.5rem' }}>System & Diagnostics</div>
          <button
            className="nav-item"
            onClick={() => {
              if (onOpenDiagnostics) onOpenDiagnostics();
              if (isMobileOpen) setIsMobileOpen(false);
            }}
          >
            <Database size={18} />
            <span>Layout Diagnostics</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div>
              <span className="status-dot"></span>
              <span>Sheets Live Sync</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>v1.0 Read-Only</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

