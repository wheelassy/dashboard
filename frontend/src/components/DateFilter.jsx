import React from 'react';
import { Calendar, Filter, Search, RotateCcw, Factory, Truck } from 'lucide-react';

export function DateFilter({
  availableTabs = [],
  selectedTab,
  onSelectTab,
  latestTab,
  plantFilter,
  onSelectPlant,
  supplierFilter,
  onSelectSupplier,
  availableSuppliers = [],
  modelFilter,
  onSelectModel,
  availableModels = [],
  statusFilter,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  onResetFilters
}) {
  const isFiltered = (
    (plantFilter && plantFilter !== 'ALL') ||
    (supplierFilter && supplierFilter !== 'ALL') ||
    (modelFilter && modelFilter !== 'ALL') ||
    (statusFilter && statusFilter !== 'ALL') ||
    (searchQuery && searchQuery.trim() !== '')
  );

  return (
    <div className="controls-bar">
      <div className="controls-left">
        {/* Date Selector */}
        <div className="filter-group">
          <Calendar size={16} style={{ color: 'var(--re-red)' }} />
          <span className="filter-label">Sheet Date:</span>
          <div className="date-select-wrapper">
            <select
              className="select-input"
              value={selectedTab || ''}
              onChange={(e) => onSelectTab(e.target.value)}
            >
              {availableTabs.map((tab) => (
                <option key={tab.name} value={tab.name}>
                  {tab.name} {tab.name === latestTab ? '★ (Latest)' : ''}
                </option>
              ))}
            </select>
            {selectedTab === latestTab && (
              <span className="latest-pill">Live</span>
            )}
          </div>
        </div>

        {/* Plant Selector */}
        {onSelectPlant && (
          <div className="filter-group">
            <Factory size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="filter-label">Plant:</span>
            <select
              className="select-input"
              value={plantFilter || 'ALL'}
              onChange={(e) => onSelectPlant(e.target.value)}
            >
              <option value="ALL">All Plants (Vallam & Oragadam)</option>
              <option value="VALLAM">Vallam Plant</option>
              <option value="ORAGADAM">Oragadam Plant</option>
            </select>
          </div>
        )}

        {/* Status Filter */}
        {onSelectStatus && (
          <div className="filter-group">
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <span className="filter-label">Status:</span>
            <select
              className="select-input"
              value={statusFilter || 'ALL'}
              onChange={(e) => onSelectStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="SHORTAGE">Shortage (Gap &lt; 0)</option>
              <option value="SURPLUS">Surplus (Gap &gt; 0)</option>
              <option value="BALANCED">Balanced (Gap = 0)</option>
            </select>
          </div>
        )}

        {/* Bike Model Selector */}
        {onSelectModel && availableModels.length > 0 && (
          <div className="filter-group">
            <span className="filter-label">Model:</span>
            <select
              className="select-input"
              value={modelFilter || 'ALL'}
              onChange={(e) => onSelectModel(e.target.value)}
              style={{ maxWidth: '160px' }}
            >
              <option value="ALL">All Models</option>
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Supplier Selector */}
        {onSelectSupplier && availableSuppliers.length > 0 && (
          <div className="filter-group">
            <Truck size={15} style={{ color: 'var(--text-muted)' }} />
            <span className="filter-label">Supplier:</span>
            <select
              className="select-input"
              value={supplierFilter || 'ALL'}
              onChange={(e) => onSelectSupplier(e.target.value)}
            >
              <option value="ALL">All Suppliers</option>
              {availableSuppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="controls-right">
        {/* Search Input */}
        {onSearchChange && (
          <div className="search-input-wrap">
            <Search size={15} />
            <input
              type="text"
              className="text-input"
              placeholder="Search part no, model..."
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {/* Reset Filter Button */}
        {isFiltered && onResetFilters && (
          <button
            className="btn-secondary"
            onClick={onResetFilters}
            title="Reset active filters"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default DateFilter;

