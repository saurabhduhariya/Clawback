import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import { ArrowLeft, Check, X, ExternalLink, ChevronDown, ChevronUp, Copy, CheckCircle2 } from 'lucide-react';

const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function AuditSkeleton() {
  return (
    <div className="px-6 py-8 max-w-[1440px] mx-auto">
      <div className="skeleton h-8 w-20 mb-6 rounded-lg" />
      <div className="skeleton h-36 rounded-2xl mb-6" />
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="skeleton h-56 rounded-2xl" />
        <div className="skeleton h-56 rounded-2xl" />
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-white/10 transition-colors" title="Copy">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />}
    </button>
  );
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function AuditTrail() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jsonOpen, setJsonOpen] = useState(false);

  useEffect(() => {
    api.getAuditTrail(transactionId).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [transactionId]);

  if (loading) return <AuditSkeleton />;
  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
      <X className="w-12 h-12 mb-4 opacity-30" />
      <p className="text-lg font-medium">Transaction not found</p>
    </div>
  );

  const { transaction: t, actions } = data;
  const diag = actions.length > 0 ? actions[0].diagnosis : null;

  return (
    <motion.div
      className="px-6 py-8 max-w-[1440px] mx-auto relative z-10"
      variants={stagger} initial="hidden" animate="visible"
    >
      <motion.button variants={fadeUp} onClick={() => navigate('/transactions')}
        className="mb-6 px-3 py-1.5 rounded-lg border border-white/5 bg-black/40 text-zinc-500 text-xs font-semibold cursor-pointer hover:text-white hover:bg-black/60 transition-all inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </motion.button>

      {/* Header */}
      <motion.div variants={fadeUp}
        className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/5 flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 relative overflow-hidden group"
      >
        <div className="absolute -right-4 -top-8 text-[10rem] font-black text-white/[0.03] pointer-events-none select-none leading-none">TX</div>
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">{t.customer_name}</h2>
            <CopyButton text={t.id} />
          </div>
          <p className="font-mono text-[11px] text-zinc-600 mb-3">{t.id}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.6rem] font-bold uppercase tracking-wider ${
              t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/60 text-zinc-400'
            }`}>{t.status}</span>
            <span className="font-mono text-[11px] text-zinc-500 bg-black/40 px-2 py-0.5 rounded">{t.type} · {t.failure_reason}</span>
          </div>
        </div>
        <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-white relative z-10">{fmt(t.amount)}</div>
      </motion.div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
          <h2 className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest mb-5">Transaction Details</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {[
              ['Email', t.customer_email],
              ['Phone', t.customer_phone],
              ['Created', new Date(t.created_at).toLocaleString()],
              ['Attempts', `${t.attempt_count} / ${t.max_attempts}`],
              ['Recovered', <span className="text-emerald-400 font-semibold">{fmt(t.recovered_amount)}</span>],
              ['Source', <span className="capitalize">{t.failure_source}</span>],
            ].map(([label, value], i) => (
              <div key={i}>
                <span className="text-zinc-600 text-[10px] uppercase tracking-wider font-bold block mb-1">{label}</span>
                <div className="text-white text-sm">{value}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {diag && (
          <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
            <h2 className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest mb-5">AI Diagnosis</h2>
            <div className="space-y-4">
              <div>
                <span className="text-zinc-600 text-[10px] uppercase tracking-wider font-bold block mb-1">Root Cause</span>
                <p className="text-white text-sm">{diag.root_cause}</p>
              </div>
              <div>
                <span className="text-zinc-600 text-[10px] uppercase tracking-wider font-bold block mb-1">Retryable</span>
                <div className={`flex items-center gap-1.5 font-bold text-sm ${diag.is_retryable ? 'text-emerald-400' : 'text-red-400'}`}>
                  {diag.is_retryable ? <><Check className="w-4 h-4" /> Yes</> : <><X className="w-4 h-4" /> No</>}
                </div>
              </div>
              <div>
                <span className="text-zinc-600 text-[10px] uppercase tracking-wider font-bold block mb-1">Reasoning</span>
                <p className="text-zinc-400 text-sm leading-relaxed">{diag.reasoning}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Timeline */}
      <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5 mb-4">
        <h2 className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest mb-5">Recovery Timeline</h2>
        {actions.length === 0 ? (
          <p className="text-center py-8 text-zinc-600 text-sm">No recovery actions yet</p>
        ) : (
          <div className="relative pl-8 mt-2">
            <div className="timeline-line" />
            {actions.map((a, i) => {
              const isSuccess = a.recovery_result === 'success';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  className="relative mb-5 bg-black/30 border border-white/5 rounded-xl p-5 transition-all hover:bg-zinc-900/60 hover:border-white/10"
                >
                  <div className={`timeline-dot ${isSuccess ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Attempt #{a.attempt_number}</span>
                    <span className="text-zinc-700">—</span>
                    <span className="text-xs font-semibold text-white capitalize">{a.chosen_action?.replace(/_/g, ' ') || 'Skipped'}</span>
                  </div>
                  <div className="text-sm space-y-1.5 text-zinc-400">
                    <p><span className="text-zinc-500 font-medium">Guardrail:</span> {a.guardrail_check}</p>
                    <p><span className="text-zinc-500 font-medium">API:</span> <code className="text-[11px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-300">{a.razorpay_api_called}</code></p>
                    {a.razorpay_short_url && (
                      <p><span className="text-zinc-500 font-medium">Link:</span>{' '}
                        <a href={a.razorpay_short_url} target="_blank" rel="noreferrer" className="text-white underline decoration-white/20 hover:decoration-white/60 transition-colors inline-flex items-center gap-1">
                          {a.razorpay_short_url} <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    )}
                    <div className="flex items-center gap-4 pt-1">
                      <span className={`text-sm font-semibold ${a.simulated_outcome === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                        Outcome: {a.simulated_outcome}
                      </span>
                      <span className={`text-sm font-bold inline-flex items-center gap-1 ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isSuccess ? <><Check className="w-3.5 h-3.5" /> Recovered</> : <><X className="w-3.5 h-3.5" /> {a.recovery_result}</>}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-zinc-700 mt-3">{a.created_at}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Expandable Raw JSON */}
      {actions.length > 0 && actions[0].razorpay_response && (
        <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
          <button
            onClick={() => setJsonOpen(!jsonOpen)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">Raw Razorpay Response</span>
            {jsonOpen ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
          </button>
          <AnimatePresence>
            {jsonOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4">
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4 max-h-72 overflow-auto relative group">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={JSON.stringify(actions[0].razorpay_response, null, 2)} />
                    </div>
                    <pre className="font-mono text-[11px] text-zinc-500 whitespace-pre-wrap">
                      {JSON.stringify(actions[0].razorpay_response, null, 2)}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
