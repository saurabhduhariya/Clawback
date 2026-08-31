import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactFlow, Background, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useRecovery } from '../context/RecoveryContext';
import { useToast } from '../context/ToastContext';
import { Zap, Play, CheckCircle2, Circle, Search, Brain, Shield, GitBranch, Phone, Database } from 'lucide-react';

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } } };

const CustomNode = ({ data }) => {
  const isActive = data.status === 'active';
  const isDone = data.status === 'done';
  const isError = data.status === 'error';
  
  return (
    <div className={`px-4 py-3 rounded-xl border backdrop-blur-md min-w-[150px] transition-all duration-300 ${
      isActive ? 'bg-emerald-500/30 border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.6)] scale-110 z-50' :
      isDone ? 'bg-white/5 border-white/20' :
      isError ? 'bg-red-500/20 border-red-500/50' :
      'bg-zinc-900/50 border-white/5 opacity-50'
    }`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-emerald-500/50 border-0" />
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center ${
          isActive ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 
          isDone ? 'bg-white/10 text-white' : 
          isError ? 'bg-red-500/20 text-red-400' :
          'bg-black/50 text-zinc-500'
        }`}>
          {(() => {
            const props = { className: "w-4 h-4" };
            switch(data.icon) {
              case 'search': return <Search {...props} />;
              case 'brain': return <Brain {...props} />;
              case 'shield': return <Shield {...props} />;
              case 'branch': return <GitBranch {...props} />;
              case 'zap': return <Zap {...props} />;
              case 'phone': return <Phone {...props} />;
              case 'database': return <Database {...props} />;
              default: return <Circle {...props} />;
            }
          })()}
        </div>
        <div>
          <div className={`text-xs font-bold ${isActive ? 'text-white' : isDone ? 'text-white' : isError ? 'text-red-400' : 'text-zinc-500'}`}>
            {data.label}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{isActive ? 'Processing...' : isDone ? 'Completed' : isError ? 'Failed' : 'Pending'}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-emerald-500/50 border-0" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

const initialNodes = [
  { id: 'detect', type: 'custom', position: { x: 0, y: 100 }, data: { label: 'Detect Failure', status: 'pending', icon: 'search' } },
  { id: 'diagnose', type: 'custom', position: { x: 220, y: 100 }, data: { label: 'Diagnose (LLM)', status: 'pending', icon: 'brain' } },
  { id: 'checkGuardrails', type: 'custom', position: { x: 440, y: 100 }, data: { label: 'Guardrails', status: 'pending', icon: 'shield' } },
  { id: 'pickStrategy', type: 'custom', position: { x: 680, y: 0 }, data: { label: 'Decide Strategy', status: 'pending', icon: 'branch' } },
  { id: 'execute', type: 'custom', position: { x: 900, y: 0 }, data: { label: 'Execute', status: 'pending', icon: 'zap' } },
  { id: 'simulateResponse', type: 'custom', position: { x: 1120, y: 0 }, data: { label: 'Simulate', status: 'pending', icon: 'phone' } },
  { id: 'updateState', type: 'custom', position: { x: 1340, y: 100 }, data: { label: 'Update DB', status: 'pending', icon: 'database' } },
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

export default function RecoveryRun() {
  const [params, setParams] = useState({ limit: 10, offset: 0, days_back: 7, auto_execute: true });
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  
  const { runId, logs, running, done, activeNode, startRecovery, reconnect, checkExistingJob } = useRecovery();
  const logRef = useRef(null);
  const navigate = useNavigate();

  // On mount, check if there's an existing job to reconnect to
  useEffect(() => {
    checkExistingJob();
  }, [checkExistingJob]);
  
  useEffect(() => {
    reconnect();
  }, [reconnect]);

  // Update nodes based on activeNode from Context
  useEffect(() => {
    if (!activeNode && !running && !done) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      return;
    }

    const nodeOrder = ['detect', 'diagnose', 'checkGuardrails', 'pickStrategy', 'execute', 'simulateResponse', 'updateState'];
    const activeIndex = nodeOrder.indexOf(activeNode);
    
    setNodes(nds => nds.map(node => {
      const idx = nodeOrder.indexOf(node.id);
      let status = 'pending';
      if (idx < activeIndex || done) status = 'done';
      else if (idx === activeIndex && running) status = 'active';
      
      return { ...node, data: { ...node.data, status } };
    }));

    if (activeNode) {
      setEdges(eds => eds.map(e => ({
        ...e,
        animated: e.source === activeNode || e.target === activeNode,
        style: { ...e.style, stroke: (e.source === activeNode || e.target === activeNode) ? '#10b981' : '#52525b' }
      })));
    } else if (done) {
      setEdges(eds => eds.map(e => ({ ...e, animated: false, style: { ...e.style, stroke: '#52525b' } })));
    }

  }, [activeNode, running, done]);

  // Auto scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRun = () => {
    if (running) return;
    startRecovery(params.limit);
  };
  


  return (
    <motion.div
      className="px-6 py-8 max-w-[1440px] mx-auto relative z-10"
      variants={stagger} initial="hidden" animate="visible"
    >
      <motion.div variants={fadeUp} className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-white">Recovery</h1>
          <p className="text-zinc-500 text-sm">Launch the autonomous AI agent to recover failed payments</p>
        </div>
        {runId && (
          <div className="bg-zinc-900/80 border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-xs text-zinc-500">Run ID:</span>
            <span className="text-sm font-mono text-emerald-400">#{runId}</span>
          </div>
        )}
      </motion.div>

      <div className="flex flex-col gap-6">
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
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors disabled:opacity-50"
                  value={params.limit} onChange={e => setParams({...params, limit: parseInt(e.target.value) || 0})}
                  disabled={running}
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest mb-2">Days Back</label>
                <input type="number"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors disabled:opacity-50"
                  value={params.days_back} onChange={e => setParams({...params, days_back: parseInt(e.target.value) || 0})}
                  disabled={running}
                />
              </div>
              <label className={`flex items-center gap-3 p-3 bg-black/30 border border-white/5 rounded-xl transition-colors group ${running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-black/50'}`}>
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

            {!running && !done && (
              <button onClick={handleRun}
                className="w-full bg-white hover:bg-zinc-200 text-black py-3 rounded-xl text-xs font-bold tracking-[0.1em] uppercase transition-all flex items-center justify-center gap-2 group"
              >
                <Play className="w-4 h-4" /> Launch Agent
              </button>
            )}
            {running && (
              <div className="w-full bg-emerald-500/20 text-emerald-400 py-3 rounded-xl text-xs font-bold tracking-[0.1em] uppercase flex items-center justify-center gap-2 border border-emerald-500/50 cursor-not-allowed">
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> Running
              </div>
            )}
          </motion.div>

          {/* Right: Live Output (Logs) */}
          <motion.div variants={fadeUp} className="lg:col-span-3 space-y-4 flex flex-col h-[400px]">
            {/* Terminal Log */}
            <div className="flex-1 overflow-hidden flex flex-col bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-white/5">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600 ml-2">recovery-agent.log</span>
                </div>
                {running && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Live</span>
                  </div>
                )}
              </div>
              <div ref={logRef} className="terminal-log p-4 flex-1 overflow-y-auto font-mono text-sm">
                {!running && logs.length === 0 && !done && (
                  <div className="h-full flex items-center justify-center text-zinc-600">
                    No logs yet. Launch the agent to start.
                  </div>
                )}
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex gap-3 mb-1"
                    >
                      <span className="text-zinc-700 flex-shrink-0">[{log.time}]</span>
                      <span className={`log-${log.type} ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'highlight' ? 'text-blue-400 font-semibold' : 'text-zinc-400'}`}>
                        {log.msg}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Success state */}
            <AnimatePresence>
              {done && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center gap-4 shrink-0"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Recovery Complete</p>
                    <p className="text-xs text-emerald-400/60">Redirecting to transactions in 3s...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Bottom Row: LangGraph Live Visualizer */}
        <motion.div variants={fadeUp} className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden h-[400px] relative">
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
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
            className="bg-black/20"
          >
            <Background color="#52525b" gap={20} size={1} />
          </ReactFlow>
        </motion.div>
      </div>
    </motion.div>
  );
}
