const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Session = require('../models/Session');

/**
 * GET /api/analytics/clicks
 * Fetch click data for a page (for heatmap visualization)
 * Query params: url (string), limit (number)
 */
router.get('/clicks', async (req, res) => {
  try {
    const rawUrl = req.query.url ? String(req.query.url).trim() : '';

    if (!rawUrl) {
      return res.status(400).json({ error: 'A "url" query parameter is required (e.g. ?url=http://... or pathname)' });
    }

    // Flexible URL matching: match full URL or match ending pathname
    const urlPattern = new RegExp(rawUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');

    const clicks = await Event.find({
      eventType: 'click',
      $or: [
        { pageUrl: rawUrl },
        { pageUrl: { $regex: urlPattern } }
      ]
    })
      .select('sessionId timestamp x y clientX clientY viewport target pageUrl')
      .sort({ timestamp: -1 })
      .limit(1000)
      .lean();

    // Calculate click density stats & top clicked elements
    const elementCounts = {};
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const c of clicks) {
      if (c.x != null && c.y != null) {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
      }

      const key = `${c.target?.tagName || 'ELEMENT'}:${c.target?.text || c.target?.id || 'unknown'}`;
      elementCounts[key] = (elementCounts[key] || 0) + 1;
    }

    const topElements = Object.entries(elementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([element, count]) => ({ element, count }));

    return res.json({
      pageUrl: rawUrl,
      totalClicks: clicks.length,
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
          _id: '$pageUrl',
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
          pageUrl: '$_id',
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

    // Calculate average session duration
    const durationStats = await Session.aggregate([
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$durationSeconds' },
          maxDuration: { $max: '$durationSeconds' }
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
 * Clean database for fresh testing
 */
router.delete('/reset', async (req, res) => {
  try {
    await Event.deleteMany({});
    await Session.deleteMany({});
    res.json({ success: true, message: 'All analytics events and sessions have been reset.' });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed', details: error.message });
  }
});

module.exports = router;
