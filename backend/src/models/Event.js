const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['page_view', 'click', 'custom_event', 'conversion_purchase'],
    index: true
  },
  pageUrl: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Click coordinates
  x: {
    type: Number,
    default: null
  },
  y: {
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
    tagName: { type: String },
    id: { type: String },
    className: { type: String },
    text: { type: String },
    href: { type: String },
    dataRole: { type: String }
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
EventSchema.index({ pageUrl: 1, eventType: 1 });
EventSchema.index({ eventType: 1, timestamp: -1 });

module.exports = mongoose.model('Event', EventSchema);
