(async function scrapeIDX() {
  let YEAR = '2023';
  let PERIODE = 'audit';       // ← FIX: bukan 'tahunan', tapi 'audit'
  let REPORT_TYPE = 'rdf';
  
  console.log('%c[IDX SCRAPER] Memulai...', 'color: #2563EB; font-size: 15px; font-weight: bold;');
  console.log('Tahun: ' + YEAR + ' | Periode: ' + PERIODE.toUpperCase() + ' | Type: ' + REPORT_TYPE);
  
  const BASE_URL = 'https://www.idx.co.id/primary/ListedCompany/GetFinancialReport';
  const allReports = [];
  
  let data = null;
  let retries = 0;
  const MAX_RETRY = 3;
  
  while (retries < MAX_RETRY && !data) {
    try {
      const params = new URLSearchParams({
        indexFrom: '1',
        pageSize: '1000',
        year: YEAR,
        reportType: REPORT_TYPE,
        EmitenType: 's',
        periode: PERIODE,       // ← langsung 'audit'
        kodeEmiten: '',
        SortColumn: 'KodeEmiten',
        SortOrder: 'asc'
      });
      
      const response = await fetch(BASE_URL + '?' + params.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) throw new Error('HTTP ' + response.status);
      data = await response.json();
      
    } catch (err) {
      retries++;
      console.warn('Error: ' + err.message + ' (retry ' + retries + '/' + MAX_RETRY + ')');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  if (!data) { console.error('Gagal fetch'); return; }
  
  const results = data.Results || [];
  console.log('Total: ' + (data.ResultCount || results.length) + ' | Diterima: ' + results.length);
  
  if (results.length === 0) { console.error('Tidak ada data'); return; }
  
  for (const item of results) {
    allReports.push({
      kodeEmiten: item.KodeEmiten,
      namaEmiten: item.NamaEmiten,
      reportYear: item.Report_Year,
      reportPeriod: item.Report_Period,   // "Audit"
      reportType: REPORT_TYPE,
      emitenType: 's',
      fileModified: item.File_Modified ? new Date(item.File_Modified).toISOString() : null,
      attachments: (item.Attachments || []).map(function(att) {
        return {
          fileId: att.File_ID,
          fileName: att.File_Name,
          filePath: att.File_Path,
          fileSize: att.File_Size,
          fileType: att.File_Type,
          reportPeriod: att.Report_Period,
          reportType: att.Report_Type,
          reportYear: att.Report_Year
        };
      })
    });
  }
  
  const outputData = {
    year: YEAR,
    periode: PERIODE,           // "audit"
    reportType: REPORT_TYPE,
    totalRecords: allReports.length,
    expectedRecords: data.ResultCount || results.length,
    scrapedAt: new Date().toISOString(),
    source: 'idx.co.id',
    reports: allReports
  };
  
  const blob = new Blob([JSON.stringify(outputData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'idx-' + YEAR + '-' + PERIODE + '-' + Date.now() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('%cSELESAI! File: ' + a.download, 'color: #10B981; font-size: 16px; font-weight: bold;');
  console.log('Total record: ' + allReports.length + '/' + (data.ResultCount || results.length));
  return outputData;
})();