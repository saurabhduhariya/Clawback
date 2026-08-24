import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Search, ArrowLeft, Check, X, ExternalLink } from 'lucide-react';

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

  if (loading) return <div className="flex items-center justify-center gap-3 py-20 text-zinc-400"><span className="spinner" />Loading...</div>;
  if (!data) return <div className="text-center py-20 text-zinc-500 bg-zinc-900/20 rounded-2xl border border-white/5"><p className="flex justify-center mb-3 opacity-50"><Search className="w-10 h-10" /></p><p>Transaction not found</p></div>;

  const { transaction: t, actions } = data;
  const diag = actions.length > 0 ? actions[0].diagnosis : null;

  return (
    <div className="px-6 py-8 max-w-[1440px] mx-auto relative z-10">
      <button onClick={() => navigate('/transactions')}
        className="mb-6 px-4 py-2 rounded-lg border border-white/5 bg-black/40 text-zinc-400 text-xs font-bold uppercase tracking-widest cursor-pointer hover:text-white hover:bg-black/60 transition-all flex items-center gap-2">
        <ArrowLeft className="w-4 h-4 text-zinc-600" /> Back
      </button>

      {/* Transaction Header */}
      <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-2xl flex items-center gap-6 mb-6 flex-wrap relative overflow-hidden group">
        <div className="absolute -right-4 -top-8 text-9xl font-black text-white/5 group-hover:text-white/10 transition-colors pointer-events-none select-none">
          TX
        </div>
        <div className="flex-1 min-w-[200px] relative z-10">
          <h2 className="text-2xl font-bold mb-1 text-white">{t.customer_name}</h2>
          <p className="font-mono text-xs text-zinc-500 mb-3">{t.id}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider border ${t.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/50 border-white/10 text-zinc-300'}`}>
              {t.status}
            </span>
            <span className="font-mono text-xs text-zinc-400 bg-black/50 px-2 py-1 rounded border border-white/5">{t.type} · {t.failure_reason}</span>
          </div>
        </div>
        <div className="text-4xl font-extrabold tracking-tight text-white relative z-10">{fmt(t.amount)}</div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-2xl">
          <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Transaction Details</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
            {[
              ['Email', t.customer_email],
              ['Phone', t.customer_phone],
              ['Created', new Date(t.created_at).toLocaleString()],
              ['Attempts', `${t.attempt_count} / ${t.max_attempts}`],
              ['Recovered', <span className="text-emerald-400 font-semibold">{fmt(t.recovered_amount)}</span>],
              ['Source', <span className="capitalize">{t.failure_source}</span>],
            ].map(([label, value], i) => (
              <div key={i}>
                <span className="text-zinc-500 text-xs uppercase tracking-wider font-semibold block mb-1">{label}</span>
                <div className="text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {diag && (
          <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-2xl">
            <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">AI Diagnosis</h2>
            <div className="text-sm space-y-5">
              <div>
                <span className="text-zinc-500 text-xs uppercase tracking-wider font-semibold block mb-1">Root Cause</span>
                <p className="text-white">{diag.root_cause}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs uppercase tracking-wider font-semibold block mb-1">Retryable</span>
                <p className={`font-bold ${diag.is_retryable ? 'text-emerald-400' : 'text-red-400'}`}>
                  {diag.is_retryable ? <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Yes</span> : <span className="flex items-center gap-1"><X className="w-4 h-4" /> No</span>}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs uppercase tracking-wider font-semibold block mb-1">Reasoning</span>
                <p className="text-zinc-300 leading-relaxed">{diag.reasoning}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-2xl mb-6">
        <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Recovery Timeline</h2>
        {actions.length === 0 ? (
          <p className="text-center py-8 text-zinc-500">No recovery actions yet</p>
        ) : (
          <div className="relative pl-8 mt-4">
            <div className="timeline-line" />
            {actions.map((a, i) => {
              const isSuccess = a.recovery_result === 'success';
              return (
              <div key={i} className="relative mb-6 bg-black/40 border border-white/5 rounded-xl p-5 transition-all hover:bg-zinc-900/80">
                <div className={`timeline-dot ${isSuccess ? 'bg-emerald-500 border-emerald-900' : 'bg-zinc-500 border-zinc-900'}`} />
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-3 flex items-center gap-2">
                  <span className="text-zinc-500">Attempt #{a.attempt_number}</span>
                  <span className="text-zinc-600">—</span>
                  <span className="text-white">{a.chosen_action?.replace(/_/g, ' ') || 'Skipped'}</span>
                </div>
                <div className="text-sm leading-relaxed space-y-2 text-zinc-400">
                  <p><span className="font-semibold text-zinc-300">Guardrail:</span> {a.guardrail_check}</p>
                  <p><span className="font-semibold text-zinc-300">API:</span> <span className="font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded text-zinc-300">{a.razorpay_api_called}</span></p>
                  {a.razorpay_short_url && (
                    <p><span className="font-semibold text-zinc-300">Link:</span>{' '}
                      <a href={a.razorpay_short_url} target="_blank" rel="noreferrer" className="text-white underline decoration-white/30 hover:decoration-white transition-colors"><span className="flex items-center gap-1">{a.razorpay_short_url} <ExternalLink className="w-3 h-3" /></span></a>
                    </p>
                  )}
                  <p><span className="font-semibold text-zinc-300">Outcome:</span>{' '}
                    <span className={`font-semibold ${a.simulated_outcome === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.simulated_outcome}
                    </span>
                  </p>
                  <p><span className="font-semibold text-zinc-300">Result:</span>{' '}
                    <span className={`font-bold ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isSuccess ? <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Recovered</span> : <span className="flex items-center gap-1"><X className="w-4 h-4" /> {a.recovery_result}</span>}
                    </span>
                  </p>
                </div>
                <p className="font-mono text-[0.7rem] text-zinc-600 mt-4">{a.created_at}</p>
              </div>
            )
          })}
          </div>
        )}
      </div>

      {/* Raw JSON */}
      {actions.length > 0 && actions[0].razorpay_response && (
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-2xl">
          <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-4">Raw Razorpay Response</h2>
          <div className="bg-black/50 border border-white/5 rounded-xl p-5 max-h-72 overflow-auto scrollbar-thin scrollbar-thumb-white/10">
            <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap">
              {JSON.stringify(actions[0].razorpay_response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
