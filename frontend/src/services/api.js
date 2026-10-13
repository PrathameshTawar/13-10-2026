/**
 * API client for interacting with CausalFunnel Analytics Backend
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'causalfunnel-admin-key';

async function handleResponse(res) {
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.error || errJson.message || errorDetail;
    } catch (e) {}
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  async getOverview() {
    const res = await fetch(`${API_BASE}/api/analytics/overview`);
    return handleResponse(res);
  },

  async getSessions(page = 1, limit = 25, search = '') {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/api/sessions?${params.toString()}`);
    return handleResponse(res);
  },

  async getSessionEvents(sessionId) {
    const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/events`);
    return handleResponse(res);
  },

  async getPages() {
    const res = await fetch(`${API_BASE}/api/analytics/pages`);
    return handleResponse(res);
  },

  async getClicks(pageUrl, viewport = 'all') {
    const params = new URLSearchParams({ url: pageUrl });
    if (viewport && viewport !== 'all') {
      params.append('viewport', viewport);
    }
    const res = await fetch(`${API_BASE}/api/analytics/clicks?${params.toString()}`);
    return handleResponse(res);
  },

  async seedData() {
    const res = await fetch(`${API_BASE}/api/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY
      }
    });
    return handleResponse(res);
  },

  async resetData() {
    const res = await fetch(`${API_BASE}/api/analytics/reset`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Key': ADMIN_KEY
      }
    });
    return handleResponse(res);
  }
};
