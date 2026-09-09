import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from './ToastContext';
import { authHeaders, withApiKey, API_BASE_URL } from '../utils/api';

const RecoveryContext = createContext(null);

const API_BASE = API_BASE_URL;
const MAX_RECONNECT_ATTEMPTS = 3;

export function RecoveryProvider({ children }) {
  const [runId, setRunId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const [streamLost, setStreamLost] = useState(false);
  const { addToast } = useToast();
  const eventSourceRef = useRef(null);
  const logCountRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);

  // Keep logCountRef in sync
  useEffect(() => {
    logCountRef.current = logs.length;
  }, [logs]);

  const addLog = useCallback((type, msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { type, msg, time }]);
  }, []);

  /** Close the EventSource and reset connection state */
  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; }
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Connect (or reconnect) to the SSE stream for a given runId.
   * Uses lastIndex to replay any missed logs since disconnection.
   */
  // Polling fallback: if SSE misses the 'complete' event, this catches it
  const pollerRef = useRef(null);

  const startPoller = useCallback((jobRunId) => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    pollerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/recovery/status/${jobRunId}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
          // If the SSE never delivered 'complete', force-finish the UI
          setRunning(prev => {
            if (prev) {
              addLog('success', data.summary
                ? `Recovery complete! Processed ${data.summary.totalProcessed || 0} transactions. Recovered INR ${((data.summary.totalRecovered || 0) / 100).toLocaleString('en-IN')} (${data.summary.recoveryRate || 0}% rate)`
                : 'Recovery completed.');
              setResults(data.summary || data.results || null);
              setDone(true);
              setActiveNode(null);
              closeSSE();
            }
            return false;
          });
        }
      } catch { /* ignore polling errors */ }
    }, 8000);
  }, [addLog, closeSSE]);

  const connectSSE = useCallback((jobRunId, lastIndex = 0) => {
    closeSSE();
    setStreamLost(false);
    reconnectAttemptsRef.current = 0;
    startPoller(jobRunId); // Start polling fallback alongside SSE

    const es = new EventSource(
      withApiKey(`${API_BASE}/recovery/stream/${jobRunId}?lastIndex=${lastIndex}`)
    );
    eventSourceRef.current = es;

    es.addEventListener('info', (e) => {
      const d = JSON.parse(e.data);
      addLog('info', d.message);
    });

    es.addEventListener('log', (e) => {
      const d = JSON.parse(e.data);
      setActiveNode(d.node);
      addLog('highlight', `[${d.transactionId}] ${d.detail}`);
    });

    // P3-2: Application-level error event — the job hit an error
    es.addEventListener('error', (e) => {
      try {
        const d = JSON.parse(e.data);
        addLog('error', d.error || 'Unknown error');
        addToast(d.error || 'Recovery error occurred', 'error');
      } catch {
        // SSE connection-level error — handled in es.onerror below
        return;
      }
      // Job errored out: stop everything
      setRunning(false);
      setDone(true);
      setActiveNode(null);
      closeSSE();
    });

    es.addEventListener('complete', (e) => {
      if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; }
      const d = JSON.parse(e.data);
      addLog('success', `Recovery complete! Processed ${d.totalProcessed || 0} transactions. Recovered INR ${((d.totalRecovered || 0) / 100).toLocaleString('en-IN')} (${d.recoveryRate || 0}% rate)`);
      
      if (d.totalRecovered > 0) {
        addToast(`✓ ₹${((d.totalRecovered || 0) / 100).toLocaleString('en-IN')} recovered automatically!`, 'success');
      } else {
        addToast('Recovery completed. No funds recovered this time.', 'info');
      }

      setResults(d);
      setDone(true);
      setRunning(false);
      setActiveNode(null);
      closeSSE();
    });

    // P3-3: Terminal 'done' event from server — unambiguous stream end
    es.addEventListener('done', () => {
      closeSSE();
      // If we haven't already handled 'complete', just close silently
    });

    // P3-3: Connection-level onerror — reconnect with cap
    es.onerror = () => {
      reconnectAttemptsRef.current += 1;

      if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
        console.warn('[SSE] Max reconnect attempts reached. Stopping.');
        closeSSE();
        setStreamLost(true);
        // Don't set running=false here — the job may still be running on the server.
        // Show the user a "stream lost" state instead.
        addLog('error', 'Stream connection lost. Click reconnect or check the dashboard for results.');
      }
      // Otherwise EventSource will auto-retry (browser default behavior).
      // We just count attempts.
    };
  }, [addLog, addToast, closeSSE]);

  /**
   * Start a new recovery run.
   */
  const startRecovery = useCallback(async (options = { limit: 10 }) => {
    setLogs([]);
    setDone(false);
    setResults(null);
    setRunning(true);
    setActiveNode(null);
    setStreamLost(false);
    logCountRef.current = 0;

    let bodyPayload;
    if (typeof options === 'number') {
      bodyPayload = { limit: options };
    } else {
      bodyPayload = { limit: options.limit || options.count || 10, transactionId: options.transactionId };
    }

    try {
      const res = await fetch(`${API_BASE}/recovery/start`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          addLog('info', 'Recovery already in progress. Reconnecting...');
          setRunId(data.runId);
          connectSSE(data.runId, 0);
          return;
        }
        throw new Error(data.error || 'Failed to start recovery');
      }

      if (!data.runId) {
        addLog('info', data.message || 'No transactions to recover');
        setRunning(false);
        setDone(true);
        setActiveNode(null);
        return;
      }

      addLog('info', 'Initializing AI state machine...');
      addLog('info', `Starting recovery for ${data.totalTransactions} transactions...`);
      setRunId(data.runId);
      connectSSE(data.runId, 0);
    } catch (err) {
      addLog('error', `Failed to start: ${err.message}`);
      setRunning(false);
    }
  }, [addLog, connectSSE]);

  /**
   * Reconnect to an existing running job (called when RecoveryRun mounts).
   */
  const reconnect = useCallback(() => {
    if (runId && running && !eventSourceRef.current) {
      addLog('info', 'Reconnecting to recovery stream...');
      setStreamLost(false);
      reconnectAttemptsRef.current = 0;
      connectSSE(runId, logCountRef.current);
    }
  }, [runId, running, addLog, connectSSE]);

  /**
   * Manual reconnect for when stream is lost
   */
  const manualReconnect = useCallback(() => {
    if (runId) {
      setStreamLost(false);
      reconnectAttemptsRef.current = 0;
      connectSSE(runId, logCountRef.current);
    }
  }, [runId, connectSSE]);

  /**
   * Check for an existing running job on server (page refresh scenario).
   */
  const checkExistingJob = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/recovery/latest`, { headers: authHeaders() });
      const data = await res.json();

      if (data.runId && data.status === 'running') {
        setRunId(data.runId);
        setRunning(true);
        addLog('info', 'Found running recovery job. Reconnecting...');
        connectSSE(data.runId, 0);
      }
    } catch (err) {
      console.error('Failed to check for existing job:', err);
    }
  }, [addLog, connectSSE]);

  // Clean up SSE on full app unmount
  useEffect(() => {
    return () => closeSSE();
  }, [closeSSE]);

  const value = {
    runId,
    logs,
    running,
    done,
    results,
    activeNode,
    streamLost,
    startRecovery,
    reconnect,
    manualReconnect,
    checkExistingJob,
  };

  return (
    <RecoveryContext.Provider value={value}>
      {children}
    </RecoveryContext.Provider>
  );
}

export function useRecovery() {
  const ctx = useContext(RecoveryContext);
  if (!ctx) throw new Error('useRecovery must be used within RecoveryProvider');
  return ctx;
}
