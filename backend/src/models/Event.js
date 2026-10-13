const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
    trim: true,
    maxlength: 128
  },
  eventType: {
    type: String,
    required: true,
    enum: ['page_view', 'click', 'custom_event'],
    index: true
  },
  eventName: {
    type: String,
    default: null,
    index: true,
    maxlength: 128
  },
  pageUrl: {
    type: String,
    required: true,
    index: true,
    trim: true,
    maxlength: 1024
  },
  pagePath: {
    type: String,
    required: true,
    index: true,
    trim: true,
    maxlength: 512
  },
  pageHost: {
    type: String,
    default: '',
    maxlength: 256
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Click coordinates & normalized spatial percentages
  x: {
    type: Number,
    default: null
  },
  y: {
    type: Number,
    default: null
  },
  xPct: {
    type: Number,
    default: null,
    min: 0,
    max: 1
  },
  yPct: {
    type: Number,
    default: null,
    min: 0
  },
  docWidth: {
    type: Number,
    default: null
  },
  docHeight: {
    type: Number,
    default: null
  },
  clientX: {
    type: Number,
    default: null
  },
  clientY: {
    type: Number,
    default: null
  },
  // Viewport context
  viewport: {
    width: { type: Number },
    height: { type: Number },
    scrollX: { type: Number, default: 0 },
    scrollY: { type: Number, default: 0 }
  },
  // Target DOM element metadata
  target: {
    tagName: { type: String, maxlength: 50 },
    id: { type: String, maxlength: 100 },
    className: { type: String, maxlength: 120 },
    text: { type: String, maxlength: 100 },
    href: { type: String, maxlength: 500 },
    dataRole: { type: String, maxlength: 80 }
  },
  // Additional context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for optimal queries
EventSchema.index({ sessionId: 1, timestamp: 1 });
EventSchema.index({ pagePath: 1, eventType: 1 });
EventSchema.index({ pageUrl: 1, eventType: 1 });
EventSchema.index({ eventType: 1, timestamp: -1 });

module.exports = mongoose.model('Event', EventSchema);
