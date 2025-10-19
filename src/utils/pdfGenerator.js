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
    const logoPath = './public/diaf.png';
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

  // Create the transposed table format (Varieties as rows, Vergers as columns)
  if (destinationChartData?.data && destinationChartData.data.length > 0) {
    console.log('Processing destination chart data:', destinationChartData);

    // Get all unique varieties and vergers
    const allVarieties = destinationChartData.keys || [];
    const allVergers = [...new Set(destinationChartData.data.map(item => item.refver || 'Unknown'))].sort();
    console.log('All varieties:', allVarieties);
    console.log('All vergers:', allVergers);

    // Create transposed data: variety -> verger -> value
    const varietyData = {};
    const varietyTotals = {};
    let grandTotal = 0;

    allVarieties.forEach(variety => {
      varietyData[variety] = {};
      varietyTotals[variety] = 0;

      allVergers.forEach(verger => {
        varietyData[variety][verger] = 0;
      });
    });

    // Fill in the values
    destinationChartData.data.forEach(item => {
      const verger = item.refver || 'Unknown';

      allVarieties.forEach(variety => {
        const value = parseFloat(item[variety]) || 0;
        varietyData[variety][verger] = Math.round(value); // Round to whole numbers
        varietyTotals[variety] += Math.round(value);
        grandTotal += Math.round(value);
      });
    });

    console.log('Variety data organized:', varietyData);

    // Create table data in the transposed format
    const tableData = [];

    // Add main header
    const headerRow = ['Variété', ...allVergers.map(v => String(v).toUpperCase()), 'TotalVariété'];
    tableData.push(headerRow);

    // Add data rows (one per variety)
    allVarieties.forEach(variety => {
      const row = [String(variety).toUpperCase()];
      let varietyTotal = 0;

      allVergers.forEach(verger => {
        const value = varietyData[variety][verger] || 0;
        row.push(formatNumberWithSpaces(value, 0));
        varietyTotal += value;
      });

      row.push(formatNumberWithSpaces(varietyTotal, 0));
      tableData.push(row);
    });

    // Add total row
    const totalRow = ['TOTAL', ...allVergers.map(v => ''), formatNumberWithSpaces(grandTotal, 0)];
    tableData.push(totalRow);

    console.log('Final table data:', tableData);

    // Generate the table
    autoTable(doc, {
      startY: yPosition,
      head: [headerRow],
      body: tableData.slice(1), // Skip header row for body
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
        0: { cellWidth: 60, fontStyle: 'bold' }
      },
      margin: { left: 10, right: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text('Généré par Fruta Client Dashboard', 20, pageHeight - 20);

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
    const logoPath = './public/diaf.png';
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

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text('Généré par Fruta Client Dashboard', 20, pageHeight - 20);

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
    const logoPath = './public/diaf.png';
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

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text('Généré par Fruta Client Dashboard', 20, pageHeight - 20);

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
    const logoPath = './public/diaf.png';
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

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text('Généré par Fruta Client Dashboard', 20, pageHeight - 20);

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
    const logoPath = './public/diaf.png';
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

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text('Généré par Fruta Client Dashboard', 20, pageHeight - 20);

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

export default generateDetailedExportPDF;
export { generateVarietesPDF, generateGroupVarietePDF, generateEcartDetailsPDF, generateEcartGroupDetailsPDF };
