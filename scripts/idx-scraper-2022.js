/**
 * IDX Financial Reports Batch Scraper - 2022
 * 
 * Scrapes all 4 periods (TW1, TW2, TW3, Audit) in one run.
 * 
 * CARA PENGGUNAAN:
 * 1. Buka: https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan/
 * 2. F12 → Console
 * 3. Paste script ini → Enter
 * 4. Tunggu sampai semua 4 file ter-download
 */

(async function scrape2022() {
  const YEAR = '2022';
  const REPORT_TYPE = 'rdf';
  const PERIODES = [
    { code: 'tw1', label: 'TW1' },
    { code: 'tw2', label: 'TW2' },
    { code: 'tw3', label: 'TW3' },
    { code: 'audit', label: 'Audit' }
  ];
  
  const BASE_URL = 'https://www.idx.co.id/primary/ListedCompany/GetFinancialReport';
  
  console.log('%c[IDX BATCH SCRAPER 2022]', 'color: #2563EB; font-size: 16px; font-weight: bold;');
  console.log('Akan scrape 4 periode: TW1, TW2, TW3, Audit');
  console.log('');
  
  for (const periode of PERIODES) {
    console.log('%c▶ Memulai ' + periode.label + '...', 'color: #F59E0B; font-weight: bold;');
    
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
          periode: periode.code,
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
        console.warn('  Error: ' + err.message + ' (retry ' + retries + '/' + MAX_RETRY + ')');
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    
    if (!data) {
      console.error('  GAGAL fetch ' + periode.label + ' setelah ' + MAX_RETRY + ' retry.');
      continue;
    }
    
    const results = data.Results || [];
    const totalExpected = data.ResultCount || results.length;
    
    console.log('  Total: ' + totalExpected + ' | Diterima: ' + results.length);
    
    if (results.length === 0) {
      console.warn('  Tidak ada data untuk ' + periode.label);
      continue;
    }
    
    const allReports = [];
    for (const item of results) {
      allReports.push({
        kodeEmiten: item.KodeEmiten,
        namaEmiten: item.NamaEmiten,
        reportYear: item.Report_Year,
        reportPeriod: item.Report_Period,
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
      periode: periode.code,
      reportType: REPORT_TYPE,
      totalRecords: allReports.length,
      expectedRecords: totalExpected,
      scrapedAt: new Date().toISOString(),
      source: 'idx.co.id',
      reports: allReports
    };
    
    const blob = new Blob([JSON.stringify(outputData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'idx-' + YEAR + '-' + periode.code + '-' + Date.now() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('%c  ✓ SELESAI ' + periode.label + ': ' + allReports.length + ' record', 'color: #10B981; font-weight: bold;');
    
    // Delay between requests to avoid rate limiting
    if (periode.code !== 'audit') {
      console.log('  Menunggu 2 detik sebelum periode berikutnya...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.log('');
  console.log('%c========================================', 'color: #10B981; font-size: 16px;');
  console.log('%c  SEMUA PERIODE 2022 SELESAI!', 'color: #10B981; font-size: 18px; font-weight: bold;');
  console.log('%c========================================', 'color: #10B981; font-size: 16px;');
  console.log('');
  console.log('%cIMPORT KE MONGODB (via SSH tunnel):', 'color: #2563EB; font-weight: bold;');
  console.log('1. ssh -L 27018:127.0.0.1:27017 root@8.215.33.70 -N');
  console.log('2. Edit import-idx-json.js: const MONGODB_URI = "mongodb://localhost:27018/stockbit_dashboard"');
  console.log('3. node backend/workers/import-idx-json.js ./idx-2022-*.json');
})();
