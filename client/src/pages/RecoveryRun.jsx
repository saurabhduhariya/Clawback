import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import { Zap, Play, CheckCircle2, Loader2, Circle, ArrowRight } from 'lucide-react';

const STEPS = [
  { label: 'Fetch Transactions', desc: 'Scanning Razorpay for failed payments' },
  { label: 'AI Diagnosis', desc: 'Analyzing failure reasons with Gemini' },
  { label: 'Execute Recovery', desc: 'Creating payment links & retry orders' },
  { label: 'Complete', desc: 'Recovery run finished' },
];

export default function RecoveryRun() {
  const [params, setParams] = useState({ limit: 10, offset: 0, days_back: 7, auto_execute: true });
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [logs, setLogs] = useState([]);
  const [done, setDone] = useState(false);
  const logRef = useRef(null);
  const navigate = useNavigate();

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleRun = async () => {
    setRunning(true);
    setLogs([]);
    setDone(false);

    setCurrentStep(0);
    addLog('Initializing AI state machine...', 'info');
    addLog(`Parameters: limit=${params.limit}, days_back=${params.days_back}`, 'info');

    await new Promise(r => setTimeout(r, 800));
    addLog('Connecting to Razorpay API...', 'info');

    setCurrentStep(1);
    await new Promise(r => setTimeout(r, 600));
    addLog('Fetching failed transactions...', 'highlight');

    try {
      setCurrentStep(2);
      addLog('Running Gemini diagnosis on failures...', 'highlight');
      await new Promise(r => setTimeout(r, 500));
      addLog('Executing recovery strategies...', 'highlight');

      const res = await api.runRecovery(params);

      setCurrentStep(3);
      addLog(`Recovery complete!`, 'success');
      addLog(`Processed transactions successfully`, 'success');
      setDone(true);

      setTimeout(() => navigate('/transactions'), 2500);
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
      setRunning(false);
    }
  };

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <motion.div
      className="px-6 py-8 max-w-[1440px] mx-auto relative z-10"
      variants={stagger} initial="hidden" animate="visible"
    >
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl font-bold mb-1 text-white">Recovery</h1>
        <p className="text-zinc-500 text-sm">Launch the autonomous AI agent to recover failed payments</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Config Panel */}
        <motion.div variants={fadeUp} className="lg:col-span-2 bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Configuration</h2>
              <p className="text-xs text-zinc-500">Set recovery parameters</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest mb-2">Max Transactions</label>
              <input type="number"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                value={params.limit} onChange={e => setParams({...params, limit: parseInt(e.target.value) || 0})}
                disabled={running}
              />
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest mb-2">Days Back</label>
              <input type="number"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                value={params.days_back} onChange={e => setParams({...params, days_back: parseInt(e.target.value) || 0})}
                disabled={running}
              />
            </div>
            <label className="flex items-center gap-3 p-3 bg-black/30 border border-white/5 rounded-xl cursor-pointer hover:bg-black/50 transition-colors group">
              <div className="relative">
                <input type="checkbox" className="sr-only"
                  checked={params.auto_execute} onChange={e => setParams({...params, auto_execute: e.target.checked})}
                  disabled={running}
                />
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${params.auto_execute ? 'bg-white border-white' : 'bg-transparent border-white/20'}`}>
                  {params.auto_execute && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Auto-Execute</div>
                <div className="text-[10px] text-zinc-500">Send recovery links automatically</div>
              </div>
            </label>
          </div>

          {!running && (
            <button onClick={handleRun}
              className="w-full bg-white hover:bg-zinc-200 text-black py-3 rounded-xl text-xs font-bold tracking-[0.1em] uppercase transition-all flex items-center justify-center gap-2 group"
            >
              <Play className="w-4 h-4" /> Launch Agent
            </button>
          )}
        </motion.div>

        {/* Right: Live Output */}
        <motion.div variants={fadeUp} className="lg:col-span-3 space-y-4">
          {/* Step indicators */}
          <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
            <h3 className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest mb-4">Pipeline Status</h3>
            <div className="flex items-center gap-2">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 flex-shrink-0 ${
                    i < currentStep ? 'bg-emerald-500/20 border-emerald-500/30' :
                    i === currentStep ? 'bg-white/10 border-white/20' :
                    'bg-zinc-900 border-white/5'
                  }`}>
                    {i < currentStep ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : i === currentStep ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Circle className="w-3 h-3 text-zinc-700" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px transition-colors duration-500 ${i < currentStep ? 'bg-emerald-500/30' : 'bg-white/5'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between">
              {STEPS.map((step, i) => (
                <div key={i} className="flex-1 pr-2">
                  <div className={`text-[10px] font-semibold transition-colors ${
                    i <= currentStep ? 'text-zinc-300' : 'text-zinc-700'
                  }`}>{step.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal Log */}
          {(running || logs.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-[10px] font-mono text-zinc-600 ml-2">recovery-agent.log</span>
              </div>
              <div ref={logRef} className="terminal-log p-4">
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex gap-3"
                    >
                      <span className="text-zinc-700 flex-shrink-0">{log.time}</span>
                      <span className={`log-${log.type}`}>{log.msg}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Success state */}
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center gap-4"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-400">Recovery Complete</p>
                  <p className="text-xs text-emerald-400/60">Redirecting to transactions...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
