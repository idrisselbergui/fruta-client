import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardChart from '../components/DashboardChart';
import StackedBarChart from '../components/StackedBarChart';
import CollapsibleCard from '../components/CollapsibleCard';
import './DashboardPage.css';

// Helper to format date to YYYY-MM-DD string
const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';

const DashboardPage = () => {
  // Main filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVerger, setSelectedVerger] = useState(null);
  const [selectedGrpVar, setSelectedGrpVar] = useState(null); // New filter state
  const [selectedVariete, setSelectedVariete] = useState(null);
  
  // State for other charts
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [destinationChartData, setDestinationChartData] = useState({ data: [], keys: [] });
  const [salesByDestinationChartData, setSalesByDestinationChartData] = useState({ data: [], keys: [] });

  // State for the Ecart Details table
  const [ecartDetails, setEcartDetails] = useState({ data: [], totalPdsfru: 0 });
  const [isEcartLoading, setIsEcartLoading] = useState(false);
  const [ecartSortConfig, setEcartSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });
  const [selectedEcartType, setSelectedEcartType] = useState(null);

  // Filter options state
  const [vergerOptions, setVergerOptions] = useState([]);
  const [grpVarOptions, setGrpVarOptions] = useState([]); // New options state
  const [allVarieteOptions, setAllVarieteOptions] = useState([]); // Will hold all varieties
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [ecartTypeOptions, setEcartTypeOptions] = useState([]);
  
  const [sortConfig, setSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const lookupApiUrl = 'https://fruta-dkd7h0e6bggjfqav.canadacentral-01.azurewebsites.net/api/lookup';
  const dashboardApiUrl = 'https://fruta-dkd7h0e6bggjfqav.canadacentral-01.azurewebsites.net/api/dashboard';

  // useEffect to load all filter options and initial dates
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const datesRes = await fetch(`${lookupApiUrl}/campagne-dates`);
        if (!datesRes.ok) throw new Error('Failed to fetch campaign dates.');
        const datesData = await datesRes.json();
        setStartDate(formatDate(datesData.startDate));
        setEndDate(formatDate(datesData.endDate));

        const [vergerRes, varieteRes, destRes, ecartTypeRes, grpVarRes] = await Promise.all([
          fetch(`${lookupApiUrl}/vergers`),
          fetch(`${lookupApiUrl}/varietes`),
          fetch(`${lookupApiUrl}/destinations`),
          fetch(`${lookupApiUrl}/typeecarts`),
          fetch(`${lookupApiUrl}/grpvars`) // Fetch grpvars
        ]);
        if (!vergerRes.ok || !varieteRes.ok || !destRes.ok || !ecartTypeRes.ok || !grpVarRes.ok) throw new Error('Failed to fetch filter options');
        
        const vergerData = (await vergerRes.json()).map(v => ({ value: v.refver, label: `${v.refver} - ${v.nomver}` }));
        // --- New Logic: Store grpVarId with each variety option ---
        const varieteData = (await varieteRes.json()).map(v => ({ value: v.codvar, label: v.nomvar, grpVarId: v.codgrv }));
        const destData = (await destRes.json()).map(d => ({ value: d.coddes, label: d.vildes }));
        const ecartTypeData = (await ecartTypeRes.json()).map(et => ({ value: et.codtype, label: et.destype }));
        const grpVarData = (await grpVarRes.json()).map(g => ({ value: g.codgrv, label: g.nomgrv }));

        setVergerOptions(vergerData);
        setAllVarieteOptions(varieteData); // Store all varieties
        setDestinationOptions(destData);
        setEcartTypeOptions(ecartTypeData);
        setGrpVarOptions(grpVarData); // Set new options
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError("Could not load initial page data. Is the API running?");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- New Logic: Cascading dropdown for Varieties ---
  const filteredVarieteOptions = useMemo(() => {
    if (!selectedGrpVar) {
      return allVarieteOptions; // Show all if no group is selected
    }
    return allVarieteOptions.filter(v => v.grpVarId === selectedGrpVar.value);
  }, [selectedGrpVar, allVarieteOptions]);

  // --- New Logic: Handler to reset variety when group changes ---
  const handleGrpVarChange = (selectedOption) => {
    setSelectedGrpVar(selectedOption);
    // When the group changes, we must reset the selected variety
    setSelectedVariete(null);
  };

  // useEffect for main dashboard data
  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchDashboardData = async () => {
        const params = new URLSearchParams({ startDate, endDate });
        if (selectedVerger) params.append('vergerId', selectedVerger.value);
        if (selectedGrpVar) params.append('grpVarId', selectedGrpVar.value); // Pass grpVarId
        if (selectedVariete) params.append('varieteId', selectedVariete.value);
        try {
            const response = await fetch(`${dashboardApiUrl}/data?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch dashboard data.');
            const data = await response.json();
            setDashboardData(data);
        } catch (err) {
            setError(err.message);
        }
    };
    fetchDashboardData();
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedGrpVar]); // Add selectedGrpVar

  // useEffect for the destination chart
  useEffect(() => {
    if (!startDate || !endDate || !selectedDestination) {
      setDestinationChartData({ data: [], keys: [] });
      return;
    }
    const fetchDestinationChartData = async () => {
      const params = new URLSearchParams({ startDate, endDate });
      if (selectedVerger) params.append('vergerId', selectedVerger.value);
      if (selectedGrpVar) params.append('grpVarId', selectedGrpVar.value); // Pass grpVarId
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
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedDestination, selectedGrpVar]); // Add selectedGrpVar

  // useEffect for the sales by destination chart
  useEffect(() => {
    if (!startDate || !endDate || !selectedVerger) {
      setSalesByDestinationChartData({ data: [], keys: [] });
      return;
    }
    const fetchSalesByDestinationData = async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        vergerId: selectedVerger.value
      });
      if (selectedGrpVar) params.append('grpVarId', selectedGrpVar.value); // Pass grpVarId
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
        setSalesByDestinationChartData({ data: [], keys: [] });
      }
    };
    fetchSalesByDestinationData();
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedGrpVar]); // Add selectedGrpVar

  // useEffect for the Ecart Details table
  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchEcartDetails = async () => {
        setIsEcartLoading(true);
        const params = new URLSearchParams({ startDate, endDate });
        if (selectedVerger) params.append('vergerId', selectedVerger.value);
        if (selectedGrpVar) params.append('grpVarId', selectedGrpVar.value); // Pass grpVarId
        if (selectedVariete) params.append('varieteId', selectedVariete.value);
        if (selectedEcartType) params.append('ecartTypeId', selectedEcartType.value);

        try {
            const response = await fetch(`${dashboardApiUrl}/ecart-details?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch ecart details.');
            const data = await response.json();
            setEcartDetails({ data: data.data, totalPdsfru: data.totalPdsfru });
        } catch (err) {
            console.error("Failed to fetch ecart details:", err);
        } finally {
            setIsEcartLoading(false);
        }
    };
    fetchEcartDetails();
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedEcartType, selectedGrpVar]); // Add selectedGrpVar


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

  const sortedEcartDetails = useMemo(() => {
    if (!ecartDetails?.data) return [];
    const sortableItems = [...ecartDetails.data];
    sortableItems.sort((a, b) => {
        const aValue = a[ecartSortConfig.key];
        const bValue = b[ecartSortConfig.key];
        if (aValue < bValue) return ecartSortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return ecartSortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
    return sortableItems;
  }, [ecartDetails.data, ecartSortConfig]);

  const handleEcartSort = (key) => {
    let direction = 'ascending';
    if (ecartSortConfig.key === key && ecartSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setEcartSortConfig({ key, direction });
  };


  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="dashboard-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  return (
    <div className="dashboard-container">
      <h1>Production Dashboard</h1>
      <div className="dashboard-filters">
        <div className="filter-item"><label>Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div className="filter-item"><label>End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        <div className="filter-item"><label>Verger</label><Select options={vergerOptions} value={selectedVerger} onChange={setSelectedVerger} isClearable placeholder="All Orchards" /></div>
        {/* --- NEW FILTER --- */}
        <div className="filter-item">
            <label>Variety Group</label>
            <Select 
                options={grpVarOptions} 
                value={selectedGrpVar} 
                onChange={handleGrpVarChange} 
                isClearable 
                placeholder="All Groups" 
            />
        </div>
        {/* --- UPDATED FILTER --- */}
        <div className="filter-item">
            <label>Variety</label>
            <Select 
                options={filteredVarieteOptions} 
                value={selectedVariete} 
                onChange={setSelectedVariete} 
                isClearable 
                placeholder="All Varieties" 
            />
        </div>
      </div>

      {!dashboardData ? <LoadingSpinner /> : (
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
          
          <CollapsibleCard title="Detailed Export Analysis">
            <div className="charts-grid">
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
                <div className="chart-sub-section">
                    <h4>Export by Destination (Grouped by Variety) </h4>
                    <br/><br/><br/><br/><br/><br/>
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
          
          <CollapsibleCard title="Data Details">
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

          <CollapsibleCard title="Ecart Details">
            <div className="ecart-filter-container">
                <div className="filter-item" style={{ flexGrow: 1, maxWidth: '400px' }}>
                    <label>Filter by Ecart Type</label>
                    <Select
                        options={ecartTypeOptions}
                        value={selectedEcartType}
                        onChange={setSelectedEcartType}
                        isClearable
                        placeholder="All Ecart Types..."
                    />
                </div>
                <div className="stat-card ecart-card" style={{ marginBottom: 0, minWidth: '250px' }}>
                    <h3>Total Poids Fruit (Ecart)</h3>
                    <p className="stat-value">{ecartDetails.totalPdsfru.toFixed(2)}</p>
                </div>
            </div>
            {isEcartLoading ? <LoadingSpinner /> : (
              <div className="dashboard-table-container" style={{ marginTop: '1.5rem' }}>
                <table className="details-table">
                  <thead>
                    <tr>
                      <th className="sortable-header" onClick={() => handleEcartSort('vergerName')}>Verger{ecartSortConfig.key === 'vergerName' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleEcartSort('varieteName')}>Variety{ecartSortConfig.key === 'varieteName' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleEcartSort('ecartType')}>Ecart Type{ecartSortConfig.key === 'ecartType' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleEcartSort('totalPdsfru')}>Total Poids Fruit{ecartSortConfig.key === 'totalPdsfru' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleEcartSort('totalNbrcai')}>Total Caisses{ecartSortConfig.key === 'totalNbrcai' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEcartDetails.map((row, index) => (
                      <tr key={index}>
                        <td>{row.vergerName}</td>
                        <td>{row.varieteName}</td>
                        <td>{row.ecartType}</td>
                        <td>{row.totalPdsfru.toFixed(2)}</td>
                        <td>{row.totalNbrcai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleCard>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
