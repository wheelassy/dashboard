import React, { useState, useMemo } from 'react';
import {
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Truck,
  PackageCheck,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

export function SupplierTable({
  items = [],
  supplierNames = [],
  supplierFilter = 'ALL',
  searchQuery = ''
}) {
  const [sortField, setSortField] = useState('supplier');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Supplier filter
      if (supplierFilter && supplierFilter !== 'ALL') {
        if (item.supplier !== supplierFilter) return false;
      }

      // Search filter
      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesSupplier = (item.supplier || '').toLowerCase().includes(q);
        const matchesPart = (item.partNo || '').toLowerCase().includes(q);
        const matchesModel = (item.model || '').toLowerCase().includes(q);
        if (!matchesSupplier && !matchesPart && !matchesModel) return false;
      }

      return true;
    });
  }, [items, supplierFilter, searchQuery]);

  // Sort items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      aVal = aVal || 0;
      bVal = bVal || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredItems, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // Sorting helper
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'outstandingBalance' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: '4px' }} />;
    return sortOrder === 'asc'
      ? <ArrowUp size={12} style={{ color: 'var(--re-red)', marginLeft: '4px' }} />
      : <ArrowDown size={12} style={{ color: 'var(--re-red)', marginLeft: '4px' }} />;
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Supplier',
      'Bike Model',
      'Part Number',
      'Opening Stock',
      'Dispatch Quantity',
      'Inwarded Quantity',
      'Total Stock',
      'Outstanding Balance'
    ];

    const rows = sortedItems.map(item => [
      `"${item.supplier}"`,
      `"${item.model}"`,
      `"${item.partNo}"`,
      item.opening,
      item.dispatch,
      item.inwarded,
      item.total,
      item.outstandingBalance
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Royal_Enfield_Supplier_Dispatches_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <h3>
            <Truck size={19} style={{ color: '#ea580c' }} />
            Supplier Dispatch & Inward Tracking
          </h3>
          <p>
            {supplierNames.length} active suppliers detected • {sortedItems.length} line item dispatches
          </p>
        </div>

        <div className="panel-toolbar">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <data-table className="data-table" role="table">
          <thead>
            <tr>
              <th onClick={() => handleSort('supplier')}>
                Supplier Name {renderSortIcon('supplier')}
              </th>
              <th onClick={() => handleSort('model')}>
                Bike Model {renderSortIcon('model')}
              </th>
              <th onClick={() => handleSort('partNo')}>
                Part Number {renderSortIcon('partNo')}
              </th>
              <th onClick={() => handleSort('opening')} style={{ textAlign: 'right' }}>
                Opening {renderSortIcon('opening')}
              </th>
              <th onClick={() => handleSort('dispatch')} style={{ textAlign: 'right' }}>
                Dispatch {renderSortIcon('dispatch')}
              </th>
              <th onClick={() => handleSort('inwarded')} style={{ textAlign: 'right' }}>
                Inwarded {renderSortIcon('inwarded')}
              </th>
              <th onClick={() => handleSort('total')} style={{ textAlign: 'right' }}>
                Total {renderSortIcon('total')}
              </th>
              <th onClick={() => handleSort('outstandingBalance')} style={{ textAlign: 'right' }}>
                Outstanding Balance {renderSortIcon('outstandingBalance')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => {
                const isNegativeOB = item.outstandingBalance < 0;
                const isPositiveOB = item.outstandingBalance > 0;
                return (
                  <tr key={`${item.supplier}-${item.partNo}-${index}`}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {item.supplier}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {item.model || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="part-number-cell">{item.partNo}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="cell-number">
                      {item.opening.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#ea580c' }} className="cell-number">
                      {item.dispatch.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }} className="cell-number">
                      {item.inwarded.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }} className="cell-number">
                      {item.total.toLocaleString('en-IN')}
                    </td>
                    <td
                      style={{ textAlign: 'right' }}
                      className={`cell-number ${isNegativeOB ? 'cell-highlight-shortage' : (isPositiveOB ? 'cell-highlight-surplus' : '')}`}
                    >
                      {item.outstandingBalance > 0 ? `+${item.outstandingBalance.toLocaleString('en-IN')}` : item.outstandingBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No supplier dispatches match current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </data-table>
      </div>

      {/* Pagination Footer */}
      <div className="table-pagination">
        <div>
          Showing {sortedItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, sortedItems.length)} of {sortedItems.length} supplier items
        </div>

        <div className="pagination-controls">
          <select
            className="select-input"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
          >
            <option value={10}>10 / page</option>
            <option value={15}>15 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>

          <button
            className="page-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ margin: '0 6px', fontSize: '0.8rem', fontWeight: 600 }}>
            {currentPage} / {totalPages}
          </span>
          <button
            className="page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupplierTable;

