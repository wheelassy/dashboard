import React, { useState, useMemo } from 'react';
import {
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Factory,
  CheckCircle,
  AlertTriangle,
  MinusCircle
} from 'lucide-react';

export function PlantTable({
  plantName = 'VALLAM',
  items = [],
  supplierColumns = [],
  searchQuery = '',
  statusFilter = 'ALL',
  modelFilter = 'ALL'
}) {
  const [sortField, setSortField] = useState('gap');
  const [sortOrder, setSortOrder] = useState('asc'); // asc shows biggest shortage first!
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filter items based on props
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search query (matches partNo, desc, model)
      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesPart = (item.partNo || '').toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesModel = (item.model || '').toLowerCase().includes(q);
        if (!matchesPart && !matchesDesc && !matchesModel) return false;
      }

      // Status filter
      if (statusFilter && statusFilter !== 'ALL') {
        if (statusFilter.toUpperCase() !== item.status.toUpperCase()) return false;
      }

      // Model filter
      if (modelFilter && modelFilter !== 'ALL') {
        if (item.model !== modelFilter) return false;
      }

      return true;
    });
  }, [items, searchQuery, statusFilter, modelFilter]);

  // Sort items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle supplier stock field if sorting by dynamic supplier column
      if (aVal === undefined && a.supplierStock && a.supplierStock[sortField] !== undefined) {
        aVal = a.supplierStock[sortField];
      }
      if (bVal === undefined && b.supplierStock && b.supplierStock[sortField] !== undefined) {
        bVal = b.supplierStock[sortField];
      }

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

  // Toggle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'gap' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Plant',
      'S.No',
      'Part Number',
      'Description',
      'Bike Model',
      ...supplierColumns.map(s => `${s} Stock`),
      'Total Stock',
      'Plan',
      'Total Receipt Qty',
      'Coverage',
      'Gap',
      'Status'
    ];

    const rows = sortedItems.map(item => [
      item.plant || plantName,
      item.sNo,
      `"${item.partNo}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${(item.model || '').replace(/"/g, '""')}"`,
      ...supplierColumns.map(s => item.supplierStock?.[s] ?? 0),
      item.totalStock,
      item.plan,
      item.totalReceipt,
      item.coverage,
      item.gap,
      item.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Royal_Enfield_${plantName}_Wheels_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: '4px' }} />;
    return sortOrder === 'asc'
      ? <ArrowUp size={12} style={{ color: 'var(--re-red)', marginLeft: '4px' }} />
      : <ArrowDown size={12} style={{ color: 'var(--re-red)', marginLeft: '4px' }} />;
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <h3>
            <Factory size={19} style={{ color: 'var(--re-red)' }} />
            {plantName} Plant Wheel Operations
          </h3>
          <p>
            Showing {sortedItems.length} of {items.length} wheel part configurations
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
              <th onClick={() => handleSort('partNo')}>
                Part Number {renderSortIcon('partNo')}
              </th>
              <th onClick={() => handleSort('description')}>
                Description {renderSortIcon('description')}
              </th>
              <th onClick={() => handleSort('model')}>
                Bike Model {renderSortIcon('model')}
              </th>
              {/* Dynamic Supplier Stock Columns */}
              {supplierColumns.map(col => (
                <th key={col} onClick={() => handleSort(col)} style={{ textAlign: 'right' }}>
                  {col} Stock {renderSortIcon(col)}
                </th>
              ))}
              <th onClick={() => handleSort('totalStock')} style={{ textAlign: 'right' }}>
                Total Stock {renderSortIcon('totalStock')}
              </th>
              <th onClick={() => handleSort('plan')} style={{ textAlign: 'right' }}>
                Plan {renderSortIcon('plan')}
              </th>
              <th onClick={() => handleSort('totalReceipt')} style={{ textAlign: 'right' }}>
                Receipt Qty {renderSortIcon('totalReceipt')}
              </th>
              <th onClick={() => handleSort('coverage')} style={{ textAlign: 'right' }}>
                Coverage {renderSortIcon('coverage')}
              </th>
              <th onClick={() => handleSort('gap')} style={{ textAlign: 'right' }}>
                Gap {renderSortIcon('gap')}
              </th>
              <th onClick={() => handleSort('status')} style={{ textAlign: 'center' }}>
                Status {renderSortIcon('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => {
                const isShortage = item.gap < 0;
                const isSurplus = item.gap > 0;
                return (
                  <tr
                    key={`${item.partNo}-${index}`}
                    className={isShortage ? 'row-shortage' : (isSurplus ? 'row-surplus' : '')}
                  >
                    <td>
                      <span className="part-number-cell">{item.partNo}</span>
                    </td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'normal', fontSize: '0.82rem' }}>
                      {item.description || '—'}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {item.model || '—'}
                      </span>
                    </td>

                    {/* Supplier Stock Values */}
                    {supplierColumns.map(col => (
                      <td key={col} style={{ textAlign: 'right' }} className="cell-number">
                        {item.supplierStock?.[col]?.toLocaleString('en-IN') ?? '0'}
                      </td>
                    ))}

                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="cell-number">
                      {item.totalStock.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }} className="cell-number">
                      {item.plan.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }} className="cell-number">
                      {item.totalReceipt.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }} className="cell-number">
                      {item.coverage.toLocaleString('en-IN')}
                    </td>
                    <td
                      style={{ textAlign: 'right' }}
                      className={`cell-number ${isShortage ? 'cell-highlight-shortage' : (isSurplus ? 'cell-highlight-surplus' : '')}`}
                    >
                      {item.gap > 0 ? `+${item.gap.toLocaleString('en-IN')}` : item.gap.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-status ${item.status.toLowerCase()}`}>
                        {isShortage && <AlertTriangle size={11} />}
                        {isSurplus && <CheckCircle size={11} />}
                        {!isShortage && !isSurplus && <MinusCircle size={11} />}
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={10 + supplierColumns.length}
                  style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                >
                  No wheel parts match the selected filters or search query.
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
          {Math.min(currentPage * pageSize, sortedItems.length)} of {sortedItems.length} records
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

export default PlantTable;

