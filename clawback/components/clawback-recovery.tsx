'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Bot, Brain, ChevronDown, Clock3, Database, Gauge, GitBranch, Menu, Phone, Search, Shield, Zap } from 'lucide-react'
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

type StageStatus = 'pending' | 'active' | 'done' | 'error'
type Stage = { id: string; label: string; icon: typeof Search; color: string }
const stages: Stage[] = [
  { id: 'detect', label: 'Detect', icon: Search, color: 'blue' },
  { id: 'risk', label: 'Risk Score', icon: Gauge, color: 'amber' },
  { id: 'diagnose', label: 'Diagnose', icon: Brain, color: 'purple' },
  { id: 'guardrails', label: 'Guardrails', icon: Shield, color: 'emerald' },
  { id: 'strategy', label: 'Pick Strategy', icon: GitBranch, color: 'blue' },
  { id: 'execute', label: 'Execute', icon: Zap, color: 'amber' },
  { id: 'simulate', label: 'Simulate', icon: Phone, color: 'purple' },
  { id: 'state', label: 'Update State', icon: Database, color: 'emerald' },
]

function PipelineNode({ data }: NodeProps) {
  const stage = data.stage as Stage
  const status = data.status as StageStatus
  const Icon = stage.icon
  return <div className={`recovery-node node-${status}`}>
    <Handle type="target" position={Position.Left} />
    <span className={`node-icon node-icon-${stage.color}`}><Icon /></span>
    <span className="node-copy"><strong>{stage.label}</strong><small>{status === 'active' ? 'Processing...' : status === 'done' ? 'Completed' : status === 'error' ? 'Failed' : 'Pending'}</small></span>
    <Handle type="source" position={Position.Right} />
  </div>
}

const nodeTypes = { recovery: PipelineNode }

function makeNodes(statuses: Record<string, StageStatus>): Node[] {
  return stages.map((stage, index) => ({ id: stage.id, type: 'recovery', position: { x: index < 4 ? index * 190 : (index - 4) * 190 + 78, y: index < 4 ? 92 : 238 }, data: { stage, status: statuses[stage.id] ?? 'pending' } }))
}
function makeEdges(statuses: Record<string, StageStatus>): Edge[] {
  return [['detect', 'risk'], ['risk', 'diagnose'], ['diagnose', 'guardrails'], ['guardrails', 'strategy'], ['strategy', 'execute'], ['execute', 'simulate'], ['simulate', 'state']].map(([source, target]) => ({ id: `${source}-${target}`, source, target, type: 'smoothstep', animated: statuses[source] === 'active' || statuses[target] === 'active', style: { stroke: '#52525b', strokeWidth: 1.5 } }))
}

