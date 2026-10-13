import React from 'react';
import {
  Activity,
  Layers,
  Flame,
  ShoppingBag,
  RefreshCw,
  Sparkles,
  Trash2,
  ExternalLink
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  isRefreshing,
  onSeed,
  onReset
}) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 32px'
    }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand & Live Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(139, 92, 246, 0.5)'
            }}>
              <Activity size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="title-gradient">CausalFunnel</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>Analytics</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: 6, background: 'rgba(30, 41, 59, 0.6)', padding: 4, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'overview' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'overview' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Activity size={15} />
              Overview
            </button>

            <button
              id="tab-sessions-btn"
              onClick={() => setActiveTab('sessions')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'sessions' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'sessions' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Layers size={15} />
              Sessions
            </button>

            <button
              id="tab-heatmap-btn"
              onClick={() => setActiveTab('heatmap')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'heatmap' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'heatmap' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Flame size={15} />
              Heatmap
            </button>

            <button
              id="tab-store-btn"
              onClick={() => setActiveTab('store')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'store' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'store' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <ShoppingBag size={15} />
              Live Demo Store
            </button>
          </nav>
        </div>

        {/* Global Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Real-time Indicator & Auto-refresh */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            fontSize: 12
          }}>
            <div className="pulse-dot"></div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto-poll (3s)
            </label>
          </div>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            className="btn btn-secondary btn-sm"
            title="Refresh analytics data"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            Sync
          </button>

          {/* Seed demo data */}
          <button
            onClick={onSeed}
            className="btn btn-secondary btn-sm"
            title="Populate realistic session and click data"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c4b5fd' }}
          >
            <Sparkles size={13} />
            Seed Demo
          </button>

          {/* Reset database */}
          <button
            onClick={onReset}
            className="btn btn-ghost btn-sm"
            title="Clear all sessions and events"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171' }}
          >
            <Trash2 size={13} />
            Reset
          </button>

          {/* Open Store in New Tab Link */}
          <a
            href="http://localhost:5000/demo/index.html"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 6 }}
          >
            Open Storefront
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
}
