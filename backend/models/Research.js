const mongoose = require('mongoose');

const researchSchema = new mongoose.Schema({
  researchId: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  categoryLabel: {
    type: String,
    default: 'Snips'
  },
  url: {
    type: String
  },
  iconUrl: {
    type: String
  },
  imageUrl: {
    type: String
  },
  description: {
    type: String
  },
  compressedImageUrl: {
    type: String
  },
  created: {
    type: Date
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  }
});

researchSchema.index({ created: -1 });

module.exports = mongoose.model('Research', researchSchema);
