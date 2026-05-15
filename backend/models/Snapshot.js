const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['trending', 'top_gainer', 'top_loser', 'top_value', 'ihsg']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // TTL: auto-delete after 1 hour
  }
});

snapshotSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Snapshot', snapshotSchema);
