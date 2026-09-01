'use client'

import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowDownToLine, Bot, Check, ChevronDown, CircleDollarSign, Clock3, Download, Gauge, GitBranch, Menu, MoreHorizontal, Radio, ShieldCheck, Sparkles, Target, TrendingUp, WalletCards, X } from 'lucide-react'

const recoveryData = [
  { day: 'Aug 19', value: 8200 }, { day: 'Aug 20', value: 12400 }, { day: 'Aug 21', value: 9800 },
  { day: 'Aug 22', value: 15700 }, { day: 'Aug 23', value: 14300 }, { day: 'Aug 24', value: 19100 },
  { day: 'Aug 25', value: 17600 }, { day: 'Aug 26', value: 22300 }, { day: 'Aug 27', value: 20400 },
  { day: 'Aug 28', value: 26500 }, { day: 'Aug 29', value: 23800 }, { day: 'Aug 30', value: 30100 },
  { day: 'Aug 31', value: 28700 }, { day: 'Sep 01', value: 34600 },
]
const actionData = [
  { name: 'Retry payment', rate: 82, color: '#34d399' }, { name: 'Send reminder', rate: 68, color: '#60a5fa' },
  { name: 'Create payment link', rate: 54, color: '#fbbf24' }, { name: 'Escalate to team', rate: 31, color: '#a1a1aa' },
]
const stages = [
  { name: 'Failed', count: 120, color: 'stage-red', icon: X }, { name: 'Diagnosed', count: 98, color: 'stage-blue', icon: Activity },
  { name: 'Guardrails passed', count: 85, color: 'stage-amber', icon: ShieldCheck }, { name: 'Executed', count: 72, color: 'stage-purple', icon: GitBranch },
  { name: 'Recovered', count: 45, color: 'stage-green', icon: Check },
]

function formatINR(value: number) { return `₹${value.toLocaleString('en-IN')}` }

