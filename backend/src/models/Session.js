const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  eventCount: {
    type: Number,
    default: 0
  },
  pageViewCount: {
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0
  },
  firstSeen: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    index: true
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  entryPage: {
    type: String,
    default: ''
  },
  exitPage: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  ip: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

SessionSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('Session', SessionSchema);
