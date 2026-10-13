import React from 'react';
import {
  Users,
  Activity,
  MousePointer,
  Eye,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Radio
} from 'lucide-react';

export default function MetricsOverview({ overview, onNavigateSessions, onNavigateHeatmap }) {
  if (!overview) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading platform metrics...
      </div>
    );
  }

  const {
    totalSessions = 0,
    totalEvents = 0,
    totalClicks = 0,
    totalPageViews = 0,
    avgDurationSeconds = 0,
    recentEvents = []
  } = overview;

  const clicksPerSession = totalSessions > 0 ? (totalClicks / totalSessions).toFixed(1) : 0;
  const eventsPerSession = totalSessions > 0 ? (totalEvents / totalSessions).toFixed(1) : 0;

  function formatDuration(sec) {
    if (!sec || sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function getTimeAgo(dateStr) {
    const delta = Math.round((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (delta < 5) return 'just now';
    if (delta < 60) return `${delta}s ago`;
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    return `${Math.floor(delta / 3600)}h ago`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero Welcome & Quick Stats Banner */}
      <div className="glass-panel" style={{
        padding: '28px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#c4b5fd',
              textTransform: 'uppercase'
            }}>Live Interaction Pipeline</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>• Active Ingestion Engine</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Behavioral Intelligence Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 640 }}>
            Real-time session recording, DOM coordinate tracking, and user journey flow. 
            Monitor user friction points and click concentrations across store pages.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={onNavigateSessions}
            className="btn btn-secondary"
            style={{ padding: '10px 18px' }}
          >
            Explore User Journeys
            <ArrowUpRight size={14} />
          </button>
          <button
            onClick={onNavigateHeatmap}
            className="btn btn-primary"
            style={{ padding: '10px 20px' }}
          >
            Inspect Click Heatmap
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 18
      }}>
        {/* Total Sessions */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Total Sessions</span>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {totalSessions.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={13} />
            <span>Active unique sessions</span>
          </div>
        </div>

        {/* Total Events */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Events Ingested</span>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Activity size={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {totalEvents.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Avg <strong style={{ color: '#fff' }}>{eventsPerSession}</strong> events / session
          </div>
        </div>

        {/* Total Clicks */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>User Clicks</span>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <MousePointer size={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {totalClicks.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Avg <strong style={{ color: '#fff' }}>{clicksPerSession}</strong> clicks / session
          </div>
        </div>

        {/* Total Page Views */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Page Views</span>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
              <Eye size={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {totalPageViews.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Captured across store pages
          </div>
        </div>

        {/* Avg Duration */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Avg Session Length</span>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {formatDuration(avgDurationSeconds)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Time on site
          </div>
        </div>
      </div>

      {/* Real-time Activity Ticker */}
      <div className="glass-panel" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={18} color="#10b981" />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Live Ingestion Stream</h3>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 20,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              fontWeight: 600
            }}>Realtime</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Showing latest {recentEvents.length} recorded events
          </span>
        </div>

        {recentEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            No events recorded yet. Open the demo store or click "Seed Demo" above to start!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentEvents.map((ev, i) => {
              const isClick = ev.eventType === 'click';
              const isPageView = ev.eventType === 'page_view';
              const isConversion = ev.eventType === 'conversion_purchase';

              let badgeClass = 'badge-custom';
              if (isClick) badgeClass = 'badge-click';
              else if (isPageView) badgeClass = 'badge-pageview';
              else if (isConversion) badgeClass = 'badge-conversion';

              const cleanUrl = ev.pageUrl ? ev.pageUrl.replace(/^https?:\/\/[^/]+/, '') : '/';

              return (
                <div
                  key={ev._id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    fontSize: 13,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span className={`badge ${badgeClass}`}>
                      {ev.eventType}
                    </span>
                    <span className="mono" style={{ fontSize: 12, color: '#38bdf8' }}>
                      {cleanUrl}
                    </span>
                    {isClick && ev.target && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        Target: <code style={{ color: '#f1f5f9', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                          {ev.target.tagName ? `<${ev.target.tagName}>` : ''} {ev.target.text ? `"${ev.target.text}"` : (ev.target.id || '')}
                        </code>
                        {ev.x != null && ev.y != null && (
                          <span style={{ color: '#94a3b8', marginLeft: 8 }} className="mono">
                            ({ev.x}, {ev.y})
                          </span>
                        )}
                      </span>
                    )}
                    {isConversion && (
                      <span style={{ color: '#c084fc', fontWeight: 600 }}>
                        🎉 Purchase Complete ($516.24)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {ev.sessionId ? `${ev.sessionId.substring(0, 10)}...` : ''}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 65, textAlign: 'right' }}>
                      {getTimeAgo(ev.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
