import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardChart from '../components/DashboardChart';
import StackedBarChart from '../components/StackedBarChart';
import CollapsibleCard from '../components/CollapsibleCard';
import { apiGet } from '../apiService';
import useDebounce from '../hooks/useDebounce'; // --- 1. IMPORT THE NEW HOOK ---
import './DashboardPage.css';

const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';

const DashboardPage = () => {
  // --- 2. COMBINE ALL FILTERS INTO A SINGLE STATE OBJECT ---
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    selectedVerger: null,
    selectedGrpVar: null,
    selectedVariete: null,
    selectedDestination: null,
    selectedEcartType: null,
  });

  // --- 3. APPLY THE DEBOUNCE HOOK TO THE FILTERS ---
  const debouncedFilters = useDebounce(filters, 500);
  
  // Data states remain the same
  const [dashboardData, setDashboardData] = useState(null);
  const [destinationChartData, setDestinationChartData] = useState({ data: [], keys: [] });
  const [salesByDestinationChartData, setSalesByDestinationChartData] = useState({ data: [], keys: [] });
  const [ecartDetails, setEcartDetails] = useState({ data: [], totalPdsfru: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true); 
  
  // Dropdown options states remain the same
  const [vergerOptions, setVergerOptions] = useState([]);
  const [grpVarOptions, setGrpVarOptions] = useState([]);
  const [varieteOptions, setVarieteOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [ecartTypeOptions, setEcartTypeOptions] = useState([]);
  
  // Sorting configurations
  const [sortConfig, setSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });
  const [ecartSortConfig, setEcartSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });

  // Initial page load state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- 4. CREATE A SINGLE HANDLER FOR ALL FILTER CHANGES ---
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // useEffect for fetching initial dropdown options
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const datesData = await apiGet('/api/lookup/campagne-dates');
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(datesData.startDate),
          endDate: formatDate(datesData.endDate),
        }));

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
        setError("Could not load initial page data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- 5. CREATE A SINGLE, CONSOLIDATED useEffect FOR ALL DATA FETCHING ---
  useEffect(() => {
    if (!debouncedFilters.startDate || !debouncedFilters.endDate || isLoading) return;

    const fetchAllDashboardData = async () => {
      setIsDataLoading(true);
      const { startDate, endDate, selectedVerger, selectedGrpVar, selectedVariete, selectedDestination, selectedEcartType } = debouncedFilters;
      
      const baseParams = { startDate, endDate };
      if (selectedVerger) baseParams.vergerId = selectedVerger.value;
      if (selectedGrpVar) baseParams.grpVarId = selectedGrpVar.value;
      if (selectedVariete) baseParams.varieteId = selectedVariete.value;

      try {
        // Build all API call promises
        const mainDataPromise = apiGet('/api/dashboard/data', baseParams);

        const ecartParams = { ...baseParams };
        if (selectedEcartType) ecartParams.ecartTypeId = selectedEcartType.value;
        const ecartPromise = apiGet('/api/dashboard/ecart-details', ecartParams);

        const destChartParams = { ...baseParams };
        if (selectedDestination) destChartParams.destinationId = selectedDestination.value;
        const destChartPromise = selectedDestination ? apiGet('/api/dashboard/destination-chart', destChartParams) : Promise.resolve({ data: [], keys: [] });

        const salesChartParams = { ...baseParams };
        const salesChartPromise = selectedVerger ? apiGet('/api/dashboard/destination-by-variety-chart', salesChartParams) : Promise.resolve({ data: [], keys: [] });

        // Await all promises together
        const [mainData, ecartData, destChartData, salesChartData] = await Promise.all([
            mainDataPromise,
            ecartPromise,
            destChartPromise,
            salesChartPromise
        ]);

        // Set all state at once
        setDashboardData(mainData);
        setEcartDetails({ data: ecartData.data, totalPdsfru: ecartData.totalPdsfru });
        setDestinationChartData(destChartData);
        setSalesByDestinationChartData(salesChartData);

      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchAllDashboardData();
  }, [debouncedFilters, isLoading]); // This now depends only on the debounced filters

  const filteredVarieteOptions = useMemo(() => {
    if (!filters.selectedGrpVar) return varieteOptions;
    return varieteOptions.filter(v => v.grpVarId === filters.selectedGrpVar.value);
  }, [filters.selectedGrpVar, varieteOptions]);

  const handleGrpVarChange = (selectedOption) => {
    handleFilterChange('selectedGrpVar', selectedOption);
    const isStillValid = filteredVarieteOptions.some(v => v.value === filters.selectedVariete?.value);
    
    if (!isStillValid) {
        handleFilterChange('selectedVariete', null);
    }
  };

  const sortedTableRows = useMemo(() => {
    if (!dashboardData?.tableRows) return [];
    return [...dashboardData.tableRows].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [dashboardData, sortConfig]);

  const sortedEcartDetails = useMemo(() => {
    if (!ecartDetails?.data) return [];
    return [...ecartDetails.data].sort((a, b) => {
        const aValue = a[ecartSortConfig.key];
        const bValue = b[ecartSortConfig.key];
        if (aValue < bValue) return ecartSortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return ecartSortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
  }, [ecartDetails.data, ecartSortConfig]);
  
  const handleSort = (key, isEcart) => {
    const currentConfig = isEcart ? ecartSortConfig : sortConfig;
    const setConfig = isEcart ? setEcartSortConfig : setSortConfig;
    let direction = 'ascending';
    if (currentConfig.key === key && currentConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setConfig({ key, direction });
  };
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="dashboard-page"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">Production Dashboard</h1>
      
      <div className="filters-card">
        <div className="filters-grid">
          <div className="filter-item"><label>Start Date</label><input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} /></div>
          <div className="filter-item"><label>End Date</label><input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} /></div>
          <div className="filter-item"><label>Verger</label><Select options={vergerOptions} value={filters.selectedVerger} onChange={val => handleFilterChange('selectedVerger', val)} isClearable placeholder="All Orchards" /></div>
          <div className="filter-item"><label>Variety Group</label><Select options={grpVarOptions} value={filters.selectedGrpVar} onChange={handleGrpVarChange} isClearable placeholder="All Groups" /></div>
          <div className="filter-item"><label>Variety</label><Select options={filteredVarieteOptions} value={filters.selectedVariete} onChange={val => handleFilterChange('selectedVariete', val)} isClearable placeholder="All Varieties" /></div>
        </div>
      </div>

      {isDataLoading ? <LoadingSpinner /> : !dashboardData ? <p>No data available for the selected filters.</p> : (
        <>
          <div className="stats-grid">
            <div className="stat-card reception-card">
              <div className="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
              <div className="stat-info"><h3>Reception</h3><p className="stat-value">{dashboardData.totalPdsfru.toFixed(2)}</p></div>
            </div>
            <div className="stat-card export-card">
              <div className="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/><path d="M16 8l-4 4-4-4"/><path d="M12 16V4"/></svg></div>
              <div className="stat-info"><h3>Export</h3><p className="stat-value">{dashboardData.totalPdscom.toFixed(2)}<span className="stat-percentage">({dashboardData.exportPercentage.toFixed(2)}%)</span></p></div>
            </div>
            <div className="stat-card ecart-card">
              <div className="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
              <div className="stat-info"><h3>Ecart</h3><p className="stat-value">{dashboardData.totalEcart.toFixed(2)}<span className="stat-percentage ecart-percentage">({dashboardData.ecartPercentage.toFixed(2)}%)</span></p></div>
            </div>
          </div>

          <CollapsibleCard title="TVN/Export by Verger">
            <div className="charts-grid">
              <DashboardChart data={dashboardData.receptionByVergerChart} title="Reception by Verger" dataKey="value" color="#3498db" />
              <DashboardChart data={dashboardData.exportByVergerChart} title="Export by Verger" dataKey="value" color="#2ecc71" />
            </div>
          </CollapsibleCard>
          
          <CollapsibleCard title="Detailed Export Analysis">
            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Export by Verger (Grouped by Variety)</h3>
                    <div className="filter-item" style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                        <label>Filter by Client</label>
                        <Select options={destinationOptions} value={filters.selectedDestination} onChange={val => handleFilterChange('selectedDestination', val)} isClearable placeholder="Select a client..." />
                    </div>
                    {filters.selectedDestination ? (
                        <StackedBarChart
                            data={destinationChartData.data}
                            keys={destinationChartData.keys}
                            title={`Total Export for ${filters.selectedDestination.label}`}
                        />
                    ) : (
                        <p>Please select a client to view the chart.</p>
                    )}
                </div>
                <div className="chart-container">
                    <h3>Export by Client (Grouped by Variety)</h3>
                    {!filters.selectedVerger ? (
                        <p>Please select an orchard to view this chart.</p>
                    ) : salesByDestinationChartData.data.length > 0 ? (
                        <StackedBarChart
                            data={salesByDestinationChartData.data}
                            keys={salesByDestinationChartData.keys}
                            title={`Sales for ${filters.selectedVerger.label}`}
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
                    <th className="sortable-header" onClick={() => handleSort('vergerName', false)}>Verger{sortConfig.key === 'vergerName' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    <th className="sortable-header" onClick={() => handleSort('varieteName', false)}>Variety{sortConfig.key === 'varieteName' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    <th className="sortable-header" onClick={() => handleSort('totalPdsfru', false)}>Reception{sortConfig.key === 'totalPdsfru' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    <th className="sortable-header" onClick={() => handleSort('totalPdscom', false)}>Export{sortConfig.key === 'totalPdscom' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    <th className="sortable-header" onClick={() => handleSort('totalEcart', false)}>Ecart{sortConfig.key === 'totalEcart' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
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
                        value={filters.selectedEcartType}
                        onChange={val => handleFilterChange('selectedEcartType', val)}
                        isClearable
                        placeholder="All Ecart Types..."
                    />
                </div>
                <div className="stat-card ecart-card">
                  <div className="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 12H2.5"/><path d="M18.5 5H5.5"/><path d="M18.5 19H5.5"/></svg></div>
                  <div className="stat-info"><h3>Total Poids Fruit (Ecart)</h3><p className="stat-value">{ecartDetails.totalPdsfru.toFixed(2)}</p></div>
                </div>
            </div>
            {isDataLoading ? <LoadingSpinner /> : (
              <div className="dashboard-table-container">
                <table className="details-table">
                  <thead>
                    <tr>
                      <th className="sortable-header" onClick={() => handleSort('vergerName', true)}>Verger{ecartSortConfig.key === 'vergerName' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleSort('varieteName', true)}>Variety{ecartSortConfig.key === 'varieteName' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleSort('ecartType', true)}>Ecart Type{ecartSortConfig.key === 'ecartType' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleSort('totalPdsfru', true)}>Total Poids Fruit{ecartSortConfig.key === 'totalPdsfru' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleSort('totalNbrcai', true)}>Total Caisses{ecartSortConfig.key === 'totalNbrcai' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
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

