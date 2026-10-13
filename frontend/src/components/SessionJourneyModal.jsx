import React, { useEffect, useState } from 'react';
import {
  X,
  Clock,
  MousePointer,
  Eye,
  CheckCircle2,
  Calendar,
  Globe,
  MapPin,
  Laptop,
  Maximize2,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function SessionJourneyModal({ sessionId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    api.getSessionEvents(sessionId)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [sessionId]);

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  function cleanUrl(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch (e) {
      return url.replace(/^https?:\/\/[^/]+/, '');
    }
  }

  function formatDuration(sec) {
    if (!sec || sec <= 0) return '< 1s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(30, 41, 59, 0.5)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#c4b5fd',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                User Journey
              </span>
              <h2 className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                {sessionId}
              </h2>
            </div>
            {data?.sessionSummary && (
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>Total Events: <strong style={{ color: '#fff' }}>{data.totalEvents}</strong></span>
                <span>•</span>
                <span>Duration: <strong style={{ color: '#fbbf24' }}>{formatDuration(data.sessionSummary.durationSeconds)}</strong></span>
                <span>•</span>
                <span>First Seen: <span className="mono">{new Date(data.sessionSummary.firstSeen).toLocaleTimeString()}</span></span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleCopyJson}
              className="btn btn-secondary btn-sm"
              title="Copy session events as JSON"
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              {copied ? 'Copied JSON' : 'Export JSON'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: 'var(--text-secondary)',
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body / Journey Timeline */}
        <div style={{
          padding: '24px 28px',
          overflowY: 'auto',
          flex: 1
        }}>
          {loading && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading chronological journey steps...
            </div>
          )}

          {error && (
            <div style={{ padding: 32, textAlign: 'center', color: '#f87171' }}>
              Error loading journey: {error}
            </div>
          )}

          {!loading && !error && data?.events && (
            <div style={{ position: 'relative', paddingLeft: 32 }}>
              {/* Vertical connector line */}
              <div style={{
                position: 'absolute',
                left: 11,
                top: 14,
                bottom: 14,
                width: 2,
                background: 'linear-gradient(to bottom, #8b5cf6, #3b82f6, #10b981)'
              }} />

              {/* Event Step Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {data.events.map((ev, index) => {
                  const isPageView = ev.eventType === 'page_view';
                  const isClick = ev.eventType === 'click';
                  const isConversion = ev.eventType === 'conversion_purchase';

                  let badgeColor = '#60a5fa';
                  let badgeBg = 'rgba(59, 130, 246, 0.15)';
                  let Icon = Eye;

                  if (isClick) {
                    badgeColor = '#34d399';
                    badgeBg = 'rgba(16, 185, 129, 0.15)';
                    Icon = MousePointer;
                  } else if (isConversion) {
                    badgeColor = '#c084fc';
                    badgeBg = 'rgba(168, 85, 247, 0.15)';
                    Icon = CheckCircle2;
                  }

                  const elapsedSec = ev.elapsedFromPrevMs > 0 ? (ev.elapsedFromPrevMs / 1000).toFixed(1) : null;

                  return (
                    <div key={ev._id || index} style={{ position: 'relative' }}>
                      {/* Step Indicator Node */}
                      <div style={{
                        position: 'absolute',
                        left: -32,
                        top: 12,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#0f172a',
                        border: `2px solid ${badgeColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                        boxShadow: `0 0 10px ${badgeColor}40`
                      }}>
                        <Icon size={12} color={badgeColor} />
                      </div>

                      {/* Step Card */}
                      <div style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: '16px 20px',
                        transition: 'border-color 0.2s'
                      }}>
                        {/* Top bar of step card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--text-tertiary)',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              STEP #{ev.stepIndex}
                            </span>

                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: badgeBg,
                              color: badgeColor,
                              textTransform: 'uppercase'
                            }}>
                              {ev.eventType}
                            </span>

                            <span className="mono" style={{ fontSize: 13, color: '#38bdf8', fontWeight: 600 }}>
                              {cleanUrl(ev.pageUrl)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                            {elapsedSec && (
                              <span style={{ color: '#fbbf24', fontSize: 11, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                +{elapsedSec}s
                              </span>
                            )}
                            <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Step Details & Coordinates */}
                        {isClick && (
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 12,
                            alignItems: 'center',
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            fontSize: 12
                          }}>
                            {/* Coordinates Chip */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              color: '#34d399'
                            }}>
                              <MapPin size={13} />
                              <span className="mono" style={{ fontWeight: 600 }}>
                                X: {ev.x}px, Y: {ev.y}px
                              </span>
                              {ev.clientX != null && (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
                                  (Viewport: {ev.clientX}, {ev.clientY})
                                </span>
                              )}
                            </div>

                            {/* Clicked Element Details */}
                            {ev.target && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                <span>Target:</span>
                                <code style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  color: '#f8fafc',
                                  fontSize: 11
                                }}>
                                  &lt;{ev.target.tagName || 'ELEMENT'}&gt; {ev.target.text ? `"${ev.target.text}"` : (ev.target.id || '')}
                                </code>
                              </div>
                            )}

                            {/* Viewport size */}
                            {ev.viewport?.width && (
                              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)', fontSize: 11 }}>
                                <Maximize2 size={11} />
                                <span>{ev.viewport.width}×{ev.viewport.height}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {isConversion && (
                          <div style={{
                            marginTop: 8,
                            padding: '8px 12px',
                            background: 'rgba(168, 85, 247, 0.12)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: '#e9d5ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <span>🛒 Purchase conversion event recorded! Total: $516.24</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.9)',
          fontSize: 12,
          color: 'var(--text-secondary)'
        }}>
          <div>
            Showing complete sequential user interaction journey
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close Journey
          </button>
        </div>
      </div>
    </div>
  );
}
