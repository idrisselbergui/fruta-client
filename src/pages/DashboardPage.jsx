import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import './DashboardPage.css';

// Helper to get today's date in YYYY-MM-DD format
const getTodayString = () => new Date().toISOString().split('T')[0];

const DashboardPage = () => {
  // State for filters
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [selectedVerger, setSelectedVerger] = useState(null);
  const [selectedVariete, setSelectedVariete] = useState(null);

  // State for data
  const [dashboardData, setDashboardData] = useState(null);
  const [vergerOptions, setVergerOptions] = useState([]);
  const [varieteOptions, setVarieteOptions] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const lookupApiUrl = 'https://localhost:44374/api/lookup';
  const dashboardApiUrl = 'https://localhost:44374/api/dashboard';

  // Effect to fetch filter options (vergers and varietes)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [vergerRes, varieteRes] = await Promise.all([
          fetch(`${lookupApiUrl}/vergers`), 
          fetch(`${lookupApiUrl}/varietes`)
        ]);
        if (!vergerRes.ok || !varieteRes.ok) {
            throw new Error('Failed to fetch filter options');
        }
        const vergerData = (await vergerRes.json()).map(v => ({ value: v.refver, label: v.nomver }));
        const varieteData = (await varieteRes.json()).map(v => ({ value: v.codvar, label: v.nomvar }));
        
        setVergerOptions(vergerData);
        setVarieteOptions(varieteData);
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
        // Optionally set an error state for the user
      }
    };
    fetchFilterOptions();
  }, []);

  // Effect to fetch main dashboard data whenever a filter changes
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (selectedVerger) params.append('vergerId', selectedVerger.value);
      if (selectedVariete) params.append('varieteId', selectedVariete.value);

      try {
        const response = await fetch(`${dashboardApiUrl}/data?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch dashboard data.');
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [startDate, endDate, selectedVerger, selectedVariete]);

  if (isLoading && !dashboardData) return <LoadingSpinner />; // Show spinner only on initial load
  if (error) return <div className="dashboard-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  return (
    <div className="dashboard-container">
      <h1>Production Dashboard</h1>
      
      <div className="dashboard-filters">
        <div className="filter-item">
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="filter-item">
          <label>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="filter-item">
          <label>Orchard (Verger)</label>
          <Select options={vergerOptions} value={selectedVerger} onChange={setSelectedVerger} isClearable placeholder="All Orchards" />
        </div>
        <div className="filter-item">
          <label>Variety</label>
          <Select options={varieteOptions} value={selectedVariete} onChange={setSelectedVariete} isClearable placeholder="All Varieties" />
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : dashboardData && (
        <>
        <div className="stats-grid">
        {/* Card Order: Reception -> Export -> Ecart */}
        <div className="stat-card reception-card">
          <h3>Reception</h3>
          <p className="stat-value">{dashboardData.totalPdsfru.toFixed(2)}</p>
        </div>

        <div className="stat-card export-card">
          <h3>Export</h3>
          <div className="stat-value-container">
            <p className="stat-value">{dashboardData.totalPdscom.toFixed(2)}</p>
            <span className="stat-percentage">
              ({dashboardData.exportPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="stat-card ecart-card">
          <h3>Ecart</h3>
          <div className="stat-value-container">
            <p className="stat-value">{dashboardData.totalEcart.toFixed(2)}</p>
            <span className="stat-percentage ecart-percentage">
              ({dashboardData.ecartPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-table-container">
        <table className="details-table">
          <thead>
            <tr>
              {/* Column Order: Verger -> Variety -> Reception -> Export -> Ecart */}
              <th>Verger</th>
              <th>Variety</th>
              <th>Reception</th>
              <th>Export</th>
              <th>Ecart</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData.tableRows.map((row, index) => (
              <tr key={index}>
                <td>{row.vergerName}</td>
                <td>{row.varieteName}</td>
                <td>{row.totalPdsfru.toFixed(2)}</td>
                <td>{row.totalPdscom.toFixed(2)}</td>
                <td>{row.totalEcart.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
