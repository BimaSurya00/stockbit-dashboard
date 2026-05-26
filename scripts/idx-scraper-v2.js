/**
 * IDX Financial Reports Scraper - Console Script (FIXED)
 * 
 * CARA PENGGUNAAN:
 * 1. Buka: https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan/
 * 2. Pilih filter (Tahun, Periode)
 * 3. F12 → Console
 * 4. Paste script ini → Enter
 * 5. Tunggu sampai "SELESAI!"
 * 
 * FIX: Gunakan pageSize besar untuk ambil semua data sekaligus
 */

(async function scrapeIDX() {
  // ===== KONFIGURASI =====
  let YEAR = '2026';
  let PERIODE = 'tw1';
  let REPORT_TYPE = 'rdf';
  
  // Auto-detect dari DOM
  try {
    const yr = document.querySelector('input[type="radio"][value^="20"]:checked');
    if (yr) YEAR = yr.value;
    const pr = document.querySelector('input[type="radio"][value^="tw"]:checked, input[type="radio"][value="tahunan"]:checked');
    if (pr) PERIODE = pr.value;
  } catch (e) {}
  
  console.log('%c[IDX SCRAPER] Memulai...', 'color: #2563EB; font-size: 15px; font-weight: bold;');
  console.log('Tahun: ' + YEAR + ' | Periode: ' + PERIODE.toUpperCase());
  console.log('');
  
  const BASE_URL = 'https://www.idx.co.id/primary/ListedCompany/GetFinancialReport';
  const allReports = [];
  
  // ===== STRATEGI: AMBIL SEMUA DATA SEKALIGUS =====
  // Coba dulu dengan pageSize=1000 (semua record sekaligus)
  console.log('Mencoba ambil semua data sekaligus...');
  
  let data = null;
  let retries = 0;
  const MAX_RETRY = 3;
  
  while (retries < MAX_RETRY && !data) {
    try {
      const params = new URLSearchParams({
        indexFrom: '1',
        pageSize: '1000',         // Ambil semua sekaligus!
        year: YEAR,
        reportType: REPORT_TYPE,
        EmitenType: 's',
        periode: PERIODE.toLowerCase(),
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
  
  if (!data) {
    console.error('Gagal fetch data setelah ' + MAX_RETRY + ' kali retry.');
    return;
  }
  
  const results = data.Results || [];
  const totalExpected = data.ResultCount || results.length;
  
  console.log('%c  Total record: ' + totalExpected, 'color: #059669; font-weight: bold;');
  console.log('  Diterima: ' + results.length + ' record');
  console.log('');
  
  if (results.length === 0) {
    console.error('Tidak ada data untuk filter ini.');
    return;
  }
  
  // ===== TRANSFORM DATA =====
  console.log('Memproses data...');
  
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
  
  // ===== EXPORT JSON =====
  const outputData = {
    year: YEAR,
    periode: PERIODE,
    reportType: REPORT_TYPE,
    totalRecords: allReports.length,
    expectedRecords: totalExpected,
    scrapedAt: new Date().toISOString(),
    source: 'idx.co.id',
    reports: allReports
  };
  
  const jsonString = JSON.stringify(outputData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(blob);
  
  const filename = 'idx-' + YEAR + '-' + PERIODE + '-' + Date.now() + '.json';
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  
  // ===== SUMMARY =====
  console.log('');
  console.log('%c========================================', 'color: #10B981; font-size: 16px;');
  console.log('%c  SELESAI!', 'color: #10B981; font-size: 20px; font-weight: bold;');
  console.log('%c========================================', 'color: #10B981; font-size: 16px;');
  console.log('File: ' + filename);
  console.log('Total record: ' + allReports.length + '/' + totalExpected);
  if (allReports.length < totalExpected) {
    console.warn('PERINGATAN: Hanya dapat ' + allReports.length + ' dari ' + totalExpected + ' record.');
    console.log('Beberapa record mungkin tidak termasuk. Coba ubah pageSize lebih besar.');
  }
  console.log('');
  console.log('%cIMPORT KE MONGODB:', 'color: #2563EB; font-weight: bold;');
  console.log('scp ' + filename + ' root@8.215.33.70:/tmp/');
  console.log('node workers/import-idx-json.js /tmp/' + filename);
  
  return outputData;
})();
