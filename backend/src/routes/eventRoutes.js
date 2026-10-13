const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Session = require('../models/Session');

// Helper to normalize client event keys (snake_case from tracker to camelCase for DB)
function normalizeEvent(raw, req) {
  const sessionId = raw.session_id || raw.sessionId;
  const eventType = raw.event_type || raw.eventType;
  const pageUrl = raw.page_url || raw.pageUrl;
  const timestamp = raw.timestamp ? new Date(raw.timestamp) : new Date();

  if (!sessionId || !eventType || !pageUrl) {
    return null;
  }

  return {
    sessionId: String(sessionId).trim(),
    eventType: String(eventType).trim(),
    pageUrl: String(pageUrl).trim(),
    timestamp,
    x: raw.x !== undefined ? Number(raw.x) : null,
    y: raw.y !== undefined ? Number(raw.y) : null,
    clientX: raw.clientX !== undefined ? Number(raw.clientX) : null,
    clientY: raw.clientY !== undefined ? Number(raw.clientY) : null,
    viewport: raw.viewport || {},
    target: raw.target || {},
    metadata: {
      userAgent: req.headers['user-agent'] || '',
      referrer: raw.referrer || '',
      title: raw.title || '',
      ip: req.ip || req.connection.remoteAddress || '',
      ...(raw.metadata || {})
    }
  };
}

/**
 * POST /api/events
 * Ingest single event or batch of tracking events
 */
router.post('/events', async (req, res) => {
  try {
    const rawData = req.body;
    const rawList = Array.isArray(rawData) ? rawData : [rawData];

    if (!rawList.length) {
      return res.status(400).json({ error: 'Empty payload provided.' });
    }

    const validEvents = [];
    for (const item of rawList) {
      const normalized = normalizeEvent(item, req);
      if (normalized) {
        validEvents.push(normalized);
      }
    }

    if (!validEvents.length) {
      return res.status(400).json({
        error: 'Invalid event payload. Required fields: session_id, event_type, page_url'
      });
    }

    // Insert events in bulk
    const inserted = await Event.insertMany(validEvents);

    // Group updates by sessionId for atomic session updates
    const sessionMap = new Map();
    for (const ev of validEvents) {
      if (!sessionMap.has(ev.sessionId)) {
        sessionMap.set(ev.sessionId, {
          events: [],
          pageViews: 0,
          clicks: 0,
          earliest: ev.timestamp,
          latest: ev.timestamp,
          lastPage: ev.pageUrl,
          firstPage: ev.pageUrl
        });
      }
      const data = sessionMap.get(ev.sessionId);
      data.events.push(ev);
      if (ev.eventType === 'page_view') data.pageViews++;
      if (ev.eventType === 'click') data.clicks++;
      if (ev.timestamp < data.earliest) {
        data.earliest = ev.timestamp;
        data.firstPage = ev.pageUrl;
      }
      if (ev.timestamp > data.latest) {
        data.latest = ev.timestamp;
        data.lastPage = ev.pageUrl;
      }
    }

    // Update each session
    for (const [sessionId, data] of sessionMap.entries()) {
      const existing = await Session.findOne({ sessionId });
      if (!existing) {
        await Session.create({
          sessionId,
          eventCount: data.events.length,
          pageViewCount: data.pageViews,
          clickCount: data.clicks,
          firstSeen: data.earliest,
          lastSeen: data.latest,
          durationSeconds: Math.round((data.latest.getTime() - data.earliest.getTime()) / 1000),
          entryPage: data.firstPage,
          exitPage: data.lastPage,
          userAgent: req.headers['user-agent'] || '',
          ip: req.ip || ''
        });
      } else {
        const newFirstSeen = existing.firstSeen < data.earliest ? existing.firstSeen : data.earliest;
        const newLastSeen = existing.lastSeen > data.latest ? existing.lastSeen : data.latest;
        const durationSec = Math.round((newLastSeen.getTime() - newFirstSeen.getTime()) / 1000);

        await Session.updateOne(
          { sessionId },
          {
            $inc: {
              eventCount: data.events.length,
              pageViewCount: data.pageViews,
              clickCount: data.clicks
            },
            $set: {
              lastSeen: newLastSeen,
              durationSeconds: durationSec,
              exitPage: data.lastPage
            }
          }
        );
      }
    }

    return res.status(201).json({
      success: true,
      received: validEvents.length,
      savedIds: inserted.map(e => e._id)
    });
  } catch (error) {
    console.error('[Event Ingest Error]', error);
    return res.status(500).json({ error: 'Failed to record tracking event', details: error.message });
  }
});

module.exports = router;
