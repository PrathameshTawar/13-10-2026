const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Event = require('../models/Event');
const Session = require('../models/Session');

// Rate limiter for ingestion endpoint: 500 requests per 15 minutes per IP
const ingestionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tracking requests from this IP, please try again later.' }
});

// Helper to sanitize and normalize event payload
function normalizeEvent(raw, req) {
  if (!raw || typeof raw !== 'object') return null;

  const rawSessionId = raw.session_id || raw.sessionId;
  const rawEventType = raw.event_type || raw.eventType;
  const rawPageUrl = raw.page_url || raw.pageUrl;

  if (!rawSessionId || !rawEventType || !rawPageUrl) {
    return null;
  }

  const sessionId = String(rawSessionId).trim().substring(0, 128);
  const rawTypeStr = String(rawEventType).trim();

  // Map event types safely: keep page_view and click, map everything else to custom_event
  let eventType = 'custom_event';
  let eventName = null;

  if (rawTypeStr === 'page_view') {
    eventType = 'page_view';
  } else if (rawTypeStr === 'click') {
    eventType = 'click';
  } else {
    eventType = 'custom_event';
    eventName = (raw.event_name || raw.eventName || rawTypeStr).substring(0, 128);
  }

  // Normalize URL and extract path & host
  let cleanUrl = String(rawPageUrl).trim();
  let pagePath = cleanUrl;
  let pageHost = '';

  try {
    const parsed = new URL(cleanUrl);
    parsed.search = '';
    parsed.hash = '';
    cleanUrl = parsed.toString();
    pagePath = parsed.pathname || '/';
    pageHost = parsed.host || '';
  } catch (e) {
    // Relative URL fallback
    cleanUrl = cleanUrl.split('?')[0].split('#')[0];
    pagePath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
  }

  // Parse timestamp
  let timestamp = new Date();
  if (raw.timestamp) {
    const parsedTs = new Date(raw.timestamp);
    if (!isNaN(parsedTs.getTime())) {
      timestamp = parsedTs;
    }
  }

  // Validate coordinates safely (ensuring finite numbers, no NaN)
  const isFiniteNum = (val) => typeof val === 'number' && !isNaN(val) && isFinite(val);

  const x = isFiniteNum(raw.x) ? Math.round(raw.x) : null;
  const y = isFiniteNum(raw.y) ? Math.round(raw.y) : null;
  const clientX = isFiniteNum(raw.clientX) ? Math.round(raw.clientX) : null;
  const clientY = isFiniteNum(raw.clientY) ? Math.round(raw.clientY) : null;
  const docWidth = isFiniteNum(raw.docWidth) ? Math.round(raw.docWidth) : null;
  const docHeight = isFiniteNum(raw.docHeight) ? Math.round(raw.docHeight) : null;

  // Normalized percentages (0.0 to 1.0)
  let xPct = null;
  let yPct = null;

  if (isFiniteNum(raw.xPct) && raw.xPct >= 0 && raw.xPct <= 1) {
    xPct = Number(raw.xPct.toFixed(5));
  } else if (x !== null && docWidth && docWidth > 0) {
    xPct = Number((x / docWidth).toFixed(5));
  }

  if (isFiniteNum(raw.yPct) && raw.yPct >= 0) {
    yPct = Number(raw.yPct.toFixed(5));
  } else if (y !== null && docHeight && docHeight > 0) {
    yPct = Number((y / docHeight).toFixed(5));
  }

  // Extract element target info safely
  const rawTarget = raw.target || {};
  const target = {
    tagName: typeof rawTarget.tagName === 'string' ? rawTarget.tagName.substring(0, 50).toUpperCase() : undefined,
    id: typeof rawTarget.id === 'string' ? rawTarget.id.substring(0, 100) : undefined,
    className: typeof rawTarget.className === 'string' ? rawTarget.className.substring(0, 120) : undefined,
    text: typeof rawTarget.text === 'string' ? rawTarget.text.substring(0, 100) : undefined,
    href: typeof rawTarget.href === 'string' ? rawTarget.href.substring(0, 500) : undefined,
    dataRole: typeof rawTarget.dataRole === 'string' ? rawTarget.dataRole.substring(0, 80) : undefined
  };

  // Viewport context
  const rawVp = raw.viewport || {};
  const viewport = {
    width: isFiniteNum(rawVp.width) ? rawVp.width : undefined,
    height: isFiniteNum(rawVp.height) ? rawVp.height : undefined,
    scrollX: isFiniteNum(rawVp.scrollX) ? rawVp.scrollX : 0,
    scrollY: isFiniteNum(rawVp.scrollY) ? rawVp.scrollY : 0
  };

  return {
    sessionId,
    eventType,
    eventName,
    pageUrl: cleanUrl.substring(0, 1024),
    pagePath: pagePath.substring(0, 512),
    pageHost: pageHost.substring(0, 256),
    timestamp,
    x,
    y,
    xPct,
    yPct,
    docWidth,
    docHeight,
    clientX,
    clientY,
    viewport,
    target,
    metadata: {
      name: eventName,
      userAgent: (req.headers['user-agent'] || '').substring(0, 300),
      referrer: (typeof raw.referrer === 'string' ? raw.referrer : '').substring(0, 500),
      title: (typeof raw.title === 'string' ? raw.title : '').substring(0, 200),
      ip: (req.ip || req.connection?.remoteAddress || '').substring(0, 100),
      ...(typeof raw.metadata === 'object' && raw.metadata !== null ? raw.metadata : {})
    }
  };
}

/**
 * POST /api/events
 * Ingest single event or batch of tracking events
 */
router.post('/events', ingestionLimiter, async (req, res) => {
  try {
    const rawData = req.body;
    let rawList = Array.isArray(rawData) ? rawData : [rawData];

    // Cap batch size to 50 events
    if (rawList.length > 50) {
      rawList = rawList.slice(0, 50);
    }

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

    // Insert events in bulk with ordered: false so one bad document won't fail the batch
    const inserted = await Event.insertMany(validEvents, { ordered: false });

    // Group updates by sessionId for atomic session updates
    const sessionMap = new Map();
    for (const ev of validEvents) {
      if (!sessionMap.has(ev.sessionId)) {
        sessionMap.set(ev.sessionId, {
          events: [],
          pageViews: 0,
          clicks: 0,
          customEvents: 0,
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
      if (ev.eventType === 'custom_event') data.customEvents++;

      if (ev.timestamp < data.earliest) {
        data.earliest = ev.timestamp;
        data.firstPage = ev.pageUrl;
      }
      if (ev.timestamp > data.latest) {
        data.latest = ev.timestamp;
        data.lastPage = ev.pageUrl;
      }
    }

    // Atomic session update with { upsert: true } - eliminates E11000 duplicate key race conditions
    for (const [sessionId, data] of sessionMap.entries()) {
      await Session.updateOne(
        { sessionId },
        {
          $inc: {
            eventCount: data.events.length,
            pageViewCount: data.pageViews,
            clickCount: data.clicks,
            customEventCount: data.customEvents
          },
          $min: { firstSeen: data.earliest },
          $max: { lastSeen: data.latest },
          $set: { exitPage: data.lastPage },
          $setOnInsert: {
            entryPage: data.firstPage,
            userAgent: (req.headers['user-agent'] || '').substring(0, 500),
            ip: (req.ip || req.connection?.remoteAddress || '').substring(0, 100)
          }
        },
        { upsert: true }
      );
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
