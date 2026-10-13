const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    maxlength: 128
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
  customEventCount: {
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
  entryPage: {
    type: String,
    default: '',
    maxlength: 1024
  },
  exitPage: {
    type: String,
    default: '',
    maxlength: 1024
  },
  userAgent: {
    type: String,
    default: '',
    maxlength: 512
  },
  ip: {
    type: String,
    default: '',
    maxlength: 100
  }
}, {
  timestamps: true
});

SessionSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('Session', SessionSchema);
