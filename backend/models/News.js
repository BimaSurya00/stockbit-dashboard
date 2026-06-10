const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  streamId: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String
  },
  contentOriginal: {
    type: String
  },
  titleUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    required: true
  },
  createdDisplay: {
    type: String
  },
  userId: {
    type: Number
  },
  username: {
    type: String
  },
  fullname: {
    type: String
  },
  userAvatar: {
    type: String
  },
  type: {
    type: String,
    default: 'STREAM_TYPE_NEWS'
  },
  images: [{
    type: String
  }],
  source: {
    type: String
  },
  sourceLabel: {
    type: String
  },
  sourceImage: {
    type: String
  },
  topics: [{
    type: String
  }],
  totalReplies: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  }
});

newsSchema.index({ streamId: 1 }, { unique: true });
newsSchema.index({ createdAt: -1 });
newsSchema.index({ topics: 1 });
newsSchema.index({ source: 1 });
newsSchema.index({ fetchedAt: 1 });

module.exports = mongoose.model('News', newsSchema);
