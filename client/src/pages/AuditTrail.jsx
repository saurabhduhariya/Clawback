import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import { ArrowLeft, Check, X, ExternalLink, ChevronDown, ChevronUp, Copy, CheckCircle2, Bot } from 'lucide-react';

const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title="Copy">
      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400 hover:text-white" />}
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

  if (loading) return (
    <main className="dashboard-shell transactions-shell">
      <div className="dashboard-glow glow-one" />
      <div className="flex items-center justify-center min-h-[60vh]"><div className="transaction-skeleton">Loading...</div></div>
    </main>
  );

  if (!data) return (
    <main className="dashboard-shell transactions-shell">
      <div className="dashboard-glow glow-one" />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <X className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">Transaction not found</p>
      </div>
    </main>
  );

  const { transaction: t, actions } = data;
  const diag = actions.length > 0 ? actions[0].diagnosis : null;

  return (
    <main className="dashboard-shell transactions-shell">
      <div className="dashboard-glow glow-one" />

      {/* Standardized Topbar */}
      <header className="topbar">
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-mark"><Bot /></span>
          <span>Clawback</span>
          <span className="brand-divider" />
          <span className="brand-subtitle">AI revenue recovery</span>
        </div>
        
        <nav className="topnav hidden md:flex">
          <a onClick={() => navigate('/dashboard')} style={{cursor:'pointer'}}>Overview</a>
          <a className="active" onClick={() => navigate('/transactions')} style={{cursor:'pointer'}}>Transactions</a>
          <a onClick={() => navigate('/recover')} style={{cursor:'pointer'}}>Recovery</a>
        </nav>
        
        <div className="top-actions">
          <button className="export-button" onClick={() => navigate('/transactions')}>
            <ArrowLeft style={{width: 14}} /> Back to List
          </button>
        </div>
      </header>

      <div className="page-content transactions-content">
        <section className="transactions-header reveal">
          <div>
            <p className="eyebrow"><span className="live-pip" /> AUDIT TRAIL</p>
            <div className="flex items-center gap-3">
              <h1 style={{margin:0}}>{t.customer_name}</h1>
              <span className={`status-badge status-${(t.status || 'failed').toLowerCase()}`}><i/>{t.status || 'Failed'}</span>
            </div>
            <p className="font-mono text-[12px] mt-2 opacity-70 flex items-center gap-2">
              {t.id} <CopyButton text={t.id} />
              <span className="ml-3 bg-black/40 px-2 py-0.5 rounded border border-white/10">{t.type} · {t.failure_reason}</span>
            </p>
          </div>
          <div style={{textAlign: 'right'}}>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2">{fmt(t.amount)}</h2>
          </div>
        </section>

        <motion.div variants={stagger} initial="hidden" animate="visible" className="w-full">
          {/* Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <motion.div variants={fadeUp} className="pipeline-card">
              <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Transaction Details</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-6 text-sm">
                {[
                  ['Email', t.customer_email],
                  ['Phone', t.customer_phone],
                  ['Created', new Date(t.created_at).toLocaleString()],
                  ['Attempts', `${t.attempt_count} / ${t.max_attempts}`],
                  ['Recovered', <span className="text-emerald-400 font-semibold">{fmt(t.recovered_amount || 0)}</span>],
                  ['Source', <span className="capitalize">{t.failure_source || 'Bank'}</span>],
                ].map(([label, value], i) => (
                  <div key={i}>
                    <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold block mb-1">{label}</span>
                    <div className="text-white text-[13px]">{value || '-'}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {diag ? (
              <motion.div variants={fadeUp} className="pipeline-card">
                <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Bot className="w-4 h-4 text-emerald-400" /> AI Diagnosis</h2>
                <div className="space-y-5">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Root Cause</span>
                    <p className="text-white text-[13px]">{diag.root_cause}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Retryable</span>
                    <div className={`flex items-center gap-1.5 font-bold text-[13px] ${diag.is_retryable ? 'text-emerald-400' : 'text-red-400'}`}>
                      {diag.is_retryable ? <><Check className="w-4 h-4" /> Yes</> : <><X className="w-4 h-4" /> No</>}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Reasoning</span>
                    <p className="text-zinc-400 text-[12px] leading-relaxed">{diag.reasoning}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} className="pipeline-card flex items-center justify-center">
                 <p className="text-zinc-500 text-sm">No AI diagnosis available</p>
              </motion.div>
            )}
          </div>

          {/* Timeline */}
          <motion.div variants={fadeUp} className="pipeline-card mb-4">
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Recovery Timeline</h2>
            {actions.length === 0 ? (
              <p className="text-center py-8 text-zinc-500 text-sm">No recovery actions yet</p>
            ) : (
              <div className="relative pl-6 mt-2 ml-2 border-l border-white/10">
                {actions.map((a, i) => {
                  const isSuccess = a.recovery_result === 'success';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      className="relative mb-6 bg-[#00000040] border border-white/5 rounded-xl p-5 transition-all hover:border-[#34d39940] hover:bg-[#34d39908]"
                    >
                      <div className={`absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full border-2 border-[#111113] ${isSuccess ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`} />
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-white/5 px-2 py-0.5 rounded">Attempt #{a.attempt_number}</span>
                        <span className="text-[14px] font-semibold text-white capitalize flex items-center gap-2">
                           {a.chosen_action?.replace(/_/g, ' ') || 'Skipped'}
                        </span>
                      </div>
                      <div className="text-[13px] space-y-2 text-zinc-400 mt-4">
                        <p><span className="text-zinc-500 font-medium inline-block w-20">Guardrail:</span> <span className="text-zinc-300">{a.guardrail_check}</span></p>
                        <p><span className="text-zinc-500 font-medium inline-block w-20">API:</span> <code className="text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">{a.razorpay_api_called}</code></p>
                        {a.razorpay_short_url && (
                          <p><span className="text-zinc-500 font-medium inline-block w-20">Link:</span>{' '}
                            <a href={a.razorpay_short_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-400/30 hover:decoration-emerald-400 transition-colors inline-flex items-center gap-1">
                              {a.razorpay_short_url} <ExternalLink className="w-3 h-3" />
                            </a>
                          </p>
                        )}
                        <div className="flex items-center gap-5 pt-3 mt-3 border-t border-white/5">
                          <span className={`font-semibold ${a.simulated_outcome === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                            Outcome: {a.simulated_outcome}
                          </span>
                          <span className={`font-bold inline-flex items-center gap-1 ${isSuccess ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {isSuccess ? <><Check className="w-4 h-4" /> Recovered</> : <><X className="w-4 h-4" /> {a.recovery_result}</>}
                          </span>
                        </div>
                      </div>
                      <p className="font-mono text-[10px] text-zinc-600 mt-4">{a.created_at}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Expandable Raw JSON */}
          {actions.length > 0 && actions[0].razorpay_response && (
            <motion.div variants={fadeUp} className="pipeline-card overflow-hidden mb-8">
              <button
                onClick={() => setJsonOpen(!jsonOpen)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Raw Razorpay Response</span>
                {jsonOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
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
                    <div className="px-6 pb-6 pt-2">
                      <div className="bg-[#00000080] border border-white/5 rounded-xl p-5 max-h-96 overflow-auto relative group">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton text={JSON.stringify(actions[0].razorpay_response, null, 2)} />
                        </div>
                        <pre className="font-mono text-[12px] text-emerald-500/80 whitespace-pre-wrap">
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
        
        <footer style={{ marginTop: '20px' }}>
          <span>Clawback <small>AI-powered revenue recovery</small></span>
          
        </footer>
      </div>
    </main>
  );
}
