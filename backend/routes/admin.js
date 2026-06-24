const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Config = require('../models/Config');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { getTokenInfo } = require('../lib/stockbit');

// Token management
router.put('/token', authMiddleware, adminMiddleware, async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Body harus ada field "token" (string)' });
  try {
    await Config.findOneAndUpdate(
      { key: 'stockbit_token' }, { key: 'stockbit_token', value: token, description: 'Stockbit API Bearer token' },
      { upsert: true, new: true }
    );
    const { loadTokenFromDB } = require('../lib/stockbit');
    await loadTokenFromDB();
    const info = getTokenInfo(token);
    console.log(`[TOKEN UPDATE] ${info.message}`);
    res.json({ success: true, tokenInfo: info });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save token', detail: err.message });
  }
});

// User management
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', detail: err.message });
  }
});

router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const update = {};
    if (role) update.role = role;
    if (typeof isActive === 'boolean') update.isActive = isActive;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user', detail: err.message });
  }
});

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot delete the last admin' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', detail: err.message });
  }
});

module.exports = router;
