const mongoose = require('mongoose');

const chartPriceSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  timeframe: {
    type: String,
    required: true,
    enum: ['1d', '1w', '1m', '3m', 'ytd', '1y', '3y', '5y']
  },
  prices: [{
    date: String,
    formatted_date: String,
    value: String,
    change: Number,
    percentage: Number
  }],
  previous: Number,
  metadata: {
    lastPrice: Number,
    change: Number,
    changePercent: Number
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chartPriceSchema.index({ symbol: 1, timeframe: 1 }, { unique: true });
chartPriceSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('ChartPrice', chartPriceSchema);
