const mongoose = require('mongoose');

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
  kodeEmiten: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  namaEmiten: {
    type: String,
    required: true
  },
  reportYear: {
    type: String,
    required: true,
    index: true
  },
  reportPeriod: {
    type: String,
    required: true,
    enum: ['TW1', 'TW2', 'TW3', 'Tahunan'],
    index: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['rdf', 'annual'],
    index: true
  },
  emitenType: {
    type: String,
    default: 's',
    enum: ['s', 'o']
  },
  fileModified: Date,
  attachments: [AttachmentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index untuk unique constraint
FinancialReportSchema.index({ kodeEmiten: 1, reportYear: 1, reportPeriod: 1, reportType: 1 }, { unique: true });

module.exports = mongoose.model('FinancialReport', FinancialReportSchema);
