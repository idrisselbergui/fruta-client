import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatNumberWithSpaces = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0';
  const fixed = Math.abs(num).toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (num < 0 ? '-' : '') + parts.join('.');
};

const generateDetailedExportPDF = (dashboardData, destinationChartData, salesByDestinationChartData, selectedDestination, selectedVerger, filters) => {
  console.log('Starting PDF generation with data:', {
    dashboardData: dashboardData ? 'present' : 'null',
    destinationChartData: destinationChartData ? 'present' : 'null',
    salesByDestinationChartData: salesByDestinationChartData ? 'present' : 'null',
    selectedDestination: selectedDestination,
    selectedVerger: selectedVerger,
    filters: filters
  });

  // Ensure we have valid data
  if (!destinationChartData?.data?.length) {
    console.error('No destination chart data available for PDF generation');
    throw new Error('No chart data available. Please select a client and ensure data is loaded.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add clear logo in top right corner
  try {
    const logoPath = '/diaf.png';
    // Add logo in top right corner (clear and visible)
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (error) {
    console.log('Logo not found, continuing without logo');
  }

  // Header
  doc.setFontSize(18);
  doc.text('Export par Verger (Groupé par Variété)', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  doc.text(`Période: ${filters.startDate} au ${filters.endDate}`, 20, 37);
  doc.text(`Client: ${selectedDestination.label}`, 20, 44);

  let yPosition = 55;

  // Create a simple table with Verger, Variete, and Pds
  if (destinationChartData?.data && destinationChartData.data.length > 0) {
    console.log('Processing destination chart data for simple table:', destinationChartData);

    const allVarieties = destinationChartData.keys || [];
    const tableData = [];
    let grandTotal = 0;

    // Flatten the data
    destinationChartData.data.forEach(item => {
      const vergerName = item.name || 'Unknown';
      allVarieties.forEach(variety => {
        const value = parseFloat(item[variety]) || 0;
        if (value > 0) {
          tableData.push({
            verger: vergerName,
            variete: variety,
            pds: value
          });
          grandTotal += value;
        }
      });
    });

    // Sort data
    tableData.sort((a, b) => {
      if (a.verger < b.verger) return -1;
      if (a.verger > b.verger) return 1;
      if (a.variete < b.variete) return -1;
      if (a.variete > b.variete) return 1;
      return 0;
    });

    const tableBody = tableData.map(row => [
      row.verger,
      row.variete,
      formatNumberWithSpaces(row.pds, 0)
    ]);

    const headerRow = ['Verger', 'Variété', 'Pds'];

    // Add total row
    tableBody.push(['TOTAL', '', formatNumberWithSpaces(grandTotal, 0)]);

    console.log('Final simple table data:', tableBody);

    // Generate the table
    autoTable(doc, {
      startY: yPosition,
      head: [headerRow],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'right' }
      },
      margin: { left: 10, right: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }

  // Save the PDF
  const fileName = `export-par-verger-groupe-par-variete-${selectedDestination?.label || 'tous'}-${new Date().toISOString().split('T')[0]}.pdf`;
  console.log('Saving PDF with filename:', fileName);

  try {
    doc.save(fileName);
    console.log('PDF saved successfully');
    return fileName;
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw error;
  }
};

// Helper function to calculate accurate date range from table rows
const calculateDateRangeFromTableRows = (tableRows) => {
  console.log('🔍 Calculating date range from table rows...');
  if (!tableRows || !tableRows.length) {
    console.log('❌ No table rows provided');
    return null;
  }

  let allDates = [];
  let foundDateFields = 0;

  tableRows.forEach((row, index) => {
    if (index < 2) { // Log first 2 rows for debugging
      console.log(`📊 Row ${index + 1} fields:`, Object.keys(row));
    }

    // Check for regular dashboard date fields (reception/export)
    if (row.minReceptionDate) {
      console.log('✅ Found minReceptionDate:', row.minReceptionDate);
      const minDate = new Date(row.minReceptionDate);
      if (!isNaN(minDate.getTime())) {
        allDates.push(minDate);
        foundDateFields++;
      }
    }
    if (row.maxExportDate) {
      console.log('✅ Found maxExportDate:', row.maxExportDate);
      const maxDate = new Date(row.maxExportDate);
      if (!isNaN(maxDate.getTime())) {
        allDates.push(maxDate);
        foundDateFields++;
      }
    }

    // Check for ecart date fields (when ecarts were recorded)
    if (row.minEcartDate) {
      console.log('✅ Found minEcartDate:', row.minEcartDate);
      const minDate = new Date(row.minEcartDate);
      if (!isNaN(minDate.getTime())) {
        allDates.push(minDate);
        foundDateFields++;
      }
    }
    if (row.MaxEcartDate) { // Try PascalCase too
      console.log('✅ Found MaxEcartDate (PascalCase):', row.MaxEcartDate);
      const maxDate = new Date(row.MaxEcartDate);
      if (!isNaN(maxDate.getTime())) {
        allDates.push(maxDate);
        foundDateFields++;
      }
    }
    if (row.maxEcartDate) {
      console.log('✅ Found maxEcartDate (camelCase):', row.maxEcartDate);
      const maxDate = new Date(row.maxEcartDate);
      if (!isNaN(maxDate.getTime())) {
        allDates.push(maxDate);
        foundDateFields++;
      }
    }

    // Check for any Date fields that start with "min" or "max"
    Object.keys(row).forEach(field => {
      if (field.toLowerCase().includes('date') && (field.toLowerCase().startsWith('min') || field.toLowerCase().startsWith('max'))) {
        console.log('⚠️ Found date-related field:', field, '=', row[field]);
      }
    });
  });

  console.log(`📈 Found ${foundDateFields} date fields across ${tableRows.length} rows`);

  if (allDates.length === 0) {
    console.log('❌ No valid dates found in table rows, will use filter fallback');
    return null; // Will use filter dates as fallback
  }

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  const startDate = minDate.toLocaleDateString('sv-SE');
  const endDate = maxDate.toLocaleDateString('sv-SE');

  console.log(`🎯 FINAL: Calculated period from ${allDates.length} dates: ${startDate} to ${endDate}`);
  return { startDate, endDate };
};

const generateVarietesPDF = (tableRows, grpVarOptions, varieteOptions, filters) => {
  console.log('Starting varietes PDF generation with tableRows:', tableRows);

  if (!tableRows?.length) {
    console.error('No table rows available for varietes PDF');
    throw new Error('No data available. Please ensure data is loaded.');
  }

  // Calculate accurate period from table data
  const calculatedPeriod = calculateDateRangeFromTableRows(tableRows);
  const periodStart = calculatedPeriod?.startDate || filters.startDate;
  const periodEnd = calculatedPeriod?.endDate || filters.endDate;

  console.log(`Using period for PDF: ${periodStart} to ${periodEnd}`);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add clear logo in top right corner
  try {
    const logoPath = '/diaf.png';
    // Add logo in top right corner (clear and visible)
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (error) {
    console.log('Logo not found, continuing without logo');
  }

  // Header
  doc.setFontSize(18);
  doc.text('Détails des Données - Variétés', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  doc.text(`Période: ${periodStart} au ${periodEnd}`, 20, 37);

  let yPosition = 50;

  // Sort the table rows by verger name first
  const sortedTableRows = [...tableRows].sort((a, b) => (a.vergerName || '').localeCompare(b.vergerName || ''));

  // Create table data - same as the details table in the UI
  const tableData = [];

  // Add header - same as in the DashboardPage table
  const headerRow = ['Verger', 'Variété', 'Réception', 'Export', 'Écart'];
  tableData.push(headerRow);

  // Add data rows - same data as displayed in the UI table
  let grandTotalPdsfru = 0;
  let grandTotalPdscom = 0;
  let grandTotalEcart = 0;

  sortedTableRows.forEach(row => {
    const rowData = [
      (row.vergerName || '').toUpperCase(),
      (row.varieteName || '').toUpperCase(),
      formatNumberWithSpaces(parseFloat(row.totalPdsfru) || 0, 0),
      formatNumberWithSpaces(parseFloat(row.totalPdscom) || 0, 0),
      formatNumberWithSpaces(parseFloat(row.totalEcart) || 0, 0)
    ];
    tableData.push(rowData);

    grandTotalPdsfru += parseFloat(row.totalPdsfru) || 0;
    grandTotalPdscom += parseFloat(row.totalPdscom) || 0;
    grandTotalEcart += parseFloat(row.totalEcart) || 0;
  });

  // Add total row
  const totalRow = [
    'TOTAL',
    '',
    formatNumberWithSpaces(grandTotalPdsfru, 0),
    formatNumberWithSpaces(grandTotalPdscom, 0),
    formatNumberWithSpaces(grandTotalEcart, 0)
  ];
  tableData.push(totalRow);

  console.log('Final table data for varietes (raw data):', tableData);

  // Generate the table with smaller height
  autoTable(doc, {
    startY: yPosition,
    head: [headerRow],
    body: tableData.slice(1),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' }
    },
    margin: { left: 10, right: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Save the PDF
  const fileName = `details-donnee-varietes-${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    doc.save(fileName);
    console.log('Varietes PDF saved successfully:', fileName);
    return fileName;
  } catch (error) {
    console.error('Error saving varietes PDF:', error);
    throw error;
  }
};

const generateGroupVarietePDF = (tableRows, grpVarOptions, varieteOptions, filters) => {
  console.log('Starting group variete PDF generation with tableRows:', tableRows);

  if (!tableRows?.length) {
    console.error('No table rows available for group variete PDF');
    throw new Error('No data available. Please ensure data is loaded.');
  }

  // Calculate accurate period from table data
  const calculatedPeriod = calculateDateRangeFromTableRows(tableRows);
  const periodStart = calculatedPeriod?.startDate || filters.startDate;
  const periodEnd = calculatedPeriod?.endDate || filters.endDate;

  console.log(`Using period for PDF: ${periodStart} to ${periodEnd}`);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add clear logo in top right corner
  try {
    const logoPath = '/diaf.png';
    // Add logo in top right corner (clear and visible)
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (error) {
    console.log('Logo not found, continuing without logo');
  }

  // Header
  doc.setFontSize(18);
  doc.text('Détails des Données - Groupes de Variétés', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  doc.text(`Période: ${periodStart} au ${periodEnd}`, 20, 37);

  let yPosition = 50;

  // Sort the table rows by verger name first, then by group name
  const sortedTableRows = [...tableRows].sort((a, b) => {
    const vergerCompare = (a.vergerName || '').localeCompare(b.vergerName || '');
    if (vergerCompare !== 0) return vergerCompare;
    return (a.groupVarieteName || '').localeCompare(b.groupVarieteName || '');
  });

  // Create table data - using the pre-grouped data structure
  const tableData = [];

  // Add header - same as in the DashboardPage table
  const headerRow = ['Verger', 'Groupe Variété', 'Réception', 'Export', 'Écart'];
  tableData.push(headerRow);

  // Add data rows - using the pre-grouped data from backend
  let grandTotalPdsfru = 0;
  let grandTotalPdscom = 0;
  let grandTotalEcart = 0;

  sortedTableRows.forEach(row => {
    const rowData = [
      (row.vergerName || '').toUpperCase(),
      (row.groupVarieteName || '').toUpperCase(),
      formatNumberWithSpaces(parseFloat(row.totalPdsfru) || 0, 0),
      formatNumberWithSpaces(parseFloat(row.totalPdscom) || 0, 0),
      formatNumberWithSpaces(parseFloat(row.totalEcart) || 0, 0)
    ];
    tableData.push(rowData);

    grandTotalPdsfru += parseFloat(row.totalPdsfru) || 0;
    grandTotalPdscom += parseFloat(row.totalPdscom) || 0;
    grandTotalEcart += parseFloat(row.totalEcart) || 0;
  });

  // Add total row
  const totalRow = [
    'TOTAL',
    '',
    formatNumberWithSpaces(grandTotalPdsfru, 0),
    formatNumberWithSpaces(grandTotalPdscom, 0),
    formatNumberWithSpaces(grandTotalEcart, 0)
  ];
  tableData.push(totalRow);

  console.log('Final table data for group variete (raw data):', tableData);

  // Generate the table with smaller height
  autoTable(doc, {
    startY: yPosition,
    head: [headerRow],
    body: tableData.slice(1),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 10, right: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Save the PDF
  const fileName = `details-donnee-groupes-variete-${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    doc.save(fileName);
    console.log('Group variete PDF saved successfully:', fileName);
    return fileName;
  } catch (error) {
    console.error('Error saving group variete PDF:', error);
    throw error;
  }
};

const generateEcartDetailsPDF = (ecartDetails, filters) => {
  console.log('Starting ecart details PDF generation');

  if (!ecartDetails?.data?.length) {
    console.error('No ecart details available for PDF');
    throw new Error('No ecart data available. Please ensure data is loaded.');
  }

  // Calculate accurate period from ecart data
  const calculatedPeriod = calculateDateRangeFromTableRows(ecartDetails.data);
  const periodStart = calculatedPeriod?.startDate || filters.startDate;
  const periodEnd = calculatedPeriod?.endDate || filters.endDate;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add clear logo in top right corner
  try {
    const logoPath = '/diaf.png';
    // Add logo in top right corner (clear and visible)
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (error) {
    console.log('Logo not found, continuing without logo');
  }

  // Header
  doc.setFontSize(18);
  doc.text('Détails des Écarts', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  doc.text(`Période: ${periodStart} au ${periodEnd}`, 20, 37);

  let yPosition = 50;

  // Sort the ecart details by verger name first
  const sortedEcartDetails = [...ecartDetails.data].sort((a, b) =>
    (a.vergerName || '').localeCompare(b.vergerName || '')
  );

  // Create table data for ecart details
  const tableData = [];

  // Add header - Ecart details with caisses column
  const headerRow = ['Verger', 'Variété', 'Type d\'Écart', 'Poids Fruit', 'Caisses'];
  tableData.push(headerRow);

  // Add data rows
  let grandTotalPdsfru = 0;
  let grandTotalNbrcai = 0;

  sortedEcartDetails.forEach(row => {
    const rowData = [
      (row.vergerName || '').toUpperCase(),
      (row.varieteName || '').toUpperCase(),
      (row.ecartType || '').toUpperCase(),
      formatNumberWithSpaces(parseFloat(row.totalPdsfru) || 0, 2),
      formatNumberWithSpaces(parseFloat(row.totalNbrcai) || 0, 0)
    ];
    tableData.push(rowData);

    grandTotalPdsfru += parseFloat(row.totalPdsfru) || 0;
    grandTotalNbrcai += parseFloat(row.totalNbrcai) || 0;
  });

  // Add total row
  const totalRow = [
    'TOTAL',
    '',
    '',
    formatNumberWithSpaces(grandTotalPdsfru, 0),
    formatNumberWithSpaces(grandTotalNbrcai, 0)
  ];
  tableData.push(totalRow);

  console.log('Final table data for ecart details:', tableData);

  // Generate the table
  autoTable(doc, {
    startY: yPosition,
    head: [headerRow],
    body: tableData.slice(1),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [220, 53, 69], // Red color for ecart theme
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' }
    },
    margin: { left: 10, right: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Save the PDF
  const fileName = `details-ecarts-${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    doc.save(fileName);
    console.log('Ecart details PDF saved successfully:', fileName);
    return fileName;
  } catch (error) {
    console.error('Error saving ecart details PDF:', error);
    throw error;
  }
};

const generateEcartGroupDetailsPDF = (ecartGroupDetails, filters) => {
  console.log('Starting ecart group details PDF generation');

  if (!ecartGroupDetails?.data?.length) {
    console.error('No ecart group details available for PDF');
    throw new Error('No ecart group data available. Please ensure data is loaded.');
  }

  // Calculate accurate period from ecart group data
  const calculatedPeriod = calculateDateRangeFromTableRows(ecartGroupDetails.data);
  const periodStart = calculatedPeriod?.startDate || filters.startDate;
  const periodEnd = calculatedPeriod?.endDate || filters.endDate;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add clear logo in top right corner
  try {
    const logoPath = '/diaf.png';
    // Add logo in top right corner (clear and visible)
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (error) {
    console.log('Logo not found, continuing without logo');
  }

  // Header
  doc.setFontSize(18);
  doc.text('Détails des Écarts Groupés', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  doc.text(`Période: ${periodStart} au ${periodEnd}`, 20, 37);

  let yPosition = 50;

  // Sort the ecart group details by verger name first
  const sortedEcartGroupDetails = [...ecartGroupDetails.data].sort((a, b) =>
    (a.vergerName || '').localeCompare(b.vergerName || '')
  );

  // Create table data for ecart group details
  const tableData = [];

  // Add header - Grouped ecart details including variety group
  const headerRow = ['Verger', 'Groupe de Variété', 'Groupe Écart', 'Poids Fruit', 'Caisses'];
  tableData.push(headerRow);

  // Add data rows
  let grandTotalPdsfru = 0;
  let grandTotalNbrcai = 0;

  sortedEcartGroupDetails.forEach(row => {
    const rowData = [
      (row.vergerName || '').toUpperCase(),
      (row.groupVarieteName || '').toUpperCase(),
      (row.groupName || row.ecartType || '').toUpperCase(),
      formatNumberWithSpaces(parseFloat(row.totalPdsfru) || 0, 2),
      formatNumberWithSpaces(parseFloat(row.totalNbrcai) || 0, 0)
    ];
    tableData.push(rowData);

    grandTotalPdsfru += parseFloat(row.totalPdsfru) || 0;
    grandTotalNbrcai += parseFloat(row.totalNbrcai) || 0;
  });

  // Add total row
  const totalRow = [
    'TOTAL',
    '',
    '',
    formatNumberWithSpaces(grandTotalPdsfru, 0),
    formatNumberWithSpaces(grandTotalNbrcai, 0)
  ];
  tableData.push(totalRow);

  console.log('Final table data for ecart group details:', tableData);

  // Generate the table
  autoTable(doc, {
    startY: yPosition,
    head: [headerRow],
    body: tableData.slice(1),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [220, 53, 69], // Red color for ecart theme
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' }
    },
    margin: { left: 10, right: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Save the PDF
  const fileName = `details-ecarts-groupes-${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    doc.save(fileName);
    console.log('Ecart group details PDF saved successfully:', fileName);
    return fileName;
  } catch (error) {
    console.error('Error saving ecart group details PDF:', error);
    throw error;
  }
};

const generateEcartDirectGroupedPDF = (ecartDirectData, vergers, varietes, typeEcarts, filters) => {
  console.log('Starting Ecart Direct grouped PDF generation');

  if (!ecartDirectData?.length) {
    console.error('No ecart direct data available for PDF');
    throw new Error('No data available. Please ensure data is loaded.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add clear logo in top right corner
  try {
    const logoPath = '/diaf.png';
    // Add logo in top right corner (clear and visible)
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (error) {
    console.log('Logo not found, continuing without logo');
  }

  // Header
  doc.setFontSize(18);
  doc.text('Rapport Écarts Directs (Groupés)', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  if (filters.startDate && filters.endDate) {
    doc.text(`Période: ${filters.startDate} au ${filters.endDate}`, 20, 37);
  } else if (filters.startDate) {
    doc.text(`À partir du: ${filters.startDate}`, 20, 37);
  } else if (filters.endDate) {
    doc.text(`Jusqu'au: ${filters.endDate}`, 20, 37);
  }

  let yPosition = 50;

  // Group data by verger -> variete -> typeecart
  const groupedData = {};

  ecartDirectData.forEach(item => {
    const verger = vergers.find(v => v.refver === item.refver);
    const variete = varietes.find(v => v.codvar === item.codvar);
    const typeEcart = typeEcarts.find(t => t.codtype === item.codtype);

    const vergerKey = verger ? verger.nomver : 'N/A';
    const varieteKey = variete ? variete.nomvar : 'N/A';
    const typeEcartKey = typeEcart ? typeEcart.destype : 'N/A';

    if (!groupedData[vergerKey]) groupedData[vergerKey] = {};
    if (!groupedData[vergerKey][varieteKey]) groupedData[vergerKey][varieteKey] = {};
    if (!groupedData[vergerKey][varieteKey][typeEcartKey]) {
      groupedData[vergerKey][varieteKey][typeEcartKey] = 0;
    }

    groupedData[vergerKey][varieteKey][typeEcartKey] += parseFloat(item.pdsfru) || 0;
  });

  // Create table data for hierarchical display
  const tableData = [];
  const headerRow = ['Verger', 'Variété', 'Type d\'Écart', 'Poids Fruit Total'];
  tableData.push(headerRow);

  let grandTotal = 0;

  // Sort verg ers alphabetically
  const sortedVergers = Object.keys(groupedData).sort();

  sortedVergers.forEach(vergerName => {
    let vergerTotal = 0;
    const sortedVarietes = Object.keys(groupedData[vergerName]).sort();

    sortedVarietes.forEach(varieteName => {
      let varieteTotal = 0;
      const sortedTypeEcarts = Object.keys(groupedData[vergerName][varieteName]).sort();

      sortedTypeEcarts.forEach(typeEcartName => {
        const weight = groupedData[vergerName][varieteName][typeEcartName];
        tableData.push([
          vergerName.toUpperCase(),
          varieteName.toUpperCase(),
          typeEcartName.toUpperCase(),
          formatNumberWithSpaces(weight, 2)
        ]);
        varieteTotal += weight;
        vergerTotal += weight;
        grandTotal += weight;
      });
    });
  });

  // Grand total
  tableData.push([
    'TOTAL GÉNÉRAL',
    '',
    '',
    formatNumberWithSpaces(grandTotal, 2)
  ]);

  console.log('Final table data for ecart direct grouped PDF:', tableData);

  // Generate the table
  autoTable(doc, {
    startY: yPosition,
    head: [headerRow],
    body: tableData.slice(1),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [220, 53, 69], // Red color for ecart theme
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 10, right: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Save the PDF
  const fileName = `rapport-ecarts-direct-groupes-${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    doc.save(fileName);
    console.log('Ecart Direct Grouped PDF saved successfully:', fileName);
    return fileName;
  } catch (error) {
    console.error('Error saving ecart direct grouped PDF:', error);
    throw error;
  }
};

const generateEcartDirectDetailsPDF = (ecartDirectData, vergers, varietes, typeEcarts, filters) => {
  console.log('Starting Ecart Direct details PDF generation');

  if (!ecartDirectData?.length) {
    console.error('No ecart direct data available for details PDF');
    throw new Error('No data available. Please ensure data is loaded.');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Add clear logo in top right corner
  try {
    const logoPath = '/diaf.png';
    // Add logo in top right corner (clear and visible)
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (error) {
    console.log('Logo not found, continuing without logo');
  }

  // Header
  doc.setFontSize(18);
  doc.text('Rapport Écarts Directs (Détails)', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  if (filters.startDate && filters.endDate) {
    doc.text(`Période: ${filters.startDate} au ${filters.endDate}`, 20, 37);
  } else if (filters.startDate) {
    doc.text(`À partir du: ${filters.startDate}`, 20, 37);
  } else if (filters.endDate) {
    doc.text(`Jusqu'au: ${filters.endDate}`, 20, 37);
  }

  let yPosition = 50;

  // Create table data - same as displayed in the table
  const tableData = [];
  const headerRow = ['N° Palette', 'Verger', 'Variété', 'Date', 'N° BL', 'Poids Fruit', 'Type d\'Écart'];
  tableData.push(headerRow);

  let totalPdsfru = 0;

  // Sort by numpal descending (same as table)
  const sortedData = [...ecartDirectData].sort((a, b) => b.numpal - a.numpal);

  sortedData.forEach(row => {
    const verger = vergers.find(v => v.refver === row.refver);
    const variete = varietes.find(v => v.codvar === row.codvar);
    const typeEcart = typeEcarts.find(t => t.codtype === row.codtype);

    const rowData = [
      row.numpal,
      (verger?.nomver || 'N/A').toUpperCase(),
      (variete?.nomvar || 'N/A').toUpperCase(),
      row.dtepal ? new Date(row.dtepal).toLocaleDateString('fr-FR') : '',
      row.numbl || '',
      formatNumberWithSpaces(parseFloat(row.pdsfru) || 0, 2),
      (typeEcart?.destype || 'N/A').toUpperCase()
    ];
    tableData.push(rowData);

    totalPdsfru += parseFloat(row.pdsfru) || 0;
  });

  // Add total row
  tableData.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    formatNumberWithSpaces(totalPdsfru, 2),
    ''
  ]);

  console.log('Final table data for ecart direct details PDF:', tableData);

  // Generate the table
  autoTable(doc, {
    startY: yPosition,
    head: [headerRow],
    body: tableData.slice(1),
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [220, 53, 69], // Red color for ecart theme
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 40 }
    },
    margin: { left: 10, right: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Save the PDF
  const fileName = `rapport-ecarts-direct-details-${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    doc.save(fileName);
    console.log('Ecart Direct Details PDF saved successfully:', fileName);
    return fileName;
  } catch (error) {
    console.error('Error saving ecart direct details PDF:', error);
    throw error;
  }
};

// Helper to generate defect performance chart using Canvas
const generateDefectChart = (dailyChecks, availableDefects) => {
  return new Promise((resolve) => {
    try {
      if (!dailyChecks || dailyChecks.length === 0) {
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Extract all unique dates and defect types
      const dates = dailyChecks.map(dc => new Date(dc.checkDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));

      const defectMap = new Map(); // defectId -> { name, color, data: [] }
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#71B37C'];

      let colorIndex = 0;

      // Initialize defect map
      dailyChecks.forEach(dc => {
        dc.defects.forEach(d => {
          if (!defectMap.has(d.defectId)) {
            const defectInfo = availableDefects.find(ad => ad.coddef === d.defectId);
            defectMap.set(d.defectId, {
              name: defectInfo ? defectInfo.intdef : `Defect ${d.defectId}`, // Use intdef from Defaut model
              color: colors[colorIndex % colors.length],
              data: new Array(dailyChecks.length).fill(0)
            });
            colorIndex++;
          }
        });
      });

      // Fill data
      dailyChecks.forEach((dc, dayIndex) => {
        dc.defects.forEach(d => {
          if (defectMap.has(d.defectId)) {
            defectMap.get(d.defectId).data[dayIndex] = d.quantity;
          }
        });
      });

      // Chart Dimensions
      const padding = 50;
      const chartWidth = canvas.width - (padding * 2);
      const chartHeight = canvas.height - (padding * 2);

      // Calculate Max Y
      let maxY = 0;
      defectMap.forEach(d => {
        const localMax = Math.max(...d.data);
        if (localMax > maxY) maxY = localMax;
      });
      maxY = Math.ceil(maxY * 1.1) || 10; // Add 10% buffering, min 10

      // Draw Axes
      ctx.beginPath();
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1; // Thinner axis lines
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding); // Y Axis
      ctx.lineTo(canvas.width - padding, canvas.height - padding); // X Axis
      ctx.stroke();

      // Draw Y Labels & Grid
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '12px Inter, sans-serif';
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const yVal = Math.round((maxY / steps) * i);
        const yPos = canvas.height - padding - ((yVal / maxY) * chartHeight);
        ctx.fillText(formatNumber(yVal), padding - 10, yPos);

        // Grid line
        ctx.beginPath();
        ctx.strokeStyle = '#eeeeee';
        ctx.moveTo(padding, yPos);
        ctx.lineTo(canvas.width - padding, yPos);
        ctx.stroke();
      }

      // Bar Configuration
      const numGroups = dates.length;
      const numSeries = defectMap.size;
      const groupWidth = chartWidth / numGroups;
      // Use 70% of the group width for bars, reserving 30% for spacing between groups
      const totalBarWidth = groupWidth * 0.7;
      const singleBarWidth = totalBarWidth / numSeries;
      const groupSpacing = groupWidth * 0.15; // 15% padding on each side

      // Draw X Labels
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // const stepX = chartWidth / (dates.length > 0 ? dates.length : 1); // Logic adjusted for bars

      dates.forEach((date, i) => {
        const xCenter = padding + (i * groupWidth) + (groupWidth / 2);
        ctx.fillText(date, xCenter, canvas.height - padding + 10);
      });

      // Draw Bars
      let seriesIndex = 0;
      defectMap.forEach((defect) => {
        ctx.fillStyle = defect.color;

        defect.data.forEach((val, groupIndex) => {
          if (val > 0) {
            const barHeight = (val / maxY) * chartHeight;
            // Calculate x position for this specific bar
            // Start of group + spacing + (this series * bar width)
            const xPos = padding + (groupIndex * groupWidth) + groupSpacing + (seriesIndex * singleBarWidth);
            const yPos = canvas.height - padding - barHeight;

            ctx.fillRect(xPos, yPos, singleBarWidth - 2, barHeight); // -2 for small gap between bars

            // Draw Value
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.fillText(val, xPos + (singleBarWidth - 2) / 2, yPos - 2);
          }
        });
        seriesIndex++;
      });

      // Draw Legend
      const legendX = padding;
      const legendY = 20;
      let currentLegendX = legendX;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic'; // Reset baseline for normal text

      defectMap.forEach((defect) => {
        ctx.fillStyle = defect.color;
        ctx.fillRect(currentLegendX, legendY, 15, 15);
        ctx.fillStyle = '#333333';
        ctx.fillText(defect.name || 'Inconnu', currentLegendX + 20, legendY + 12);
        currentLegendX += ctx.measureText(defect.name || 'Inconnu').width + 50;
      });

      resolve(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Error generating chart:', e);
      resolve(null);
    }
  });
};

const generateColorationChart = (dailyChecks) => {
  return new Promise((resolve) => {
    try {
      if (!dailyChecks || dailyChecks.length === 0) {
        resolve(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 250;
      const ctx = canvas.getContext('2d');
      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const dates = dailyChecks.map(dc => new Date(dc.checkDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
      // Calculate Average Color
      const avgColorData = dailyChecks.map(dc => ((dc.couleur1 || 0) + (dc.couleur2 || 0)) / 2);

      const padding = 40;
      const chartWidth = canvas.width - (padding * 2);
      const chartHeight = canvas.height - (padding * 2);
      const maxY = Math.ceil(Math.max(...avgColorData, 8)) + 1; // Ensure enough height

      // Axes
      ctx.beginPath();
      ctx.strokeStyle = '#ccc';
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      ctx.stroke();

      // Draw X Axis Labels (Dates)
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '10px Inter, sans-serif';
      const stepX = chartWidth / (dates.length > 1 ? dates.length - 1 : 1);
      dates.forEach((date, i) => {
        const x = padding + (i * stepX);
        ctx.fillText(date, x, canvas.height - padding + 10);
      });

      // Draw Y Axis Labels
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const yVal = Math.round((maxY / steps) * i * 10) / 10;
        const yPos = canvas.height - padding - ((yVal / maxY) * chartHeight);
        ctx.fillText(yVal, padding - 5, yPos);

        // Grid
        ctx.beginPath();
        ctx.strokeStyle = '#eee';
        ctx.moveTo(padding, yPos);
        ctx.lineTo(canvas.width - padding, yPos);
        ctx.stroke();
      }

      // Draw Average Line
      ctx.beginPath();
      ctx.strokeStyle = '#9966FF'; // Purple for average
      ctx.lineWidth = 3;
      avgColorData.forEach((val, i) => {
        const x = padding + (i * stepX);
        const y = canvas.height - padding - ((val / maxY) * chartHeight);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Points & Numbers
      ctx.fillStyle = '#9966FF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 10px Inter, sans-serif';

      avgColorData.forEach((val, i) => {
        const x = padding + (i * stepX);
        const y = canvas.height - padding - ((val / maxY) * chartHeight);

        // Point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Number Label
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(val.toFixed(1), x, y - 8);
        ctx.fillStyle = '#9966FF'; // Reset for next point
      });

      // Legend
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#9966FF';
      ctx.fillRect(padding, 10, 15, 10);
      ctx.fillStyle = '#333';
      ctx.fillText('Coul. Moyenne', padding + 20, 10);

      resolve(canvas.toDataURL('image/png'));
    } catch (e) { resolve(null); }
  });
};

const generateWeightChart = (dailyChecks) => {
  return new Promise((resolve) => {
    try {
      if (!dailyChecks || dailyChecks.length === 0) {
        resolve(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 250;
      const ctx = canvas.getContext('2d');
      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const dates = dailyChecks.map(dc => new Date(dc.checkDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
      const weightData = dailyChecks.map(dc => dc.pdsfru);
      const padding = 40;
      const chartWidth = canvas.width - (padding * 2);
      const chartHeight = canvas.height - (padding * 2);

      const maxVal = Math.max(...weightData);
      const minVal = Math.min(...weightData);
      const diff = maxVal - minVal;
      const range = diff === 0 ? maxVal * 0.2 : diff;
      const maxY = maxVal + (range * 0.2); // +20%

      // Axes
      ctx.beginPath();
      ctx.strokeStyle = '#ccc';
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      ctx.stroke();

      // Draw X Axis Labels (Dates)
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '10px Inter, sans-serif';
      const stepX = chartWidth / (dates.length > 1 ? dates.length - 1 : 1);
      dates.forEach((date, i) => {
        const x = padding + (i * stepX);
        ctx.fillText(date, x, canvas.height - padding + 10);
      });

      // Draw Y Axis Labels
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const yVal = (maxY / steps) * i;
        const yPos = canvas.height - padding - ((yVal / maxY) * chartHeight);
        ctx.fillText(yVal.toFixed(0), padding - 5, yPos);

        // Grid
        ctx.beginPath();
        ctx.strokeStyle = '#eee';
        ctx.moveTo(padding, yPos);
        ctx.lineTo(canvas.width - padding, yPos);
        ctx.stroke();
      }

      // Line
      ctx.beginPath();
      ctx.strokeStyle = '#4bc0c0';
      ctx.lineWidth = 2;
      weightData.forEach((val, i) => {
        const x = padding + (i * stepX);
        const y = canvas.height - padding - ((val / maxY) * chartHeight);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Points & Numbers
      ctx.fillStyle = '#4bc0c0';
      ctx.textAlign = 'center';
      ctx.font = 'bold 10px Inter, sans-serif';

      weightData.forEach((val, i) => {
        const x = padding + (i * stepX);
        const y = canvas.height - padding - ((val / maxY) * chartHeight);

        // Point
        if (val !== undefined && val !== null) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();

          // Number Label
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(val.toFixed(0), x, y - 8);
          ctx.fillStyle = '#4bc0c0'; // Reset
        }
      });

      // Legend
      ctx.fillStyle = '#4bc0c0'; ctx.fillText('Poids (G)', padding + 10, 20);

      resolve(canvas.toDataURL('image/png'));
    } catch (e) { resolve(null); }
  });
};

const formatNumber = (num, decimals = 0) => {
  return num !== undefined && num !== null
    ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
    : 'N/A';
};

const generateSampleTestReportPDF = async (historyData, destinations, varieties, availableDefects) => {
  console.log('Starting Premium Sample Test Report generation for:', historyData);

  if (!historyData || !historyData.sample) {
    throw new Error('No valid sample history data available.');
  }

  const { sample, dailyChecks } = historyData;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // --- Header Section (Premium Gradient Look) ---
  // Since jsPDF doesn't support linear gradients easily, we'll use the primary purple color from the design
  doc.setFillColor(102, 126, 234); // #667eea
  doc.rect(0, 0, 210, 40, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rapport Shelf-Life - Palette #${sample.numpal}`, 105, 20, { align: 'center' }); // Centered

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 105, 30, { align: 'center' });

  // Reset Colors
  doc.setTextColor(50, 50, 50);

  let yPosition = 55;

  // --- Sample Overview Section ---
  doc.setFillColor(248, 249, 252); // Light background
  doc.roundedRect(15, yPosition, 180, 45, 3, 3, 'F');

  doc.setFontSize(14);
  doc.setTextColor(102, 126, 234); // Purple title
  doc.setFont('helvetica', 'bold');
  doc.text('Détails de l\'Échantillon', 20, yPosition + 10);

  // Info Grid
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');

  const clientName = destinations.find(d => d.value === sample.coddes || d.coddes === sample.coddes)?.vildes || sample.coddes || 'N/A';
  const varietyName = varieties.find(v => v.value === sample.codvar || v.codvar === sample.codvar)?.nomvar || sample.codvar || 'N/A';
  const lastCheck = dailyChecks && dailyChecks.length > 0 ? dailyChecks[dailyChecks.length - 1] : null;
  const daysElapsed = sample.startDate ? Math.floor((new Date() - new Date(sample.startDate)) / (1000 * 60 * 60 * 24)) + 1 : 0;

  // Col 1
  doc.text(`Verger : ${sample.vergerName || 'N/A'}`, 20, yPosition + 20);
  doc.text(`Client : ${clientName}`, 20, yPosition + 28);
  doc.text(`Variété : ${varietyName}`, 20, yPosition + 36);

  // Col 2
  doc.text(`Date de Début : ${sample.startDate ? new Date(sample.startDate).toLocaleDateString('fr-FR') : 'N/A'}`, 110, yPosition + 20);
  doc.text(`Nombre Initial : ${formatNumber(sample.initialFruitCount)}`, 110, yPosition + 28);
  doc.text(`Poids : ${formatNumber(sample.pdsfru, 0)} G`, 110, yPosition + 36);

  // Status Badge
  const statusColor = sample.status === 0 ? [40, 167, 69] : [220, 53, 69]; // Green or Red
  doc.setFillColor(...statusColor);
  doc.roundedRect(160, yPosition + 15, 30, 8, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(sample.status === 0 ? 'ACTIF' : 'FERMÉ', 175, yPosition + 20.5, { align: 'center' });

  yPosition += 55;

  // --- Current Condition Section ---
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(15, yPosition, 180, 35, 3, 3, 'F');

  doc.setFontSize(14);
  doc.setTextColor(102, 126, 234);
  doc.setFont('helvetica', 'bold');
  doc.text('État Actuel', 20, yPosition + 10);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');

  if (lastCheck) {
    doc.text(`Dernier Contrôle : ${new Date(lastCheck.checkDate).toLocaleDateString('fr-FR')}`, 20, yPosition + 20);
    doc.text(`Couleur 1 : ${lastCheck.couleur1 || 0}`, 70, yPosition + 20);
    doc.text(`Couleur 2 : ${lastCheck.couleur2 || 0}`, 110, yPosition + 20);
    doc.text(`Coul. Moy. : ${((lastCheck.couleur1 + lastCheck.couleur2) / 2).toFixed(1)}`, 150, yPosition + 20);
  } else {
    doc.text('Aucun contrôle effectué.', 20, yPosition + 20);
  }

  yPosition += 45;

  // --- Defect Performance Chart ---
  doc.setFontSize(14);
  doc.setTextColor(102, 126, 234);
  doc.setFont('helvetica', 'bold');
  doc.text('Analyse des Défauts', 20, yPosition);

  yPosition += 5;

  // Generate Chart
  const chartImage = await generateDefectChart(dailyChecks, availableDefects);
  if (chartImage) {
    doc.addImage(chartImage, 'PNG', 15, yPosition, 180, 90);
    yPosition += 100;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Pas assez de données pour le graphique.', 20, yPosition + 20);
    yPosition += 30;
  }

  // Check for page break
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  // --- Sub Charts (Coloration & Weight) ---
  doc.setFontSize(14);
  doc.setTextColor(102, 126, 234);
  doc.setFont('helvetica', 'bold');
  doc.text('Tendances de Coloration & Poids', 20, yPosition);
  yPosition += 5;

  const colorChartImage = await generateColorationChart(dailyChecks);
  const weightChartImage = await generateWeightChart(dailyChecks);

  if (colorChartImage && weightChartImage) {
    doc.addImage(colorChartImage, 'PNG', 15, yPosition, 85, 60);
    doc.addImage(weightChartImage, 'PNG', 110, yPosition, 85, 60);
    yPosition += 70;
  } else if (colorChartImage) {
    doc.addImage(colorChartImage, 'PNG', 15, yPosition, 180, 80);
    yPosition += 90;
  }

  // Check for page break again for table
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }

  // --- Detailed History Table ---
  doc.setFontSize(14);
  doc.setTextColor(102, 126, 234);
  doc.setFont('helvetica', 'bold');
  doc.text('Historique Détaillé des Défauts', 20, yPosition);
  yPosition += 5;

  const tableData = [];
  const headerRow = ['Date', 'Nb. Fruit', 'Poids (G)', 'Coul. 1', 'Coul. 2', 'Défaut Maj.', 'Qté', '%'];
  tableData.push(headerRow);

  dailyChecks.forEach(dc => {
    let topDefect = '-';
    let topDefectQty = 0;

    // Note: Removed totalDailyDefects as we are now showing % of Major Defect

    if (dc.defects && dc.defects.length > 0) {
      dc.defects.forEach(d => {
        if (d.quantity > topDefectQty) {
          topDefectQty = d.quantity;
          const def = availableDefects.find(ad => ad.coddef === d.defectId);
          topDefect = def ? def.intdef : `ID: ${d.defectId}`;
        }
      });
    }

    const percentage = sample.initialFruitCount > 0 && topDefectQty > 0
      ? ((topDefectQty / sample.initialFruitCount) * 100).toFixed(1) + '%'
      : '-';

    tableData.push([
      new Date(dc.checkDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      sample.initialFruitCount,
      dc.pdsfru !== undefined ? formatNumber(dc.pdsfru, 0) : '-',
      dc.couleur1 || 0,
      dc.couleur2 || 0,
      topDefect,
      topDefectQty > 0 ? topDefectQty : '-',
      percentage
    ]);
  });

  if (tableData.length > 1) { // If there is data + header
    autoTable(doc, {
      startY: yPosition,
      head: [headerRow],
      body: tableData.slice(1),
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [230, 230, 230],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [102, 126, 234], // Primary Purple
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center' }, // Date
        1: { halign: 'center' }, // Nb Fruit
        2: { halign: 'center' }, // Weight
        3: { halign: 'center' }, // Color 1
        4: { halign: 'center' }, // Color 2
        6: { halign: 'center' }, // Qty
        7: { halign: 'center', fontStyle: 'bold' } // %
      },
      margin: { left: 15, right: 15 },
      alternateRowStyles: { fillColor: [248, 249, 252] }
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('Aucune donnée enregistrée.', 20, yPosition + 10);
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} sur ${pageCount}`, 190, 290, { align: 'right' });
    doc.text('Fruta - Gestion Shelf Life', 20, 290);
  }

  // Add Watermark (Diaf Logo) to all pages
  try {
    const addWatermark = async () => {
      const imgData = await new Promise((resolve) => {
        const img = new Image();
        img.src = '/diaf.png';
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.globalAlpha = 0.1; // 10% opacity for watermark
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
      });

      if (imgData) {
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const imgSize = 80; // mm
          const x = (pageWidth - imgSize) / 2;
          const y = (pageHeight - imgSize) / 2;
          doc.addImage(imgData, 'PNG', x, y, imgSize, imgSize);
        }
      }
    };

    await addWatermark();
  } catch (err) {
    console.error('Error adding watermark:', err);
  }

  // Save
  const fileName = `shelf-life-report-P${sample.numpal}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  return fileName;
};

const generateVenteEcartPDF = (vente, details, vergers, grpvars, typeEcarts) => {
  console.log('Starting Vente Ecart PDF generation', { vente, details });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add Logo
  try {
    const logoPath = '/diaf.png';
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (error) {
    console.log('Logo not found');
  }

  // Header Title
  doc.setFontSize(22);
  doc.setTextColor(44, 62, 80);
  doc.text('Bon de Vente Écart', 20, 25);

  // Vente Information Box
  doc.setDrawColor(200);
  doc.setFillColor(248, 249, 250);
  doc.rect(20, 35, 170, 45, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(50);

  // Left Column
  doc.setFont(undefined, 'bold');
  doc.text(`N° Bon de Vente:`, 25, 45);
  doc.setFont(undefined, 'normal');
  doc.text(`${vente.numbonvente || 'N/A'}`, 65, 45);

  doc.setFont(undefined, 'bold');
  doc.text(`Date:`, 25, 53);
  doc.setFont(undefined, 'normal');
  doc.text(`${new Date(vente.date).toLocaleDateString('fr-FR')}`, 65, 53);

  doc.setFont(undefined, 'bold');
  doc.text(`Type d'Écart:`, 25, 61);
  doc.setFont(undefined, 'normal');
  const typeEcart = typeEcarts.find(t => t.codtype === vente.codtype);
  doc.text(`${typeEcart?.destype || 'N/A'}`, 65, 61);

  doc.setFont(undefined, 'bold');
  doc.text(`Numéro de Lot:`, 25, 69);
  doc.setFont(undefined, 'normal');
  doc.text(`${vente.numlot || '-'}`, 65, 69);

  // Right Column (Financials)
  doc.setFont(undefined, 'bold');
  doc.text(`Prix Unitaire:`, 110, 45);
  doc.setFont(undefined, 'normal');
  doc.text(`${formatNumberWithSpaces(vente.price)} DH/kg`, 150, 45);

  doc.setFont(undefined, 'bold');
  doc.text(`Poids Total:`, 110, 53);
  doc.setFont(undefined, 'normal');
  doc.text(`${formatNumberWithSpaces(vente.poidsTotal)} kg`, 150, 53);

  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 100, 0); // Green color for total
  doc.text(`Montant Total:`, 110, 69);
  doc.setFontSize(12);
  doc.text(`${formatNumberWithSpaces(vente.montantTotal)} DH`, 150, 69);

  // Reset Font
  doc.setFontSize(10);
  doc.setTextColor(0);

  // Details Table
  const tableData = details.map(item => {
    // Determine labels. If item comes from edit form (mapped), it has .label.
    // If it comes directly from DB traverse, we might need to find it again, but handlePrintVente usually prepares mapped data.
    // We will ensure handlePrintVente mimics the structure used in edit.
    return [
      item.refver?.label || vergers.find(v => v.refver === item.refver)?.nomver || 'N/A',
      item.codgrv?.label || grpvars.find(g => g.codgrv === item.codgrv)?.nomgrv || 'N/A',
      formatNumberWithSpaces(item.pds)
    ];
  });

  const headerRow = ['Verger', 'Variété (Groupe)', 'Poids (kg)'];

  autoTable(doc, {
    startY: 90,
    head: [headerRow],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [220, 220, 220]
    },
    headStyles: {
      fillColor: [52, 152, 219],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} / ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `Bon_Vente_${vente.numbonvente || vente.id}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export {
  generateDetailedExportPDF,
  generateVarietesPDF,
  generateGroupVarietePDF,
  generateEcartDetailsPDF,
  generateEcartGroupDetailsPDF,
  generateEcartDirectGroupedPDF,
  generateEcartDirectDetailsPDF,
  generateSampleTestReportPDF,
  calculateDateRangeFromTableRows,
  generateVenteEcartPDF
};
