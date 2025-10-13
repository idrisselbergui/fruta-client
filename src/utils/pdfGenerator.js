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
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

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

export default generateDetailedExportPDF;
