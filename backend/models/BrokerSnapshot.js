const mongoose = require('mongoose');

const brokerSnapshotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  group: {
    type: String,
    required: true,
    enum: ['foreign', 'local', 'government']
  },
  buy_value: {
    type: Number,
    default: 0
  },
  sell_value: {
    type: Number,
    default: 0
  },
  net_value: {
    type: Number,
    default: 0
  },
  total_value: {
    type: Number,
    default: 0
  },
  total_volume: {
    type: Number,
    default: 0
  },
  total_frequency: {
    type: Number,
    default: 0
  },
  top_brokers: [{
    code: String,
    name: String,
    net_value: Number,
    buy_value: Number,
    sell_value: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

brokerSnapshotSchema.index({ date: 1, group: 1 }, { unique: true });
brokerSnapshotSchema.index({ date: -1 });

module.exports = mongoose.model('BrokerSnapshot', brokerSnapshotSchema);
