import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Fonction pour générer des couleurs pour chaque segment de barre
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF', '#FF4560', '#775DD0'];

// --- NOUVEAU : Composant pour l'infobulle personnalisée ---
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    // 'name' est la propriété qui contient le nom complet du verger
    const vergerName = payload[0].payload.name; 
    return (
      <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p className="label" style={{ margin: 0, fontWeight: 'bold' }}>{vergerName}</p>
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

const StackedBarChart = ({ data, keys, title }) => {
  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {/* L'axe X utilise maintenant 'refver' pour les étiquettes */}
          <XAxis dataKey="refver" />
          <YAxis />
          {/* Utilise l'infobulle personnalisée */}
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
