import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardChart from '../components/DashboardChart';
import StackedBarChart from '../components/StackedBarChart';
import TrendChart, { CombinedTrendChart } from '../components/TrendChart';
import CollapsibleCard from '../components/CollapsibleCard';
import { apiGet } from '../apiService';
import useDebounce from '../hooks/useDebounce';
import { generateDetailedExportPDF, generateVarietesPDF, generateGroupVarietePDF, generateEcartDetailsPDF, generateEcartGroupDetailsPDF, generateEcartDirectGroupedPDF, generateEcartDirectDetailsPDF, generateGlobalVenteEcartPDF } from '../utils/pdfGenerator';
import { generateChartPDF } from '../utils/chartPdfGenerator';
import './DashboardPage.css';

const formatDate = (date) => date ? new Date(date).toLocaleDateString('sv-SE') : '';

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
  const [groupedData, setGroupedData] = useState({ tableRows: [] });
  const [destinationChartData, setDestinationChartData] = useState({ data: [], keys: [] });
  const [salesByDestinationChartData, setSalesByDestinationChartData] = useState({ data: [], keys: [] });
  const [ecartDetails, setEcartDetails] = useState({ data: [], totalPdsfru: 0 });
  const [ecartGroupDetails, setEcartGroupDetails] = useState({ data: [], totalPdsfru: 0 });
  const [venteEcartData, setVenteEcartData] = useState([]);
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
    venteEcartDetails: false,
  });

  // Time period selection for Export by Client card
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('monthly');

  // Chart type selection for multi-purpose chart
  const [selectedChartType, setSelectedChartType] = useState('export');

  // Combined chart data state
  const [combinedTrendData, setCombinedTrendData] = useState([]);



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
        // Ecart Group Details
        const ecartGroupParams = { ...baseParams };
        if (selectedEcartType) ecartGroupParams.ecartTypeId = selectedEcartType.value;
        promises.push(apiGet('/api/dashboard/ecart-details-grouped', ecartGroupParams));
        // Destination Chart
        const destChartParams = { ...baseParams };
        if (selectedDestination) destChartParams.destinationId = selectedDestination.value;
        promises.push(selectedDestination ? apiGet('/api/dashboard/destination-chart', destChartParams) : Promise.resolve({ data: [], keys: [] }));
        // Sales by Dest Chart
        const salesChartParams = { ...baseParams };
        promises.push(selectedVerger ? apiGet('/api/dashboard/destination-by-variety-chart', salesChartParams) : Promise.resolve({ data: [], keys: [] }));

        // Vente Ecart Data (Global list)
        // Note: The endpoint returns all sales; we filter locally or should update backend to accept params.
        // For now, fetching all and we will filter in UI render or memo
        promises.push(apiGet('/api/vente-ecart'));

        const [mainData, ecartData, ecartGroupData, destChartData, salesChartData, ventesData] = await Promise.all(promises);

        setDashboardData(mainData);
        setEcartDetails({ data: ecartData.data, totalPdsfru: ecartData.totalPdsfru });
        setEcartGroupDetails({ data: ecartGroupData.data, totalPdsfru: ecartGroupData.totalPdsfru });
        setDestinationChartData(destChartData);
        setSalesByDestinationChartData(salesChartData);
        setVenteEcartData(ventesData);

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
    if (isLoading || !debouncedFilters.startDate || !debouncedFilters.endDate) {
      return;
    }

    const fetchPeriodicTrendData = async () => {
      try {
        const { startDate, endDate, selectedVerger, selectedGrpVar, selectedVariete } = debouncedFilters;

        const params = {
          startDate,
          endDate,
          chartType: selectedChartType,
          timePeriod: selectedTimePeriod
        };

        // Apply verger filter if selected
        if (selectedVerger && selectedVerger.value !== null && selectedVerger.value !== undefined) {
          params.vergerId = selectedVerger.value;
          console.log('Applying verger filter:', selectedVerger.value);
        }

        // Apply variety group and variety filters if selected
        if (selectedGrpVar && selectedGrpVar.value !== null && selectedGrpVar.value !== undefined) {
          params.grpVarId = selectedGrpVar.value;
          console.log('Applying variety group filter:', selectedGrpVar.value);
        }
        if (selectedVariete && selectedVariete.value !== null && selectedVariete.value !== undefined) {
          params.varieteId = selectedVariete.value;
          console.log('Applying variety filter:', selectedVariete.value);
        }

        console.log('Trend chart filters:', params); // Debug logging
        const trendData = await apiGet('/api/dashboard/periodic-trends', params);
        console.log('Trend data received:', trendData); // Debug logging
        setPeriodicTrendData(trendData.trends || []);

      } catch (err) {
        console.error("Failed to load periodic trend data:", err);
        setPeriodicTrendData([]);
      }
    };
    fetchPeriodicTrendData();
  }, [debouncedFilters, selectedChartType, selectedTimePeriod, isLoading]);

  // Fetch combined trend data when combined chart type is selected
  useEffect(() => {
    if (isLoading || !debouncedFilters.startDate || !debouncedFilters.endDate || selectedChartType !== 'combined') {
      return;
    }

    const fetchCombinedTrendData = async () => {
      try {
        const { startDate, endDate, selectedVerger, selectedGrpVar, selectedVariete } = debouncedFilters;

        // Fetch all three data types in parallel
        const params = {
          startDate,
          endDate,
          timePeriod: selectedTimePeriod
        };

        // Apply verger filter if selected
        if (selectedVerger && selectedVerger.value !== null && selectedVerger.value !== undefined) {
          params.vergerId = selectedVerger.value;
        }

        // Apply variety filters if selected
        if (selectedGrpVar && selectedGrpVar.value !== null && selectedGrpVar.value !== undefined) {
          params.grpVarId = selectedGrpVar.value;
        }
        if (selectedVariete && selectedVariete.value !== null && selectedVariete.value !== undefined) {
          params.varieteId = selectedVariete.value;
        }

        // Fetch all three data types
        const [receptionData, exportData, ecartData] = await Promise.all([
          apiGet('/api/dashboard/periodic-trends', { ...params, chartType: 'reception' }),
          apiGet('/api/dashboard/periodic-trends', { ...params, chartType: 'export' }),
          apiGet('/api/dashboard/periodic-trends', { ...params, chartType: 'ecart' })
        ]);

        // Combine the data by date/label
        const combinedDataMap = new Map();

        // Process reception data
        (receptionData.trends || []).forEach(item => {
          const key = item.label;
          if (!combinedDataMap.has(key)) {
            combinedDataMap.set(key, {
              label: item.label,
              date: item.date,
              reception: 0,
              export: 0,
              ecart: 0
            });
          }
          combinedDataMap.get(key).reception = parseFloat(item.value) || 0;
        });

        // Process export data
        (exportData.trends || []).forEach(item => {
          const key = item.label;
          if (!combinedDataMap.has(key)) {
            combinedDataMap.set(key, {
              label: item.label,
              date: item.date,
              reception: 0,
              export: 0,
              ecart: 0
            });
          }
          combinedDataMap.get(key).export = parseFloat(item.value) || 0;
        });

        // Process ecart data
        (ecartData.trends || []).forEach(item => {
          const key = item.label;
          if (!combinedDataMap.has(key)) {
            combinedDataMap.set(key, {
              label: item.label,
              date: item.date,
              reception: 0,
              export: 0,
              ecart: 0
            });
          }
          combinedDataMap.get(key).ecart = parseFloat(item.value) || 0;
        });

        const combinedData = Array.from(combinedDataMap.values());
        console.log('Combined data:', combinedData);
        setCombinedTrendData(combinedData);

      } catch (err) {
        console.error("Failed to load combined trend data:", err);
        setCombinedTrendData([]);
      }
    };
    fetchCombinedTrendData();
  }, [debouncedFilters, selectedChartType, selectedTimePeriod, isLoading]);

  // Fetch grouped data for PDF generation
  useEffect(() => {
    if (isLoading || !debouncedFilters.startDate || !debouncedFilters.endDate) {
      return;
    }

    const fetchGroupedData = async () => {
      const { startDate, endDate, selectedVerger, selectedGrpVar, selectedVariete } = debouncedFilters;

      const baseParams = { startDate, endDate };
      if (selectedVerger) baseParams.vergerId = selectedVerger.value;
      if (selectedGrpVar) baseParams.grpVarId = selectedGrpVar.value;
      if (selectedVariete) baseParams.varieteId = selectedVariete.value;

      try {
        const groupedResult = await apiGet('/api/dashboard/data-grouped-by-variety-group', baseParams);
        setGroupedData(groupedResult);
      } catch (err) {
        console.error("Failed to load grouped data:", err);
        setGroupedData({ tableRows: [] });
      }
    };
    fetchGroupedData();
  }, [debouncedFilters, isLoading]);

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
    if (!filters.selectedDestination) {
      alert('Please select a destination first');
      return;
    }
    try {
      generateDetailedExportPDF(
        dashboardData,
        destinationChartData,
        salesByDestinationChartData,
        filters.selectedDestination,
        filters.selectedVerger,
        filters
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF: ' + error.message);
    }
  };

  const handleExportChart = async () => {
    try {
      if (!filters.selectedVerger) {
        // Allow exporting without verger selection - will show aggregated data
        // alert('Please select an orchard first');
        // return;
      }

      // Table is always visible now

      // Show loading state
      const originalButtonText = document.querySelector('.btn-primary').textContent;
      document.querySelector('.btn-primary').textContent = '⏳ Generating PDF...';
      document.querySelector('.btn-primary').disabled = true;

      const chartTypeLabel = selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1);
      const orchardName = filters.selectedVerger ? filters.selectedVerger.label : 'Tous les Vergers';

      console.log('Starting PDF generation...');
      console.log('Chart element:', document.getElementById('trend-chart-container'));
      console.log('Table element:', document.getElementById('detail-data-table'));

      // Generate PDF with chart and table
      // Extract variety names from data if no specific variety is selected
      let varieteDisplayName = filters.selectedVariete ? filters.selectedVariete.label : 'Toutes les Variétés';
      if (!filters.selectedVariete && dashboardData?.tableRows && dashboardData.tableRows.length > 0) {
        // Get unique variety names from table rows that have data
        const dataVarieties = [...new Set(
          dashboardData.tableRows
            .filter(row => !filters.selectedVerger || row.vergerName === filters.selectedVerger.label.split(' - ')[1]) // Match verger
            .filter(row => !filters.selectedGrpVar || row.groupVarieteName === filters.selectedGrpVar.label) // Match group if selected
            .filter(row => parseFloat(row.totalPdsfru) > 0 || parseFloat(row.totalPdscom) > 0 || parseFloat(row.totalEcart) > 0) // Has data
            .map(row => row.varieteName)
        )];
        if (dataVarieties.length > 0) {
          varieteDisplayName = dataVarieties.join('-');
        }
      }

      await generateChartPDF(
        document.getElementById('trend-chart-container'),
        document.getElementById('detail-data-table'),
        {
          title: 'Rapport de Performance du Verger',
          orchardName: orchardName,
          chartType: chartTypeLabel,
          timePeriod: selectedTimePeriod.charAt(0).toUpperCase() + selectedTimePeriod.slice(1),
          varieteName: varieteDisplayName,
          includeTable: true // Always include table in PDF
        }
      );

      // Restore button state
      document.querySelector('.btn-primary').textContent = originalButtonText;
      document.querySelector('.btn-primary').disabled = false;

      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF: ' + error.message);

      // Restore button state on error
      document.querySelector('.btn-primary').textContent = '📄 Export Chart Data';
      document.querySelector('.btn-primary').disabled = false;
    }
  };

  const handleExportAllVergersPDF = async () => {
    try {
      if (filters.selectedVerger) {
        alert('Veuillez désélectionner le verger pour utiliser cette fonction.');
        return;
      }

      if (!vergerOptions?.length) {
        alert('Aucun verger disponible.');
        return;
      }

      // Show loading state on all vergers button
      const allVergersButton = document.querySelector('.btn-all-vergers');
      const originalButtonText = allVergersButton.textContent;
      allVergersButton.textContent = '⏳ Generating PDFs...';
      allVergersButton.disabled = true;

      console.log(`Starting batch PDF generation for ${vergerOptions.length} verg ers...`);

      // Store original data to restore later
      const originalPeriodicTrendData = [...periodicTrendData];
      const originalCombinedTrendData = [...combinedTrendData];

      let successCount = 0;

      // Loop through each verger and generate PDF
      for (let i = 0; i < vergerOptions.length; i++) {
        const verger = vergerOptions[i];
        console.log(`Generating PDF for verger ${i + 1}/${vergerOptions.length}: ${verger.label}`);

        // Update button text to show progress
        allVergersButton.textContent = `⏳ ${i + 1}/${vergerOptions.length}...`;

        try {
          // Fetch trend data specifically for this verger
          const params = {
            startDate: filters.startDate,
            endDate: filters.endDate,
            chartType: selectedChartType,
            timePeriod: selectedTimePeriod,
            vergerId: verger.value
          };

          // Apply variety filters if selected
          if (filters.selectedGrpVar) {
            params.grpVarId = filters.selectedGrpVar.value;
          }
          if (filters.selectedVariete) {
            params.varieteId = filters.selectedVariete.value;
          }

          console.log(`Fetching data for verger ${verger.label}:`, params);

          let trendData;
          if (selectedChartType === 'combined') {
            // Fetch all three data types in parallel for combined chart
            const [receptionData, exportData, ecartData] = await Promise.all([
              apiGet('/api/dashboard/periodic-trends', { ...params, chartType: 'reception' }),
              apiGet('/api/dashboard/periodic-trends', { ...params, chartType: 'export' }),
              apiGet('/api/dashboard/periodic-trends', { ...params, chartType: 'ecart' })
            ]);

            // Combine the data by date/label
            const combinedDataMap = new Map();

            // Process reception data
            (receptionData.trends || []).forEach(item => {
              const key = item.label;
              if (!combinedDataMap.has(key)) {
                combinedDataMap.set(key, {
                  label: item.label,
                  date: item.date,
                  reception: 0,
                  export: 0,
                  ecart: 0
                });
              }
              combinedDataMap.get(key).reception = parseFloat(item.value) || 0;
            });

            // Process export data
            (exportData.trends || []).forEach(item => {
              const key = item.label;
              if (!combinedDataMap.has(key)) {
                combinedDataMap.set(key, {
                  label: item.label,
                  date: item.date,
                  reception: 0,
                  export: 0,
                  ecart: 0
                });
              }
              combinedDataMap.get(key).export = parseFloat(item.value) || 0;
            });

            // Process ecart data
            (ecartData.trends || []).forEach(item => {
              const key = item.label;
              if (!combinedDataMap.has(key)) {
                combinedDataMap.set(key, {
                  label: item.label,
                  date: item.date,
                  reception: 0,
                  export: 0,
                  ecart: 0
                });
              }
              combinedDataMap.get(key).ecart = parseFloat(item.value) || 0;
            });

            trendData = Array.from(combinedDataMap.values());
          } else {
            // Fetch data for single chart type
            const response = await apiGet('/api/dashboard/periodic-trends', params);
            trendData = response.trends || [];
          }

          // Skip vergers with no data
          if (!trendData || trendData.length === 0) {
            console.log(`Skipping verger ${verger.label} - no data available`);
            continue;
          }

          // Temporarily update the chart data state for chart rendering
          if (selectedChartType === 'combined') {
            setCombinedTrendData(trendData);
          } else {
            setPeriodicTrendData(trendData);
          }

          // Wait longer for React to update the chart with new data (increased for reliability)
          console.log(`Waiting for chart to render with ${trendData.length} data points...`);
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Additional wait to ensure chart is fully rendered
          await new Promise(resolve => setTimeout(resolve, 500));

          // Generate PDF with this verger's specific data
          const chartTypeLabel = selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1);

          // Extract variety names from data that have values if no specific variety is selected
          let varieteDisplayName = filters.selectedVariete ? filters.selectedVariete.label : 'Toutes les Variétés';
          if (!filters.selectedVariete && dashboardData?.tableRows && dashboardData.tableRows.length > 0) {
            // Get unique variety names from table rows that have data for this specific verger
            const vergerVarieties = [...new Set(
              dashboardData.tableRows
                .filter(row => row.vergerName === verger.label.split(' - ')[1]) // Always filter by this specific verger
                .filter(row => !filters.selectedGrpVar || row.groupVarieteName === filters.selectedGrpVar.label) // Match group if selected
                .filter(row => parseFloat(row.totalPdsfru) > 0 || parseFloat(row.totalPdscom) > 0 || parseFloat(row.totalEcart) > 0) // Has data
                .map(row => row.varieteName)
            )];
            if (vergerVarieties.length > 0) {
              varieteDisplayName = vergerVarieties.join('-');
            }
          }

          await generateChartPDF(
            document.getElementById('trend-chart-container'),
            document.getElementById('detail-data-table'),
            {
              title: `Rapport de Performance - ${verger.label}`,
              orchardName: verger.label,
              chartType: chartTypeLabel,
              timePeriod: selectedTimePeriod.charAt(0).toUpperCase() + selectedTimePeriod.slice(1),
              varieteName: varieteDisplayName,
              includeTable: true,
              vergerId: verger.value
            }
          );

          successCount++;

        } catch (vergerError) {
          console.error(`Error generating PDF for verger ${verger.label}:`, vergerError);
          // Continue with next verger instead of stopping the whole process
        }
      }

      // Restore original data
      setPeriodicTrendData(originalPeriodicTrendData);
      setCombinedTrendData(originalCombinedTrendData);

      // Restore button state
      allVergersButton.textContent = originalButtonText;
      allVergersButton.disabled = false;

      console.log('Batch PDF generation completed');
      alert(`Génération terminée! ${successCount}/${vergerOptions.length} PDFs créés avec succès.`);

    } catch (error) {
      console.error('Error in batch PDF generation:', error);
      alert('Erreur lors de la génération des PDFs: ' + error.message);

      // Restore button state on error
      const allVergersButton = document.querySelector('.btn-all-vergers');
      if (allVergersButton) {
        allVergersButton.textContent = '📄 Generate All Vergers PDFs';
        allVergersButton.disabled = false;
      }
    }
  };

  const handleExportVarietesPDF = () => {
    console.log('Varietes PDF button clicked');
    if (!dashboardData?.tableRows?.length) {
      alert('Aucune donnée disponible pour la génération du PDF.');
      return;
    }
    try {
      generateVarietesPDF(
        dashboardData.tableRows,
        grpVarOptions,
        varieteOptions,
        filters
      );
    } catch (error) {
      console.error('Error generating varietes PDF:', error);
      alert('Erreur lors de la génération du PDF des variétés: ' + error.message);
    }
  };

  const handleExportGroupVarietePDF = () => {
    console.log('Group variete PDF button clicked');
    if (!groupedData?.tableRows?.length) {
      alert('Aucune donnée disponible pour la génération du PDF.');
      return;
    }
    try {
      generateGroupVarietePDF(
        groupedData.tableRows,
        grpVarOptions,
        varieteOptions,
        filters
      );
    } catch (error) {
      console.error('Error generating group variete PDF:', error);
      alert('Erreur lors de la génération du PDF des groupes de variétés: ' + error.message);
    }
  };

  const handleExportEcartDetailsPDF = () => {
    console.log('Ecart details PDF button clicked');
    console.log('Ecart details data structure:', JSON.stringify(ecartDetails.data.slice(0, 2), null, 2));
    if (!ecartDetails?.data?.length) {
      alert('Aucune donnée d\'écart disponible pour la génération du PDF.');
      return;
    }
    try {
      // Calculate accurate period from ecart data
      const calculatedPeriod = calculateDateRangeFromTableRows(ecartDetails.data);
      const periodStart = calculatedPeriod?.startDate || filters.startDate;
      const periodEnd = calculatedPeriod?.endDate || filters.endDate;
      const periodFilters = { ...filters, startDate: periodStart, endDate: periodEnd };

      console.log('Calculated period result:', calculatedPeriod);
      console.log('Using period for ecart PDF:', periodStart, 'to', periodEnd);

      generateEcartDetailsPDF(
        ecartDetails,
        periodFilters
      );
    } catch (error) {
      console.error('Error generating ecart details PDF:', error);
      alert('Erreur lors de la génération du PDF des détails d\'écart: ' + error.message);
    }
  };

  const handleExportEcartGroupDetailsPDF = () => {
    console.log('Ecart group details PDF button clicked');
    if (!ecartGroupDetails?.data?.length) {
      alert('Aucune donnée d\'écart groupée disponible pour la génération du PDF.');
      return;
    }
    try {
      // Calculate accurate period from ecart group data
      const calculatedPeriod = calculateDateRangeFromTableRows(ecartGroupDetails.data);
      const periodStart = calculatedPeriod?.startDate || filters.startDate;
      const periodEnd = calculatedPeriod?.endDate || filters.endDate;
      const periodFilters = { ...filters, startDate: periodStart, endDate: periodEnd };

      console.log('Using calculated period for ecart group PDF:', periodStart, 'to', periodEnd);

      const enhancedEcartGroupDetails = {
        ...ecartGroupDetails,
        data: ecartGroupDetails.data.map(row => {
          if (!row.groupVarieteName && row.groupVarieteId && grpVarOptions) {
            const group = grpVarOptions.find(g => g.codgrv === row.groupVarieteId || g.value === row.groupVarieteId);
            return {
              ...row,
              groupVarieteName: group?.nomgrv || group?.label || ''
            };
          }
          return row;
        })
      };

      generateEcartGroupDetailsPDF(
        enhancedEcartGroupDetails,
        periodFilters
      );
    } catch (error) {
      console.error('Error generating ecart group details PDF:', error);
      alert('Erreur lors de la génération du PDF des détails d\'écart groupés: ' + error.message);
    }
  };

  // Filter and Aggregate Vente Ecart Data
  const aggregatedVenteEcartData = useMemo(() => {
    if (!venteEcartData) return [];

    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;

    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    const filteredVentes = venteEcartData.filter(v => {
      const vDate = new Date(v.date);
      if (start && vDate < start) return false;
      if (end && vDate > end) return false;
      return true;
    });

    // Aggregation Logic
    const aggregationMap = {};

    filteredVentes.forEach(vente => {
      if (vente.vecartDs && Array.isArray(vente.vecartDs)) {
        vente.vecartDs.forEach(detail => {
          // Key: VergerId_GroupVarId_TypeEcartId
          const key = `${detail.refver || '0'}_${detail.codgrv || '0'}_${vente.codtype || '0'}`;

          if (!aggregationMap[key]) {
            const verger = vergerOptions.find(v => v.value === detail.refver);
            const groupVar = grpVarOptions.find(g => g.value === detail.codgrv);
            const typeEcart = ecartTypeOptions.find(t => t.value === vente.codtype);

            aggregationMap[key] = {
              key,
              vergerName: verger ? verger.label : (detail.refver || 'N/A'),
              groupVarName: groupVar ? groupVar.label : (detail.codgrv || 'N/A'),
              typeEcartName: typeEcart ? typeEcart.label : (vente.codtype || 'N/A'),
              poidsTotal: 0,
              montantTotal: 0
            };
          }

          const poids = parseFloat(detail.pds) || 0;
          const price = parseFloat(vente.price) || 0;
          aggregationMap[key].poidsTotal += poids;
          aggregationMap[key].montantTotal += (poids * price);
        });
      }
    });

    return Object.values(aggregationMap).sort((a, b) => {
      // Sort by Verger, then GroupVar, then TypeEcart
      if (a.vergerName < b.vergerName) return -1;
      if (a.vergerName > b.vergerName) return 1;
      return 0;
    });
  }, [venteEcartData, filters.startDate, filters.endDate, vergerOptions, grpVarOptions, ecartTypeOptions]);

  const handleExportGlobalVenteEcart = () => {
    if (!aggregatedVenteEcartData || aggregatedVenteEcartData.length === 0) {
      alert('Aucune donnée de vente à exporter pour cette période.');
      return;
    }
    try {
      generateGlobalVenteEcartPDF(aggregatedVenteEcartData, filters);
    } catch (error) {
      console.error("Error generating global vente ecart PDF", error);
      alert("Erreur lors de la génération du PDF.");
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="dashboard-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  return (
    <div className="dashboard-container">
      <h1>Tableau de Bord de Production</h1>

      <div className="dashboard-filters">
        <div className="filter-item"><label>Date de Début</label><input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} /></div>
        <div className="filter-item"><label>Date de Fin</label><input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} /></div>
        <div className="filter-item"><label>Verger</label><Select options={vergerOptions} value={filters.selectedVerger} onChange={val => handleFilterChange('selectedVerger', val)} isClearable placeholder="Tous les Vergers" /></div>
        <div className="filter-item"><label>Groupe de Variétés</label><Select options={grpVarOptions} value={filters.selectedGrpVar} onChange={handleGrpVarChange} isClearable placeholder="Tous les Groupes" /></div>
        <div className="filter-item"><label>Variété</label><Select options={filteredVarieteOptions} value={filters.selectedVariete} onChange={val => handleFilterChange('selectedVariete', val)} isClearable placeholder="Toutes les Variétés" /></div>
      </div>

      {isDataLoading ? <LoadingSpinner /> : !dashboardData ? <p>Aucune donnée disponible pour les filtres sélectionnés.</p> : (
        <>
          <div className="stats-grid">
            <div className="stat-card reception-card">
              <h3>Réception</h3>
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
              <h3>Écart</h3>
              <div className="stat-value-container">
                <p className="stat-value">{formatNumberWithSpaces(dashboardData.totalEcart)}</p>
                <span className="stat-percentage ecart-percentage">({formatNumberWithSpaces(dashboardData.ecartPercentage, 2)}%)</span>
              </div>
            </div>
          </div>

          <CollapsibleCard title="TVN/Export par Verger" open={cardStates.tvnExport} onToggle={(isOpen) => handleCardToggle('tvnExport', isOpen)}>
            <div className="charts-grid">
              <DashboardChart data={dashboardData.receptionByVergerChart} title="Réception par Verger" dataKey="value" color="#3498db" />
              <DashboardChart data={dashboardData.exportByVergerChart} title="Export par Verger" dataKey="value" color="#2ecc71" />
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Analyse Détaillée des Exportations" open={cardStates.detailedExport} onToggle={(isOpen) => handleCardToggle('detailedExport', isOpen)}>
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Export par Verger (Groupé par Variété)</h3>
                <div className="filter-item" style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                  <label>Filtrer par Client</label>
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
                    xAxisDataKey="name"
                  />
                ) : (
                  <p>Veuillez sélectionner un client pour voir le graphique.</p>
                )}
              </div>
              <div className="chart-container">
                <h3>Export par Client (Groupé par Variété)</h3>
                <div className="chart-placeholder"></div>
                {!filters.selectedVerger ? (
                  <p>Veuillez sélectionner un verger pour voir ce graphique.</p>
                ) : salesByDestinationChartData.data.length > 0 ? (
                  <StackedBarChart
                    data={salesByDestinationChartData.data}
                    keys={salesByDestinationChartData.keys}
                    title={`Sales for ${filters.selectedVerger.label}`}
                    xAxisDataKey="name"
                  />
                ) : (
                  <p>Aucune donnée d'export disponible pour ce verger.</p>
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
                    <button
                      className={`chart-type-btn ${selectedChartType === 'combined' ? 'active' : ''}`}
                      onClick={() => setSelectedChartType('combined')}
                      style={{
                        padding: '0.5rem 1rem',
                        border: `2px solid ${selectedChartType === 'combined' ? '#e83e8c' : '#dee2e6'}`,
                        backgroundColor: selectedChartType === 'combined' ? '#e83e8c' : '#ffffff',
                        color: selectedChartType === 'combined' ? '#ffffff' : '#495057',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    >
                      📊 Combined
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
                      className={`time-period-btn ${selectedTimePeriod === 'biweekly' ? 'active' : ''}`}
                      onClick={() => setSelectedTimePeriod('biweekly')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        border: `1px solid ${selectedTimePeriod === 'biweekly' ? '#6f42c1' : '#dee2e6'}`,
                        backgroundColor: selectedTimePeriod === 'biweekly' ? '#6f42c1' : '#ffffff',
                        color: selectedTimePeriod === 'biweekly' ? '#ffffff' : '#495057',
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
                      📊 Bi-weekly
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d' }}>
                Current view: <strong>{selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)}</strong> data by <strong>{selectedTimePeriod.charAt(0).toUpperCase() + selectedTimePeriod.slice(1)}</strong>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => handleExportChart()}
                  className="btn btn-primary"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  📄 Export Chart & Data
                </button>
                {!filters.selectedVerger && (
                  <button
                    onClick={() => handleExportAllVergersPDF()}
                    className="btn btn-all-vergers"
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                    title="Generate PDFs for all verg ers"
                  >
                    📄 Generate All Vergers PDFs
                  </button>
                )}
              </div>
            </div>
            <div className="full-width-chart">
              <div id="trend-chart-container" className="chart-container">
                <h3>Tendances de Performance du Verger</h3>
                {selectedChartType === 'combined' ? (
                  combinedTrendData.length > 0 ? (
                    <CombinedTrendChart
                      data={combinedTrendData}
                      timePeriod={selectedTimePeriod}
                      title={`Tendances Combinées ${filters.selectedVerger ? `du Verger - ${filters.selectedVerger.label}` : 'Tous les Vergers'}`}
                    />
                  ) : (
                    <p>Aucune donnée de tendance combinée disponible{filters.selectedVerger ? ` pour le verger sélectionné` : ' pour les verg ers sélectionnés'}.</p>
                  )
                ) : periodicTrendData.length > 0 ? (
                  <TrendChart
                    data={periodicTrendData}
                    chartType={selectedChartType}
                    timePeriod={selectedTimePeriod}
                    title={`Tendances de Performance ${filters.selectedVerger ? `du Verger - ${filters.selectedVerger.label}` : 'Tous les Vergers'}`}
                  />
                ) : (
                  <p>Aucune donnée de tendance disponible{filters.selectedVerger ? ` pour le verger sélectionné` : ' pour les verg ers sélectionnés'}.</p>
                )}
              </div>
            </div>

            {/* Hidden Table for PDF Generation - Not Visible on Screen */}
            <div id="detail-data-table" className="detail-data-table" style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2' }}>Period</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2' }}>Start Date</th>
                    {selectedChartType === 'combined' ? (
                      <>
                        <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2' }}>Reception</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2' }}>Export</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2' }}>Ecart</th>
                      </>
                    ) : (
                      <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2' }}>{selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedChartType === 'combined' && combinedTrendData.length > 0 ? (
                    combinedTrendData.map((item, index) => (
                      <tr key={index}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.label}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.date}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatNumberWithSpaces(item.reception || 0)}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatNumberWithSpaces(item.export || 0)}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatNumberWithSpaces(item.ecart || 0)}</td>
                      </tr>
                    ))
                  ) : periodicTrendData.length > 0 ? (
                    periodicTrendData.map((item, index) => (
                      <tr key={index}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.label}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.date}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatNumberWithSpaces(item.value || 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={selectedChartType === 'combined' ? 5 : 3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: '#6c757d' }}>
                        Aucune donnée disponible
                      </td>
                    </tr>
                  )}

                  {/* Totals Row */}
                  {((selectedChartType === 'combined' && combinedTrendData.length > 0) || (selectedChartType !== 'combined' && periodicTrendData.length > 0)) && (
                    <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                      <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>TOTAL</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>-</td>
                      {selectedChartType === 'combined' ? (
                        <>
                          <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>
                            {formatNumberWithSpaces(combinedTrendData.reduce((sum, item) => sum + (item.reception || 0), 0))}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>
                            {formatNumberWithSpaces(combinedTrendData.reduce((sum, item) => sum + (item.export || 0), 0))}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>
                            {formatNumberWithSpaces(combinedTrendData.reduce((sum, item) => sum + (item.ecart || 0), 0))}
                          </td>
                        </>
                      ) : (
                        <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>
                          {formatNumberWithSpaces(periodicTrendData.reduce((sum, item) => sum + (item.value || 0), 0))}
                        </td>
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>


          </CollapsibleCard>

          <CollapsibleCard title="Détails des Données" open={cardStates.dataDetails} onToggle={(isOpen) => handleCardToggle('dataDetails', isOpen)}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={handleExportVarietesPDF}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                title="Exporter le tableau des variétés en PDF"
              >
                📄 Détails Variétés
              </button>
              <button
                onClick={handleExportGroupVarietePDF}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                title="Exporter le tableau des groupes de variétés en PDF"
              >
                📄 Détails Groupes Variétés
              </button>
            </div>
            <div className="dashboard-table-container">
              <table className="details-table">
                <thead>
                  <tr>
                    <th className="sortable-header" onClick={() => handleSort('vergerName', false)}>Verger{sortConfig.key === 'vergerName' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    <th className="sortable-header" onClick={() => handleSort('varieteName', false)}>Variété{sortConfig.key === 'varieteName' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    <th className="sortable-header" onClick={() => handleSort('totalPdsfru', false)}>Réception{sortConfig.key === 'totalPdsfru' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    <th className="sortable-header" onClick={() => handleSort('totalPdscom', false)}>Export{sortConfig.key === 'totalPdscom' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                    <th className="sortable-header" onClick={() => handleSort('totalEcart', false)}>Écart{sortConfig.key === 'totalEcart' && (<span className="sort-indicator">{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
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

          <CollapsibleCard title="Détails des Écarts" open={cardStates.ecartDetails} onToggle={(isOpen) => handleCardToggle('ecartDetails', isOpen)}>

            <div className="ecart-filter-container">
              <div className="filter-item">

                <label>Filtrer par Type d'Écart</label>
                <Select
                  options={ecartTypeOptions}
                  value={filters.selectedEcartType}
                  onChange={val => handleFilterChange('selectedEcartType', val)}
                  isClearable
                  placeholder="Tous les Types d'Écart..."
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    onClick={handleExportEcartDetailsPDF}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                    title="Exporter les détails d'écart en PDF (avec caisses)"
                  >
                    📄  Écarts Par variete
                  </button>
                  <button
                    onClick={handleExportEcartGroupDetailsPDF}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                    title="Exporter les détails d'écart groupés en PDF"
                  >
                    📄 Écarts Par Group Variete
                  </button>
                </div>
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
                      <th className="sortable-header" onClick={() => handleSort('varieteName', true)}>Variété{ecartSortConfig.key === 'varieteName' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
                      <th className="sortable-header" onClick={() => handleSort('ecartType', true)}>Type d'Écart{ecartSortConfig.key === 'ecartType' && (<span className="sort-indicator">{ecartSortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>)}</th>
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
                        <td>{formatNumberWithSpaces(row.totalNbrcai, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleCard>

          <CollapsibleCard title="Détails Ventes Écarts" open={cardStates.venteEcartDetails} onToggle={(isOpen) => handleCardToggle('venteEcartDetails', isOpen)}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleExportGlobalVenteEcart}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📄 Export Rapport Global
              </button>
            </div>

            <div className="dashboard-table-container">
              {aggregatedVenteEcartData.length > 0 ? (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Verger</th>
                      <th>Groupe Variété</th>
                      <th>Type d'Écart</th>
                      <th style={{ textAlign: 'right' }}>Poids (kg)</th>
                      <th style={{ textAlign: 'right' }}>Montant (DH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedVenteEcartData.map((row, index) => (
                      <tr key={row.key || index}>
                        <td>{row.vergerName}</td>
                        <td>{row.groupVarName}</td>
                        <td>{row.typeEcartName}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumberWithSpaces(row.poidsTotal)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatNumberWithSpaces(row.montantTotal)}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                      <td colSpan="3" style={{ textAlign: 'right' }}>TOTAL</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatNumberWithSpaces(aggregatedVenteEcartData.reduce((sum, v) => sum + (v.poidsTotal || 0), 0))}
                      </td>
                      <td style={{ textAlign: 'right', color: '#28a745' }}>
                        {formatNumberWithSpaces(aggregatedVenteEcartData.reduce((sum, v) => sum + (v.montantTotal || 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p style={{ padding: '1rem', textAlign: 'center', color: '#6c757d' }}>Aucune donnée de vente groupée trouvée pour cette période.</p>
              )}
            </div>
          </CollapsibleCard>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
