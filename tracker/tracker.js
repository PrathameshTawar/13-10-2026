/**
 * CausalFunnel Analytics Tracker Script (tracker.js)
 * Lightweight, non-blocking client-side interaction tracking script.
 * 
 * Tracks:
 * - page_view (initial load & SPA navigation)
 * - click (with coordinate mapping & element metadata)
 * - custom_event (custom interaction triggers)
 * 
 * Features:
 * - Persistent session tracking (localStorage with Cookie fallback)
 * - Session idle expiration (30-minute standard window)
 * - Normalized coordinate percentages (xPct, yPct, docWidth, docHeight) for accurate multi-device heatmaps
 * - Cross-origin resilient delivery via navigator.sendBeacon (text/plain) & fetch keepalive
 */

(function (window, document) {
  'use strict';

  // Prevent multiple tracker instances
  if (window.__CAUSAL_TRACKER_LOADED__) return;
  window.__CAUSAL_TRACKER_LOADED__ = true;

  // Configuration discovery (via current script tag attributes or global)
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const config = {
    endpoint: (currentScript && currentScript.getAttribute('data-endpoint')) ||
              window.__CAUSAL_API_ENDPOINT__ ||
              'http://localhost:5000/api/events',
    sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes idle timeout
    debug: (currentScript && currentScript.getAttribute('data-debug') === 'true') || false,
    batchIntervalMs: 1500 // Flush event buffer every 1.5s
  };

  function log(...args) {
    if (config.debug) {
      console.log('[CausalTracker]', ...args);
    }
  }

  // --- Session Management (LocalStorage + Cookie Fallback) ---
  const STORAGE_KEY_SESSION = 'cf_session_id';
  const STORAGE_KEY_LAST_ACTIVE = 'cf_last_active';

  function generateUUID() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'cf-sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
  }

  function getOrCreateSessionId() {
    const now = Date.now();
    let sessionId = null;
    let lastActive = 0;

    try {
      sessionId = localStorage.getItem(STORAGE_KEY_SESSION);
      lastActive = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ACTIVE) || '0', 10);
    } catch (e) {
      log('LocalStorage not accessible, falling back to cookie', e);
    }

    if (!sessionId) {
      sessionId = getCookie(STORAGE_KEY_SESSION);
      const cookieLastActive = getCookie(STORAGE_KEY_LAST_ACTIVE);
      if (cookieLastActive) lastActive = parseInt(cookieLastActive, 10);
    }

    // Check session expiration (if idle > 30 minutes, create fresh session)
    if (!sessionId || (lastActive && now - lastActive > config.sessionTimeoutMs)) {
      sessionId = generateUUID();
      log('New session generated:', sessionId);
    } else {
      log('Resuming existing session:', sessionId);
    }

    // Update timestamps and persist
    updateSessionActivity(sessionId);
    return sessionId;
  }

  function updateSessionActivity(sessionId) {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, sessionId);
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
    } catch (e) {}
    setCookie(STORAGE_KEY_SESSION, sessionId, 7);
    setCookie(STORAGE_KEY_LAST_ACTIVE, now.toString(), 7);
  }

  const currentSessionId = getOrCreateSessionId();

  // --- Event Queue & Dispatcher ---
  const eventQueue = [];
  let flushTimer = null;

  function sendEvents(events) {
    if (!events || events.length === 0) return;
    const payload = JSON.stringify(events.length === 1 ? events[0] : events);
    const url = config.endpoint;

    // Use sendBeacon with text/plain to avoid CORS preflight rejection across origins
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'text/plain' });
        const success = navigator.sendBeacon(url, blob);
        if (success) {
          log('Sent via sendBeacon:', events.length, 'events');
          return;
        }
      } catch (e) {
        log('sendBeacon failed, falling back to fetch', e);
      }
    }

    // Fallback to fetch with keepalive
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function (err) {
      log('Failed to dispatch tracking events:', err);
    });
  }

  function flushQueue() {
    if (eventQueue.length === 0) return;
    const toSend = eventQueue.splice(0, eventQueue.length);
    sendEvents(toSend);
  }

  function enqueueEvent(eventData, immediate) {
    updateSessionActivity(currentSessionId);
    eventQueue.push(eventData);

    if (immediate) {
      flushQueue();
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    } else if (!flushTimer) {
      flushTimer = setTimeout(function () {
        flushTimer = null;
        flushQueue();
      }, config.batchIntervalMs);
    }
  }

  // --- Element Metadata Extractor ---
  function getElementDetails(target) {
    if (!target || !(target instanceof Element)) {
      return { tagName: 'UNKNOWN', text: '' };
    }

    let text = (target.innerText || target.textContent || '').trim().replace(/\s+/g, ' ');
    if (text.length > 70) text = text.substring(0, 67) + '...';

    return {
      tagName: target.tagName ? target.tagName.toUpperCase() : 'UNKNOWN',
      id: target.id ? target.id.substring(0, 80) : undefined,
      className: typeof target.className === 'string' ? target.className.trim().substring(0, 100) : undefined,
      text: text || undefined,
      href: target.getAttribute('href') || (target.closest('a') ? target.closest('a').getAttribute('href') : undefined),
      dataRole: target.getAttribute('data-role') || target.getAttribute('data-track') || undefined
    };
  }

  // --- Coordinate & Document Metrics ---
  function getDocDimensions() {
    const doc = document.documentElement;
    const body = document.body;
    const docWidth = Math.max(
      doc ? doc.scrollWidth : 0,
      body ? body.scrollWidth : 0,
      window.innerWidth || 0
    );
    const docHeight = Math.max(
      doc ? doc.scrollHeight : 0,
      body ? body.scrollHeight : 0,
      window.innerHeight || 0
    );
    return { docWidth, docHeight };
  }

  // --- Event Collectors ---

  function trackPageView(customUrl) {
    const pageUrl = customUrl || window.location.href;
    const { docWidth, docHeight } = getDocDimensions();

    const event = {
      session_id: currentSessionId,
      event_type: 'page_view',
      page_url: pageUrl,
      timestamp: new Date().toISOString(),
      docWidth: Math.round(docWidth),
      docHeight: Math.round(docHeight),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        screenWidth: window.screen ? window.screen.width : undefined,
        screenHeight: window.screen ? window.screen.height : undefined
      },
      referrer: document.referrer || '',
      title: document.title || ''
    };

    log('Captured page_view:', event);
    enqueueEvent(event, true); // Send page views immediately
  }

  function handleClick(e) {
    // Collect coordinates: viewport-relative (clientX/Y) and document-relative (pageX/Y)
    const clientX = e.clientX;
    const clientY = e.clientY;
    const pageX = e.pageX !== undefined ? e.pageX : (clientX + (window.scrollX || window.pageXOffset || 0));
    const pageY = e.pageY !== undefined ? e.pageY : (clientY + (window.scrollY || window.pageYOffset || 0));

    const { docWidth, docHeight } = getDocDimensions();
    const xPct = docWidth > 0 ? Number((pageX / docWidth).toFixed(5)) : null;
    const yPct = docHeight > 0 ? Number((pageY / docHeight).toFixed(5)) : null;

    const elementInfo = getElementDetails(e.target);

    const event = {
      session_id: currentSessionId,
      event_type: 'click',
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      x: Math.round(pageX), // Document-relative X
      y: Math.round(pageY), // Document-relative Y
      xPct: xPct,           // Normalized X percentage (0 to 1)
      yPct: yPct,           // Normalized Y percentage (0 to 1)
      docWidth: Math.round(docWidth),
      docHeight: Math.round(docHeight),
      clientX: Math.round(clientX),
      clientY: Math.round(clientY),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: Math.round(window.scrollX || window.pageXOffset || 0),
        scrollY: Math.round(window.scrollY || window.pageYOffset || 0)
      },
      target: elementInfo
    };

    log('Captured click:', event);
    enqueueEvent(event, false);
  }

  // --- Setup Listeners ---

  // 1. Capture user clicks on the document
  document.addEventListener('click', handleClick, true);

  // 2. Track initial page view when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageView();
    });
  } else {
    trackPageView();
  }

  // 3. SPA Navigation Detection (HTML5 History API + popstate)
  let lastRecordedUrl = window.location.href;

  function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastRecordedUrl) {
      lastRecordedUrl = currentUrl;
      trackPageView(currentUrl);
    }
  }

  const originalPushState = history.pushState;
  if (originalPushState) {
    history.pushState = function () {
      originalPushState.apply(this, arguments);
      setTimeout(checkUrlChange, 0);
    };
  }

  const originalReplaceState = history.replaceState;
  if (originalReplaceState) {
    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      setTimeout(checkUrlChange, 0);
    };
  }

  window.addEventListener('popstate', checkUrlChange);

  // 4. Flush remaining events before unload / page exit
  window.addEventListener('beforeunload', flushQueue);
  window.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      flushQueue();
    }
  });

  // --- Public API for Host Pages ---
  window.CausalTracker = {
    getSessionId: function () {
      return currentSessionId;
    },
    trackPageView: trackPageView,
    trackCustomEvent: function (eventName, customData) {
      const { docWidth, docHeight } = getDocDimensions();
      const event = Object.assign({
        session_id: currentSessionId,
        event_type: 'custom_event',
        event_name: eventName,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        docWidth: Math.round(docWidth),
        docHeight: Math.round(docHeight),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }, customData || {});
      enqueueEvent(event, true);
    },
    flush: flushQueue
  };

  log('Tracker initialized successfully. Session:', currentSessionId);
})(window, document);
