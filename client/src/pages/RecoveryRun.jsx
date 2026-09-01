import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRecovery } from '../context/RecoveryContext';
import {
  Activity, Bot, Brain, ChevronDown, Clock3, Database, Gauge, GitBranch,
  Menu, Phone, Search, Shield, Zap
} from 'lucide-react';
import {
  ReactFlow, ReactFlowProvider, Handle, Position, Background, Controls, MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const stagesDef = [
  { id: 'detect', label: 'Detect', icon: Search, color: 'blue' },
  { id: 'risk', label: 'Risk Score', icon: Gauge, color: 'amber' },
  { id: 'diagnose', label: 'Diagnose', icon: Brain, color: 'purple' },
  { id: 'guardrails', label: 'Guardrails', icon: Shield, color: 'emerald' },
  { id: 'strategy', label: 'Pick Strategy', icon: GitBranch, color: 'blue' },
  { id: 'execute', label: 'Execute', icon: Zap, color: 'amber' },
  { id: 'simulate', label: 'Simulate', icon: Phone, color: 'purple' },
  { id: 'state', label: 'Update State', icon: Database, color: 'emerald' },
];

function PipelineNode({ data }) {
  const stage = data.stage;
  const status = data.status;
  const Icon = stage.icon;
  return (
    <div className={`recovery-node node-${status}`}>
      <Handle type="target" position={Position.Left} />
      <span className={`node-icon node-icon-${stage.color}`}><Icon /></span>
      <span className="node-copy">
        <strong>{stage.label}</strong>
        <small>{status === 'active' ? 'Processing...' : status === 'done' ? 'Completed' : status === 'error' ? 'Failed' : 'Pending'}</small>
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { recovery: PipelineNode };

function makeNodes(statuses) {
  return stagesDef.map((stage, i) => ({
    id: stage.id, type: 'recovery',
    position: { x: i < 4 ? i * 190 : (i - 4) * 190 + 78, y: i < 4 ? 92 : 238 },
    data: { stage, status: statuses[stage.id] || 'pending' }
  }));
}

function makeEdges(statuses) {
  return [['detect','risk'],['risk','diagnose'],['diagnose','guardrails'],['guardrails','strategy'],['strategy','execute'],['execute','simulate'],['simulate','state']].map(([s,t]) => ({
    id: `${s}-${t}`, source: s, target: t, type: 'smoothstep',
    animated: statuses[s] === 'active' || statuses[t] === 'active',
    style: { stroke: '#52525b', strokeWidth: 1.5 }
  }));
}

const nodeToStage = {
  detectFailures: 'detect', calculateRiskScore: 'risk', diagnose: 'diagnose',
  guardrails: 'guardrails', pickStrategy: 'strategy', executeRecovery: 'execute',
  simulateOutreach: 'simulate', updateState: 'state',
};

export default function RecoveryRun() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [count, setCount] = useState('10');
  const [days, setDays] = useState('7 days');
  const [autoExecute, setAutoExecute] = useState(true);
  const logRef = useRef(null);

  // Use global context instead of local state!
  const { logs, running, done, activeNode, startRecovery, reconnect, checkExistingJob } = useRecovery();

  useEffect(() => {
    reconnect();
    checkExistingJob();
  }, [reconnect, checkExistingJob]);

  // Derive active stage index from context
  const activeStage = useMemo(() => {
    if (done) return stagesDef.length;
    if (activeNode && nodeToStage[activeNode]) {
      return stagesDef.findIndex(s => s.id === nodeToStage[activeNode]);
    }
    return running ? 0 : -1;
  }, [activeNode, done, running]);

  const statuses = useMemo(() =>
    Object.fromEntries(stagesDef.map((s, i) => [s.id, i < activeStage ? 'done' : i === activeStage ? 'active' : 'pending']))
  , [activeStage]);

  const nodes = useMemo(() => makeNodes(statuses), [statuses]);
  const edges = useMemo(() => makeEdges(statuses), [statuses]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [logs]);

  const runAgent = () => {
    startRecovery(parseInt(count, 10));
  };

  return (
    <main className="dashboard-shell recovery-shell">
      <div className="dashboard-glow glow-one" /><div className="dashboard-glow glow-two" />

      <header className="topbar">
        <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button>
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-mark"><Bot /></span><span>Clawback</span><span className="brand-divider" /><span className="brand-subtitle">AI revenue recovery</span>
        </div>
        <nav className={mobileNav ? 'topnav open' : 'topnav'}>
          <a className={location.pathname === '/dashboard' ? 'active' : ''} onClick={() => navigate('/dashboard')} style={{cursor:'pointer'}}>Overview</a>
          <a className={location.pathname === '/transactions' ? 'active' : ''} onClick={() => navigate('/transactions')} style={{cursor:'pointer'}}>Transactions</a>
          <a className={location.pathname === '/recover' ? 'active' : ''} onClick={() => navigate('/recover')} style={{cursor:'pointer'}}>Recovery</a>
        </nav>
        <div className="top-actions">
          <span className="recovery-top-status"><span className="status-dot is-active" /> Agent ready</span>
          <label className="interval">
            <Clock3 />
            <select aria-label="Recovery interval"><option>Every 6h</option><option>Every 12h</option><option>Every 24h</option></select>
            <ChevronDown />
          </label>
        </div>
      </header>

      <div className="page-content recovery-content">
        <section className="recovery-header reveal">
          <div>
            <p className="eyebrow"><span className="live-pip" /> Autonomous recovery</p>
            <h1>Recovery</h1>
            <p>Launch the autonomous AI agent to recover failed payments.</p>
          </div>
          <button className="run-agent" onClick={runAgent} disabled={running}>
            {running ? <><Activity className="spin" /> Running...</> : <><Zap /> Run Recovery Agent</>}
          </button>
        </section>

        <section className="config-panel reveal delay-one">
          <label>Transactions to process
            <input type="number" min="1" max="200" value={count} onChange={(e) => setCount(e.target.value)} list="batch-options" placeholder="Enter count..." className="config-input" />
            <datalist id="batch-options"><option value="5" /><option value="10" /><option value="25" /><option value="50" /><option value="100" /></datalist>
          </label>
          <label className="toggle-label">Auto-execute
            <button className={`switch ${autoExecute ? 'on' : ''}`} aria-label="Toggle auto-execute" onClick={() => setAutoExecute(!autoExecute)}><span /></button>
          </label>
          <label>Days back
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option>3 days</option><option>7 days</option><option>14 days</option><option>30 days</option>
            </select>
          </label>
        </section>

        <section className="pipeline-card reveal delay-two">
          <div className="pipeline-title">
            <div>
              <p className="section-kicker">LangGraph orchestration</p>
              <h2>Agent Pipeline</h2>
              <span>Real-time execution flow</span>
            </div>
            <span className="pipeline-state">
              <i className={running ? 'running' : ''} /> {running ? 'Processing' : done ? 'Complete' : 'Ready'}
            </span>
          </div>
          <div className="flow-wrap">
            <ReactFlowProvider>
              <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} nodesDraggable={false} nodesConnectable={false} zoomOnScroll={false} panOnScroll={false} preventScrolling={false} zoomOnPinch={false} zoomOnDoubleClick={false} proOptions={{ hideAttribution: true }}>
                <Background color="#ffffff14" gap={22} size={1} />
                <Controls showInteractive={false} />
                <MiniMap nodeColor={(node) => node.data?.status === 'active' ? '#34d399' : '#3f3f46'} maskColor="#09090b88" />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </section>

        <section className="logs-card reveal delay-three">
          <div className="logs-heading">
            <div><p className="section-kicker">Execution trace</p><h2>Agent Logs</h2></div>
            <span className="live-badge"><i /> Live</span>
          </div>
          <div className="log-feed" ref={logRef}>
            {logs.length ? logs.map((log, i) => (
              <div className="log-row" key={`${log.time}-${i}`}>
                <time>[{log.time || new Date().toLocaleTimeString('en-US',{hour12:false})}]</time>
                <span className={`log-${log.type === 'highlight' ? 'success' : log.type}`}>{log.msg || log.message}</span>
              </div>
            )) : (
              <div className="log-empty"><Activity /><span>Waiting for agent to start...</span></div>
            )}
          </div>
        </section>

        <footer>
          <span>Clawback <small>AI-powered revenue recovery</small></span>
          <span>Powered by <b>Razorpay</b> <span className="footer-dot" /> All systems operational</span>
        </footer>
      </div>
    </main>
  );
}
