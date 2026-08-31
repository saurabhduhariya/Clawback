import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const RecoveryContext = createContext(null);

const API_BASE = 'http://localhost:3001/api';

export function RecoveryProvider({ children }) {
  const [runId, setRunId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const eventSourceRef = useRef(null);
  const logCountRef = useRef(0);

  // Keep logCountRef in sync
  useEffect(() => {
    logCountRef.current = logs.length;
  }, [logs]);

  const addLog = useCallback((type, msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { type, msg, time }]);
  }, []);

  /**
   * Connect (or reconnect) to the SSE stream for a given runId.
   * Uses lastIndex to replay any missed logs since disconnection.
   */
  const connectSSE = useCallback((jobRunId, lastIndex = 0) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(
      `${API_BASE}/recovery/stream/${jobRunId}?lastIndex=${lastIndex}`
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

    es.addEventListener('error', (e) => {
      try {
        const d = JSON.parse(e.data);
        addLog('error', d.error || 'Unknown error');
      } catch {
        // SSE connection-level error (server down, etc.)
      }
    });

    es.addEventListener('complete', (e) => {
      const d = JSON.parse(e.data);
      addLog('success', `Recovery complete! Processed ${d.totalProcessed || 0} transactions. Recovered INR ${((d.totalRecovered || 0) / 100).toLocaleString('en-IN')} (${d.recoveryRate || 0}% rate)`);
      setResults(d);
      setDone(true);
      setRunning(false);
      setActiveNode(null);
      es.close();
      eventSourceRef.current = null;
    });

    es.onerror = () => {
      // Connection closed — job may still be running, SSE just dropped.
      // Don't set running=false here.
    };
  }, [addLog]);

  /**
   * Start a new recovery run.
   */
  const startRecovery = useCallback(async (limit = 10) => {
    setLogs([]);
    setDone(false);
    setResults(null);
    setRunning(true);
    setActiveNode(null);
    logCountRef.current = 0;

    try {
      const res = await fetch(`${API_BASE}/recovery/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
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
      connectSSE(runId, logCountRef.current);
    }
  }, [runId, running, addLog, connectSSE]);

  /**
   * Check for an existing running job on server (page refresh scenario).
   */
  const checkExistingJob = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/recovery/latest`);
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
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const value = {
    runId,
    logs,
    running,
    done,
    results,
    activeNode,
    startRecovery,
    reconnect,
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
