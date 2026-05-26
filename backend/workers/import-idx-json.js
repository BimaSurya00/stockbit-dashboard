/**
 * Import IDX JSON ke MongoDB
 * 
 * Usage:
 *   node workers/import-idx-json.js /path/to/idx-reports-2026-tw1-1234567890.json
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const FinancialReport = require('../models/FinancialReport');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard';

async function main() {
  const jsonFile = process.argv[2];
  
  if (!jsonFile) {
    console.error('Usage: node import-idx-json.js <path-to-json-file>');
    process.exit(1);
  }
  
  if (!fs.existsSync(jsonFile)) {
    console.error(`File not found: ${jsonFile}`);
    process.exit(1);
  }
  
  console.log('=== Import IDX Reports to MongoDB ===');
  console.log('File:', jsonFile);
  console.log('MongoDB:', MONGODB_URI.replace(/\/\/.+@/, '//****@'));
  console.log('');
  
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected\n');
  
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const reports = data.reports || data.Results || [];
  
  console.log(`[INFO] Found ${reports.length} reports in JSON`);
  console.log(`       Year: ${data.year}, Periode: ${data.periode || data.Periode}`);
  console.log('');
  
  let imported = 0;
  let skipped = 0;
  
  for (const item of reports) {
    try {
      // Handle both formats (snake_case from console script or CamelCase from API)
      const kodeEmiten = item.kodeEmiten || item.KodeEmiten;
      const namaEmiten = item.namaEmiten || item.NamaEmiten;
      const reportYear = item.reportYear || item.Report_Year || item.report_year;
      const reportPeriod = item.reportPeriod || item.Report_Period || item.report_period;
      const reportType = item.reportType || item.Report_Type || 'rdf';
      const fileModified = item.fileModified || item.File_Modified;
      const attachments = item.attachments || item.Attachments || [];
      
      if (!kodeEmiten) {
        console.warn(`[SKIP] Missing kodeEmiten`);
        skipped++;
        continue;
      }
      
      await FinancialReport.findOneAndUpdate(
        {
          kodeEmiten: kodeEmiten.toUpperCase(),
          reportYear: reportYear?.toString(),
          reportPeriod: reportPeriod?.toString(),
          reportType: reportType
        },
        {
          kodeEmiten: kodeEmiten.toUpperCase(),
          namaEmiten: namaEmiten || kodeEmiten,
          reportYear: reportYear?.toString(),
          reportPeriod: reportPeriod?.toString(),
          reportType: reportType,
          emitenType: 's',
          fileModified: fileModified ? new Date(fileModified) : null,
          attachments: attachments.map(att => ({
            fileId: att.fileId || att.File_ID,
            fileName: att.fileName || att.File_Name,
            filePath: att.filePath || att.File_Path,
            fileSize: att.fileSize || att.File_Size,
            fileType: att.fileType || att.File_Type,
            reportPeriod: att.reportPeriod || att.Report_Period,
            reportType: att.reportType || att.Report_Type,
            reportYear: att.reportYear || att.Report_Year
          })),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      
      imported++;
      
      if (imported % 50 === 0) {
        console.log(`[PROGRESS] ${imported}/${reports.length} imported...`);
      }
      
    } catch (err) {
      console.error(`[ERROR] Failed to import item:`, err.message);
      skipped++;
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`Imported: ${imported}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Total:    ${reports.length}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
