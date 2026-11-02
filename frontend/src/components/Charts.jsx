import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Truck, Layers } from 'lucide-react';

// Custom Tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip-title">{label}</div>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="custom-tooltip-row">
            <span style={{ color: entry.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 8, height: 8, backgroundColor: entry.color, borderRadius: '50%', display: 'inline-block' }} />
              {entry.name}:
            </span>
            <strong style={{ color: '#ffffff' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}
            </strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function Charts({ chartsData = {} }) {
  const {
    plantComparison = [],
    stockComparison = [],
    supplierPerformance = [],
    statusDistribution = [],
    modelCoverage = [],
    dailyTrend = []
  } = chartsData;

  const DONUT_COLORS = {
    Shortage: '#ef4444',
    Surplus: '#10b981',
    Balanced: '#64748b'
  };

  return (
    <div className="charts-grid">
      {/* 1. Plant-wise Plan vs Coverage */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title-group">
            <h3>Plant-wise Plan vs Coverage</h3>
            <p>Target production plan versus actual wheel coverage quantity</p>
          </div>
          <BarChart3 size={18} style={{ color: 'var(--re-red)' }} />
        </div>
        <div className="chart-container">
          {plantComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plantComparison} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="plant" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="plan" name="Plan Qty" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="coverage" name="Coverage Qty" fill="#d8232a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-state">No plant comparison data available</div>
          )}
        </div>
      </div>

      {/* 2. Plant-wise Stock Comparison */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title-group">
            <h3>Plant Stock vs Receipt</h3>
            <p>Warehouse opening stock compared against total receipts inwarded</p>
          </div>
          <Layers size={18} style={{ color: '#2563eb' }} />
        </div>
        <div className="chart-container">
          {stockComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockComparison} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="stock" name="Total Stock" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="receipt" name="Receipt Qty" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-state">No stock comparison data available</div>
          )}
        </div>
      </div>

      {/* 3. Supplier Dispatch vs Inwarded (Horizontal Bar Chart) */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title-group">
            <h3>Supplier Dispatch vs Inwarded</h3>
            <p>Vendor dispatch quantities against verified plant inward receipts</p>
          </div>
          <Truck size={18} style={{ color: '#ea580c' }} />
        </div>
        <div className="chart-container">
          {supplierPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={supplierPerformance}
                margin={{ top: 15, right: 25, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis dataKey="supplier" type="category" tick={{ fill: '#0f172a', fontSize: 12, fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="dispatch" name="Dispatched" fill="#ea580c" radius={[0, 4, 4, 0]} />
                <Bar dataKey="inwarded" name="Inwarded" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-state">No supplier performance data available</div>
          )}
        </div>
      </div>

      {/* 4. Shortage vs Surplus (Donut Chart) */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title-group">
            <h3>Shortage vs Surplus Distribution</h3>
            <p>Overall wheel inventory health and gap ratio across all models</p>
          </div>
          <PieIcon size={18} style={{ color: '#10b981' }} />
        </div>
        <div className="chart-container">
          {statusDistribution.length > 0 && statusDistribution.some(s => s.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DONUT_COLORS[entry.name] || '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val} parts (${(item.payload.qty || 0).toLocaleString()} qty)`,
                    name
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-state">No status distribution data available</div>
          )}
        </div>
      </div>

      {/* 5. Wheel Model-wise Plan and Coverage */}
      {modelCoverage.length > 0 && (
        <div className="chart-card col-span-2">
          <div className="chart-header">
            <div className="chart-title-group">
              <h3>Bike Model-wise Plan & Coverage</h3>
              <p>Top bike models by production plan versus available wheel coverage</p>
            </div>
            <BarChart3 size={18} style={{ color: 'var(--re-red)' }} />
          </div>
          <div className="chart-container" style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelCoverage} margin={{ top: 15, right: 25, left: 10, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="model"
                  tick={{ fill: '#475569', fontSize: 10 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '5px' }} />
                <Bar dataKey="plan" name="Plan" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="coverage" name="Coverage" fill="#d8232a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stock" name="Total Stock" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 6. Daily Dispatch Trend */}
      {dailyTrend.length > 0 && (
        <div className="chart-card col-span-2">
          <div className="chart-header">
            <div className="chart-title-group">
              <h3>Daily Historical Operations Trend</h3>
              <p>Historical daily tracking of total plan, wheel coverage, and receipts across daily tabs</p>
            </div>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="chart-container" style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend} margin={{ top: 15, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="plan"
                  name="Total Plan"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="coverage"
                  name="Wheel Coverage"
                  stroke="#d8232a"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="stock"
                  name="Total Stock"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="receipt"
                  name="Receipt Qty"
                  stroke="#0891b2"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default Charts;

