const express = require('express');
const router = express.Router();
const WorkerJob = require('../models/WorkerJob');
const { getTokenInfo } = require('../lib/stockbit');

router.get('/token-status', (req, res) => {
  const { getTokenInfo, loadTokenFromDB } = require('../lib/stockbit');
  const { getCurrentToken } = require('../lib/stockbit');
  getCurrentToken().then(token => {
    res.json(getTokenInfo(token));
  });
});

router.get('/worker-status', async (req, res) => {
  try {
    const workers = await WorkerJob.find().sort({ updatedAt: -1 });
    res.json({ workers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch worker status', detail: err.message });
  }
});

router.post('/clear-cache', (req, res) => {
  // Cache is managed by lib/stockbit - clear via environment reset
  res.json({ success: true, message: 'Cache would be cleared on next restart' });
});

module.exports = router;
