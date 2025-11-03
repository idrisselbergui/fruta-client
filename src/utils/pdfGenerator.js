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

const generateVarietesPDF = (tableRows, grpVarOptions, varieteOptions, filters) => {
  console.log('Starting varietes PDF generation');

  if (!tableRows?.length) {
    console.error('No table rows available for varietes PDF');
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
  doc.text('Détails des Données - Variétés', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  doc.text(`Période: ${filters.startDate} au ${filters.endDate}`, 20, 37);

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
  console.log('Starting group variete PDF generation');

  if (!tableRows?.length) {
    console.error('No table rows available for group variete PDF');
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
  doc.text('Détails des Données - Groupes de Variétés', 20, 20);

  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
  doc.text(`Période: ${filters.startDate} au ${filters.endDate}`, 20, 37);

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
  doc.text(`Période: ${filters.startDate} au ${filters.endDate}`, 20, 37);

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
  doc.text(`Période: ${filters.startDate} au ${filters.endDate}`, 20, 37);

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

export default generateDetailedExportPDF;
export { generateVarietesPDF, generateGroupVarietePDF, generateEcartDetailsPDF, generateEcartGroupDetailsPDF, generateEcartDirectGroupedPDF, generateEcartDirectDetailsPDF };
