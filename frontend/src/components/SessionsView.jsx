import React, { useState } from 'react';
import {
  Search,
  Filter,
  Clock,
  MousePointer,
  Eye,
  ArrowRight,
  Copy,
  Check,
  ChevronRight,
  Laptop,
  Compass
} from 'lucide-react';

export default function SessionsView({ sessions, onSelectSession, isLoading }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  function formatDuration(sec) {
    if (!sec || sec <= 0) return '< 1s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function cleanUrl(url) {
    if (!url) return '-';
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch (e) {
      return url.replace(/^https?:\/\/[^/]+/, '');
    }
  }

  function getPlatform(ua) {
    if (!ua) return 'Web';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Macintosh')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('iPhone') || ua.includes('Android')) return 'Mobile';
    return 'Web';
  }

  // Filter sessions
  const filteredSessions = (sessions || []).filter(s => {
    if (search && !s.sessionId.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterType === 'multi_page' && (!s.pageViewCount || s.pageViewCount < 2)) {
      return false;
    }
    if (filterType === 'high_activity' && (!s.eventCount || s.eventCount < 10)) {
      return false;
    }
    if (filterType === 'with_clicks' && (!s.clickCount || s.clickCount < 1)) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Filter Controls */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              User Sessions ({filteredSessions.length})
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Select any session to inspect the ordered user journey and interaction steps.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search session ID..."
                className="input-base"
                style={{ paddingLeft: 34, width: 220 }}
              />
            </div>

            {/* Quick Filter Buttons */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(30, 41, 59, 0.6)', padding: 4, borderRadius: 10 }}>
              <button
                onClick={() => setFilterType('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: filterType === 'all' ? 'var(--accent-primary)' : 'transparent',
                  color: filterType === 'all' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('multi_page')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: filterType === 'multi_page' ? 'var(--accent-primary)' : 'transparent',
                  color: filterType === 'multi_page' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Multi-page
              </button>
              <button
                onClick={() => setFilterType('high_activity')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: filterType === 'high_activity' ? 'var(--accent-primary)' : 'transparent',
                  color: filterType === 'high_activity' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                High Activity (10+)
              </button>
              <button
                onClick={() => setFilterType('with_clicks')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: filterType === 'with_clicks' ? 'var(--accent-primary)' : 'transparent',
                  color: filterType === 'with_clicks' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                With Clicks
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {filteredSessions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No sessions match the current filter or search criteria.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Session Identifier</th>
                <th>Total Events</th>
                <th>Interactions</th>
                <th>Duration</th>
                <th>Entry → Exit Journey</th>
                <th>Platform</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((s) => {
                const isSelectedCopy = copiedId === s.sessionId;
                return (
                  <tr
                    key={s._id || s.sessionId}
                    onClick={() => onSelectSession(s.sessionId)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Session ID */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="mono" style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>
                          {s.sessionId}
                        </span>
                        <button
                          onClick={(e) => handleCopy(s.sessionId, e)}
                          title="Copy Session ID"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isSelectedCopy ? '#34d399' : 'var(--text-tertiary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {isSelectedCopy ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>

                    {/* Total Events Badge */}
                    <td>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        background: 'rgba(139, 92, 246, 0.2)',
                        color: '#c4b5fd',
                        fontWeight: 700,
                        fontSize: 12,
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}>
                        {s.eventCount || 0} events
                      </span>
                    </td>

                    {/* Breakdown */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#34d399' }}>
                          <MousePointer size={12} />
                          {s.clickCount || 0} clicks
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}>
                          <Eye size={12} />
                          {s.pageViewCount || 1} views
                        </span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <Clock size={12} color="#fbbf24" />
                        {formatDuration(s.durationSeconds)}
                      </div>
                    </td>

                    {/* Entry -> Exit */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span className="mono" style={{ color: '#cbd5e1' }}>{cleanUrl(s.entryPage)}</span>
                        {s.exitPage && s.exitPage !== s.entryPage && (
                          <>
                            <ArrowRight size={11} color="var(--text-tertiary)" />
                            <span className="mono" style={{ color: '#a78bfa' }}>{cleanUrl(s.exitPage)}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Platform */}
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)'
                      }}>
                        <Laptop size={11} />
                        {getPlatform(s.userAgent)}
                      </span>
                    </td>

                    {/* Last Active */}
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {s.lastSeen ? new Date(s.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                      </span>
                    </td>

                    {/* Action button */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                      >
                        Journey
                        <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
