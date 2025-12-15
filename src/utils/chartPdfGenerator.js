import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';

/**
 * Generates a PDF document containing the chart and data table
 * @param {Object} chartElement - The chart DOM element to capture
 * @param {Object} tableElement - The table DOM element to capture
 * @param {Object} options - Configuration options
 */
export const generateChartPDF = async (chartElement, tableElement, options = {}) => {
  const {
    title = 'Rapport de Performance du Verger',
    orchardName = '',
    chartType = 'Combined',
    timePeriod = 'Monthly',
    varieteName = 'Toutes les Variétés',
    includeTable = true
  } = options;

  try {
    // Create new PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 20;

    // Add logo
    try {
      const logoPath = '/diaf.png';
      pdf.addImage(logoPath, 'PNG', pageWidth - 35, 10, 25, 25);
    } catch (error) {
      console.log('Logo not found, continuing without logo');
    }

    // Add title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Add orchard and chart info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Verger: ${orchardName}`, 20, currentY);
    currentY += 7;
    pdf.text(`Variété: ${varieteName}`, 20, currentY);
    currentY += 7;
    pdf.text(`Type de Graphique: ${chartType}`, 20, currentY);
    currentY += 7;
    pdf.text(`Période: ${timePeriod}`, 20, currentY);
    currentY += 7;
    pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, currentY);
    currentY += 20;

    // Capture chart as image
    if (chartElement) {
      try {
        const canvas = await html2canvas(chartElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: chartElement.offsetWidth,
          height: chartElement.offsetHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 170; // Width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Check if we need a new page for the chart
        if (currentY + imgHeight > pageHeight - 20) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.text('Visualisation du Graphique:', 20, currentY);
        currentY += 10;

        pdf.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 15;
      } catch (chartError) {
        console.error('Error capturing chart:', chartError);
        pdf.text('Le graphique n\'a pas pu être rendu dans le PDF', 20, currentY);
        currentY += 10;
      }
    }

    // Add table data if requested and table element exists
    if (includeTable && tableElement) {
      // Check if we need a new page for the table
      if (currentY > pageHeight - 40) { // Give more space for table header
        pdf.addPage();
        currentY = 20;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Détails des Données du Graphique:', 20, currentY);
      currentY += 10;

      try {
        const tableData = extractTableData(tableElement);
        if (!tableData.headers || tableData.headers.length === 0 || !tableData.rows || tableData.rows.length === 0) {
          pdf.setFont('helvetica', 'italic');
          pdf.text('Aucune donnée de tableau trouvée ou le tableau est vide.', 20, currentY);
        } else {
          autoTable(pdf, {
            startY: currentY,
            head: [tableData.headers],
            body: tableData.rows,
            theme: 'grid',
            styles: {
              fontSize: 8,
              cellPadding: 2,
            },
            headStyles: {
              fillColor: [22, 160, 133],
              textColor: 255,
              fontStyle: 'bold',
            },
            margin: { left: 20, right: 20 },
          });
        }
      } catch (tableError) {
        console.error('Error processing table for PDF:', tableError);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 0, 0);
        pdf.text('Erreur lors du traitement du tableau pour le PDF.', 20, currentY);
      }
    }

    // Save the PDF
    const filename = `rapport_performance_verger_${orchardName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
    pdf.save(filename);

    return filename;

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Échec de génération du rapport PDF');
  }
};

/**
 * Extracts data from a table element
 * @param {HTMLElement} tableElement - The table DOM element
 * @returns {Object} - Object containing headers and rows
 */
const extractTableData = (tableElement) => {
  const headers = [];
  const rows = [];

  console.log('Table element:', tableElement);
  console.log('Table HTML:', tableElement.outerHTML);

  // Get table headers - try multiple selectors
  let headerCells = tableElement.querySelectorAll('thead th');
  if (headerCells.length === 0) {
    // If no thead, try getting headers from first row
    headerCells = tableElement.querySelectorAll('tr:first-child th');
  }
  if (headerCells.length === 0) {
    // If still no headers, use generic column names
    const firstRow = tableElement.querySelector('tbody tr');
    if (firstRow) {
      const cellCount = firstRow.querySelectorAll('td').length;
      for (let i = 1; i <= cellCount; i++) {
        headers.push(`Colonne ${i}`);
      }
    }
  } else {
    headerCells.forEach(cell => {
      const text = cell.textContent.trim();
      console.log('Header cell:', text);
      headers.push(text);
    });
  }

  console.log('Extracted headers:', headers);

  // Get table rows
  const rowElements = tableElement.querySelectorAll('tbody tr');
  console.log('Found row elements:', rowElements.length);

  rowElements.forEach((row, index) => {
    const rowData = [];
    const cells = row.querySelectorAll('td');

    console.log(`Row ${index} cells:`, cells.length);
    cells.forEach((cell, cellIndex) => {
      const text = cell.textContent.trim();
      console.log(`Cell ${cellIndex}:`, text);
      rowData.push(text);
    });

    if (rowData.length > 0) {
      rows.push(rowData);
    }
  });

  console.log('Final extracted data:', { headers, rows });
  return { headers, rows };
};

/**
 * Hook to generate PDF from chart and table elements
 * @param {string} chartId - ID of the chart element
 * @param {string} tableId - ID of the table element
 * @returns {Function} - Function to generate PDF
 */
export const useChartPDFGenerator = (chartId, tableId) => {
  const generatePDF = async (options = {}) => {
    const chartElement = document.getElementById(chartId);
    const tableElement = document.getElementById(tableId);

    if (!chartElement) {
      throw new Error('Element graphique introuvable');
    }

    return await generateChartPDF(chartElement, tableElement, options);
  };

  return generatePDF;
};
