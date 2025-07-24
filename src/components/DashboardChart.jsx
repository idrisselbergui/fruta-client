import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// This is a custom component to render the rotated labels
const RotatedAxisTick = (props) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-45)">
        {payload.value}
      </text>
    </g>
  );
};

// This is a custom component for the tooltip content
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '5px 10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p className="label" style={{ margin: 0, fontWeight: 'bold' }}>{`${payload[0].payload.name}`}</p>
        <p className="intro" style={{ margin: 0 }}>{`Value: ${payload[0].value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

const DashboardChart = ({ data, title, dataKey, color }) => {
  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {/* --- CORRECTION ICI --- */}
          {/* The X-axis now uses the 'refVer' property for its labels */}
          <XAxis dataKey="refVer" tick={<RotatedAxisTick />} interval={0} />
          <YAxis />
          {/* Use the new custom tooltip */}
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DashboardChart;
