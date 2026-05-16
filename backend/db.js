const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard';

const mongooseOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[MONGODB] Connected to MongoDB');
  } catch (error) {
    console.error('[MONGODB] Connection error:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
