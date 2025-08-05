import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardChart from '../components/DashboardChart';
import StackedBarChart from '../components/StackedBarChart';
import CollapsibleCard from '../components/CollapsibleCard';
import './DashboardPage.css';

const getTodayString = () => new Date().toISOString().split('T')[0];

const DashboardPage = () => {
  // Main filters state
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [selectedVerger, setSelectedVerger] = useState(null);
  const [selectedVariete, setSelectedVariete] = useState(null);
  
  // State for other charts
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [destinationChartData, setDestinationChartData] = useState({ data: [], keys: [] });

  // --- NEW STATE FOR THE REQUIRED CHART ---
  const [salesByDestinationChartData, setSalesByDestinationChartData] = useState({ data: [], keys: [] });

  // Filter options state
  const [vergerOptions, setVergerOptions] = useState([]);
  const [varieteOptions, setVarieteOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  
  const [sortConfig, setSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const lookupApiUrl = 'https://localhost:44374/api/lookup';
  const dashboardApiUrl = 'https://localhost:44374/api/dashboard';

  // useEffect to load filter options (unchanged)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [vergerRes, varieteRes, destRes] = await Promise.all([
          fetch(`${lookupApiUrl}/vergers`),
          fetch(`${lookupApiUrl}/varietes`),
          fetch(`${lookupApiUrl}/destinations`)
        ]);
        if (!vergerRes.ok || !varieteRes.ok || !destRes.ok) throw new Error('Failed to fetch filter options');
        
        const vergerData = (await vergerRes.json()).map(v => ({ value: v.refver, label: `${v.refver} - ${v.nomver}` }));
        const varieteData = (await varieteRes.json()).map(v => ({ value: v.codvar, label: v.nomvar }));
        const destData = (await destRes.json()).map(d => ({ value: d.coddes, label: d.vildes }));

        setVergerOptions(vergerData);
        setVarieteOptions(varieteData);
        setDestinationOptions(destData);
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
        setError("Could not load filter options. Is the API running?");
      }
    };
    fetchFilterOptions();
  }, []);

  // useEffect for main dashboard data (unchanged)
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

  // useEffect for the original destination chart (unchanged)
  useEffect(() => {
    if (!selectedDestination) {
      setDestinationChartData({ data: [], keys: [] });
      return;
    }
    const fetchDestinationChartData = async () => {
      const params = new URLSearchParams({ startDate, endDate });
      if (selectedVerger) params.append('vergerId', selectedVerger.value);
      if (selectedVariete) params.append('varieteId', selectedVariete.value);
      if (selectedDestination) params.append('destinationId', selectedDestination.value);
      try {
        const response = await fetch(`${dashboardApiUrl}/destination-chart?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch destination chart data.');
        const data = await response.json();
        setDestinationChartData(data);
      } catch (err) {
        console.error("Failed to fetch destination chart data:", err);
      }
    };
    fetchDestinationChartData();
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedDestination]);

  // --- USEEFFECT FOR THE NEW CHART ---
  useEffect(() => {
    // Rule: If no orchard is selected, clear data and do nothing.
    if (!selectedVerger) {
      setSalesByDestinationChartData({ data: [], keys: [] });
      return;
    }

    const fetchSalesByDestinationData = async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        vergerId: selectedVerger.value // This is the required parameter
      });
      if (selectedVariete) {
        params.append('varieteId', selectedVariete.value);
      }

      try {
        const response = await fetch(`${dashboardApiUrl}/destination-by-variety-chart?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch sales by destination data.');
        const data = await response.json();
        setSalesByDestinationChartData(data);
      } catch (err) {
        console.error("Failed to fetch sales by destination data:", err);
        setSalesByDestinationChartData({ data: [], keys: [] }); // Clear data on error
      }
    };

    fetchSalesByDestinationData();
  }, [selectedVerger, selectedVariete, startDate, endDate]);


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
        <div className="filter-item"><label> Verger</label><Select options={vergerOptions} value={selectedVerger} onChange={setSelectedVerger} isClearable placeholder="All Orchards" /></div>
        <div className="filter-item"><label>Variety</label><Select options={varieteOptions} value={selectedVariete} onChange={setSelectedVariete} isClearable placeholder="All Varieties" /></div>
      </div>

      {isLoading ? <LoadingSpinner /> : dashboardData && (
        <>
          <div className="stats-grid">
            <div className="stat-card reception-card"><h3>Reception</h3><p className="stat-value">{dashboardData.totalPdsfru.toFixed(2)}</p></div>
            <div className="stat-card export-card"><h3>Export</h3><div className="stat-value-container"><p className="stat-value">{dashboardData.totalPdscom.toFixed(2)}</p><span className="stat-percentage">({dashboardData.exportPercentage.toFixed(2)}%)</span></div></div>
            <div className="stat-card ecart-card"><h3>Ecart</h3><div className="stat-value-container"><p className="stat-value">{dashboardData.totalEcart.toFixed(2)}</p><span className="stat-percentage ecart-percentage">({dashboardData.ecartPercentage.toFixed(2)}%)</span></div></div>
          </div>

          <CollapsibleCard title="TVN/Export by Verger">
            <div className="charts-grid">
              <DashboardChart data={dashboardData.receptionByVergerChart} title="Reception by Verger" dataKey="value" color="#3498db" />
              <DashboardChart data={dashboardData.exportByVergerChart} title="Export by Verger" dataKey="value" color="#2ecc71" />
            </div>
          </CollapsibleCard>
<CollapsibleCard title="Detailed Export Analysis" defaultOpen={true}>
    {/* Main grid container to place the two charts side-by-side */}
    <div className="charts-grid">

        {/* --- Section 1: Chart with Destination Filter --- */}
        <div className="chart-sub-section">
            <h4>Export by Verger (Grouped by Variety)</h4>
            <div className="filter-item" style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                <label>Filter by Destination</label>
                <Select options={destinationOptions} value={selectedDestination} onChange={setSelectedDestination} isClearable placeholder="Select a destination..." />
            </div>
            {selectedDestination ? (
                <StackedBarChart
                    data={destinationChartData.data}
                    keys={destinationChartData.keys}
                    title={`Total Export for ${selectedDestination.label}`}
                />
            ) : (
                <p>Please select a destination to view the chart.</p>
            )}
        </div>

        {/* --- Section 2: Chart Dependent on Verger Filter --- */}
        <div className="chart-sub-section">
            <h4>Export by Destination (Grouped by Variety)</h4>
            {!selectedVerger ? (
                <p>Please select an orchard to view this chart.</p>
            ) : salesByDestinationChartData.data.length > 0 ? (
                <StackedBarChart
                    data={salesByDestinationChartData.data}
                    keys={salesByDestinationChartData.keys}
                    title={`Sales for ${selectedVerger.label}`}
                    xAxisDataKey="name"
                />
            ) : (
                <p>No export data available for this orchard.</p>
            )}
        </div>

    </div>
</CollapsibleCard>
          

          <CollapsibleCard title="Data Details" defaultOpen={true}>
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
          </CollapsibleCard>
        </>
      )}
    </div>
  );
};

export default DashboardPage;