import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Zap, Play } from 'lucide-react';


export default function RecoveryRun() {
  const [params, setParams] = useState({ limit: 10, offset: 0, days_back: 7, auto_execute: true });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  const handleRun = async () => {
    setLoading(true);
    setStatus({ step: 'Initializing AI state machine...', progress: 10 });
    
    try {
      setTimeout(() => setStatus({ step: 'Fetching failed transactions from Razorpay...', progress: 30 }), 1000);
      setTimeout(() => setStatus({ step: 'Analyzing failure reasons with Gemini...', progress: 60 }), 2500);
      setTimeout(() => setStatus({ step: 'Executing recovery strategies...', progress: 90 }), 4500);
      
      const res = await api.runRecovery(params);
      
      setStatus({ step: 'Complete!', progress: 100 });
      setTimeout(() => navigate('/transactions'), 1000);
    } catch (err) {
      console.error(err);
      setStatus({ step: 'Error: ' + err.message, progress: 0, error: true });
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-12 max-w-[1440px] mx-auto min-h-[80vh] flex items-center justify-center relative z-10">
      <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-8 md:p-10 border border-white/5 shadow-2xl w-full max-w-2xl relative overflow-hidden animate-in">
        
        <div className="absolute -right-10 -top-10 text-white/5 pointer-events-none select-none">
          <Zap className="w-64 h-64" />
        </div>
        
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 border border-white/10">
            <Zap className="w-6 h-6 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2 text-white">Trigger Recovery Run</h1>
          <p className="text-zinc-400 text-sm mb-8">Launch the autonomous AI agent to scan and recover failed payments.</p>

          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Max Transactions</label>
                <input type="number" 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                  value={params.limit} onChange={e => setParams({...params, limit: parseInt(e.target.value)})} 
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Days Back</label>
                <input type="number" 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                  value={params.days_back} onChange={e => setParams({...params, days_back: parseInt(e.target.value)})} 
                  disabled={loading}
                />
              </div>
            </div>
            
            <label className="flex items-center gap-3 p-4 bg-black/30 border border-white/5 rounded-xl cursor-pointer hover:bg-black/50 transition-colors group">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" className="sr-only" 
                  checked={params.auto_execute} onChange={e => setParams({...params, auto_execute: e.target.checked})}
                  disabled={loading}
                />
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${params.auto_execute ? 'bg-white border-white' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
                  {params.auto_execute && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
              <div className="select-none">
                <div className="text-sm font-semibold text-white">Auto-Execute Strategies</div>
                <div className="text-xs text-zinc-500">If unchecked, generates diagnosis only without sending links.</div>
              </div>
            </label>
          </div>

          {loading || status ? (
            <div className="bg-black/50 rounded-xl p-5 border border-white/5">
              <div className="flex justify-between items-center mb-3">
                <span className={`text-sm font-semibold ${status?.error ? 'text-red-400' : 'text-white'}`}>
                  {status?.step || 'Starting...'}
                </span>
                <span className="text-xs font-mono text-zinc-500">{status?.progress || 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div className="progress-fill" style={{ width: `${status?.progress || 0}%`, backgroundColor: status?.error ? '#ef4444' : '#ffffff' }} />
              </div>
            </div>
          ) : (
            <button 
              onClick={handleRun}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 py-4 rounded-xl text-xs font-bold tracking-[0.15em] uppercase transition-all shadow-xl flex items-center justify-center gap-2 group"
            >
              <Play className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" /> 
              Launch Agent
            </button>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      </div>
    </div>
  );
}
