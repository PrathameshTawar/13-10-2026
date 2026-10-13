const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/server');
const Event = require('../src/models/Event');
const Session = require('../src/models/Session');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Event.deleteMany({});
  await Session.deleteMany({});
});

describe('CausalFunnel Analytics API Test Suite', () => {
  test('GET /api/health should return healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('POST /api/events ingests a single page_view event and creates session', async () => {
    const payload = {
      session_id: 'sess-unit-1',
      event_type: 'page_view',
      page_url: 'http://localhost:5000/demo/index.html',
      timestamp: new Date().toISOString(),
      viewport: { width: 1440, height: 900 }
    };

    const res = await request(app)
      .post('/api/events')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.received).toBe(1);

    const events = await Event.find({ sessionId: 'sess-unit-1' });
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('page_view');
    expect(events[0].pagePath).toBe('/demo/index.html');

    const session = await Session.findOne({ sessionId: 'sess-unit-1' });
    expect(session).not.toBeNull();
    expect(session.pageViewCount).toBe(1);
    expect(session.eventCount).toBe(1);
  });

  test('POST /api/events ingests a click event with normalized coordinates', async () => {
    const payload = {
      session_id: 'sess-unit-2',
      event_type: 'click',
      page_url: 'http://localhost:5000/demo/product.html',
      x: 720,
      y: 450,
      docWidth: 1440,
      docHeight: 1800,
      target: {
        tagName: 'BUTTON',
        id: 'btn-add-pro-x',
        text: 'Add to Cart'
      }
    };

    const res = await request(app)
      .post('/api/events')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const saved = await Event.findOne({ sessionId: 'sess-unit-2', eventType: 'click' });
    expect(saved).not.toBeNull();
    expect(saved.x).toBe(720);
    expect(saved.y).toBe(450);
    expect(saved.xPct).toBeCloseTo(0.5); // 720 / 1440
    expect(saved.yPct).toBeCloseTo(0.25); // 450 / 1800
    expect(saved.target.tagName).toBe('BUTTON');
  });

  test('POST /api/events handles custom events without breaking the batch', async () => {
    const batch = [
      {
        session_id: 'sess-unit-3',
        event_type: 'page_view',
        page_url: 'http://localhost:5000/demo/cart.html'
      },
      {
        session_id: 'sess-unit-3',
        event_type: 'click',
        page_url: 'http://localhost:5000/demo/cart.html',
        x: 300,
        y: 400,
        docWidth: 1200,
        docHeight: 800
      },
      {
        session_id: 'sess-unit-3',
        event_type: 'view_legal_modal', // Custom un-enumerated event
        page_url: 'http://localhost:5000/demo/cart.html',
        metadata: { doc_type: 'privacy' }
      },
      {
        session_id: 'sess-unit-3',
        event_type: 'conversion_purchase', // Custom purchase event
        page_url: 'http://localhost:5000/demo/cart.html',
        metadata: { order_total: 516.24 }
      }
    ];

    const res = await request(app)
      .post('/api/events')
      .send(batch);

    expect(res.status).toBe(201);
    expect(res.body.received).toBe(4);

    const events = await Event.find({ sessionId: 'sess-unit-3' });
    expect(events.length).toBe(4);

    const customEvents = events.filter(e => e.eventType === 'custom_event');
    expect(customEvents.length).toBe(2);
    expect(customEvents.some(e => e.eventName === 'view_legal_modal')).toBe(true);
    expect(customEvents.some(e => e.eventName === 'conversion_purchase')).toBe(true);

    const session = await Session.findOne({ sessionId: 'sess-unit-3' });
    expect(session.eventCount).toBe(4);
    expect(session.clickCount).toBe(1);
    expect(session.pageViewCount).toBe(1);
    expect(session.customEventCount).toBe(2);
  });

  test('POST /api/events rejects malformed payloads with 400', async () => {
    const res1 = await request(app)
      .post('/api/events')
      .send([]);
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post('/api/events')
      .send({ invalid: 'data' });
    expect(res2.status).toBe(400);
  });

  test('GET /api/sessions returns list of sessions with dynamic duration', async () => {
    const now = Date.now();
    await Session.create({
      sessionId: 'sess-list-1',
      eventCount: 5,
      pageViewCount: 2,
      clickCount: 3,
      firstSeen: new Date(now - 45000),
      lastSeen: new Date(now)
    });

    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body.sessions.length).toBe(1);
    expect(res.body.sessions[0].sessionId).toBe('sess-list-1');
    expect(res.body.sessions[0].durationSeconds).toBe(45);
  });

  test('GET /api/sessions/:sessionId/events returns ordered user journey', async () => {
    const t0 = new Date('2026-10-13T10:00:00Z');
    const t1 = new Date('2026-10-13T10:00:05Z');

    await Event.create([
      {
        sessionId: 'sess-journey-1',
        eventType: 'page_view',
        pageUrl: 'http://localhost:5000/demo/index.html',
        pagePath: '/demo/index.html',
        timestamp: t0
      },
      {
        sessionId: 'sess-journey-1',
        eventType: 'click',
        pageUrl: 'http://localhost:5000/demo/index.html',
        pagePath: '/demo/index.html',
        x: 200,
        y: 300,
        xPct: 0.2,
        yPct: 0.3,
        timestamp: t1
      }
    ]);

    const res = await request(app).get('/api/sessions/sess-journey-1/events');
    expect(res.status).toBe(200);
    expect(res.body.totalEvents).toBe(2);
    expect(res.body.events[0].stepIndex).toBe(1);
    expect(res.body.events[1].stepIndex).toBe(2);
    expect(res.body.events[1].elapsedFromPrevMs).toBe(5000);
  });

  test('GET /api/analytics/clicks returns click points and top elements', async () => {
    await Event.create([
      {
        sessionId: 'sess-heat-1',
        eventType: 'click',
        pageUrl: 'http://localhost:5000/demo/index.html',
        pagePath: '/demo/index.html',
        x: 100,
        y: 200,
        xPct: 0.1,
        yPct: 0.2,
        docWidth: 1000,
        docHeight: 1000,
        target: { tagName: 'BUTTON', text: 'CTA' }
      },
      {
        sessionId: 'sess-heat-2',
        eventType: 'click',
        pageUrl: 'http://localhost:5000/demo/index.html',
        pagePath: '/demo/index.html',
        x: 120,
        y: 210,
        xPct: 0.12,
        yPct: 0.21,
        docWidth: 1000,
        docHeight: 1000,
        target: { tagName: 'BUTTON', text: 'CTA' }
      }
    ]);

    const res = await request(app).get('/api/analytics/clicks?url=/demo/index.html');
    expect(res.status).toBe(200);
    expect(res.body.totalClicks).toBe(2);
    expect(res.body.topElements.length).toBeGreaterThan(0);
    expect(res.body.topElements[0].count).toBe(2);
    expect(res.body.clicks[0].xPct).toBeDefined();
  });
});
