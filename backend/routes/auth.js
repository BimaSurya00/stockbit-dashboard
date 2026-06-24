const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authMiddleware, adminMiddleware } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
    if (!await user.comparePassword(password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

router.post('/register', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (await User.findOne({ username: username.toLowerCase() })) return res.status(409).json({ error: 'Username already exists' });
    const user = await User.create({ username: username.toLowerCase(), password, role: role || 'user' });
    res.status(201).json({ message: 'User created', user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.post('/refresh', authMiddleware, (req, res) => {
  try {
    const newToken = generateToken(req.user);
    res.json({ success: true, token: newToken, user: { id: req.user._id, username: req.user.username, role: req.user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Gagal refresh token', detail: err.message });
  }
});

module.exports = router;
