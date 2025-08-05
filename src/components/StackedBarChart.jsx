import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF', '#FF4560', '#775DD0'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    // This part is now more generic as it reads the 'name' property,
    // which both of your data structures provide for the main label.
    const mainLabel = payload[0].payload.name; 
    return (
      <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p className="label" style={{ margin: 0, fontWeight: 'bold' }}>{mainLabel}</p>
        {payload.map(pld => (
          <p key={pld.dataKey} style={{ margin: 0, color: pld.fill }}>
            {`${pld.dataKey}: ${pld.value.toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// --- MODIFICATION 1: Add xAxisDataKey to props ---
const StackedBarChart = ({ data, keys, title, xAxisDataKey = 'refver' }) => {
  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {/* --- MODIFICATION 2: Use the new prop here --- */}
          <XAxis dataKey={xAxisDataKey} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {keys.map((key, index) => (
            <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedBarChart;