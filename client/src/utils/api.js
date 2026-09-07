const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

// Shared secret for the protected endpoints (P2-2). This is a drive-by shield,
// not real auth — anything in a Vite bundle is readable by whoever loads the
// page. It stops an anonymous stranger from firing payment links and dumping the
// customer CSV; it does not stop a determined attacker.
const API_KEY = import.meta.env.VITE_API_KEY || '';

/** Headers for fetch/XHR calls. */
export function authHeaders(extra = {}) {
  return {
    ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    ...extra,
  };
}

/**
 * EventSource and window.open can't set headers, so those two carry the key as a
 * query param instead (the server accepts either).
 */
export function withApiKey(url) {
  if (!API_KEY) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${encodeURIComponent(API_KEY)}`;
}

export const API_BASE_URL = BASE_URL;

export async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: authHeaders({ 'Content-Type': 'application/json', ...(options.headers || {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API request failed');
  }
  return res.json();
}

export const api = {
  // Transactions
  getTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/transactions${query ? '?' + query : ''}`);
  },
  getTransaction: (id) => fetchApi(`/transactions/${id}`),
  getTransactionSummary: () => fetchApi('/transactions/summary'),
  injectMockTransaction: (data) => fetchApi('/transactions/mock', { method: 'POST', body: JSON.stringify(data) }),

  // Recovery
  startRecoveryRun: () => fetchApi('/recovery/run', { method: 'POST' }),
  getRecoveryRuns: () => fetchApi('/recovery/runs'),

  // Metrics
  getMetrics: () => fetchApi('/metrics'),

  // Audit
  getAuditTrail: (txnId) => fetchApi(`/audit/${txnId}`),

  // Scheduler
  getSchedulerStatus: () => fetchApi("/scheduler/status"),
  toggleScheduler: (enable, interval) => fetchApi("/scheduler/toggle", { method: "POST", body: JSON.stringify({ enable, interval }) }),

  // CSV export — a browser navigation, so the key rides in the query string.
  csvExportUrl: () => withApiKey(`${BASE_URL}/export/csv`),
};
