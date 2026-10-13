const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { connectDB } = require('./config/db');
const eventRoutes = require('./routes/eventRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { seedAnalyticsData } = require('./seed/seedData');
const Session = require('./models/Session');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));

// Support application/json and text/plain (used by sendBeacon Blob)
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ type: 'text/plain', limit: '1mb' }));

// Middleware to parse text/plain body into JSON if sendBeacon sent string
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim().startsWith('{') || typeof req.body === 'string' && req.body.trim().startsWith('[')) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

// Serve client tracker script directly at /tracker.js
app.get('/tracker.js', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../tracker/tracker.js'), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
});

// Serve demo storefront at /demo
app.use('/demo', express.static(path.resolve(__dirname, '../../demo-site')));

// Redirect /demo to /demo/index.html
app.get('/demo', (req, res) => {
  res.redirect('/demo/index.html');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', eventRoutes);
app.use('/api', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Seed API endpoint
app.post('/api/seed', async (req, res) => {
  try {
    await seedAnalyticsData();
    res.json({ success: true, message: 'Demo analytics data seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Seed failed', details: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start Server & Connect Database
async function startServer() {
  try {
    await connectDB();

    // Auto-seed initial demo dataset if empty so dashboard is populated on first load
    const count = await Session.countDocuments();
    if (count === 0) {
      console.log('[Startup] Empty database detected. Seeding initial e-commerce analytics data...');
      await seedAnalyticsData();
    }

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 CausalFunnel Analytics Backend running on port ${PORT}`);
      console.log(`📍 Ingestion API:    http://localhost:${PORT}/api/events`);
      console.log(`📍 Sessions API:     http://localhost:${PORT}/api/sessions`);
      console.log(`📍 Analytics API:    http://localhost:${PORT}/api/analytics/clicks`);
      console.log(`📦 Tracker Script:   http://localhost:${PORT}/tracker.js`);
      console.log(`🛍️  Demo Store:       http://localhost:${PORT}/demo/index.html`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();
