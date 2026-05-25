/**
 * Worker: Seed financial reports from IDX API to MongoDB
 *
 * Run this from a machine that CAN access IDX (e.g. your laptop in Indonesia).
 * It fetches ALL pages and saves them to MongoDB.
 *
 * Usage:
 *   node workers/seed-financial-reports-from-idx.js
 *
 * Env vars needed:
 *   MONGODB_URI=mongodb+srv://... (or local)
 *   Optional: YEAR=2024 PERIODE=tw1 REPORT_TYPE=rdf
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const FinancialReport = require('../models/FinancialReport');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard';

const YEAR = process.env.YEAR || '2024';
const PERIODE = process.env.PERIODE || 'tw1';   // tw1, tw2, tw3, tahunan
const REPORT_TYPE = process.env.REPORT_TYPE || 'rdf'; // rdf = keuangan, annual = tahunan
const EMITEN_TYPE = process.env.EMITEN_TYPE || 's';     // s = saham, o = obligasi

const IDX_URL = 'https://www.idx.co.id/primary/ListedCompany/GetFinancialReport';
const PAGE_SIZE = 50;

async function fetchPage(indexFrom) {
  const res = await axios.get(IDX_URL, {
    params: {
      indexFrom,
      pageSize: PAGE_SIZE,
      year: YEAR,
      reportType: REPORT_TYPE,
      EmitenType: EMITEN_TYPE,
      periode: PERIODE.toLowerCase(),
      kodeEmiten: '',
      SortColumn: 'KodeEmiten',
      SortOrder: 'asc'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan/',
      'Origin': 'https://www.idx.co.id',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    decompress: true,
    timeout: 20000,
    maxRedirects: 5,
    validateStatus: (status) => {
      // Allow us to inspect 403 responses
      return status < 500;
    }
  });

  if (res.status === 403) {
    console.error('[IDX DEBUG] Status 403 - Response body (first 500 chars):');
    const bodyPreview = typeof res.data === 'string'
      ? res.data.substring(0, 500)
      : JSON.stringify(res.data).substring(0, 500);
    console.error(bodyPreview);
    console.error('[IDX DEBUG] Headers sent:', JSON.stringify(res.config.headers));
    throw new Error(`IDX returned 403 - possible IP block. Response preview above.`);
  }

  return res.data;
}

async function saveReports(results, reportType) {
  let saved = 0;
  for (const item of results) {
    await FinancialReport.findOneAndUpdate(
      {
        kodeEmiten: item.KodeEmiten,
        reportYear: item.Report_Year,
        reportPeriod: item.Report_Period,
        reportType: reportType
      },
      {
        kodeEmiten: item.KodeEmiten,
        namaEmiten: item.NamaEmiten,
        reportYear: item.Report_Year,
        reportPeriod: item.Report_Period,
        reportType: reportType,
        emitenType: EMITEN_TYPE,
        fileModified: item.File_Modified ? new Date(item.File_Modified) : null,
        attachments: (item.Attachments || []).map(att => ({
          fileId: att.File_ID,
          fileName: att.File_Name,
          filePath: att.File_Path,
          fileSize: att.File_Size,
          fileType: att.File_Type,
          reportPeriod: att.Report_Period,
          reportType: att.Report_Type,
          reportYear: att.Report_Year
        })),
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    saved++;
  }
  return saved;
}

async function main() {
  console.log('=== Seed Financial Reports from IDX ===');
  console.log('MongoDB:', MONGODB_URI.replace(/\/\/.+@/, '//****@'));
  console.log('Year:', YEAR);
  console.log('Periode:', PERIODE);
  console.log('ReportType:', REPORT_TYPE);
  console.log('');

  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected\n');

  let indexFrom = 1;
  let totalSaved = 0;
  let totalExpected = null;

  while (true) {
    console.log(`[FETCH] Page starting at ${indexFrom}...`);
    const data = await fetchPage(indexFrom);
    const results = data?.Results || [];

    if (totalExpected === null) {
      totalExpected = data?.ResultCount || results.length;
      console.log(`[INFO] Total expected: ${totalExpected} reports\n`);
    }

    if (results.length === 0) {
      console.log('[INFO] No more results.');
      break;
    }

    const saved = await saveReports(results, REPORT_TYPE);
    totalSaved += saved;
    console.log(`[SAVED] ${saved} reports (total: ${totalSaved}/${totalExpected})`);

    if (results.length < PAGE_SIZE) {
      console.log('[INFO] Last page reached.');
      break;
    }

    indexFrom += PAGE_SIZE;

    // Small delay to be polite
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== DONE ===');
  console.log(`Total saved: ${totalSaved}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
