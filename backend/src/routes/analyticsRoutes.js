const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Session = require('../models/Session');

// Admin protection helper for sensitive mutations
function checkAdminAccess(req, res, next) {
  // If NODE_ENV is production, enforce X-Admin-Key header
  if (process.env.NODE_ENV === 'production') {
    const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
    const requiredKey = process.env.ADMIN_KEY || 'causalfunnel-admin-key';
    if (!adminKey || adminKey !== requiredKey) {
      return res.status(403).json({
        error: 'Unauthorized. Protected endpoint requires a valid X-Admin-Key header in production.'
      });
    }
  }
  next();
}

/**
 * GET /api/analytics/clicks
 * Fetch click data for a page (for heatmap visualization)
 * Query params: url (string), viewport (string: 'all' | 'desktop' | 'tablet' | 'mobile')
 */
router.get('/clicks', async (req, res) => {
  try {
    const rawTarget = req.query.url ? String(req.query.url).trim() : '';
    const viewportFilter = req.query.viewport ? String(req.query.viewport).toLowerCase() : 'all';

    if (!rawTarget) {
      return res.status(400).json({ error: 'A "url" query parameter is required (e.g. ?url=/demo/index.html)' });
    }

    // Extract path from input if a full URL was provided
    let targetPath = rawTarget;
    try {
      const parsed = new URL(rawTarget);
      targetPath = parsed.pathname;
    } catch (e) {
      targetPath = rawTarget.split('?')[0].split('#')[0];
      if (!targetPath.startsWith('/') && !targetPath.startsWith('http')) {
        targetPath = `/${targetPath}`;
      }
    }

    // Query using exact path or exact URL (indexed)
    const query = {
      eventType: 'click',
      $or: [
        { pagePath: targetPath },
        { pageUrl: rawTarget }
      ]
    };

    // Apply viewport filter if specified
    if (viewportFilter === 'desktop') {
      query['viewport.width'] = { $gte: 1024 };
    } else if (viewportFilter === 'tablet') {
      query['viewport.width'] = { $gte: 768, $lt: 1024 };
    } else if (viewportFilter === 'mobile') {
      query['viewport.width'] = { $lt: 768 };
    }

    const clicks = await Event.find(query)
      .select('sessionId timestamp x y xPct yPct docWidth docHeight clientX clientY viewport target pageUrl pagePath')
      .sort({ timestamp: -1 })
      .limit(1500)
      .lean();

    // Calculate click density stats & top clicked elements
    const elementCounts = {};
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let maxDocWidth = 0;
    let maxDocHeight = 0;

    for (const c of clicks) {
      if (c.x != null && c.y != null) {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
      }
      if (c.docWidth && c.docWidth > maxDocWidth) maxDocWidth = c.docWidth;
      if (c.docHeight && c.docHeight > maxDocHeight) maxDocHeight = c.docHeight;

      const key = `${c.target?.tagName || 'ELEMENT'}:${c.target?.text || c.target?.id || 'unknown'}`;
      elementCounts[key] = (elementCounts[key] || 0) + 1;
    }

    const topElements = Object.entries(elementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([element, count]) => ({ element, count }));

    return res.json({
      pageUrl: rawTarget,
      pagePath: targetPath,
      totalClicks: clicks.length,
      pageDimensions: {
        docWidth: maxDocWidth || 1200,
        docHeight: maxDocHeight || 1200
      },
      bounds: clicks.length ? { minX, maxX, minY, maxY } : null,
      topElements,
      clicks
    });
  } catch (error) {
    console.error('[Heatmap Clicks Error]', error);
    res.status(500).json({ error: 'Failed to retrieve click data for heatmap', details: error.message });
  }
});

/**
 * GET /api/analytics/pages
 * Retrieve list of all tracked unique pages with their pageviews and click stats
 */
router.get('/pages', async (req, res) => {
  try {
    const pages = await Event.aggregate([
      {
        $group: {
          _id: '$pagePath',
          fullUrl: { $first: '$pageUrl' },
          totalEvents: { $sum: 1 },
          pageViews: {
            $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] }
          },
          clicks: {
            $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] }
          },
          uniqueSessions: { $addToSet: '$sessionId' },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          pagePath: '$_id',
          pageUrl: '$fullUrl',
          totalEvents: 1,
          pageViews: 1,
          clicks: 1,
          uniqueSessionsCount: { $size: '$uniqueSessions' },
          lastActivity: 1
        }
      },
      { $sort: { clicks: -1, totalEvents: -1 } }
    ]);

    return res.json({ pages });
  } catch (error) {
    console.error('[Get Pages Error]', error);
    res.status(500).json({ error: 'Failed to retrieve tracked pages', details: error.message });
  }
});

/**
 * GET /api/analytics/overview
 * Top-level KPI stats for dashboard summary cards
 */
router.get('/overview', async (req, res) => {
  try {
    const totalSessions = await Session.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalClicks = await Event.countDocuments({ eventType: 'click' });
    const totalPageViews = await Event.countDocuments({ eventType: 'page_view' });

    // Calculate average session duration dynamically from sessions
    const durationStats = await Session.aggregate([
      {
        $project: {
          duration: {
            $cond: [
              { $and: ['$firstSeen', '$lastSeen', { $gte: ['$lastSeen', '$firstSeen'] }] },
              { $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 1000] },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Recent 10 events for live activity ticker
    const recentEvents = await Event.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return res.json({
      totalSessions,
      totalEvents,
      totalClicks,
      totalPageViews,
      avgDurationSeconds: Math.round(durationStats[0]?.avgDuration || 0),
      recentEvents
    });
  } catch (error) {
    console.error('[Analytics Overview Error]', error);
    res.status(500).json({ error: 'Failed to retrieve analytics overview', details: error.message });
  }
});

/**
 * DELETE /api/analytics/reset
 * Clean database for fresh testing (protected by admin check)
 */
router.delete('/reset', checkAdminAccess, async (req, res) => {
  try {
    await Event.deleteMany({});
    await Session.deleteMany({});
    res.json({ success: true, message: 'All analytics events and sessions have been reset.' });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed', details: error.message });
  }
});

module.exports = router;
