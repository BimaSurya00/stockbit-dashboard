const mongoose = require('mongoose');
const fs = require('fs');

const MONGODB_URI = 'mongodb://localhost:27018/stockbit_dashboard';

const AttachmentSchema = new mongoose.Schema({
  fileId: String,
  fileName: String,
  filePath: String,
  fileSize: Number,
  fileType: String,
  reportPeriod: String,
  reportType: String,
  reportYear: String
}, { _id: false });

const FinancialReportSchema = new mongoose.Schema({
  kodeEmiten: { type: String, required: true, uppercase: true, index: true },
  namaEmiten: { type: String, required: true },
  reportYear: { type: String, required: true, index: true },
  reportPeriod: { type: String, required: true, enum: ['TW1', 'TW2', 'TW3', 'Tahunan'], index: true },
  reportType: { type: String, required: true, enum: ['rdf', 'annual'], index: true },
  emitenType: { type: String, default: 's', enum: ['s', 'o'] },
  fileModified: Date,
  attachments: [AttachmentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

FinancialReportSchema.index({ kodeEmiten: 1, reportYear: 1, reportPeriod: 1, reportType: 1 }, { unique: true });

const FinancialReport = mongoose.model('FinancialReport', FinancialReportSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[DB] Connected');

    const data = JSON.parse(fs.readFileSync('/tmp/idx_data.json', 'utf8'));
    const results = data.Results || [];

    console.log(`[SEED] Found ${results.length} reports`);

    for (const item of results) {
      await FinancialReport.findOneAndUpdate(
        {
          kodeEmiten: item.KodeEmiten,
          reportYear: item.Report_Year,
          reportPeriod: item.Report_Period,
          reportType: 'rdf'
        },
        {
          kodeEmiten: item.KodeEmiten,
          namaEmiten: item.NamaEmiten,
          reportYear: item.Report_Year,
          reportPeriod: item.Report_Period,
          reportType: 'rdf',
          emitenType: 's',
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
    }

    console.log('[SEED] Done');
    process.exit(0);
  } catch (err) {
    console.error('[SEED ERROR]', err.message);
    process.exit(1);
  }
}

seed();