export default function ClawbackRecovery() {
  const [mobileNav, setMobileNav] = useState(false)
  const [running, setRunning] = useState(false)
  const [activeStage, setActiveStage] = useState(-1)
  const [count, setCount] = useState('10')
  const [days, setDays] = useState('7 days')
  const [autoExecute, setAutoExecute] = useState(true)
  const [logs, setLogs] = useState<{ time: string; message: string; type: string }[]>([])
  const logRef = useRef<HTMLDivElement>(null)
  const statuses = useMemo(() => Object.fromEntries(stages.map((stage, index) => [stage.id, index < activeStage ? 'done' : index === activeStage ? 'active' : 'pending'])) as Record<string, StageStatus>, [activeStage])
  const nodes = useMemo(() => makeNodes(statuses), [statuses])
  const edges = useMemo(() => makeEdges(statuses), [statuses])
  const addLog = useCallback((message: string, type = 'info') => setLogs((current) => [...current, { time: new Date().toLocaleTimeString('en-GB', { hour12: false }), message, type }]), [])
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }) }, [logs])
  useEffect(() => { if (!running) return; if (activeStage >= stages.length) { setRunning(false); addLog('Recovery run completed. 7 transactions recovered.', 'success'); return } const timer = window.setTimeout(() => { addLog(`${stages[activeStage].label} node started`, 'node_start'); window.setTimeout(() => addLog(`${stages[activeStage].label} completed successfully`, 'success'), 650); setActiveStage((value) => value + 1) }, 1050); return () => window.clearTimeout(timer) }, [running, activeStage, addLog])
  const runAgent = () => { setLogs([]); setActiveStage(0); setRunning(true); addLog(`Agent initialized for ${count} failed transactions (${days})`, 'info') }
  return <main className="dashboard-shell recovery-shell"><div className="dashboard-glow glow-one" /><div className="dashboard-glow glow-two" />
    <header className="topbar"><button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button><div className="brand"><span className="brand-mark"><Bot /></span><span>Clawback</span><span className="brand-divider" /><span className="brand-subtitle">AI revenue recovery</span></div><nav className={mobileNav ? 'topnav open' : 'topnav'}><a href="/">Overview</a><a href="/transactions">Transactions</a><a className="active" href="/recovery">Recovery</a></nav><div className="top-actions"><span className="recovery-top-status"><span className="status-dot is-active" /> Agent ready</span><label className="interval"><Clock3 /><select aria-label="Recovery interval"><option>Every 6h</option><option>Every 12h</option><option>Every 24h</option></select><ChevronDown /></label></div></header>
    <div className="page-content recovery-content"><section className="recovery-header reveal"><div><p className="eyebrow"><span className="live-pip" /> Autonomous recovery</p><h1>Recovery</h1><p>Launch the autonomous AI agent to recover failed payments.</p></div><button className="run-agent" onClick={runAgent} disabled={running}>{running ? <><Activity className="spin" /> Running...</> : <><Zap /> Run Recovery Agent</>}</button></section>
      <section className="config-panel reveal delay-one"><label>Transactions to process<select value={count} onChange={(event) => setCount(event.target.value)}><option>5</option><option>10</option><option>25</option><option>50</option></select></label><label className="toggle-label">Auto-execute<button className={`switch ${autoExecute ? 'on' : ''}`} aria-label="Toggle auto-execute" onClick={() => setAutoExecute(!autoExecute)}><span /></button></label><label>Days back<select value={days} onChange={(event) => setDays(event.target.value)}><option>3 days</option><option>7 days</option><option>14 days</option><option>30 days</option></select></label></section>
      <section className="pipeline-card reveal delay-two"><div className="pipeline-title"><div><p className="section-kicker">LangGraph orchestration</p><h2>Agent Pipeline</h2><span>Real-time execution flow</span></div><span className="pipeline-state"><i className={running ? 'running' : ''} /> {running ? 'Processing' : activeStage >= stages.length ? 'Complete' : 'Ready'}</span></div><div className="flow-wrap"><ReactFlowProvider><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} nodesDraggable={false} nodesConnectable={false} zoomOnScroll={false} panOnScroll={false} proOptions={{ hideAttribution: true }}><Background color="#ffffff14" gap={22} size={1} /><Controls showInteractive={false} /><MiniMap nodeColor={(node) => node.data?.status === 'active' ? '#34d399' : '#3f3f46'} maskColor="#09090b88" /></ReactFlow></ReactFlowProvider></div></section>
      <section className="logs-card reveal delay-three"><div className="logs-heading"><div><p className="section-kicker">Execution trace</p><h2>Agent Logs</h2></div><span className="live-badge"><i /> Live</span></div><div className="log-feed" ref={logRef}>{logs.length ? logs.map((log, index) => <div className="log-row" key={`${log.time}-${index}`}><time>[{log.time}]</time><span className={`log-${log.type}`}>{log.message}</span></div>) : <div className="log-empty"><Activity /><span>Waiting for agent to start...</span></div>}</div></section>
      <footer><span>Clawback <small>AI-powered revenue recovery</small></span><span>Powered by <b>Razorpay</b> <span className="footer-dot" /> All systems operational</span></footer>
    </div>
  </main>
}
