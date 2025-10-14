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
  switch (timePeriod) {
    case 'daily':
      return new Date(label).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    case 'weekly':
      return label; // Already formatted as "Week of dd/MM/yyyy"
    case 'monthly':
      return new Date(label).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    case 'yearly':
      return label; // Already formatted as year
    default:
      return label;
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
  const formattedData = data.map(item => ({
    ...item,
    displayLabel: formatDateLabel(item.label, timePeriod),
    [dataKey]: parseFloat(item[dataKey])
  }));

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
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          className="dashboard-line-chart"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f7fafc"
            vertical={false}
          />
          <XAxis
            dataKey="displayLabel"
            tick={{ fontSize: '0.75rem', fill: '#718096' }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: '0.875rem', fill: '#718096' }}
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
