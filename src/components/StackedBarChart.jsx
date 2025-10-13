import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatNumberWithSpaces } from '../utils/numberUtils';
import './StackedBarChart.css';
 

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF', '#FF4560', '#775DD0'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={entry.dataKey} className="tooltip-entry">
            <span className="tooltip-color" style={{ backgroundColor: entry.fill }}></span>
            <span className="tooltip-key">{entry.dataKey}:</span>
            <span className="tooltip-value">{formatNumberWithSpaces(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StackedBarChart = ({ data, keys, title, xAxisDataKey = 'refver', unit = '', showSummary = true }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container empty">
        <h3 className="chart-title">{title}</h3>
        <div className="empty-state">
          <p>No data available for this chart.</p>
        </div>
      </div>
    );
  }

  const totalSum = data.reduce((sum, item) => {
    return sum + keys.reduce((acc, key) => acc + (parseFloat(item[key]) || 0), 0);
  }, 0);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {showSummary && (
          <p className="chart-summary">
            Total: {formatNumberWithSpaces(totalSum)} {unit}
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          className="stacked-bar-chart"
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f7fafc"
            vertical={false}
          />
          <XAxis 
            dataKey={xAxisDataKey} 
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: '0.875rem', fill: '#718096', fontWeight: '500' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: '0.875rem', fill: '#718096' }}
            unit={unit}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(0, 123, 255, 0.05)' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
            iconSize={10}
          />
          {keys.map((key, index) => (
            <Bar 
              key={key} 
              dataKey={key} 
              stackId="a" 
              fill={COLORS[index % COLORS.length]} 
              radius={[4, 4, 0, 0]}
              className="bar-stack"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedBarChart;
