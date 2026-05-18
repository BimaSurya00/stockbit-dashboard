const mongoose = require('mongoose');
const User = require('../models/User');

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  role: 'admin'
};

async function seedAdmin() {
  try {
    const existing = await User.findOne({ username: DEFAULT_ADMIN.username });
    if (existing) {
      console.log('[ADMIN SEED] Admin already exists, skipping');
      return { created: false };
    }
    await User.create(DEFAULT_ADMIN);
    console.log('[ADMIN SEED] Default admin created: admin / admin123');
    return { created: true };
  } catch (err) {
    console.error('[ADMIN SEED] Error:', err.message);
    throw err;
  }
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard';
  mongoose.connect(MONGODB_URI)
    .then(() => seedAdmin())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seedAdmin, DEFAULT_ADMIN };
