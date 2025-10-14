import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatNumberWithSpaces } from '../utils/numberUtils';

// Combined chart component for multiple data types
export const CombinedTrendChart = ({
  data,
  title,
  timePeriod,
  color = '#007bff',
  dataKey = 'value'
}) => {
  // Format data for display
  const formattedData = data.map((item, index) => ({
    ...item,
    displayLabel: formatDateLabel(item.label, timePeriod),
    reception: parseFloat(item.reception || 0),
    export: parseFloat(item.export || 0),
    ecart: parseFloat(item.ecart || 0)
  }));

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">{title || `Combined Trends by ${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}`}</h3>
        {data.length > 0 && (
          <p className="chart-summary">
            Total Data Points: {data.length}
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 40, bottom: 100 }}
          className="dashboard-line-chart"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f7fafc"
            vertical={false}
          />
          <XAxis
            dataKey="displayLabel"
            tick={{ fontSize: '0.875rem', fill: '#4a5568', fontWeight: '500' }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
          />
          <YAxis
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            tick={{ fontSize: '0.875rem', fill: '#4a5568', fontWeight: '500' }}
            width={40}
          />
          <Tooltip
            content={<CombinedTooltip />}
            cursor={{ strokeDasharray: '3 3' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="reception"
            stroke="#17a2b8"
            strokeWidth={3}
            dot={{ fill: '#17a2b8', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#17a2b8', strokeWidth: 2 }}
            name="📥 Reception"
          />
          <Line
            type="monotone"
            dataKey="export"
            stroke="#28a745"
            strokeWidth={3}
            dot={{ fill: '#28a745', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#28a745', strokeWidth: 2 }}
            name="📤 Export"
          />
          <Line
            type="monotone"
            dataKey="ecart"
            stroke="#ffc107"
            strokeWidth={3}
            dot={{ fill: '#ffc107', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#ffc107', strokeWidth: 2 }}
            name="⚖️ Ecart"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Combined tooltip for multiple data types
const CombinedTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color }}>
            <span className="value-label">{entry.name}:</span> {formatNumberWithSpaces(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom tooltip for trend chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">
          <span className="value-label">Value:</span> {formatNumberWithSpaces(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// Format date labels based on time period
const formatDateLabel = (label, timePeriod) => {
  try {
    switch (timePeriod) {
      case 'daily':
        const dailyDate = new Date(label);
        return isNaN(dailyDate.getTime()) ? label : dailyDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      case 'weekly':
        return label; // Already formatted as "Week of dd/MM/yyyy"
      case 'biweekly':
        return label; // Already formatted as "1-15 MM/YYYY" or "16-End MM/YYYY"
      case 'monthly':
        const monthlyDate = new Date(label);
        return isNaN(monthlyDate.getTime()) ? label : monthlyDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      case 'yearly':
        return label; // Already formatted as year
      default:
        return label;
    }
  } catch (error) {
    console.error('Date formatting error:', error, 'Label:', label, 'TimePeriod:', timePeriod);
    return label; // Fallback to original label if parsing fails
  }
};

const TrendChart = ({
  data,
  title,
  chartType,
  timePeriod,
  color = '#007bff',
  dataKey = 'value'
}) => {
  // Format data for display
  const formattedData = data.map((item, index) => {
    console.log('Raw item data:', item, 'TimePeriod:', timePeriod);

    return {
      ...item,
      displayLabel: formatDateLabel(item.label, timePeriod),
      [dataKey]: parseFloat(item[dataKey]) || 0,
      originalLabel: item.label // Keep original for debugging
    };
  });

  // Get color based on chart type
  const getChartColor = () => {
    switch (chartType) {
      case 'reception': return '#17a2b8';
      case 'export': return '#28a745';
      case 'ecart': return '#ffc107';
      default: return color;
    }
  };

  // Get chart title based on type and period
  const getChartTitle = () => {
    const typeLabel = chartType.charAt(0).toUpperCase() + chartType.slice(1);
    const periodLabel = timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1);
    return `${typeLabel} Trends by ${periodLabel}`;
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">{title || getChartTitle()}</h3>
        {data.length > 0 && (
          <p className="chart-summary">
            Total: {formatNumberWithSpaces(data.reduce((sum, item) => sum + parseFloat(item[dataKey]), 0))}
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 40, bottom: 100 }}
          className="dashboard-line-chart"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f7fafc"
            vertical={false}
          />
          <XAxis
            dataKey="displayLabel"
            tick={{ fontSize: '0.875rem', fill: '#4a5568', fontWeight: '500' }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
          />
          <YAxis
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            tick={{ fontSize: '0.875rem', fill: '#4a5568', fontWeight: '500' }}
            width={40}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: '3 3' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={getChartColor()}
            strokeWidth={3}
            dot={{ fill: getChartColor(), strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: getChartColor(), strokeWidth: 2 }}
            name={chartType.charAt(0).toUpperCase() + chartType.slice(1)}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
