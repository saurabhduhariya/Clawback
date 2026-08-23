import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function RecoveryRun() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [pastRuns, setPastRuns] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => { api.getRecoveryRuns().then(setPastRuns).catch(console.error); }, [result]);

  const handleRun = async () => {
    setRunning(true); setError(null); setResult(null);
    try { setResult(await api.startRecoveryRun()); }
    catch (e) { setError(e.message); }
    finally { setRunning(false); }
  };

  return (
    <div className="px-6 py-8 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Recovery Agent</h1>
      <p className="text-txt-secondary text-sm mb-7">Trigger the AI-powered recovery pipeline</p>

      <div className="glass rounded-2xl p-10 text-center">
        {!running && !result && !error && (
          <>
            <p className="text-txt-secondary text-base mb-8 leading-relaxed">
              The agent will analyze every failed transaction, run guardrail checks,<br />
              pick the optimal recovery strategy, and call Razorpay APIs.
            </p>
            <button onClick={handleRun} className="btn-gradient px-8 py-3.5 rounded-xl text-white font-semibold text-base cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(79,125,245,0.3)] border-none font-sans">
              🚀 Start Recovery Run
            </button>
          </>
        )}

        {running && (
          <div className="py-4">
            <div className="text-5xl mb-5">🤖</div>
            <p className="text-lg font-semibold text-txt-primary mb-2">Agent is processing transactions...</p>
            <p className="text-txt-muted text-sm mb-6">Diagnosing → Guardrails → Strategy → Execute → Simulate</p>
            <div className="max-w-md mx-auto">
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="progress-fill" style={{ width: '65%' }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-txt-muted">
                <span>Processing...</span>
                <span><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="py-4">
            <p className="text-accent-red text-base mb-4">❌ Error: {error}</p>
            <button onClick={handleRun} className="px-4 py-2 rounded-lg border border-border-glass bg-glass text-txt-secondary text-sm font-medium cursor-pointer hover:border-border-glass-hover hover:text-txt-primary transition-all font-sans">
              Retry
            </button>
          </div>
        )}

        {result && (
          <>
            <div className="text-5xl mb-3">✅</div>
            <p className="text-lg font-semibold text-accent-green mb-6">Recovery Run #{result.runId} Complete</p>

            <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto mb-8 max-sm:grid-cols-2">
              {[
                { label: 'Processed', value: result.totalProcessed, color: '' },
                { label: 'At Risk', value: fmt(result.totalAtRisk), color: 'text-accent-orange' },
                { label: 'Recovered', value: fmt(result.totalRecovered), color: 'text-accent-green' },
                { label: 'Rate', value: `${result.recoveryRate}%`, color: 'text-accent-blue' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-glass border border-border-glass text-center">
                  <div className="text-[0.68rem] text-txt-muted uppercase tracking-wider">{item.label}</div>
                  <div className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="text-left">
              <h3 className="text-[0.68rem] font-semibold text-txt-muted uppercase tracking-wider mb-3">Transaction Results</h3>
              <div className="max-h-72 overflow-auto rounded-xl">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['ID', 'Customer', 'Action', 'Outcome', 'Result'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[0.68rem] font-semibold text-txt-muted uppercase tracking-wider border-b border-border-glass">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r, i) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        <td className="px-4 py-2.5 font-mono text-xs text-txt-secondary">{r.id}</td>
                        <td className="px-4 py-2.5 text-sm">{r.customer}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-accent-blue">{r.action || '-'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-txt-secondary">{r.outcome || '-'}</td>
                        <td className="px-4 py-2.5 text-sm font-semibold">
                          <span className={r.result === 'success' ? 'text-accent-green' : 'text-txt-secondary'}>
                            {r.result === 'success' ? '✓ Recovered' : r.result === 'error' ? '✗ Error' : '✗ Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={() => { setResult(null); setError(null); }}
              className="mt-6 px-4 py-2 rounded-lg border border-border-glass bg-glass text-txt-secondary text-sm font-medium cursor-pointer hover:text-txt-primary transition-all font-sans">
              ← Run Another
            </button>
          </>
        )}
      </div>

      {pastRuns.length > 0 && (
        <div className="glass rounded-2xl p-6 mt-6">
          <h2 className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-5">Past Recovery Runs</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Run', 'Date', 'Transactions', 'At Risk', 'Recovered', 'Rate', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[0.68rem] font-semibold text-txt-muted uppercase tracking-wider border-b border-border-glass">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastRuns.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.03]">
                    <td className="px-4 py-3 font-semibold">#{r.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt-secondary">{new Date(r.started_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{r.total_transactions}</td>
                    <td className="px-4 py-3 text-sm">{fmt(r.total_at_risk_amount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-accent-green">{fmt(r.total_recovered)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{r.recovery_rate}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.7rem] font-semibold uppercase ${r.status === 'completed' ? 'bg-accent-green/12 text-emerald-300' : 'bg-accent-blue/12 text-blue-300'}`}>
                        <span className={`badge-dot ${r.status === 'completed' ? 'bg-accent-green' : 'bg-accent-blue'}`} />
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
