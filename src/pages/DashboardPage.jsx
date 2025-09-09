import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardChart from '../components/DashboardChart';
import StackedBarChart from '../components/StackedBarChart';
import CollapsibleCard from '../components/CollapsibleCard';
import { apiGet } from '../apiService'; // --- 1. IMPORT THE NEW API SERVICE ---
import './DashboardPage.css';

// Helper to format date to YYYY-MM-DD string
const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';

const DashboardPage = () => {
  // --- All of your state variables remain exactly the same ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVerger, setSelectedVerger] = useState(null);
  const [selectedGrpVar, setSelectedGrpVar] = useState(null);
  const [selectedVariete, setSelectedVariete] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [destinationChartData, setDestinationChartData] = useState({ data: [], keys: [] });
  const [salesByDestinationChartData, setSalesByDestinationChartData] = useState({ data: [], keys: [] });
  const [ecartDetails, setEcartDetails] = useState({ data: [], totalPdsfru: 0 });
  const [isEcartLoading, setIsEcartLoading] = useState(false);
  const [ecartSortConfig, setEcartSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });
  const [selectedEcartType, setSelectedEcartType] = useState(null);
  const [vergerOptions, setVergerOptions] = useState([]);
  const [grpVarOptions, setGrpVarOptions] = useState([]);
  const [varieteOptions, setVarieteOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [ecartTypeOptions, setEcartTypeOptions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- 2. REFACTOR ALL FETCH LOGIC TO USE apiGet ---

  // useEffect to load filter options and initial dates
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const datesData = await apiGet('/api/lookup/campagne-dates');
        setStartDate(formatDate(datesData.startDate));
        setEndDate(formatDate(datesData.endDate));

        const [vergerData, varieteData, destData, ecartTypeData, grpVarData] = await Promise.all([
          apiGet('/api/lookup/vergers'),
          apiGet('/api/lookup/varietes'),
          apiGet('/api/lookup/destinations'),
          apiGet('/api/lookup/typeecarts'),
          apiGet('/api/lookup/grpvars')
        ]);
        
        setVergerOptions(vergerData.map(v => ({ value: v.refver, label: `${v.refver} - ${v.nomver}` })));
        setVarieteOptions(varieteData.map(v => ({ value: v.codvar, label: v.nomvar, grpVarId: v.codgrv })));
        setDestinationOptions(destData.map(d => ({ value: d.coddes, label: d.vildes })));
        setEcartTypeOptions(ecartTypeData.map(et => ({ value: et.codtype, label: et.destype })));
        setGrpVarOptions(grpVarData.map(g => ({ value: g.codgrv, label: g.nomgrv })));

      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError("Could not load initial page data. Is the API running?");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // useEffect for main dashboard data
  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchDashboardData = async () => {
        const params = { startDate, endDate };
        if (selectedVerger) params.vergerId = selectedVerger.value;
        if (selectedGrpVar) params.grpVarId = selectedGrpVar.value;
        if (selectedVariete) params.varieteId = selectedVariete.value;
        
        try {
            const data = await apiGet('/api/dashboard/data', params);
            setDashboardData(data);
        } catch (err) {
            setError(err.message);
        }
    };
    fetchDashboardData();
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedGrpVar]);

  // All other useEffect hooks follow the same pattern...
  
  const filteredVarieteOptions = useMemo(() => {
    if (!selectedGrpVar) {
      return varieteOptions;
    }
    return varieteOptions.filter(v => v.grpVarId === selectedGrpVar.value);
  }, [selectedGrpVar, varieteOptions]);

  const handleGrpVarChange = (selectedOption) => {
    setSelectedGrpVar(selectedOption);
    if (selectedVariete) {
        const isStillValid = filteredVarieteOptions.some(v => v.value === selectedVariete.value && v.grpVarId === selectedOption?.value);
        if (!isStillValid) {
            setSelectedVariete(null);
        }
    }
  };

  useEffect(() => {
    if (!startDate || !endDate || !selectedDestination) {
      setDestinationChartData({ data: [], keys: [] });
      return;
    }
    const fetchDestinationChartData = async () => {
      const params = { startDate, endDate };
      if (selectedVerger) params.vergerId = selectedVerger.value;
      if (selectedGrpVar) params.grpVarId = selectedGrpVar.value;
      if (selectedVariete) params.varieteId = selectedVariete.value;
      if (selectedDestination) params.destinationId = selectedDestination.value;
      try {
        const data = await apiGet('/api/dashboard/destination-chart', params);
        setDestinationChartData(data);
      } catch (err) {
        console.error("Failed to fetch destination chart data:", err);
      }
    };
    fetchDestinationChartData();
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedDestination, selectedGrpVar]);

  useEffect(() => {
    if (!startDate || !endDate || !selectedVerger) {
      setSalesByDestinationChartData({ data: [], keys: [] });
      return;
    }
    const fetchSalesByDestinationData = async () => {
      const params = { startDate, endDate, vergerId: selectedVerger.value };
      if (selectedGrpVar) params.grpVarId = selectedGrpVar.value;
      if (selectedVariete) params.varieteId = selectedVariete.value;
      try {
        const data = await apiGet('/api/dashboard/destination-by-variety-chart', params);
        setSalesByDestinationChartData(data);
      } catch (err) {
        console.error("Failed to fetch sales by destination data:", err);
        setSalesByDestinationChartData({ data: [], keys: [] });
      }
    };
    fetchSalesByDestinationData();
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedGrpVar]);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchEcartDetails = async () => {
        setIsEcartLoading(true);
        const params = { startDate, endDate };
        if (selectedVerger) params.vergerId = selectedVerger.value;
        if (selectedVariete) params.varieteId = selectedVariete.value;
        if (selectedEcartType) params.ecartTypeId = selectedEcartType.value;

        try {
            const data = await apiGet('/api/dashboard/ecart-details', params);
            setEcartDetails({ data: data.data, totalPdsfru: data.totalPdsfru });
        } catch (err) {
            console.error("Failed to fetch ecart details:", err);
        } finally {
            setIsEcartLoading(false);
        }
    };
    fetchEcartDetails();
  }, [startDate, endDate, selectedVerger, selectedVariete, selectedEcartType]);

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
        <div className="filter-item"><label>Variety Group</label><Select options={grpVarOptions} value={selectedGrpVar} onChange={handleGrpVarChange} isClearable placeholder="All Groups" /></div>
        <div className="filter-item"><label>Variety</label><Select options={filteredVarieteOptions} value={selectedVariete} onChange={setSelectedVariete} isClearable placeholder="All Varieties" /></div>
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
                        <label>Filter by Client</label>
                        <Select options={destinationOptions} value={selectedDestination} onChange={setSelectedDestination} isClearable placeholder="Select a client..." />
                    </div>
                    {selectedDestination ? (
                        <StackedBarChart
                            data={destinationChartData.data}
                            keys={destinationChartData.keys}
                            title={`Total Export for ${selectedDestination.label}`}
                        />
                    ) : (
                        <p>Please select a client to view the chart.</p>
                    )}
                </div>
                <div className="chart-sub-section">
                    <h4>Export by Client (Grouped by Variety) </h4>
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
                <div className="filter-item">
                    <label>Filter by Ecart Type</label>
                    <Select
                        options={ecartTypeOptions}
                        value={selectedEcartType}
                        onChange={setSelectedEcartType}
                        isClearable
                        placeholder="All Ecart Types..."
                    />
                </div>
                <div className="stat-card ecart-card ecart-total-card">
                    <h3>Total Poids Fruit (Ecart)</h3>
                    <p className="stat-value">{ecartDetails.totalPdsfru.toFixed(2)}</p>
                </div>
            </div>
            {isEcartLoading ? <LoadingSpinner /> : (
              <div className="dashboard-table-container">
                <table className="details-table">
                  <thead>
                    <tr>
                      <th className="sortable-header" onClick={() => handleEcartSort('vergerName')}>Verger{ecartSortConfig.key === 'vergerName' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
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

