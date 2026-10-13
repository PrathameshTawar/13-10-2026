const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Event = require('../models/Event');

/**
 * GET /api/sessions
 * Fetch list of sessions with event counts, pagination, and sorting
 */
router.get('/sessions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const search = req.query.search ? String(req.query.search).trim() : '';

    const query = {};
    if (search) {
      query.sessionId = { $regex: search, $options: 'i' };
    }

    const totalSessions = await Session.countDocuments(query);
    const sessions = await Session.find(query)
      .sort({ lastSeen: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // If no sessions in Session collection yet, query Event collection directly
    if (sessions.length === 0 && totalSessions === 0) {
      const fallbackSessions = await Event.aggregate([
        {
          $group: {
            _id: '$sessionId',
            eventCount: { $sum: 1 },
            clickCount: {
              $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] }
            },
            pageViewCount: {
              $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] }
            },
            firstSeen: { $min: '$timestamp' },
            lastSeen: { $max: '$timestamp' }
          }
        },
        {
          $project: {
            sessionId: '$_id',
            eventCount: 1,
            clickCount: 1,
            pageViewCount: 1,
            firstSeen: 1,
            lastSeen: 1,
            durationSeconds: {
              $round: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 1000] }, 0]
            }
          }
        },
        { $sort: { lastSeen: -1 } },
        { $limit: limit }
      ]);

      return res.json({
        total: fallbackSessions.length,
        page,
        limit,
        totalPages: Math.ceil(fallbackSessions.length / limit) || 1,
        sessions: fallbackSessions
      });
    }

    return res.json({
      total: totalSessions,
      page,
      limit,
      totalPages: Math.ceil(totalSessions / limit) || 1,
      sessions
    });
  } catch (error) {
    console.error('[Get Sessions Error]', error);
    res.status(500).json({ error: 'Failed to retrieve sessions', details: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/events
 * Fetch all events for a specific session ordered chronologically (User Journey)
 */
router.get('/sessions/:sessionId/events', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId parameter is required' });
    }

    // Retrieve session summary info
    const session = await Session.findOne({ sessionId }).lean();

    // Retrieve all events sorted by timestamp
    const events = await Event.find({ sessionId })
      .sort({ timestamp: 1 })
      .lean();

    if (!events.length && !session) {
      return res.status(404).json({ error: 'Session not found or has no recorded events' });
    }

    // Calculate step-by-step elapsed time
    const journey = events.map((ev, index) => {
      const prev = index > 0 ? events[index - 1] : null;
      const stepDeltaMs = prev ? (new Date(ev.timestamp) - new Date(prev.timestamp)) : 0;
      return {
        ...ev,
        stepIndex: index + 1,
        elapsedFromPrevMs: stepDeltaMs
      };
    });

    return res.json({
      sessionId,
      sessionSummary: session || {
        sessionId,
        eventCount: events.length,
        firstSeen: events[0]?.timestamp,
        lastSeen: events[events.length - 1]?.timestamp
      },
      totalEvents: events.length,
      events: journey
    });
  } catch (error) {
    console.error('[Get Session Events Error]', error);
    res.status(500).json({ error: 'Failed to retrieve session events', details: error.message });
  }
});

module.exports = router;
