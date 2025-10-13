import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatNumberWithSpaces } from '../utils/numberUtils';
 

// Custom rotated axis tick
const RotatedAxisTick = (props) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={0} 
        dy={16} 
        textAnchor="end" 
        fill="#718096" 
        transform="rotate(-45)"
        fontSize="0.875rem"
        fontWeight="500"
      >
        {payload.value}
      </text>
    </g>
  );
};

// Enhanced custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">
          <span className="value-label">Value:</span> {formatNumberWithSpaces(payload[0].value)}
        </p>
        {payload[0].payload.unit && (
          <p className="tooltip-unit">{payload[0].payload.unit}</p>
        )}
      </div>
    );
  }
  return null;
};

const DashboardChart = ({ data, title, dataKey, color = '#007bff', unit = '' }) => {
  const enrichedData = data.map(item => ({
    ...item,
    [dataKey]: parseFloat(item[dataKey]),
    unit
  }));

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {data.length > 0 && (
          <p className="chart-summary">
            Total: {formatNumberWithSpaces(data.reduce((sum, item) => sum + parseFloat(item[dataKey]), 0))} {unit}
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={enrichedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          className="dashboard-bar-chart"
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f7fafc"
            vertical={false}
          />
          <XAxis 
            dataKey="refVer" 
            tick={<RotatedAxisTick />} 
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
            cursor={{ fill: 'rgba(0, 123, 255, 0.05)' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          <Bar 
            dataKey={dataKey} 
            fill={color} 
            radius={[4, 4, 0, 0]}
            className="bar-item"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DashboardChart;
