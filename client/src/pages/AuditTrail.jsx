import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function AuditTrail() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditTrail(transactionId).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [transactionId]);

  if (loading) return <div className="flex items-center justify-center gap-3 py-20 text-txt-secondary"><span className="spinner" />Loading...</div>;
  if (!data) return <div className="text-center py-20 text-txt-muted"><p className="text-4xl mb-3 opacity-50">🔍</p><p>Transaction not found</p></div>;

  const { transaction: t, actions } = data;
  const diag = actions.length > 0 ? actions[0].diagnosis : null;

  return (
    <div className="px-6 py-8 max-w-[1440px] mx-auto">
      <button onClick={() => navigate('/transactions')}
        className="mb-4 px-4 py-2 rounded-lg border border-border-glass bg-glass text-txt-secondary text-sm font-medium cursor-pointer hover:text-txt-primary transition-all font-sans inline-flex items-center gap-1.5">
        ← Back
      </button>

      {/* Transaction Header */}
      <div className="glass rounded-2xl p-6 flex items-center gap-6 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-xl font-bold mb-1">{t.customer_name}</h2>
          <p className="font-mono text-xs text-txt-muted mb-2">{t.id}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={t.status} />
            <span className="font-mono text-xs text-txt-muted">{t.type} · {t.failure_reason}</span>
          </div>
        </div>
        <div className="text-3xl font-extrabold tracking-tight">{fmt(t.amount)}</div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 max-md:grid-cols-1">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-4">Transaction Details</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Email', t.customer_email],
              ['Phone', t.customer_phone],
              ['Created', new Date(t.created_at).toLocaleString()],
              ['Attempts', `${t.attempt_count} / ${t.max_attempts}`],
              ['Recovered', <span className="text-accent-green font-semibold">{fmt(t.recovered_amount)}</span>],
              ['Source', t.failure_source],
            ].map(([label, value], i) => (
              <div key={i}>
                <span className="text-txt-muted text-xs">{label}</span>
                <div className="mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {diag && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-4">AI Diagnosis</h2>
            <div className="text-sm space-y-3">
              <div>
                <span className="text-txt-muted text-xs">Root Cause</span>
                <p className="mt-0.5">{diag.root_cause}</p>
              </div>
              <div>
                <span className="text-txt-muted text-xs">Retryable</span>
                <p className={`mt-0.5 font-semibold ${diag.is_retryable ? 'text-accent-green' : 'text-accent-red'}`}>
                  {diag.is_retryable ? '✓ Yes' : '✗ No'}
                </p>
              </div>
              <div>
                <span className="text-txt-muted text-xs">Reasoning</span>
                <p className="mt-0.5 text-txt-secondary">{diag.reasoning}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-5">Recovery Timeline</h2>
        {actions.length === 0 ? (
          <p className="text-center py-8 text-txt-muted">No recovery actions yet</p>
        ) : (
          <div className="relative pl-8">
            <div className="timeline-line" />
            {actions.map((a, i) => (
              <div key={i} className="relative mb-6 glass rounded-xl p-4 transition-all hover:bg-glass-hover">
                <div className={`timeline-dot ${a.recovery_result === 'success' ? 'bg-accent-green shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-accent-red shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-accent-blue mb-1.5">
                  Attempt #{a.attempt_number} — {a.chosen_action?.replace(/_/g, ' ') || 'Skipped'}
                </div>
                <div className="text-sm leading-relaxed space-y-1">
                  <p><span className="font-semibold">Guardrail:</span> {a.guardrail_check}</p>
                  <p><span className="font-semibold">API:</span> <span className="font-mono text-xs text-accent-blue">{a.razorpay_api_called}</span></p>
                  {a.razorpay_short_url && (
                    <p><span className="font-semibold">Link:</span>{' '}
                      <a href={a.razorpay_short_url} target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">{a.razorpay_short_url} ↗</a>
                    </p>
                  )}
                  <p><span className="font-semibold">Outcome:</span>{' '}
                    <span className={`font-semibold ${a.simulated_outcome === 'paid' ? 'text-accent-green' : 'text-accent-red'}`}>{a.simulated_outcome}</span>
                  </p>
                  <p><span className="font-semibold">Result:</span>{' '}
                    <span className={`font-bold ${a.recovery_result === 'success' ? 'text-accent-green' : 'text-accent-red'}`}>
                      {a.recovery_result === 'success' ? '✓ Recovered' : '✗ ' + a.recovery_result}
                    </span>
                  </p>
                </div>
                <p className="font-mono text-[0.7rem] text-txt-muted mt-2">{a.created_at}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw JSON */}
      {actions.length > 0 && actions[0].razorpay_response && (
        <div className="glass rounded-2xl p-6 mt-4">
          <h2 className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-4">Raw Razorpay Response</h2>
          <div className="bg-black/30 border border-border-glass rounded-xl p-4 max-h-72 overflow-auto">
            <pre className="font-mono text-xs text-txt-secondary whitespace-pre-wrap">
              {JSON.stringify(actions[0].razorpay_response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
