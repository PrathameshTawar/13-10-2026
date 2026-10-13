import React, { useState } from 'react';
import { ExternalLink, RefreshCw, ShoppingBag, Eye, MousePointer } from 'lucide-react';

export default function LiveStoreTab({ onActionTaken }) {
  const [currentDemoPage, setCurrentDemoPage] = useState('http://localhost:5000/demo/index.html');
  const [iframeKey, setIframeKey] = useState(1);

  const reloadIframe = () => {
    setIframeKey(k => k + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner with Instructions and Store Switcher */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="pulse-dot"></span>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                Interactive Store Sandbox
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 700 }}>
              Interact directly with the storefront below. Every click and page view triggers the embedded 
              <code style={{ color: '#67e8f9', margin: '0 4px' }}>tracker.js</code> script, instantly sending coordinates, 
              DOM element metadata, and session tokens to the backend!
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Page switcher buttons */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(30, 41, 59, 0.6)', padding: 4, borderRadius: 10 }}>
              <button
                onClick={() => setCurrentDemoPage('http://localhost:5000/demo/index.html')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: currentDemoPage.includes('index.html') ? 'var(--accent-primary)' : 'transparent',
                  color: currentDemoPage.includes('index.html') ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Storefront Home
              </button>
              <button
                onClick={() => setCurrentDemoPage('http://localhost:5000/demo/product.html')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: currentDemoPage.includes('product.html') ? 'var(--accent-primary)' : 'transparent',
                  color: currentDemoPage.includes('product.html') ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Product Details
              </button>
              <button
                onClick={() => setCurrentDemoPage('http://localhost:5000/demo/cart.html')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: currentDemoPage.includes('cart.html') ? 'var(--accent-primary)' : 'transparent',
                  color: currentDemoPage.includes('cart.html') ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Shopping Cart
              </button>
            </div>

            <button
              onClick={reloadIframe}
              className="btn btn-secondary btn-sm"
              title="Reload sandbox"
            >
              <RefreshCw size={13} />
            </button>

            <a
              href={currentDemoPage}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
            >
              Full Window
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Embedded Store Frame */}
      <div className="glass-panel" style={{
        padding: 4,
        overflow: 'hidden',
        height: '75vh',
        background: '#090d16'
      }}>
        <iframe
          key={iframeKey}
          src={currentDemoPage}
          title="AuraStore Live Demo"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 'var(--radius-md)'
          }}
        />
      </div>
    </div>
  );
}
