const mongoose = require('mongoose');

const emitenSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  sector: {
    type: String,
    default: ''
  },
  industry: {
    type: String,
    default: ''
  },
  // Data terakhir dari Stockbit
  lastPrice: {
    type: Number,
    default: 0
  },
  change: {
    type: Number,
    default: 0
  },
  changePercent: {
    type: String,
    default: '0'
  },
  volume: {
    type: Number,
    default: 0
  },
  marketCap: {
    type: Number,
    default: 0
  },
  // Chart data cache
  chartData: {
    type: Object,
    default: null
  },
  chartUpdatedAt: {
    type: Date,
    default: null
  },
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Auto-managed createdAt & updatedAt
});

// Index untuk pencarian cepat
emitenSchema.index({ name: 'text', sector: 'text' });

const Emiten = mongoose.model('Emiten', emitenSchema);

module.exports = Emiten;
