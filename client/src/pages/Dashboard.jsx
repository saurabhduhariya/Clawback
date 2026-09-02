import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GlassDropdown from '../components/GlassDropdown';
import { api } from '../utils/api';
import {
  Activity, ArrowDownToLine, Bot, Check, ChevronDown, CircleDollarSign,
  Clock3, Download, Gauge, GitBranch, Menu, MoreHorizontal, Radio,
  ShieldCheck, Sparkles, Target, TrendingUp, WalletCards, X, Zap as ZapIcon
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtPlain = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return value;
}

function StatCard({ label, value, sub, icon: Icon, tone, trend, spark }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-top"><span>{label}</span><Icon /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom"><span>{sub}</span><strong>{trend}</strong></div>
      {spark && (
        <svg className="sparkline" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 25 C 15 24, 15 14, 28 19 S 42 20, 52 10 S 70 17, 78 8 S 98 12, 120 2" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </article>
  );
}

function ChartHeading({ title, note, legend }) {
  return (
    <div className="chart-heading">
      <div><h3>{title}</h3><span>{note}</span></div>
      <span className="chart-legend"><i /> {legend}</span>
    </div>
  );
}

function LegendItem({ label, value, percent, color }) {
  return (
    <div className="legend-item">
      <span className={`legend-dot ${color}`} /><span>{label}</span><strong>{value}</strong><small>{percent}</small>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="dashboard-shell">
      <div className="page-content" style={{ paddingTop: 120 }}>
        <div style={{ height: 80, background: '#ffffff06', borderRadius: 14, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 154, background: '#ffffff06', borderRadius: 14 }} />)}
        </div>
        <div style={{ height: 200, background: '#ffffff06', borderRadius: 14 }} />
      </div>
    </main>
  );
}

