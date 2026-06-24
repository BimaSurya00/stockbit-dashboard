const express = require('express');
const router = express.Router();
const axios = require('axios');
const FinancialReport = require('../models/FinancialReport');

router.get('/', async (req, res) => {
  try {
    const { year = '2026', reportType = 'rdf', periode = 'tw1', emitenType = 's', kodeEmiten, pageSize = 12, indexFrom = 1, sortColumn = 'KodeEmiten', sortOrder = 'asc' } = req.query;
    const periodeMap = { tw1: 'TW1', tw2: 'TW2', tw3: 'TW3', tahunan: 'Audit', audit: 'Audit' };
    const dbReportPeriod = periodeMap[periode.toLowerCase()] || periode.toUpperCase();
    const dbFilter = { reportYear: year, reportType, reportPeriod: dbReportPeriod, emitenType };
    if (kodeEmiten) dbFilter.kodeEmiten = { $regex: `^${kodeEmiten}`, $options: 'i' };
    const sortFieldMap = { KodeEmiten: 'kodeEmiten', NamaEmiten: 'namaEmiten', Report_Year: 'reportYear', Report_Period: 'reportPeriod', File_Modified: 'fileModified' };
    const dbSortField = sortFieldMap[sortColumn] || 'kodeEmiten';
    const [dbResults, totalCount] = await Promise.all([
      FinancialReport.find(dbFilter).sort({ [dbSortField]: sortOrder === 'asc' ? 1 : -1 }).limit(parseInt(pageSize)).skip(parseInt(indexFrom) - 1),
      FinancialReport.countDocuments(dbFilter)
    ]);
    res.json({
      Search: { ReportType: reportType, KodeEmiten: kodeEmiten || null, Year: year, SortColumn: sortColumn, SortOrder: sortOrder, EmitenType: emitenType, Periode: periode, indexfrom: parseInt(indexFrom), pagesize: parseInt(pageSize) },
      ResultCount: totalCount,
      Results: dbResults.map(r => ({
        KodeEmiten: r.kodeEmiten, NamaEmiten: r.namaEmiten, Report_Year: r.reportYear, Report_Period: r.reportPeriod, File_Modified: r.fileModified,
        Attachments: r.attachments.map(a => ({ File_ID: a.fileId, File_Name: a.fileName, File_Path: a.filePath, File_Size: a.fileSize, File_Type: a.fileType, Report_Period: a.reportPeriod, Report_Type: a.reportType, Report_Year: a.reportYear }))
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch financial reports', detail: err.message });
  }
});

router.get('/download', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'File path required' });
    const response = await axios.get(`https://www.idx.co.id${filePath}`, {
      responseType: 'stream', headers: { 'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0' }, timeout: 30000
    });
    res.setHeader('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file', detail: err.message });
  }
});

module.exports = router;
