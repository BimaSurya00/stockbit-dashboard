/**
 * Diagnostic: Test connectivity to IDX API
 * Run this on your server to check if IDX blocks your IP.
 *
 * Usage:
 *   node workers/test-idx-connection.js
 */

const axios = require('axios');

const IDX_URL = 'https://www.idx.co.id/primary/ListedCompany/GetFinancialReport';

async function test() {
  console.log('=== IDX Connectivity Test ===\n');
  console.log('Target URL:', IDX_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  try {
    const res = await axios.get(IDX_URL, {
      params: {
        indexFrom: 1,
        pageSize: 5,
        year: '2024',
        reportType: 'rdf',
        EmitenType: 's',
        periode: 'tw1',
        SortColumn: 'KodeEmiten',
        SortOrder: 'asc'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan/',
        'Origin': 'https://www.idx.co.id'
      },
      timeout: 15000,
      decompress: true
    });

    console.log('[SUCCESS] IDX API responded!');
    console.log('Status:', res.status, res.statusText);
    console.log('ResultCount:', res.data?.ResultCount || 'N/A');
    console.log('Results length:', res.data?.Results?.length || 0);
    console.log('\nFirst result:', res.data?.Results?.[0]?.KodeEmiten || 'N/A');
    console.log('\n✅ Your server CAN access IDX API.');
    process.exit(0);

  } catch (err) {
    console.error('[FAILED] Could not reach IDX API');
    console.error('Error message:', err.message);

    if (err.response) {
      console.error('HTTP Status:', err.response.status, err.response.statusText);
      console.error('Response data (first 300 chars):');
      const data = typeof err.response.data === 'string'
        ? err.response.data.substring(0, 300)
        : JSON.stringify(err.response.data).substring(0, 300);
      console.error(data);
    } else if (err.request) {
      console.error('No response received — possible network or DNS issue.');
    }

    console.log('\n❌ Your server CANNOT access IDX API.');
    console.log('   This is likely due to IP geo-blocking by IDX.');
    console.log('   Solution: run seed-financial-reports.js from a local machine with Indonesian IP.');
    process.exit(1);
  }
}

test();
