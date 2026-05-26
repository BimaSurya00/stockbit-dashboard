/**
 * IDX Financial Reports Scraper - Console Script
 * 
 * CARA PENGGUNAAN:
 * 1. Buka browser Chrome/Edge/Firefox
 * 2. Buka: https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan/
 * 3. Pilih filter di website (Tahun, Periode, Jenis Laporan)
 * 4. Tekan F12 → tab Console
 * 5. Copy-Paste SELURUH isi file ini ke Console
 * 6. Tekan Enter
 * 7. Tunggu sampai muncul "SELESAI!" dan file JSON ter-download
 * 
 * OUTPUT:
 * - File JSON: idx-YYYY-periode-timestamp.json
 * - Format sesuai MongoDB schema (bisa langsung import)
 */

(async function scrapeIDX() {
  // ===== KONFIGURASI =====
  // Auto-detect dari halaman, atau ubah manual di bawah ini
  let YEAR = '2026';
  let PERIODE = 'tw1';        // tw1, tw2, tw3, tahunan
  let REPORT_TYPE = 'rdf';    // rdf = keuangan, annual = tahunan
  const PAGE_SIZE = 50;
  const DELAY_MS = 600;       // delay antar halaman
  const MAX_RETRY = 3;        // max retry per halaman
  
  // Coba detect dari DOM
  try {
    const yrRadio = document.querySelector('input[type="radio"][name^="year"]:checked, input[type="radio"][value^="20"]:checked');
    if (yrRadio) YEAR = yrRadio.value;
    
    const prRadio = document.querySelector('input[type="radio"][name^="periode"]:checked, input[type="radio"][value^="tw"]:checked, input[type="radio"][value="tahunan"]:checked');
    if (prRadio) PERIODE = prRadio.value;
  } catch (e) {}
  
  console.log('%c[IDX SCRAPER] Memulai...', 'color: #2563EB; font-size: 15px; font-weight: bold;');
  console.log('Tahun: ' + YEAR + ' | Periode: ' + PERIODE.toUpperCase() + ' | ReportType: ' + REPORT_TYPE);
  console.log('');
  
  const BASE_URL = 'https://www.idx.co.id/primary/ListedCompany/GetFinancialReport';
  const allReports = [];
  let indexFrom = 1;
  let totalExpected = null;
  let pageNum = 0;
  let success = true;
  
  // ===== FETCH LOOP =====
  while (success) {
    pageNum++;
    let retries = 0;
    let pageData = null;
    
    // Retry mechanism
    while (retries < MAX_RETRY && !pageData) {
      try {
        console.log('  Halaman ' + pageNum + ' (record ' + indexFrom + ')...');
        
        const params = new URLSearchParams({
          indexFrom: indexFrom.toString(),
          pageSize: PAGE_SIZE.toString(),
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
        
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        
        pageData = await response.json();
        
      } catch (err) {
        retries++;
        console.warn('    Error: ' + err.message + ' (retry ' + retries + '/' + MAX_RETRY + ')');
        if (retries >= MAX_RETRY) {
          console.error('    Gagal setelah ' + MAX_RETRY + ' kali retry. Skip halaman ini.');
          pageData = null;
          break;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    // Jika fetch gagal total, lanjut ke halaman berikutnya
    if (!pageData) {
      indexFrom += PAGE_SIZE;
      continue;
    }
    
    const results = pageData.Results || [];
    
    // Set total di halaman pertama
    if (totalExpected === null) {
      totalExpected = pageData.ResultCount || 0;
      console.log('%c  Total record yang akan di-scrape: ' + totalExpected, 'color: #059669; font-weight: bold;');
      console.log('');
    }
    
    // Jika tidak ada hasil, selesai
    if (results.length === 0) {
      console.log('  Tidak ada data lagi. Selesai.');
      break;
    }
    
    // Transform & simpan
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
    
    console.log('  OK: ' + results.length + ' record | Total: ' + allReports.length + '/' + totalExpected);
    
    // Cek apakah sudah selesai
    if (results.length < PAGE_SIZE) {
      console.log('  Halaman terakhir tercapai.');
      break;
    }
    if (allReports.length >= totalExpected && totalExpected > 0) {
      console.log('  Semua record sudah terkumpul.');
      break;
    }
    
    // Lanjut ke halaman berikutnya
    indexFrom += PAGE_SIZE;
    await new Promise(function(r) { setTimeout(r, DELAY_MS); });
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
  console.log('Total record: ' + allReports.length + (totalExpected ? ' (dari ' + totalExpected + ')' : ''));
  console.log('');
  console.log('%cCARA IMPORT KE MONGODB:', 'color: #2563EB; font-weight: bold;');
  console.log('1. Simpan file JSON yang baru di-download');
  console.log('2. Copy ke server:  scp ' + filename + ' root@8.215.33.70:/tmp/');
  console.log('3. Import:  node workers/import-idx-json.js /tmp/' + filename);
  
  return outputData;
})();
