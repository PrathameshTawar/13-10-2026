const mongoose = require('mongoose');
const Event = require('../models/Event');
const Session = require('../models/Session');
const { connectDB } = require('../config/db');

async function seedAnalyticsData() {
  console.log('[Seed] Generating realistic analytics dataset...');

  await Event.deleteMany({});
  await Session.deleteMany({});

  const baseUrl = 'http://localhost:5000/demo';
  const homePath = '/demo/index.html';
  const productPath = '/demo/product.html';
  const cartPath = '/demo/cart.html';

  const homeUrl = `${baseUrl}/index.html`;
  const productUrl = `${baseUrl}/product.html`;
  const cartUrl = `${baseUrl}/cart.html`;

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36'
  ];

  const docWidth = 1440;
  const docHeight = 1350;

  // Hotspots with coordinate positions and target metadata
  const homeHotspots = [
    { name: 'Hero CTA Button', x: 200, y: 310, tag: 'A', text: 'Explore Aura Pro X', weight: 35 },
    { name: 'Hero 20% Off', x: 380, y: 310, tag: 'BUTTON', text: 'Claim 20% Off', weight: 20 },
    { name: 'Add to Cart Pro X', x: 260, y: 780, tag: 'BUTTON', text: '+ Add to Cart', weight: 30 },
    { name: 'Add to Cart Pulse Watch', x: 550, y: 780, tag: 'BUTTON', text: '+ Add to Cart', weight: 22 },
    { name: 'Filter Audio Chip', x: 240, y: 440, tag: 'BUTTON', text: 'Spatial Audio', weight: 15 },
    { name: 'Nav Cart Button', x: 1100, y: 25, tag: 'A', text: 'Cart 2', weight: 18 },
    { name: 'Search Input', x: 920, y: 25, tag: 'INPUT', text: '', weight: 12 },
    { name: 'Product Card 1 Image', x: 180, y: 640, tag: 'DIV', text: '🎧', weight: 14 }
  ];

  const productHotspots = [
    { name: 'Add to Bag CTA', x: 880, y: 450, tag: 'BUTTON', text: 'Add to Bag • $299', weight: 40 },
    { name: 'Color Swatch Midnight', x: 670, y: 360, tag: 'DIV', text: '', weight: 25 },
    { name: 'Color Swatch Silver', x: 710, y: 360, tag: 'DIV', text: '', weight: 18 },
    { name: 'Qty Plus Button', x: 740, y: 450, tag: 'BUTTON', text: '+', weight: 20 },
    { name: 'Front View Thumb', x: 240, y: 420, tag: 'BUTTON', text: '🎧 Front', weight: 15 },
    { name: 'Mic View Thumb', x: 330, y: 420, tag: 'BUTTON', text: '🎙️ Mic', weight: 12 },
    { name: 'Back to Catalog Link', x: 160, y: 90, tag: 'A', text: '← Back to catalog', weight: 10 }
  ];

  const cartHotspots = [
    { name: 'Complete Order CTA', x: 980, y: 440, tag: 'BUTTON', text: 'Complete Order →', weight: 30 },
    { name: 'Apply Code Button', x: 980, y: 360, tag: 'BUTTON', text: 'Apply Code', weight: 25 },
    { name: 'Coupon Input', x: 980, y: 310, tag: 'INPUT', text: '', weight: 15 },
    { name: 'Remove Item 2', x: 760, y: 250, tag: 'BUTTON', text: '✕', weight: 8 }
  ];

  const allEvents = [];
  const allSessions = [];

  const sessionTemplates = [
    { id: 'sess-buyer-89a1', funnel: ['home', 'product', 'cart'], converted: true },
    { id: 'sess-shopper-44c2', funnel: ['home', 'product', 'cart'], converted: true },
    { id: 'sess-browser-12d9', funnel: ['home', 'product'], converted: false },
    { id: 'sess-browser-90e3', funnel: ['home', 'product'], converted: false },
    { id: 'sess-explorer-33b8', funnel: ['home'], converted: false },
    { id: 'sess-cart-drop-77f1', funnel: ['home', 'cart'], converted: false },
    { id: 'sess-tech-lead-61a0', funnel: ['home', 'product', 'cart'], converted: true },
    { id: 'sess-mobile-user-88c', funnel: ['home', 'product'], converted: false }
  ];

  const now = Date.now();

  for (let sIdx = 0; sIdx < sessionTemplates.length; sIdx++) {
    const tpl = sessionTemplates[sIdx];
    const sessionStartTime = new Date(now - (sIdx + 1) * 18 * 60 * 1000);
    let currentTime = new Date(sessionStartTime.getTime());
    const ua = userAgents[sIdx % userAgents.length];

    let pageViewsCount = 0;
    let clicksCount = 0;
    let customEventsCount = 0;
    let entryPage = '';
    let exitPage = '';

    for (const step of tpl.funnel) {
      let pageUrl = homeUrl;
      let pagePath = homePath;
      let hotspots = homeHotspots;

      if (step === 'product') {
        pageUrl = productUrl;
        pagePath = productPath;
        hotspots = productHotspots;
      } else if (step === 'cart') {
        pageUrl = cartUrl;
        pagePath = cartPath;
        hotspots = cartHotspots;
      }

      if (!entryPage) entryPage = pageUrl;
      exitPage = pageUrl;

      // 1. page_view event
      pageViewsCount++;
      currentTime = new Date(currentTime.getTime() + Math.floor(Math.random() * 2000 + 1000));
      allEvents.push({
        sessionId: tpl.id,
        eventType: 'page_view',
        pageUrl,
        pagePath,
        pageHost: 'localhost:5000',
        timestamp: new Date(currentTime),
        docWidth,
        docHeight,
        viewport: { width: 1440, height: 900, scrollX: 0, scrollY: 0 },
        metadata: { userAgent: ua, title: `Aura Store - ${step}` }
      });

      // 2. Multiple clicks per page
      const numClicks = Math.floor(Math.random() * 4) + 2;
      for (let c = 0; c < numClicks; c++) {
        clicksCount++;
        currentTime = new Date(currentTime.getTime() + Math.floor(Math.random() * 4000 + 1500));
        const spot = hotspots[Math.floor(Math.random() * hotspots.length)];
        const jitterX = Math.round((Math.random() - 0.5) * 35);
        const jitterY = Math.round((Math.random() - 0.5) * 20);

        const clickX = spot.x + jitterX;
        const clickY = spot.y + jitterY;
        const xPct = Number((clickX / docWidth).toFixed(5));
        const yPct = Number((clickY / docHeight).toFixed(5));

        allEvents.push({
          sessionId: tpl.id,
          eventType: 'click',
          pageUrl,
          pagePath,
          pageHost: 'localhost:5000',
          timestamp: new Date(currentTime),
          x: clickX,
          y: clickY,
          xPct,
          yPct,
          docWidth,
          docHeight,
          clientX: clickX,
          clientY: clickY,
          viewport: { width: 1440, height: 900, scrollX: 0, scrollY: 0 },
          target: {
            tagName: spot.tag,
            text: spot.text,
            id: `seed-el-${Math.random().toString(36).substring(7)}`
          },
          metadata: { userAgent: ua }
        });
      }
    }

    // If converted, add purchase custom event
    if (tpl.converted) {
      customEventsCount++;
      currentTime = new Date(currentTime.getTime() + 2000);
      allEvents.push({
        sessionId: tpl.id,
        eventType: 'custom_event',
        eventName: 'purchase_complete',
        pageUrl: cartUrl,
        pagePath: cartPath,
        pageHost: 'localhost:5000',
        timestamp: new Date(currentTime),
        docWidth,
        docHeight,
        metadata: { orderTotal: 516.24, userAgent: ua }
      });
    }

    allSessions.push({
      sessionId: tpl.id,
      eventCount: pageViewsCount + clicksCount + customEventsCount,
      pageViewCount: pageViewsCount,
      clickCount: clicksCount,
      customEventCount: customEventsCount,
      firstSeen: sessionStartTime,
      lastSeen: currentTime,
      entryPage,
      exitPage,
      userAgent: ua,
      ip: '127.0.0.1'
    });
  }

  await Event.insertMany(allEvents);
  await Session.insertMany(allSessions);

  console.log(`[Seed] Seeded ${allSessions.length} sessions and ${allEvents.length} events successfully.`);
}

// Allow CLI execution if called directly
if (require.main === module) {
  connectDB().then(async () => {
    await seedAnalyticsData();
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedAnalyticsData };
