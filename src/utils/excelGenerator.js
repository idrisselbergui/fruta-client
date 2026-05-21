/**
 * Excel export utility for Fruta Dashboard Page details
 */

export const generateExcel = (tableRows, filters) => {
  if (!tableRows || tableRows.length === 0) {
    throw new Error('Aucune donnée à exporter.');
  }

  // Header row for CSV
  const headers = [
    'Verger',
    'Variete',
    'Min Date Reception',
    'Max Date Export',
    'Reception (kg)',
    'Export (kg)',
    'Export (%)',
    'Ecart (kg)',
    'Ecart (%)',
    'Frient (kg)',
    'Frient (%)'
  ];

  // Map and calculate rows
  const csvRows = [];
  
  // Set explicit separator so Excel opens in columns directly on any locale
  csvRows.push('sep=;');

  // Add the header line
  csvRows.push(headers.join(';'));

  let grandTotalPdsfru = 0;
  let grandTotalPdscom = 0;
  let grandTotalEcart = 0;
  let grandTotalFrient = 0;

  tableRows.forEach(row => {
    const pdsfru = parseFloat(row.totalPdsfru) || 0;
    const pdscom = parseFloat(row.totalPdscom) || 0;
    const ecart = parseFloat(row.totalEcart) || 0;
    const frient = pdsfru - pdscom - ecart;

    const exportPct = pdsfru > 0 ? ((pdscom / pdsfru) * 100).toFixed(2) : '0.00';
    const ecartPct = pdsfru > 0 ? ((ecart / pdsfru) * 100).toFixed(2) : '0.00';
    const frientPct = pdsfru > 0 ? ((frient / pdsfru) * 100).toFixed(2) : '0.00';

    const minDateStr = row.minReceptionDate ? new Date(row.minReceptionDate).toLocaleDateString('fr-FR') : 'N/A';
    const maxDateStr = row.maxExportDate ? new Date(row.maxExportDate).toLocaleDateString('fr-FR') : 'N/A';

    grandTotalPdsfru += pdsfru;
    grandTotalPdscom += pdscom;
    grandTotalEcart += ecart;
    grandTotalFrient += frient;

    const cleanVergerName = (row.vergerName || '').trim().replace(/\r?\n|\r/g, ' ');
    const cleanVarieteName = (row.varieteName || '').trim().replace(/\r?\n|\r/g, ' ');

    const line = [
      cleanVergerName.toUpperCase(),
      cleanVarieteName.toUpperCase(),
      minDateStr,
      maxDateStr,
      pdsfru.toFixed(0),
      pdscom.toFixed(0),
      `${exportPct}%`,
      ecart.toFixed(0),
      `${ecartPct}%`,
      frient.toFixed(0),
      `${frientPct}%`
    ];

    csvRows.push(line.join(';'));
  });

  // Add Grand Total Row
  const totalExportPct = grandTotalPdsfru > 0 ? ((grandTotalPdscom / grandTotalPdsfru) * 100).toFixed(2) : '0.00';
  const totalEcartPct = grandTotalPdsfru > 0 ? ((grandTotalEcart / grandTotalPdsfru) * 100).toFixed(2) : '0.00';
  const totalFrientPct = grandTotalPdsfru > 0 ? ((grandTotalFrient / grandTotalPdsfru) * 100).toFixed(2) : '0.00';

  const totalLine = [
    'TOTAL',
    '',
    '',
    '',
    grandTotalPdsfru.toFixed(0),
    grandTotalPdscom.toFixed(0),
    `${totalExportPct}%`,
    grandTotalEcart.toFixed(0),
    `${totalEcartPct}%`,
    grandTotalFrient.toFixed(0),
    `${totalFrientPct}%`
  ];
  csvRows.push(totalLine.join(';'));

  // Create content with UTF-8 BOM to handle French accents perfectly in Excel
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Trigger download
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `details-donnee-varietes-${dateStr}.csv`;
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, fileName);
  } else {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
