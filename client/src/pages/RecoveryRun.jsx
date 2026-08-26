import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { api } from '../utils/api';
import { Zap, Play, CheckCircle2, Loader2, Circle, ArrowRight } from 'lucide-react';


const CustomNode = ({ data }) => {
  const isActive = data.status === 'active';
  const isDone = data.status === 'done';
  const isError = data.status === 'error';
  
  return (
    <div className={`px-4 py-3 rounded-xl border backdrop-blur-md min-w-[150px] transition-all duration-300 ${
      isActive ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
      isDone ? 'bg-white/5 border-white/20' :
      isError ? 'bg-red-500/20 border-red-500/50' :
      'bg-zinc-900/50 border-white/5 opacity-50'
    }`}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center ${
          isActive ? 'bg-emerald-500/20 text-emerald-400' : 
          isDone ? 'bg-white/10 text-white' : 
          isError ? 'bg-red-500/20 text-red-400' :
          'bg-black/50 text-zinc-500'
        }`}>
           {data.icon}
        </div>
        <div>
          <div className={`text-xs font-bold ${isActive ? 'text-emerald-400' : isDone ? 'text-white' : isError ? 'text-red-400' : 'text-zinc-500'}`}>
            {data.label}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{isActive ? 'Processing...' : isDone ? 'Completed' : isError ? 'Failed' : 'Pending'}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

const initialNodes = [
  { id: 'detect', type: 'custom', position: { x: 250, y: 0 }, data: { label: 'Detect Failure', status: 'pending', icon: '🔍' } },
  { id: 'diagnose', type: 'custom', position: { x: 250, y: 100 }, data: { label: 'Diagnose (LLM)', status: 'pending', icon: '🧠' } },
  { id: 'checkGuardrails', type: 'custom', position: { x: 250, y: 200 }, data: { label: 'Guardrails', status: 'pending', icon: '🛡️' } },
  { id: 'pickStrategy', type: 'custom', position: { x: 100, y: 320 }, data: { label: 'Decide Strategy', status: 'pending', icon: '⚖️' } },
  { id: 'execute', type: 'custom', position: { x: 100, y: 420 }, data: { label: 'Execute', status: 'pending', icon: '⚡' } },
  { id: 'simulateResponse', type: 'custom', position: { x: 100, y: 520 }, data: { label: 'Simulate', status: 'pending', icon: '📞' } },
  { id: 'updateState', type: 'custom', position: { x: 250, y: 640 }, data: { label: 'Update DB', status: 'pending', icon: '💾' } },
];

const initialEdges = [
  { id: 'e1', source: 'detect', target: 'diagnose', style: { stroke: '#52525b' } },
  { id: 'e2', source: 'diagnose', target: 'checkGuardrails', style: { stroke: '#52525b' } },
  { id: 'e3', source: 'checkGuardrails', target: 'pickStrategy', type: 'step', style: { stroke: '#52525b' }, label: 'Allowed', labelBgStyle: { fill: '#18181b' }, labelStyle: { fill: '#10b981', fontSize: 10 } },
  { id: 'e4', source: 'checkGuardrails', target: 'updateState', type: 'step', style: { stroke: '#52525b' }, label: 'Blocked', labelBgStyle: { fill: '#18181b' }, labelStyle: { fill: '#ef4444', fontSize: 10 } },
  { id: 'e5', source: 'pickStrategy', target: 'execute', style: { stroke: '#52525b' } },
  { id: 'e6', source: 'execute', target: 'simulateResponse', style: { stroke: '#52525b' } },
  { id: 'e7', source: 'simulateResponse', target: 'updateState', type: 'step', style: { stroke: '#52525b' } },
];

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
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [currentNode, setCurrentNode] = useState(null);
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

  const handleRun = () => {
    setRunning(true);
    setLogs([]);
    setDone(false);
    setCurrentStep(0);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setVisitedNodes(new Set());
    setCurrentNode(null);
    
    addLog('Initializing AI state machine...', 'info');
    addLog(`Connecting via Server-Sent Events (SSE) stream...`, 'info');

    const es = new EventSource(`http://localhost:3001/api/recovery/stream?limit=${params.limit}`);
    
    es.addEventListener('info', (e) => {
      const data = JSON.parse(e.data);
      addLog(data.message, 'info');
      if (data.message.includes('Processing transaction')) setCurrentStep(1);
    });

    es.addEventListener('log', (e) => {
      const data = JSON.parse(e.data);
      setCurrentStep(2);
      addLog(`[${data.transactionId}] ${data.detail}`, 'highlight');
    });

    es.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setCurrentStep(3);
      addLog(`Recovery complete! Processed ${data.totalProcessed || 0} transactions`, 'success');
      setDone(true);
      es.close();
      setTimeout(() => navigate('/transactions'), 2500);
    });

    es.addEventListener('error', (e) => {
      const data = JSON.parse(e.data);
      addLog(`Error: ${data.error}`, 'error');
      es.close();
      setRunning(false);
    });
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
          {/* LangGraph Live Visualizer */}
          <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden h-[400px] relative">
            <div className="absolute top-4 left-4 z-10">
              <h3 className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                Live Agent Graph
              </h3>
            </div>
            <ReactFlow 
              nodes={nodes} 
              edges={edges} 
              nodeTypes={nodeTypes}
              fitView 
              minZoom={0.5}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
              className="bg-black/20"
            >
              <Background color="#52525b" gap={20} size={1} />
            </ReactFlow>
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
