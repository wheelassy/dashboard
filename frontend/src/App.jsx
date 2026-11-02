import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';
import './styles.css';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MetricCard from './components/MetricCard';
import Charts from './components/Charts';
import PlantTable from './components/PlantTable';
import SupplierTable from './components/SupplierTable';
import DateFilter from './components/DateFilter';
import { LoadingSpinner, ErrorBanner } from './components/Loading';

// Icons
import {
  Calendar,
  Layers,
  Factory,
  Truck,
  TrendingDown,
  TrendingUp,
  Package,
  CheckCircle2,
  AlertOctagon,
  FileSpreadsheet,
  X,
  RefreshCw
} from 'lucide-react';

export function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'plants-all' | 'vallam' | 'oragadam' | 'suppliers'
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedDateTab, setSelectedDateTab] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(30);

  // Diagnostics Modal
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  // Filter States
  const [plantFilter, setPlantFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [modelFilter, setModelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Timer Ref
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Fetch Dashboard Data
  const fetchDashboard = useCallback(async (tabName = '', isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const data = await api.getDashboard(tabName);
      if (data.success) {
        setDashboardData(data);
        if (!selectedDateTab || tabName) {
          setSelectedDateTab(data.selectedTab);
        }
      } else {
        throw new Error(data.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      // Preserve previous successfully loaded data, but show error banner
      setError(err.message || 'Error communicating with backend server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setCountdown(30);
    }
  }, [selectedDateTab]);

  // Initial load
  useEffect(() => {
    fetchDashboard('', false);
  }, []);

  // 30-Second Auto Refresh Interval & 1s countdown ticker
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : 30));
    }, 1000);

    timerRef.current = setInterval(() => {
      fetchDashboard(selectedDateTab, true);
    }, 30000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [fetchDashboard, selectedDateTab]);

  // Handle Tab / Date Change
  const handleSelectDateTab = (tabName) => {
    setSelectedDateTab(tabName);
    fetchDashboard(tabName, false);
  };

  // Manual Refresh
  const handleManualRefresh = () => {
    fetchDashboard(selectedDateTab, true);
  };

  // Clear Server Cache
  const handleClearCache = async () => {
    try {
      setIsRefreshing(true);
      await api.clearCache();
      await fetchDashboard(selectedDateTab, true);
    } catch (e) {
      console.error('Failed to clear cache:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Diagnostics
  const handleOpenDiagnostics = async () => {
    setDiagnosticsModalOpen(true);
    setIsLoadingDiagnostics(true);
    try {
      const res = await api.getLayoutDiagnostics(selectedDateTab);
      setDiagnosticsData(res);
    } catch (e) {
      console.error('Error fetching layout diagnostics:', e);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setPlantFilter('ALL');
    setSupplierFilter('ALL');
    setModelFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  // Available models derived from current plant data
  const availableModels = React.useMemo(() => {
    if (!dashboardData) return [];
    const models = new Set();
    const vallamItems = dashboardData.plants?.VALLAM?.items || [];
    const oragadamItems = dashboardData.plants?.ORAGADAM?.items || [];
    [...vallamItems, ...oragadamItems].forEach(item => {
      if (item.model) models.add(item.model);
    });
    return Array.from(models).sort();
  }, [dashboardData]);

  // Header Title based on Active Tab
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Executive Operations Overview';
      case 'plants-all': return 'All Plants Inventory & Coverage';
      case 'vallam': return 'Vallam Plant Operations';
      case 'oragadam': return 'Oragadam Plant Operations';
      case 'suppliers': return 'Supplier Dispatch & Inward Tracking';
      default: return 'Royal Enfield Wheel Dashboard';
    }
  };

  // Plant Data Shorthands
  const vallamData = dashboardData?.plants?.VALLAM || { items: [], supplierColumns: [], summary: {} };
  const oragadamData = dashboardData?.plants?.ORAGADAM || { items: [], supplierColumns: [], summary: {} };
  const supplierData = dashboardData?.suppliers || { items: [], supplierNames: [], summary: {} };
  const kpis = dashboardData?.kpis || {};

  // Combined parts for 'plants-all' view
  const combinedPlantItems = React.useMemo(() => {
    if (!dashboardData) return [];
    if (plantFilter === 'VALLAM') return vallamData.items;
    if (plantFilter === 'ORAGADAM') return oragadamData.items;
    return [...vallamData.items, ...oragadamData.items];
  }, [dashboardData, plantFilter, vallamData.items, oragadamData.items]);

  // Merged supplier columns for combined table
  const combinedSupplierCols = React.useMemo(() => {
    if (plantFilter === 'VALLAM') return vallamData.supplierColumns;
    if (plantFilter === 'ORAGADAM') return oragadamData.supplierColumns;
    return Array.from(new Set([...(vallamData.supplierColumns || []), ...(oragadamData.supplierColumns || [])]));
  }, [plantFilter, vallamData.supplierColumns, oragadamData.supplierColumns]);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={{
          totalParts: kpis.totalPartsCount,
          vallamParts: vallamData.items?.length,
          oragadamParts: oragadamData.items?.length,
          suppliers: supplierData.supplierNames?.length
        }}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onOpenDiagnostics={handleOpenDiagnostics}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          activeTabTitle={getHeaderTitle()}
          lastRefreshed={dashboardData?.lastRefreshed}
          isRefreshing={isRefreshing}
          countdown={countdown}
          onManualRefresh={handleManualRefresh}
          onClearCache={handleClearCache}
          onToggleMobile={() => setIsMobileOpen(prev => !prev)}
          spreadsheetTitle={dashboardData?.spreadsheet}
          selectedDate={dashboardData?.selectedDate}
        />

        <main className="main-content">
          {/* Error Banner */}
          {error && (
            <ErrorBanner
              message={error}
              onRetry={() => fetchDashboard(selectedDateTab, false)}
            />
          )}

          {/* Filter and Date Bar */}
          <DateFilter
            availableTabs={dashboardData?.availableTabs || []}
            selectedTab={selectedDateTab}
            onSelectTab={handleSelectDateTab}
            latestTab={dashboardData?.latestDailyTab}
            plantFilter={activeTab === 'plants-all' ? plantFilter : undefined}
            onSelectPlant={activeTab === 'plants-all' ? setPlantFilter : undefined}
            supplierFilter={activeTab === 'suppliers' ? supplierFilter : undefined}
            onSelectSupplier={activeTab === 'suppliers' ? setSupplierFilter : undefined}
            availableSuppliers={supplierData.supplierNames || []}
            modelFilter={activeTab !== 'suppliers' ? modelFilter : undefined}
            onSelectModel={activeTab !== 'suppliers' ? setModelFilter : undefined}
            availableModels={availableModels}
            statusFilter={activeTab !== 'suppliers' ? statusFilter : undefined}
            onSelectStatus={activeTab !== 'suppliers' ? setStatusFilter : undefined}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onResetFilters={handleResetFilters}
          />

          {/* Initial Loading Spinner */}
          {isLoading && !dashboardData ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* 8 KPI CARDS - Calculated from Actual Google Sheets Data */}
              <div className="kpi-grid">
                {/* 1. Total Wheel Plan */}
                <MetricCard
                  title="Total Wheel Plan"
                  value={kpis.totalPlan}
                  subtitle="Both Plants Combined"
                  icon={Calendar}
                  theme="primary"
                  pillText="Target"
                  pillType="info"
                />

                {/* 2. Available Wheel Coverage */}
                <MetricCard
                  title="Available Coverage"
                  value={kpis.availableCoverage}
                  subtitle={
                    kpis.totalPlan > 0
                      ? `${((kpis.availableCoverage / kpis.totalPlan) * 100).toFixed(1)}% of Plan Target`
                      : 'Gross available wheel coverage'
                  }
                  icon={CheckCircle2}
                  theme="blue"
                  pillText="Coverage Qty"
                  pillType="info"
                />

                {/* 3. Total Stock */}
                <MetricCard
                  title="Total Stock"
                  value={kpis.totalStock}
                  subtitle={`Vallam: ${vallamData.summary?.totalStock?.toLocaleString() || 0} | Oragadam: ${oragadamData.summary?.totalStock?.toLocaleString() || 0}`}
                  icon={Package}
                  theme="purple"
                  pillText="On Hand"
                  pillType="info"
                />

                {/* 4. Total Receipt Quantity */}
                <MetricCard
                  title="Total Receipt Qty"
                  value={kpis.totalReceipt}
                  subtitle="Inwarded to Plant Assembly"
                  icon={Layers}
                  theme="cyan"
                  pillText="Inward Receipts"
                  pillType="info"
                />

                {/* 5. Shortage Quantity */}
                <MetricCard
                  title="Shortage Quantity"
                  value={kpis.shortageQty}
                  subtitle={`${kpis.shortageItemCount || 0} wheel parts with gap < 0`}
                  icon={TrendingDown}
                  theme="red"
                  pillText="Deficit"
                  pillType="danger"
                />

                {/* 6. Surplus Quantity */}
                <MetricCard
                  title="Surplus Quantity"
                  value={kpis.surplusQty}
                  subtitle={`${kpis.surplusItemCount || 0} wheel parts with gap > 0`}
                  icon={TrendingUp}
                  theme="green"
                  pillText="Surplus"
                  pillType="success"
                />

                {/* 7. Total Supplier Dispatch */}
                <MetricCard
                  title="Supplier Dispatch"
                  value={kpis.totalDispatch}
                  subtitle="En Route from Wheel Vendors"
                  icon={Truck}
                  theme="orange"
                  pillText="Dispatched"
                  pillType="info"
                />

                {/* 8. Total Supplier Inwarded */}
                <MetricCard
                  title="Supplier Inwarded"
                  value={kpis.totalInwarded}
                  subtitle="Receipt Verified at Gate"
                  icon={CheckCircle2}
                  theme="teal"
                  pillText="Gate Inward"
                  pillType="info"
                />
              </div>

              {/* VIEW: EXECUTIVE OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  <Charts chartsData={dashboardData?.charts} />

                  {/* Summary preview of both plants */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="panel-card" style={{ marginBottom: 0 }}>
                      <div className="panel-header">
                        <div className="panel-title-group">
                          <h3><Factory size={18} style={{ color: 'var(--re-red)' }} /> Vallam Plant Summary</h3>
                          <p>{vallamData.items.length} Parts Configured</p>
                        </div>
                        <button className="btn-secondary" onClick={() => setActiveTab('vallam')}>View Full Plant</button>
                      </div>
                      <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                          <div>Plan: <strong>{vallamData.summary?.plan?.toLocaleString()}</strong></div>
                          <div>Coverage: <strong>{vallamData.summary?.coverage?.toLocaleString()}</strong></div>
                          <div>Stock: <strong>{vallamData.summary?.totalStock?.toLocaleString()}</strong></div>
                          <div>Receipt: <strong>{vallamData.summary?.totalReceipt?.toLocaleString()}</strong></div>
                          <div style={{ color: '#dc2626' }}>Shortage: <strong>{vallamData.summary?.shortageQty?.toLocaleString()}</strong></div>
                          <div style={{ color: '#059669' }}>Surplus: <strong>{vallamData.summary?.surplusQty?.toLocaleString()}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="panel-card" style={{ marginBottom: 0 }}>
                      <div className="panel-header">
                        <div className="panel-title-group">
                          <h3><Factory size={18} style={{ color: '#2563eb' }} /> Oragadam Plant Summary</h3>
                          <p>{oragadamData.items.length} Parts Configured</p>
                        </div>
                        <button className="btn-secondary" onClick={() => setActiveTab('oragadam')}>View Full Plant</button>
                      </div>
                      <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                          <div>Plan: <strong>{oragadamData.summary?.plan?.toLocaleString()}</strong></div>
                          <div>Coverage: <strong>{oragadamData.summary?.coverage?.toLocaleString()}</strong></div>
                          <div>Stock: <strong>{oragadamData.summary?.totalStock?.toLocaleString()}</strong></div>
                          <div>Receipt: <strong>{oragadamData.summary?.totalReceipt?.toLocaleString()}</strong></div>
                          <div style={{ color: '#dc2626' }}>Shortage: <strong>{oragadamData.summary?.shortageQty?.toLocaleString()}</strong></div>
                          <div style={{ color: '#059669' }}>Surplus: <strong>{oragadamData.summary?.surplusQty?.toLocaleString()}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* VIEW: ALL PLANTS */}
              {activeTab === 'plants-all' && (
                <PlantTable
                  plantName={plantFilter === 'ALL' ? 'Combined (Vallam + Oragadam)' : plantFilter}
                  items={combinedPlantItems}
                  supplierColumns={combinedSupplierCols}
                  searchQuery={searchQuery}
                  statusFilter={statusFilter}
                  modelFilter={modelFilter}
                />
              )}

              {/* VIEW: VALLAM */}
              {activeTab === 'vallam' && (
                <PlantTable
                  plantName="VALLAM"
                  items={vallamData.items}
                  supplierColumns={vallamData.supplierColumns}
                  searchQuery={searchQuery}
                  statusFilter={statusFilter}
                  modelFilter={modelFilter}
                />
              )}

              {/* VIEW: ORAGADAM */}
              {activeTab === 'oragadam' && (
                <PlantTable
                  plantName="ORAGADAM"
                  items={oragadamData.items}
                  supplierColumns={oragadamData.supplierColumns}
                  searchQuery={searchQuery}
                  statusFilter={statusFilter}
                  modelFilter={modelFilter}
                />
              )}

              {/* VIEW: SUPPLIER DISPATCH */}
              {activeTab === 'suppliers' && (
                <>
                  <SupplierTable
                    items={supplierData.items}
                    supplierNames={supplierData.supplierNames}
                    supplierFilter={supplierFilter}
                    searchQuery={searchQuery}
                  />

                  {/* Supplier Performance Chart */}
                  <div className="chart-card" style={{ marginTop: '1.5rem' }}>
                    <div className="chart-header">
                      <div className="chart-title-group">
                        <h3>Vendor Dispatch vs Inward Verification</h3>
                        <p>Total dispatch against received inward across detected suppliers</p>
                      </div>
                    </div>
                    <Charts chartsData={{ supplierPerformance: dashboardData?.charts?.supplierPerformance || [] }} />
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* DIAGNOSTICS MODAL */}
      {diagnosticsModalOpen && (
        <div className="modal-overlay" onClick={() => setDiagnosticsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--re-red)' }} />
                Sheet Layout Diagnostics & Validation
              </h3>
              <button
                className="btn-icon"
                onClick={() => setDiagnosticsModalOpen(false)}
                style={{ border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {isLoadingDiagnostics ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Inspecting workbook structure...</div>
              ) : diagnosticsData ? (
                <div>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Sheet: <strong>{diagnosticsData.selectedTab}</strong> • Total rows retrieved: <strong>{diagnosticsData.totalRows}</strong>
                  </p>

                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Detected Plant & Supplier Sections</h4>
                  <pre className="code-block" style={{ marginBottom: '1rem' }}>
                    {JSON.stringify(diagnosticsData.detectedSections, null, 2)}
                  </pre>

                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Available Daily Tabs ({diagnosticsData.availableDailyTabs?.length})</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                    {diagnosticsData.availableDailyTabs?.map(t => (
                      <span key={t.name} className="part-number-cell" style={{ cursor: 'pointer' }} onClick={() => { handleSelectDateTab(t.name); setDiagnosticsModalOpen(false); }}>
                        {t.name}
                      </span>
                    ))}
                  </div>

                  {diagnosticsData.nonDailyTabs?.length > 0 && (
                    <>
                      <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Excluded Non-Daily Tabs</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {diagnosticsData.nonDailyTabs.map(t => (
                          <span key={t} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div>No diagnostics data retrieved</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

