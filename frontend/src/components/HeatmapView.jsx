import React, { useEffect, useState, useRef } from 'react';
import {
  Flame,
  Grid,
  CircleDot,
  Layers,
  MapPin,
  ExternalLink,
  Sliders,
  Eye,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export default function HeatmapView() {
  const [pages, setPages] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [clickData, setClickData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Visualization mode: 'dots' | 'gradient' | 'grid'
  const [viewMode, setViewMode] = useState('gradient');
  const [showPagePreview, setShowPagePreview] = useState(true);
  const [radius, setRadius] = useState(28);
  const [opacity, setOpacity] = useState(0.85);
  const [hoveredClick, setHoveredClick] = useState(null);

  const canvasRef = useRef(null);

  // 1. Fetch available pages on mount
  useEffect(() => {
    api.getPages().then(res => {
      const pageList = res.pages || [];
      setPages(pageList);
      if (pageList.length > 0 && !selectedUrl) {
        setSelectedUrl(pageList[0].pageUrl);
      }
    }).catch(err => {
      console.error('Failed to load page list:', err);
    });
  }, []);

  // 2. Fetch click data whenever selectedUrl changes
  useEffect(() => {
    if (!selectedUrl) return;
    setIsLoading(true);
    setError(null);

    api.getClicks(selectedUrl)
      .then(res => {
        setClickData(res);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [selectedUrl]);

  // 3. Render Canvas Gradient Heatmap
  useEffect(() => {
    if (viewMode !== 'gradient' || !canvasRef.current || !clickData?.clicks?.length) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Create an offscreen canvas for alpha blending of radial gradients
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');

    // Draw radial blur for each click
    clickData.clicks.forEach(c => {
      if (c.x == null || c.y == null) return;
      const x = Math.min(width, Math.max(0, c.x));
      const y = Math.min(height, Math.max(0, c.y));

      const rad = radius;
      const grad = offCtx.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(x, y, rad, 0, Math.PI * 2);
      offCtx.fill();
    });

    // Create Color Gradient Palette (Blue -> Cyan -> Lime -> Yellow -> Red)
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pCtx = paletteCanvas.getContext('2d');

    const palGrad = pCtx.createLinearGradient(0, 0, 256, 1);
    palGrad.addColorStop(0.0, 'rgba(0, 0, 255, 0)');
    palGrad.addColorStop(0.2, 'rgba(0, 150, 255, 0.6)');
    palGrad.addColorStop(0.4, 'rgba(0, 255, 200, 0.8)');
    palGrad.addColorStop(0.65, 'rgba(255, 255, 0, 0.9)');
    palGrad.addColorStop(0.85, 'rgba(255, 120, 0, 0.95)');
    palGrad.addColorStop(1.0, 'rgba(255, 30, 0, 1)');

    pCtx.fillStyle = palGrad;
    pCtx.fillRect(0, 0, 256, 1);
    const palette = pCtx.getImageData(0, 0, 256, 1).data;

    // Colorize the alpha map
    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        const offset = alpha * 4;
        data[i] = palette[offset];         // R
        data[i + 1] = palette[offset + 1]; // G
        data[i + 2] = palette[offset + 2]; // B
        data[i + 3] = Math.round(alpha * opacity); // A
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [clickData, viewMode, radius, opacity]);

  // Clean pathname for cleaner display
  function cleanUrl(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch (e) {
      return url.replace(/^https?:\/\/[^/]+/, '');
    }
  }

  // Calculate 10x8 grid density cells for 'grid' mode
  const gridRows = 8;
  const gridCols = 10;
  const canvasWidth = 1200;
  const canvasHeight = 900;
  const cellWidth = canvasWidth / gridCols;
  const cellHeight = canvasHeight / gridRows;

  const gridCells = [];
  if (viewMode === 'grid' && clickData?.clicks?.length) {
    const counts = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
    let maxCell = 0;

    clickData.clicks.forEach(c => {
      if (c.x == null || c.y == null) return;
      const col = Math.min(gridCols - 1, Math.max(0, Math.floor(c.x / cellWidth)));
      const row = Math.min(gridRows - 1, Math.max(0, Math.floor(c.y / cellHeight)));
      counts[row][col]++;
      if (counts[row][col] > maxCell) maxCell = counts[row][col];
    });

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const count = counts[r][c];
        const pct = clickData.clicks.length > 0 ? Math.round((count / clickData.clicks.length) * 100) : 0;
        const intensity = maxCell > 0 ? (count / maxCell) : 0;
        gridCells.push({
          row: r,
          col: c,
          count,
          pct,
          intensity,
          x: c * cellWidth,
          y: r * cellHeight
        });
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Filter & Mode Selection Bar */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          {/* Page URL Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tracked Page:
            </span>
            <select
              value={selectedUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
              className="input-base"
              style={{ minWidth: 320, fontWeight: 500 }}
            >
              {pages.map((p) => (
                <option key={p.pageUrl} value={p.pageUrl}>
                  {cleanUrl(p.pageUrl)} ({p.clicks || 0} clicks • {p.pageViews || 0} views)
                </option>
              ))}
              {pages.length === 0 && (
                <option value="http://localhost:5000/demo/index.html">/demo/index.html</option>
              )}
            </select>
          </div>

          {/* Visualization Modes */}
          <div style={{ display: 'flex', gap: 6, background: 'rgba(30, 41, 59, 0.6)', padding: 4, borderRadius: 10 }}>
            <button
              onClick={() => setViewMode('gradient')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                background: viewMode === 'gradient' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'gradient' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Flame size={14} />
              Heat Glow
            </button>

            <button
              onClick={() => setViewMode('dots')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                background: viewMode === 'dots' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'dots' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <CircleDot size={14} />
              Exact Dots ({clickData?.totalClicks || 0})
            </button>

            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Grid size={14} />
              Density Grid
            </button>
          </div>

          {/* Viewport Overlay Toggle & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showPagePreview}
                onChange={(e) => setShowPagePreview(e.target.checked)}
              />
              Show Page Context
            </label>

            {/* Slider controls */}
            {viewMode === 'gradient' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                <span>Spread:</span>
                <input
                  type="range"
                  min="16"
                  max="55"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  style={{ width: 80, cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Layout: Left Canvas / Viewer + Right Insights Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Main Visualizer Stage */}
        <div className="glass-panel" style={{
          position: 'relative',
          padding: 16,
          overflow: 'hidden',
          minHeight: 650,
          background: '#090d16'
        }}>
          {isLoading && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading heatmap click coordinates...
            </div>
          )}

          {!isLoading && clickData?.clicks?.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>
              No click events tracked for this URL yet. 
              Open the store and click around, or click "Seed Demo" in the top bar!
            </div>
          )}

          {!isLoading && clickData && (
            <div style={{
              position: 'relative',
              width: canvasWidth,
              height: canvasHeight,
              maxWidth: '100%',
              margin: '0 auto',
              border: '1px solid var(--border-medium)',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#0f172a'
            }}>
              {/* Optional Underlying Page Iframe Preview */}
              {showPagePreview && selectedUrl && (
                <iframe
                  src={selectedUrl}
                  title="Page Context"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    border: 'none',
                    pointerEvents: 'none',
                    opacity: 0.65,
                    transformOrigin: 'top left'
                  }}
                />
              )}

              {/* Mode 1: Gradient Canvas Heatmap */}
              {viewMode === 'gradient' && (
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                />
              )}

              {/* Mode 2: Exact Dots View */}
              {viewMode === 'dots' && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 3
                }}>
                  {clickData.clicks.map((c, i) => {
                    if (c.x == null || c.y == null) return null;
                    return (
                      <div
                        key={c._id || i}
                        onMouseEnter={() => setHoveredClick(c)}
                        onMouseLeave={() => setHoveredClick(null)}
                        style={{
                          position: 'absolute',
                          left: c.x - 7,
                          top: c.y - 7,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.85)',
                          border: '2px solid #fff',
                          boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                          cursor: 'pointer',
                          transition: 'transform 0.15s',
                          transform: hoveredClick === c ? 'scale(1.8)' : 'scale(1)'
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Mode 3: Density Grid View */}
              {viewMode === 'grid' && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                  zIndex: 3,
                  pointerEvents: 'none'
                }}>
                  {gridCells.map((cell, idx) => {
                    const hasClicks = cell.count > 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          background: hasClicks ? `rgba(239, 68, 68, ${Math.min(0.7, cell.intensity * 0.75)})` : 'transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: '#fff',
                          padding: 4
                        }}
                      >
                        {hasClicks && (
                          <>
                            <strong style={{ fontSize: 13, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                              {cell.count}
                            </strong>
                            <span style={{ fontSize: 9, opacity: 0.85 }}>
                              {cell.pct}%
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Floating Tooltip for Hovered Dot */}
              {hoveredClick && (
                <div style={{
                  position: 'absolute',
                  left: Math.min(canvasWidth - 220, Math.max(10, hoveredClick.x + 15)),
                  top: Math.max(10, hoveredClick.y - 20),
                  background: '#090d16',
                  border: '1px solid var(--accent-primary)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 11,
                  zIndex: 100,
                  pointerEvents: 'none',
                  minWidth: 180
                }}>
                  <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 2 }}>
                    &lt;{hoveredClick.target?.tagName || 'ELEMENT'}&gt; {hoveredClick.target?.text || ''}
                  </div>
                  <div style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    X: {hoveredClick.x}px • Y: {hoveredClick.y}px
                  </div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginTop: 2 }}>
                    Session: {hoveredClick.sessionId?.substring(0, 8)}...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Page Click Breakdown & Top Elements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Page Stats Card */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={16} color="#f59e0b" />
              Page Density
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Clicks</span>
                <strong style={{ color: '#fff' }}>{clickData?.totalClicks || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Selected View</span>
                <span style={{ color: '#a78bfa', fontWeight: 600, textTransform: 'capitalize' }}>{viewMode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Active Context</span>
                <span className="mono" style={{ color: '#38bdf8', fontSize: 11 }}>{cleanUrl(selectedUrl)}</span>
              </div>
            </div>
          </div>

          {/* Top Clicked Elements Card */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              Top Clicked Targets
            </h3>
            {(!clickData?.topElements || clickData.topElements.length === 0) ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                No elements clicked yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {clickData.topElements.map((item, idx) => {
                  const maxCount = clickData.topElements[0]?.count || 1;
                  const pct = Math.round((item.count / maxCount) * 100);
                  const [tag, label] = item.element.split(':');

                  return (
                    <div key={idx} style={{ fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                          &lt;{tag}&gt; {label || 'element'}
                        </span>
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                          {item.count}
                        </span>
                      </div>
                      {/* Bar indicator */}
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
                          borderRadius: 3
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tips Card */}
          <div className="glass-panel" style={{ padding: 18, background: 'rgba(30, 41, 59, 0.3)', fontSize: 12, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#c4b5fd', marginBottom: 6 }}>
              <Info size={14} />
              Heatmap Guide
            </div>
            <p style={{ lineHeight: 1.5 }}>
              Switch to <strong>Exact Dots</strong> to hover and inspect clicked DOM elements and coordinates. 
              Switch to <strong>Density Grid</strong> to see spatial distribution across the layout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
