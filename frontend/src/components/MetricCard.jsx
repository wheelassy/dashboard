import React from 'react';

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  theme = 'primary',
  pillText,
  pillType = 'info'
}) {
  // Format numeric values with commas if number
  const formattedValue = typeof value === 'number'
    ? value.toLocaleString('en-IN')
    : (value ?? '0');

  return (
    <div className={`metric-card theme-${theme}`}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-wrap">
            <Icon size={19} />
          </div>
        )}
      </div>

      <div className="metric-value-wrap">
        <div className="metric-value">{formattedValue}</div>
      </div>

      <div className="metric-subtitle">
        {pillText && (
          <span className={`metric-pill pill-${pillType}`}>
            {pillText}
          </span>
        )}
        <span>{subtitle}</span>
      </div>
    </div>
  );
}

export default MetricCard;

