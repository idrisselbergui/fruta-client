import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardChart from '../components/DashboardChart';
import './DashboardPage.css';

const getTodayString = () => new Date().toISOString().split('T')[0];

const DashboardPage = () => {
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [selectedVerger, setSelectedVerger] = useState(null);
  const [selectedVariete, setSelectedVariete] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [vergerOptions, setVergerOptions] = useState([]);
  const [varieteOptions, setVarieteOptions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const lookupApiUrl = 'https://localhost:44374/api/lookup';
  const dashboardApiUrl = 'https://localhost:44374/api/dashboard';

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [vergerRes, varieteRes] = await Promise.all([
          fetch(`${lookupApiUrl}/vergers`),
          fetch(`${lookupApiUrl}/varietes`)
        ]);
        if (!vergerRes.ok || !varieteRes.ok) throw new Error('Failed to fetch filter options');
        const vergerData = (await vergerRes.json()).map(v => ({ value: v.refver, label: v.nomver }));
        const varieteData = (await varieteRes.json()).map(v => ({ value: v.codvar, label: v.nomvar }));
        setVergerOptions(vergerData);
        setVarieteOptions(varieteData);
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
        setError("Could not load filter options. Is the API running?");
      }
    };
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ startDate, endDate });
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

  const sortedTableRows = useMemo(() => {
    if (!dashboardData?.tableRows) return [];
    const sortableItems = [...dashboardData.tableRows];
    sortableItems.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [dashboardData, sortConfig]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (isLoading && !dashboardData) return <LoadingSpinner />;
  if (error) return <div className="dashboard-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  return (
    <div className="dashboard-container">
      <h1>Production Dashboard</h1>
      <div className="dashboard-filters">
        <div className="filter-item"><label>Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div className="filter-item"><label>End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        <div className="filter-item"><label>Orchard (Verger)</label><Select options={vergerOptions} value={selectedVerger} onChange={setSelectedVerger} isClearable placeholder="All Orchards" /></div>
        <div className="filter-item"><label>Variety</label><Select options={varieteOptions} value={selectedVariete} onChange={setSelectedVariete} isClearable placeholder="All Varieties" /></div>
      </div>

      {isLoading ? <LoadingSpinner /> : dashboardData && (
        <>
          <div className="stats-grid">
            <div className="stat-card reception-card"><h3>Reception</h3><p className="stat-value">{dashboardData.totalPdsfru.toFixed(2)}</p></div>
            <div className="stat-card export-card"><h3>Export</h3><div className="stat-value-container"><p className="stat-value">{dashboardData.totalPdscom.toFixed(2)}</p><span className="stat-percentage">({dashboardData.exportPercentage.toFixed(2)}%)</span></div></div>
            <div className="stat-card ecart-card"><h3>Ecart</h3><div className="stat-value-container"><p className="stat-value">{dashboardData.totalEcart.toFixed(2)}</p><span className="stat-percentage ecart-percentage">({dashboardData.ecartPercentage.toFixed(2)}%)</span></div></div>
          </div>

          <div className="charts-grid">
            <DashboardChart data={dashboardData.receptionByVergerChart} title="Reception by Verger" dataKey="value" color="#3498db" />
            <DashboardChart data={dashboardData.exportByVergerChart} title="Export by Verger" dataKey="value" color="#2ecc71" />
          </div>

          <div className="dashboard-table-container">
            <table className="details-table">
              <thead>
                <tr>
                  <th className="sortable-header" onClick={() => handleSort('vergerName')}>Verger{sortConfig.key === 'vergerName' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                  <th className="sortable-header" onClick={() => handleSort('varieteName')}>Variety{sortConfig.key === 'varieteName' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                  <th className="sortable-header" onClick={() => handleSort('totalPdsfru')}>Reception{sortConfig.key === 'totalPdsfru' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                  <th className="sortable-header" onClick={() => handleSort('totalPdscom')}>Export{sortConfig.key === 'totalPdscom' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                  <th className="sortable-header" onClick={() => handleSort('totalEcart')}>Ecart{sortConfig.key === 'totalEcart' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                </tr>
              </thead>
              <tbody>
                {sortedTableRows.map((row, index) => (
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