export default function ClawbackDashboard() {
  const [active, setActive] = useState(true)
  const [interval, setIntervalValue] = useState('Every 6h')
  const [mobileNav, setMobileNav] = useState(false)
  const [recovered, setRecovered] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setRecovered((value) => value >= 319997 ? 319997 : value + 6400), 22); return () => window.clearInterval(timer) }, [])
  const exportCsv = () => {
    const csv = 'Metric,Value\nRevenue at Risk,563444\nRecovered,319997\nRecovery Rate,56.8%\nUnrecoverable,124877'
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'clawback-report.csv'; link.click(); URL.revokeObjectURL(link.href)
  }
  return <main className="dashboard-shell">
    <div className="dashboard-glow glow-one" /><div className="dashboard-glow glow-two" />
    <header className="topbar">
      <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button>
      <div className="brand"><span className="brand-mark"><Bot /></span><span>Clawback</span><span className="brand-divider" /><span className="brand-subtitle">AI revenue recovery</span></div>
      <nav className={mobileNav ? 'topnav open' : 'topnav'}><a className="active" href="#overview">Overview</a><a href="/transactions">Transactions</a><a href="#activity">Recovery</a></nav>
      <div className="top-actions"><button className="export-button" onClick={exportCsv}><Download data-icon="inline-start" /> Export CSV</button><button className={`autopilot ${active ? 'is-active' : ''}`} onClick={() => setActive(!active)}><span className="status-dot" /> Auto-Pilot <span className="autopilot-status">{active ? 'Active' : 'Paused'}</span></button><label className="interval"><Clock3 /><select aria-label="Recovery interval" value={interval} onChange={(event) => setIntervalValue(event.target.value)}><option>Every 2h</option><option>Every 6h</option><option>Every 12h</option><option>Every 24h</option></select><ChevronDown /></label></div>
    </header>
    <div className="page-content" id="overview">
      <section className="hero-copy reveal"><div><p className="eyebrow"><span className="live-pip" /> Live recovery command center</p><h1>Recover more.<br /><span>Stress less.</span></h1><p className="hero-description">Clawback is watching your failed payments, diagnosing the why, and recovering revenue while you focus on growth.</p></div><div className="hero-meta"><span>Last synced</span><strong>Just now</strong><span className="sync-icon"><Radio /></span></div></section>
      <section className="stats-grid reveal delay-one"> <StatCard label="Revenue at risk" value="₹5,63,444" sub="120 failed transactions" icon={CircleDollarSign} tone="risk" trend="+12.4%" /><StatCard label="Recovered" value={formatINR(recovered)} sub="45 payments recovered" icon={WalletCards} tone="success" trend="+18.6%" /><StatCard label="Recovery rate" value="56.8%" sub="vs 42.1% last month" icon={Target} tone="blue" trend="+14.7%" spark /><StatCard label="Unrecoverable" value="₹1,24,877" sub="28 transactions" icon={Gauge} tone="danger" trend="-3.2%" /></section>
      <section className="section-block reveal delay-two"><div className="section-heading"><div><p className="section-kicker">Recovery engine</p><h2>Pipeline performance</h2></div><div className="conversion"><span>Net conversion</span><strong>37.5%</strong><TrendingUp /></div></div><div className="pipeline">{stages.map((stage, index) => <div className="pipeline-stage-wrap" key={stage.name}><div className={`pipeline-stage ${stage.color}`}><div className="stage-icon"><stage.icon /></div><div><span>{stage.name}</span><strong>{stage.count}</strong></div><MoreHorizontal className="stage-more" /></div>{index < stages.length - 1 && <div className="pipeline-line"><span /></div>}</div>)}</div></section>
      <section className="charts-grid reveal delay-three" id="activity"><div className="chart-card"><ChartHeading title="Recovery over time" note="Last 14 days" legend="Recovered value" /><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={recoveryData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.35} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 10 }} interval={2} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(value) => `₹${value / 1000}k`} /><Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#fafafa' }} formatter={(value) => [formatINR(Number(value)), 'Recovered']} /><Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} fill="url(#areaFill)" /></AreaChart></ResponsiveContainer></div></div><div className="chart-card" id="strategies"><ChartHeading title="Recovery by action" note="Success rate" legend="Success rate" /><div className="bar-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={actionData} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}><XAxis type="number" domain={[0, 100]} hide /><YAxis dataKey="name" type="category" width={125} tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} /><Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10 }} formatter={(value) => [`${value}%`, 'Success']} /><Bar dataKey="rate" radius={[0, 5, 5, 0]} barSize={20}>{actionData.map((item) => <Cell key={item.name} fill={item.color} fillOpacity={0.9} />)}</Bar></BarChart></ResponsiveContainer></div></div></section>
      <section className="bottom-grid reveal delay-four"><div className="chart-card distribution-card"><ChartHeading title="Transaction distribution" note="All time" legend="Live breakdown" /><div className="donut-content"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Recovered', value: 45 }, { name: 'Failed', value: 47 }, { name: 'Unrecoverable', value: 28 }]} innerRadius={68} outerRadius={92} paddingAngle={3} dataKey="value" stroke="none"><Cell fill="#34d399" /><Cell fill="#3f3f46" /><Cell fill="#f87171" /></Pie></PieChart></ResponsiveContainer><div className="donut-center"><strong>120</strong><span>total txns</span></div></div><div className="legend-list"><LegendItem label="Recovered" value="45" percent="37.5%" color="emerald" /><LegendItem label="Failed" value="47" percent="39.2%" color="zinc" /><LegendItem label="Unrecoverable" value="28" percent="23.3%" color="red" /></div></div></div><div className="insight-card"><div className="insight-icon"><Sparkles /></div><p className="section-kicker">AI insight</p><h3>Retries are outperforming reminders by <span>20.6%</span></h3><p>Clawback&apos;s recovery engine has automatically shifted more volume to smart retries this week.</p><button>View strategy report <ArrowDownToLine /></button></div></section>
      <footer><span>Clawback <small>AI-powered revenue recovery</small></span><span>Powered by <b>Razorpay</b> <span className="footer-dot" /> All systems operational</span></footer>
    </div>
  </main>
}

function StatCard({ label, value, sub, icon: Icon, tone, trend, spark }: { label: string; value: string; sub: string; icon: typeof Bot; tone: string; trend: string; spark?: boolean }) { return <article className={`stat-card stat-${tone}`}><div className="stat-top"><span>{label}</span><Icon /></div><div className="stat-value">{value}</div><div className="stat-bottom"><span>{sub}</span><strong>{trend}</strong></div>{spark && <svg className="sparkline" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true"><path d="M0 25 C 15 24, 15 14, 28 19 S 42 20, 52 10 S 70 17, 78 8 S 98 12, 120 2" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}</article> }
function ChartHeading({ title, note, legend }: { title: string; note: string; legend: string }) { return <div className="chart-heading"><div><h3>{title}</h3><span>{note}</span></div><span className="chart-legend"><i /> {legend}</span></div> }
function LegendItem({ label, value, percent, color }: { label: string; value: string; percent: string; color: string }) { return <div className="legend-item"><span className={`legend-dot ${color}`} /><span>{label}</span><strong>{value}</strong><small>{percent}</small></div> }
