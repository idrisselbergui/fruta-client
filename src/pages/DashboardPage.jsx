import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardChart from '../components/DashboardChart';
import StackedBarChart from '../components/StackedBarChart';
import TrendChart from '../components/TrendChart';
import CollapsibleCard from '../components/CollapsibleCard';
import { apiGet } from '../apiService';
import useDebounce from '../hooks/useDebounce';
import generateDetailedExportPDF from '../utils/pdfGenerator';
import './DashboardPage.css';

const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';

const formatNumberWithSpaces = (num, decimals = 2) => {
  const fixed = Math.abs(num).toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (num < 0 ? '-' : '') + parts.join('.');
};

const DashboardPage = () => {
  // --- STATE MANAGEMENT REFACTORED FOR SIMPLICITY ---
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    selectedVerger: null,
    selectedGrpVar: null,
    selectedVariete: null,
    selectedDestination: null,
    selectedEcartType: null,
  });

  const debouncedFilters = useDebounce(filters, 500);
  
  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [destinationChartData, setDestinationChartData] = useState({ data: [], keys: [] });
  const [salesByDestinationChartData, setSalesByDestinationChartData] = useState({ data: [], keys: [] });
  const [ecartDetails, setEcartDetails] = useState({ data: [], totalPdsfru: 0 });
  const [periodicTrendData, setPeriodicTrendData] = useState([]);
  
  // Dropdown options states
  const [vergerOptions, setVergerOptions] = useState([]);
  const [grpVarOptions, setGrpVarOptions] = useState([]);
  const [varieteOptions, setVarieteOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [ecartTypeOptions, setEcartTypeOptions] = useState([]);
  
  // Sorting states
  const [sortConfig, setSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });
  const [ecartSortConfig, setEcartSortConfig] = useState({ key: 'vergerName', direction: 'ascending' });

  // Card open states - cards start closed by default
  const [cardStates, setCardStates] = useState({
    tvnExport: false,
    detailedExport: false,
    exportByClient: false,
    dataDetails: false,
    ecartDetails: false,
  });

  // Time period selection for Export by Client card
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('monthly');

  // Chart type selection for multi-purpose chart
  const [selectedChartType, setSelectedChartType] = useState('export');

  // Loading and Error states
  const [isLoading, setIsLoading] = useState(true); // For initial page load only
  const [isDataLoading, setIsDataLoading] = useState(false); // For subsequent filter changes
  const [error, setError] = useState(null);

  // --- REFACTORED AND SIMPLIFIED LOGIC ---

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Initial data load for dropdowns
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

  // Main data fetching logic, triggered by debounced filters
  useEffect(() => {
    if (isLoading || !debouncedFilters.startDate || !debouncedFilters.endDate) {
        return;
    }

    const fetchAllDashboardData = async () => {
      setIsDataLoading(true);
      const { startDate, endDate, selectedVerger, selectedGrpVar, selectedVariete, selectedDestination, selectedEcartType } = debouncedFilters;
      
      const baseParams = { startDate, endDate };
      if (selectedVerger) baseParams.vergerId = selectedVerger.value;
      if (selectedGrpVar) baseParams.grpVarId = selectedGrpVar.value;
      if (selectedVariete) baseParams.varieteId = selectedVariete.value;

      try {
        const promises = [];
        // Main Data
        promises.push(apiGet('/api/dashboard/data', baseParams));
        // Ecart Details
        const ecartParams = { ...baseParams };
        if (selectedEcartType) ecartParams.ecartTypeId = selectedEcartType.value;
        promises.push(apiGet('/api/dashboard/ecart-details', ecartParams));
        // Destination Chart
        const destChartParams = { ...baseParams };
        if (selectedDestination) destChartParams.destinationId = selectedDestination.value;
        promises.push(selectedDestination ? apiGet('/api/dashboard/destination-chart', destChartParams) : Promise.resolve({ data: [], keys: [] }));
        // Sales by Dest Chart
        const salesChartParams = { ...baseParams };
        promises.push(selectedVerger ? apiGet('/api/dashboard/destination-by-variety-chart', salesChartParams) : Promise.resolve({ data: [], keys: [] }));

        const [mainData, ecartData, destChartData, salesChartData] = await Promise.all(promises);

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
  }, [debouncedFilters, isLoading]);

  // Fetch periodic trend data when filters, chart type, or time period changes
  useEffect(() => {
    if (isLoading || !debouncedFilters.startDate || !debouncedFilters.endDate || !filters.selectedVerger) {
        return;
    }

    const fetchPeriodicTrendData = async () => {
      try {
        const { startDate, endDate, selectedVerger, selectedGrpVar, selectedVariete } = debouncedFilters;

        const params = {
          startDate,
          endDate,
          chartType: selectedChartType,
          timePeriod: selectedTimePeriod,
          vergerId: selectedVerger.value
        };

        if (selectedGrpVar) params.grpVarId = selectedGrpVar.value;
        if (selectedVariete) params.varieteId = selectedVariete.value;

        const trendData = await apiGet('/api/dashboard/periodic-trends', params);
        setPeriodicTrendData(trendData.trends || []);

      } catch (err) {
        console.error("Failed to load periodic trend data:", err);
        setPeriodicTrendData([]);
      }
    };
    fetchPeriodicTrendData();
  }, [debouncedFilters, selectedChartType, selectedTimePeriod, isLoading]);

  const filteredVarieteOptions = useMemo(() => {
    if (!filters.selectedGrpVar) return varieteOptions;
    return varieteOptions.filter(v => v.grpVarId === filters.selectedGrpVar.value);
  }, [filters.selectedGrpVar, varieteOptions]);

  // --- BUG FIX: Correctly handle cascading dropdown ---
  const handleGrpVarChange = useCallback((selectedOption) => {
    setFilters(currentFilters => {
        const newFilters = { ...currentFilters, selectedGrpVar: selectedOption };
        if (currentFilters.selectedVariete) {
            const isStillValid = varieteOptions.some(v => 
                v.value === currentFilters.selectedVariete.value && 
                v.grpVarId === selectedOption?.value
            );
            if (!isStillValid) {
                newFilters.selectedVariete = null;
            }
        }
        return newFilters;
    });
  }, [varieteOptions]);

  // Sorting logic remains the same
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

  const handleCardToggle = (cardName, isOpen) => {
    setCardStates(prev => ({ ...prev, [cardName]: isOpen }));
  };

  const handleGeneratePDF = () => {
    console.log('PDF button clicked');
    console.log('Selected destination:', filters.selectedDestination);
    console.log('Dashboard data:', dashboardData);
    console.log('Destination chart data:', destinationChartData);
    console.log('Sales chart data:', salesByDestinationChartData);

    if (filters.selectedDestination) {
      try {
        generateDetailedExportPDF(
          dashboardData,
          destinationChartData,
          salesByDestinationChartData,
          filters.selectedDestination,
          filters.selectedVerger,
          filters
        );
        console.log('PDF generation completed');
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF: ' + error.message);
      }
    } else {
      console.log('No destination selected');
      alert('Please select a destination first');
    }
  };
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="dashboard-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  return (
    <div className="dashboard-container">
      <h1>Production Dashboard</h1>
      
      <div className="dashboard-filters">
        <div className="filter-item"><label>Start Date</label><input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} /></div>
        <div className="filter-item"><label>End Date</label><input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} /></div>
        <div className="filter-item"><label>Verger</label><Select options={vergerOptions} value={filters.selectedVerger} onChange={val => handleFilterChange('selectedVerger', val)} isClearable placeholder="All Orchards" /></div>
        <div className="filter-item"><label>Variety Group</label><Select options={grpVarOptions} value={filters.selectedGrpVar} onChange={handleGrpVarChange} isClearable placeholder="All Groups" /></div>
        <div className="filter-item"><label>Variety</label><Select options={filteredVarieteOptions} value={filters.selectedVariete} onChange={val => handleFilterChange('selectedVariete', val)} isClearable placeholder="All Varieties" /></div>
      </div>

      {isDataLoading ? <LoadingSpinner /> : !dashboardData ? <p>No data available for the selected filters.</p> : (
        <>
          <div className="stats-grid">
            <div className="stat-card reception-card">
              <h3>Reception</h3>
              <p className="stat-value">{formatNumberWithSpaces(dashboardData.totalPdsfru)}</p>
            </div>
            <div className="stat-card export-card">
              <h3>Export</h3>
              <div className="stat-value-container">
                  <p className="stat-value">{formatNumberWithSpaces(dashboardData.totalPdscom)}</p>
                  <span className="stat-percentage">({formatNumberWithSpaces(dashboardData.exportPercentage, 2)}%)</span>
              </div>
            </div>
            <div className="stat-card ecart-card">
              <h3>Ecart</h3>
              <div className="stat-value-container">
                  <p className="stat-value">{formatNumberWithSpaces(dashboardData.totalEcart)}</p>
                  <span className="stat-percentage ecart-percentage">({formatNumberWithSpaces(dashboardData.ecartPercentage, 2)}%)</span>
              </div>
            </div>
          </div>

          <CollapsibleCard title="TVN/Export by Verger" open={cardStates.tvnExport} onToggle={(isOpen) => handleCardToggle('tvnExport', isOpen)}>
            <div className="charts-grid">
              <DashboardChart data={dashboardData.receptionByVergerChart} title="Reception by Verger" dataKey="value" color="#3498db" />
              <DashboardChart data={dashboardData.exportByVergerChart} title="Export by Verger" dataKey="value" color="#2ecc71" />
            </div>
          </CollapsibleCard>
          
          <CollapsibleCard title="Detailed Export Analysis" open={cardStates.detailedExport} onToggle={(isOpen) => handleCardToggle('detailedExport', isOpen)}>
            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Export by Verger (Grouped by Variety)</h3>
                    <div className="filter-item" style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                        <label>Filter by Client</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Select
                                options={destinationOptions}
                                value={filters.selectedDestination}
                                onChange={val => handleFilterChange('selectedDestination', val)}
                                isClearable
                                placeholder="Select a client..."
                                styles={{
                                    container: (provided) => ({
                                        ...provided,
                                        flex: 1
                                    })
                                }}
                            />
                            {filters.selectedDestination && (
                                <button
                                    onClick={handleGeneratePDF}
                                    className="print-icon-button"
                                    title="Imprimer le PDF"
                                    style={{
                                        padding: '8px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        width: '40px',
                                        height: '38px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        alignSelf: 'stretch'
                                    }}
                                >
                                    📄
                                </button>
                            )}
                        </div>
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
                    <div className="chart-placeholder"></div>
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

          <CollapsibleCard title="Données Périodiques" open={cardStates.exportByClient} onToggle={(isOpen) => handleCardToggle('exportByClient', isOpen)}>
            <div className="multi-chart-controls" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div className="chart-type-buttons" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <button
                      className={`chart-type-btn ${selectedChartType === 'reception' ? 'active' : ''}`}
                      onClick={() => setSelectedChartType('reception')}
                      style={{
                        padding: '0.5rem 1rem',
                        border: `2px solid ${selectedChartType === 'reception' ? '#17a2b8' : '#dee2e6'}`,
                        backgroundColor: selectedChartType === 'reception' ? '#17a2b8' : '#ffffff',
                        color: selectedChartType === 'reception' ? '#ffffff' : '#495057',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    >
                      📥 Reception
                    </button>
                    <button
                      className={`chart-type-btn ${selectedChartType === 'export' ? 'active' : ''}`}
                      onClick={() => setSelectedChartType('export')}
                      style={{
                        padding: '0.5rem 1rem',
                        border: `2px solid ${selectedChartType === 'export' ? '#28a745' : '#dee2e6'}`,
                        backgroundColor: selectedChartType === 'export' ? '#28a745' : '#ffffff',
                        color: selectedChartType === 'export' ? '#ffffff' : '#495057',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    >
                      📤 Export
                    </button>
                    <button
                      className={`chart-type-btn ${selectedChartType === 'ecart' ? 'active' : ''}`}
                      onClick={() => setSelectedChartType('ecart')}
                      style={{
                        padding: '0.5rem 1rem',
                        border: `2px solid ${selectedChartType === 'ecart' ? '#ffc107' : '#dee2e6'}`,
                        backgroundColor: selectedChartType === 'ecart' ? '#ffc107' : '#ffffff',
                        color: selectedChartType === 'ecart' ? '#212529' : '#495057',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    >
                      ⚖️ Ecart
                    </button>
                  </div>
                </div>
                <div>
                  <div className="time-period-buttons" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <button
                      className={`time-period-btn ${selectedTimePeriod === 'daily' ? 'active' : ''}`}
                      onClick={() => setSelectedTimePeriod('daily')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        border: `1px solid ${selectedTimePeriod === 'daily' ? '#007bff' : '#dee2e6'}`,
                        backgroundColor: selectedTimePeriod === 'daily' ? '#007bff' : '#ffffff',
                        color: selectedTimePeriod === 'daily' ? '#ffffff' : '#495057',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                        minWidth: 'auto',
                        height: '32px'
                      }}
                    >
                      📅 Daily
                    </button>
                    <button
                      className={`time-period-btn ${selectedTimePeriod === 'weekly' ? 'active' : ''}`}
                      onClick={() => setSelectedTimePeriod('weekly')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        border: `1px solid ${selectedTimePeriod === 'weekly' ? '#28a745' : '#dee2e6'}`,
                        backgroundColor: selectedTimePeriod === 'weekly' ? '#28a745' : '#ffffff',
                        color: selectedTimePeriod === 'weekly' ? '#ffffff' : '#495057',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                        minWidth: 'auto',
                        height: '32px'
                      }}
                    >
                      📊 Weekly
                    </button>
                    <button
                      className={`time-period-btn ${selectedTimePeriod === 'monthly' ? 'active' : ''}`}
                      onClick={() => setSelectedTimePeriod('monthly')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        border: `1px solid ${selectedTimePeriod === 'monthly' ? '#ffc107' : '#dee2e6'}`,
                        backgroundColor: selectedTimePeriod === 'monthly' ? '#ffc107' : '#ffffff',
                        color: selectedTimePeriod === 'monthly' ? '#212529' : '#495057',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                        minWidth: 'auto',
                        height: '32px'
                      }}
                    >
                      📈 Monthly
                    </button>
                    <button
                      className={`time-period-btn ${selectedTimePeriod === 'yearly' ? 'active' : ''}`}
                      onClick={() => setSelectedTimePeriod('yearly')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        border: `1px solid ${selectedTimePeriod === 'yearly' ? '#dc3545' : '#dee2e6'}`,
                        backgroundColor: selectedTimePeriod === 'yearly' ? '#dc3545' : '#ffffff',
                        color: selectedTimePeriod === 'yearly' ? '#ffffff' : '#495057',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                        minWidth: 'auto',
                        height: '32px'
                      }}
                    >
                      📋 Yearly
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d' }}>
                Current view: <strong>{selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)}</strong> data by <strong>{selectedTimePeriod.charAt(0).toUpperCase() + selectedTimePeriod.slice(1)}</strong>
              </div>
            </div>
            <div className="charts-grid">
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
                <div className="chart-container">
                    <h3>Orchard Performance Trends</h3>
                    {!filters.selectedVerger ? (
                        <p>Please select an orchard to view trends.</p>
                    ) : periodicTrendData.length > 0 ? (
                        <TrendChart
                            data={periodicTrendData}
                            chartType={selectedChartType}
                            timePeriod={selectedTimePeriod}
                            title={`Orchard Performance Trends - ${filters.selectedVerger.label}`}
                        />
                    ) : (
                        <p>No trend data available for the selected orchard.</p>
                    )}
                </div>
                <div className="chart-container">
                    <h3>Top Performing Clients</h3>
                    <div className="chart-placeholder">
                        <p>🏆 Top clients by export volume chart will be displayed here</p>
                        <p>This could show a ranking of clients based on their export performance</p>
                    </div>
                </div>
                <div className="chart-container">
                    <h3>Export Distribution by Client</h3>
                    <div className="chart-placeholder">
                        <p>🥧 Pie chart showing export distribution across different clients</p>
                        <p>This could show the percentage breakdown of exports by client</p>
                    </div>
                </div>
            </div>
          </CollapsibleCard>
          
          <CollapsibleCard title="Data Details" open={cardStates.dataDetails} onToggle={(isOpen) => handleCardToggle('dataDetails', isOpen)}>
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
                      <td>{formatNumberWithSpaces(row.totalPdsfru)}</td>
                      <td>{formatNumberWithSpaces(row.totalPdscom)}</td>
                      <td>{formatNumberWithSpaces(row.totalEcart)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Ecart Details" open={cardStates.ecartDetails} onToggle={(isOpen) => handleCardToggle('ecartDetails', isOpen)}>
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
                <div className="stat-card ecart-card ecart-total-card">
                    <h3>Total Poids Fruit (Ecart)</h3>
                    <p className="stat-value">{formatNumberWithSpaces(ecartDetails.totalPdsfru)}</p>
                </div>
            </div>
            {isDataLoading ? <LoadingSpinner /> : (
              <div className="dashboard-table-container">
                <table className="details-table">
                  <thead>
                    <tr>
                      <th className="sortable-header" onClick={() => handleSort('vergerName', true)}>Verger{ecartSortConfig.key === 'vergerName' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
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
                        <td>{formatNumberWithSpaces(row.totalPdsfru)}</td>
                        <td>{formatNumberWithSpaces(row.totalNbrcai)}</td>
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
