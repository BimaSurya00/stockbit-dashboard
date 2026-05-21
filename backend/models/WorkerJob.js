const mongoose = require('mongoose');

const WorkerJobSchema = new mongoose.Schema({
  worker: {
    type: String,
    enum: ['snapshot', 'price'],
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['idle', 'running', 'error'],
    default: 'idle'
  },
  progress: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  message: { type: String, default: '' },
  lastRun: { type: Date },
  nextRun: { type: Date },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WorkerJob', WorkerJobSchema);
