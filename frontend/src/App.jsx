import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MetricsOverview from './components/MetricsOverview';
import SessionsView from './components/SessionsView';
import SessionJourneyModal from './components/SessionJourneyModal';
import HeatmapView from './components/HeatmapView';
import LiveStoreTab from './components/LiveStoreTab';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [ovRes, sessRes] = await Promise.all([
        api.getOverview(),
        api.getSessions(1, 50)
      ]);
      setOverview(ovRes);
      setSessions(sessRes.sessions || []);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Seed demo data handler
  const handleSeed = async () => {
    try {
      await api.seedData();
      showToast('✨ Demo sessions & heatmap clicks successfully seeded!');
      loadData();
    } catch (err) {
      showToast(`Error seeding data: ${err.message}`);
    }
  };

  // Reset database handler
  const handleReset = async () => {
    if (!window.confirm('Reset all tracking data and start fresh?')) return;
    try {
      await api.resetData();
      showToast('🧹 Analytics data reset.');
      loadData();
    } catch (err) {
      showToast(`Error resetting: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 32,
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--accent-primary)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          padding: '12px 20px',
          borderRadius: 10,
          fontSize: 13,
          color: '#fff',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onRefresh={() => loadData(false)}
        isRefreshing={isRefreshing}
        onSeed={handleSeed}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'overview' && (
          <MetricsOverview
            overview={overview}
            onNavigateSessions={() => setActiveTab('sessions')}
            onNavigateHeatmap={() => setActiveTab('heatmap')}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsView
            sessions={sessions}
            onSelectSession={(id) => setSelectedSessionId(id)}
            isLoading={isRefreshing}
          />
        )}

        {activeTab === 'heatmap' && (
          <HeatmapView />
        )}

        {activeTab === 'store' && (
          <LiveStoreTab onActionTaken={() => loadData(true)} />
        )}
      </main>

      {/* Ordered User Journey Modal */}
      {selectedSessionId && (
        <SessionJourneyModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
