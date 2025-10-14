import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates a PDF document containing the chart and data table
 * @param {Object} chartElement - The chart DOM element to capture
 * @param {Object} tableElement - The table DOM element to capture
 * @param {Object} options - Configuration options
 */
export const generateChartPDF = async (chartElement, tableElement, options = {}) => {
  const {
    title = 'Orchard Performance Report',
    orchardName = '',
    chartType = 'Combined',
    timePeriod = 'Monthly',
    includeTable = true
  } = options;

  try {
    // Create new PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 20;

    // Add title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Add orchard and chart info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Orchard: ${orchardName}`, 20, currentY);
    currentY += 7;
    pdf.text(`Chart Type: ${chartType}`, 20, currentY);
    currentY += 7;
    pdf.text(`Time Period: ${timePeriod}`, 20, currentY);
    currentY += 7;
    pdf.text(`Generated: ${new Date().toLocaleDateString('fr-FR')}`, 20, currentY);
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

        pdf.text('Chart Visualization:', 20, currentY);
        currentY += 10;

        pdf.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 15;
      } catch (chartError) {
        console.error('Error capturing chart:', chartError);
        pdf.text('Chart could not be rendered in PDF', 20, currentY);
        currentY += 10;
      }
    }

    // Add table data if requested and table element exists
    if (includeTable && tableElement) {
      // Check if we need a new page for the table
      if (currentY > pageHeight - 80) {
        pdf.addPage();
        currentY = 20;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Chart Data Details:', 20, currentY);
      currentY += 15;

      try {
        // Extract table data with better error handling
        const tableData = extractTableData(tableElement);
        console.log('Extracted table data:', tableData); // Debug logging

        if (!tableData.headers || tableData.headers.length === 0) {
          pdf.setFont('helvetica', 'italic');
          pdf.text('No table headers found', 20, currentY);
          currentY += 10;
        } else {
          // Calculate column widths based on content
          const colWidth = Math.max(30, (pageWidth - 40) / tableData.headers.length);

          // Add table headers
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setFillColor(240, 240, 240);

          // Header background
          pdf.rect(20, currentY - 3, pageWidth - 40, 8, 'F');

          tableData.headers.forEach((header, index) => {
            const x = 20 + (index * colWidth);
            pdf.setTextColor(0, 0, 0);
            const shortHeader = header.length > 12 ? header.substring(0, 12) + '...' : header;
            pdf.text(shortHeader, x + 2, currentY + 3);
          });
          currentY += 10;

          // Add table rows
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);

          tableData.rows.slice(0, 25).forEach((row, rowIndex) => { // Increased to 25 rows
            if (currentY > pageHeight - 20) {
              pdf.addPage();
              currentY = 20;

              // Re-add headers on new page
              pdf.setFont('helvetica', 'bold');
              pdf.setFillColor(240, 240, 240);
              pdf.rect(20, currentY - 3, pageWidth - 40, 8, 'F');

              tableData.headers.forEach((header, index) => {
                const x = 20 + (index * colWidth);
                pdf.setTextColor(0, 0, 0);
                const shortHeader = header.length > 12 ? header.substring(0, 12) + '...' : header;
                pdf.text(shortHeader, x + 2, currentY + 3);
              });
              currentY += 10;
              pdf.setFont('helvetica', 'normal');
            }

            // Alternate row background
            if (rowIndex % 2 === 0) {
              pdf.setFillColor(250, 250, 250);
              pdf.rect(20, currentY - 2, pageWidth - 40, 6, 'F');
            }

            row.forEach((cell, cellIndex) => {
              const x = 20 + (cellIndex * colWidth);
              const cellText = String(cell || '').substring(0, 20); // Truncate long values
              pdf.setTextColor(0, 0, 0);
              pdf.text(cellText, x + 2, currentY + 3);
            });
            currentY += 7;
          });

          if (tableData.rows.length > 25) {
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`... and ${tableData.rows.length - 25} more rows (total: ${tableData.rows.length})`, 20, currentY + 5);
          }
        }

      } catch (tableError) {
        console.error('Error processing table:', tableError);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text('Table data could not be processed - showing raw data below:', 20, currentY);
        currentY += 10;
        pdf.text('Table element found but data extraction failed', 20, currentY);
      }
    }

    // Add footer
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(
        `Page ${i} of ${totalPages} - Generated by Fruta Dashboard`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    const filename = `orchard_report_${orchardName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
    pdf.save(filename);

    return filename;

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
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
        headers.push(`Column ${i}`);
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
      throw new Error('Chart element not found');
    }

    return await generateChartPDF(chartElement, tableElement, options);
  };

  return generatePDF;
};