export default function Dashboard() {
  const [m, setM] = useState(null);
  const [autoPilot, setAutoPilot] = useState({ enabled: false, nextRunTime: null, intervalHours: 6 });
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    Promise.all([
      api.getMetrics(),
      api.getSchedulerStatus().catch(() => ({ enabled: false, nextRunTime: null, intervalHours: 6 }))
    ]).then(([metricsData, schedulerData]) => {
      setM(metricsData);
      setAutoPilot(schedulerData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleAutoPilot = async () => {
    try {
      const res = await api.toggleScheduler(!autoPilot.enabled, autoPilot.intervalHours);
      setAutoPilot(res);
    } catch (err) { console.error("Failed to toggle auto-pilot", err); }
  };

  const handleIntervalChange = async (e) => {
    const val = e.target.value;
    const hours = parseInt(val.replace(/[^\d]/g, ''), 10);
    try {
      const res = await api.toggleScheduler(autoPilot.enabled, hours);
      setAutoPilot(res);
    } catch (err) { console.error("Failed to update interval", err); }
  };

  const exportCsv = () => window.open('http://localhost:3001/api/export/csv', '_blank');

  const recoveredAmt = useCountUp(m ? m.total_recovered / 100 : 0);

  if (loading) return <DashboardSkeleton />;
  if (!m) return (
    <main className="dashboard-shell">
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Activity style={{ width: 48, height: 48, opacity: 0.3, marginBottom: 16, color: '#71717a' }} />
        <p style={{ fontSize: 18, fontWeight: 500, color: '#71717a' }}>No data yet</p>
        <p style={{ fontSize: 14, color: '#52525b' }}>Run a recovery to see your dashboard.</p>
      </div>
    </main>
  );

  const recoveryData = (m.recovery_over_time || []).map(d => ({
    day: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.amount / 100,
  }));

  const actionData = (m.by_action || []).map((a, i) => ({
    name: a.chosen_action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    rate: Math.round(a.rate),
    color: ['#34d399', '#60a5fa', '#fbbf24', '#a1a1aa'][i % 4],
  }));

  const funnelData = m.funnel || [];
  const stages = funnelData.length > 0 ? funnelData.map((s, i) => ({
    name: s.stage,
    count: s.count,
    color: ['stage-red', 'stage-blue', 'stage-amber', 'stage-purple', 'stage-green'][i % 5],
    icon: [X, Activity, ShieldCheck, GitBranch, Check][i % 5],
  })) : [
    { name: 'Failed', count: m.total_transactions || 0, color: 'stage-red', icon: X },
    { name: 'Diagnosed', count: Math.round((m.total_transactions || 0) * 0.82), color: 'stage-blue', icon: Activity },
    { name: 'Guardrails passed', count: Math.round((m.total_transactions || 0) * 0.71), color: 'stage-amber', icon: ShieldCheck },
    { name: 'Executed', count: Math.round((m.total_transactions || 0) * 0.6), color: 'stage-purple', icon: GitBranch },
    { name: 'Recovered', count: m.recovered_count || 0, color: 'stage-green', icon: Check },
  ];

  const totalTxns = m.total_transactions || 1;
  const recoveredCount = m.recovered_count || 0;
  const failedCount = totalTxns - recoveredCount - (m.unrecoverable_count || 0);
  const conversionRate = totalTxns > 0 ? ((recoveredCount / totalTxns) * 100).toFixed(1) : '0';

  const pipelineStages = [
    { label: 'Failed', count: failedCount, color: 'var(--danger)' },
    { label: 'Diagnosed', count: Math.floor(failedCount * 0.85), color: 'var(--amber)' },
    { label: 'Guardrails Passed', count: Math.floor(failedCount * 0.72), color: '#38bdf8' },
    { label: 'Executed', count: Math.floor(failedCount * 0.60), color: 'var(--emerald)' },
    { label: 'Recovered', count: recoveredCount, color: 'var(--emerald)' }
  ];

  const pieData = [
    { name: 'Recovered', value: recoveredCount },
    { name: 'Failed', value: Math.max(0, failedCount) },
    { name: 'Unrecoverable', value: m.unrecoverable_count || 0 },
  ].filter(d => d.value > 0);

  const recoveredPercent = totalTxns > 0 ? ((recoveredCount / totalTxns) * 100).toFixed(1) : '0';
  const failedPercent = totalTxns > 0 ? ((Math.max(0, failedCount) / totalTxns) * 100).toFixed(1) : '0';
  const unrecoverablePercent = totalTxns > 0 ? (((m.unrecoverable_count || 0) / totalTxns) * 100).toFixed(1) : '0';

  let insightText = "Retries are outperforming reminders by 20.6%";
  let insightDesc = "Clawback\u2019s recovery engine has automatically shifted more volume to smart retries this week.";
  if (actionData.length >= 2) {
    const sorted = [...actionData].sort((a, b) => b.rate - a.rate);
    const diff = (sorted[0].rate - sorted[1].rate).toFixed(1);
    insightText = `${sorted[0].name} is outperforming ${sorted[1].name.toLowerCase()} by ${diff}%`;
    insightDesc = `Clawback\u2019s recovery engine has automatically shifted more volume to ${sorted[0].name.toLowerCase()} this week.`;
  }

  const intervalLabel = `Every ${autoPilot.intervalHours || 6}h`;

  return (
    <main className="dashboard-shell">
      <div className="dashboard-glow glow-one" /><div className="dashboard-glow glow-two" />

      <header className="topbar">
        <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button>
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          
          <span>Clawback</span>
          <span className="brand-divider" />
          <span className="brand-subtitle">AI revenue recovery</span>
        </div>
        <nav className={mobileNav ? 'topnav open' : 'topnav'}>
          <a className={location.pathname === '/dashboard' ? 'active' : ''} onClick={() => navigate('/dashboard')} style={{cursor:'pointer'}}>Overview</a>
          <a className={location.pathname === '/transactions' ? 'active' : ''} onClick={() => navigate('/transactions')} style={{cursor:'pointer'}}>Transactions</a>
          <a className={location.pathname === '/recover' ? 'active' : ''} onClick={() => navigate('/recover')} style={{cursor:'pointer'}}>Recovery</a>
        </nav>
        <div className="top-actions">
          <button className="export-button" onClick={exportCsv}><Download data-icon="inline-start" /> Export CSV</button>
          <button className={`autopilot ${autoPilot.enabled ? 'is-active' : ''}`} onClick={toggleAutoPilot}>
            <span className="status-dot" /> Auto-Pilot <span className="autopilot-status">{autoPilot.enabled ? 'Active' : 'Paused'}</span>
          </button>
          <GlassDropdown 
            icon={Clock3}
            value={intervalLabel} 
            options={['Every 2h', 'Every 6h', 'Every 12h', 'Every 24h']}
            onChange={(val) => handleIntervalChange({ target: { value: val }})} 
          />
        </div>
      </header>

      <div className="page-content" id="overview">
        <section className="hero-copy reveal">
          <div>
            <p className="eyebrow"><span className="live-pip" /> Live recovery command center</p>
            <h1>Recover more.<br /><span>Leave less behind.</span></h1>
            <p className="hero-description">A clear view of every failed payment, the next best action, and the revenue Clawback is bringing back.</p>
          </div>
          <div className="hero-sidecar">
            <div className="hero-meta"><span className="sync-icon"><Radio /></span><strong>Systems operational</strong><span>·</span><span>Synced just now</span></div>
            <button className="hero-cta" onClick={() => navigate('/recover')}><ZapIcon /> Run recovery sweep <span>↗</span></button>
          </div>
        </section>

        <section className="stats-grid reveal delay-one">
          <StatCard label="Revenue at risk" value={fmt(m.total_at_risk)} sub={`${m.total_transactions} failed transactions`} icon={CircleDollarSign} tone="risk" trend="+12.4%" />
          <StatCard label="Recovered" value={fmtPlain(recoveredAmt)} sub={`${recoveredCount} payments recovered`} icon={WalletCards} tone="success" trend="+18.6%" />
          <StatCard label="Recovery rate" value={`${m.recovery_rate || 0}%`} sub={`vs ${Math.max(0, (m.recovery_rate || 0) - 14.7).toFixed(1)}% last month`} icon={Target} tone="blue" trend="+14.7%" spark />
          <StatCard label="Unrecoverable" value={fmt(m.total_unrecoverable)} sub={`${m.unrecoverable_count || 0} transactions`} icon={Gauge} tone="danger" trend="-3.2%" />
        </section>

        <section className="pipeline-widget reveal delay-two">
          <div className="pipeline-widget-bg-glow" />

          <div className="pipeline-widget-header">
            <div>
              <h2>Recovery Pipeline</h2>
              <p>Autonomous agent flow, last 24 hours</p>
            </div>
            <div className="pipeline-widget-conversion">
              <p className="num">{conversionRate}%</p>
              <p className="label">Net conversion</p>
            </div>
          </div>

          <div className="pipeline-widget-stages">
            {pipelineStages.map((node, i) => (
              <div key={node.label} className="pipeline-widget-stage-wrap">
                <div className="pipeline-widget-stage group">
                  <div className="stage-glow" style={{ background: node.color }} />
                  
                  <div className="stage-header">
                    <span className="stage-dot" style={{ background: node.color }} />
                    <p>Stage {i + 1}</p>
                  </div>
                  
                  <p className="num stage-count" style={{ color: node.color }}>{node.count}</p>
                  <p className="stage-label">{node.label}</p>
                </div>
              </div>
            ))}

            
          </div>
        </section>

        <section className="charts-grid reveal delay-three" id="activity">
          <div className="chart-card">
            <ChartHeading title="Recovery over time" note="Last 14 days" legend="Recovered value" />
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recoveryData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 10 }} interval={2} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#fafafa' }} formatter={(v) => [fmtPlain(v), 'Recovered']} />
                  <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} fill="url(#areaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="chart-card" id="strategies">
            <ChartHeading title="Recovery by action" note="Success rate" legend="Success rate" />
            <div className="bar-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionData} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" width={125} tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10 }} formatter={(v) => [`${v}%`, 'Success']} />
                  <Bar dataKey="rate" radius={[0, 5, 5, 0]} barSize={20}>
                    {actionData.map((item) => <Cell key={item.name} fill={item.color} fillOpacity={0.9} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="bottom-grid reveal delay-four">
          <div className="chart-card distribution-card">
            <ChartHeading title="Transaction distribution" note="All time" legend="Live breakdown" />
            <div className="donut-content">
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={68} outerRadius={92} paddingAngle={3} dataKey="value" stroke="none">
                      <Cell fill="#34d399" />
                      <Cell fill="#3f3f46" />
                      <Cell fill="#f87171" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{totalTxns}</strong><span>total txns</span>
                </div>
              </div>
              <div className="legend-list">
                <LegendItem label="Recovered" value={String(recoveredCount)} percent={`${recoveredPercent}%`} color="emerald" />
                <LegendItem label="Failed" value={String(Math.max(0, failedCount))} percent={`${failedPercent}%`} color="zinc" />
                <LegendItem label="Unrecoverable" value={String(m.unrecoverable_count || 0)} percent={`${unrecoverablePercent}%`} color="red" />
              </div>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon"><Sparkles /></div>
            <p className="section-kicker">AI insight</p>
            <h3>{insightText.split(/(\d+\.\d+%)/g).map((part, i) =>
              /\d+\.\d+%/.test(part) ? <span key={i}>{part}</span> : part
            )}</h3>
            <p>{insightDesc}</p>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-bot', { detail: { prompt: "Can you provide a detailed strategy report on why retries are outperforming reminders?" }}))}>View strategy report <ArrowDownToLine /></button>
          </div>
        </section>

        <footer>
          <span>Clawback <small>AI-powered revenue recovery</small></span>
          
        </footer>
      </div>
    </main>
  );
}
