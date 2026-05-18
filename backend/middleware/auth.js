const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'stockbit-dashboard-secret-change-me';
const JWT_EXPIRES = '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { generateToken, authMiddleware, adminMiddleware, JWT_SECRET };
