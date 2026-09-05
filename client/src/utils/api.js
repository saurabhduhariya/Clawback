const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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
};
