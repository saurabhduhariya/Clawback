import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../utils/api';
import { Wallet, CheckCircle, TrendingUp, AlertTriangle, Activity, ArrowUpRight, Zap, Clock, Filter, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

const PIE_COLORS = ['#ffffff', '#52525b', '#27272a'];
const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const tooltipStyle = {
  contentStyle: { background: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', backdropFilter: 'blur(8px)' },
  labelStyle: { color: '#a1a1aa' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

/* ─── Count-up hook ─── */
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

/* ─── Skeleton Loader ─── */
function DashboardSkeleton() {
  return (
    <div className="px-6 py-8 max-w-[1440px] mx-auto">
      <div className="skeleton skeleton-title mb-8" />
      <div className="skeleton rounded-2xl h-48 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="skeleton skeleton-chart" />
        <div className="skeleton skeleton-chart" />
      </div>
    </div>
  );
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Dashboard() {
  const [m, setM] = useState(null);
  const [autoPilot, setAutoPilot] = useState({ enabled: false, nextRunTime: null, intervalHours: 6 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMetrics(),
      api.getSchedulerStatus().catch(() => ({ enabled: false, nextRunTime: null }))
    ]).then(([metricsData, schedulerData]) => {
      setM(metricsData);
      setAutoPilot(schedulerData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  
  const toggleAutoPilot = async () => {
    try {
      const res = await api.toggleScheduler(!autoPilot.enabled, autoPilot.intervalHours);
      setAutoPilot(res);
    } catch (err) {
      console.error("Failed to toggle auto-pilot", err);
    }
  };

  const handleIntervalChange = async (e) => {
    const newInterval = parseInt(e.target.value, 10);
    try {
      const res = await api.toggleScheduler(autoPilot.enabled, newInterval);
      setAutoPilot(res);
    } catch (err) {
      console.error("Failed to update interval", err);
    }
  };
  
  const recoveredAmt = useCountUp(m ? m.total_recovered / 100 : 0);
  const recoveryRate = useCountUp(m ? m.recovery_rate : 0, 800);

  if (loading) return <DashboardSkeleton />;
  if (!m) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
      <Activity className="w-12 h-12 mb-4 opacity-30" />
      <p className="text-lg font-medium">No data yet</p>
      <p className="text-sm text-zinc-600">Run a recovery to see your dashboard.</p>
    </div>
  );

  const stats = [
    { icon: <Wallet className="w-5 h-5" />, label: 'Total At Risk', value: fmt(m.total_at_risk), sub: `${m.total_transactions} transactions`, color: 'text-white' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Recovery Rate', value: `${recoveryRate}%`, sub: 'of total at-risk', color: 'text-emerald-400' },
    { icon: <AlertTriangle className="w-5 h-5" />, label: 'Unrecoverable', value: fmt(m.total_unrecoverable), sub: `${m.unrecoverable_count} transactions`, color: 'text-red-400' },
  ];

  const barData = (m.by_type || []).map(t => ({
    name: t.type.charAt(0).toUpperCase() + t.type.slice(1),
    total: t.total, recovered: t.recovered, rate: t.rate,
  }));

  const pieData = [
    { name: 'Recovered', value: m.recovered_count || 0 },
    { name: 'Failed', value: (m.total_transactions - (m.recovered_count||0) - (m.unrecoverable_count||0)) },
    { name: 'Unrecoverable', value: m.unrecoverable_count || 0 },
  ].filter(d => d.value > 0);

  const actionData = (m.by_action || []).map(a => ({
    name: a.chosen_action.replace(/_/g, ' '), success: a.rate, total: a.total,
  }));

  return (
    <motion.div
      className="px-6 py-8 max-w-[1440px] mx-auto relative z-10"
      variants={stagger} initial="hidden" animate="visible"
    >
      
      {/* Page Header */}
      <motion.div variants={fadeUp} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm">Revenue recovery intelligence at a glance</p>
        </div>
        
        {/* Auto-Pilot Toggle */}
        <div className="flex items-center gap-4 bg-zinc-900/60 p-3 px-5 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${autoPilot.enabled ? "text-amber-400" : "text-zinc-500"}`} />
              <span className="text-sm font-bold text-white">Auto-Pilot</span>
              {autoPilot.enabled && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              {autoPilot.enabled && autoPilot.nextRunTime
                ? `Next run: ${new Date(autoPilot.nextRunTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Disabled"}
            </div>
          </div>
          
          <div className="flex items-center gap-3 border-l border-white/10 pl-4 ml-1">
            <select
              value={autoPilot.intervalHours || 6}
              onChange={handleIntervalChange}
              className="bg-zinc-800 text-xs text-zinc-300 font-medium rounded-lg px-2 py-1.5 border border-white/10 outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
            >
              <option className="bg-zinc-900 text-zinc-300" value={2}>Every 2h</option>
              <option className="bg-zinc-900 text-zinc-300" value={6}>Every 6h</option>
              <option className="bg-zinc-900 text-zinc-300" value={12}>Every 12h</option>
              <option className="bg-zinc-900 text-zinc-300" value={24}>Every 24h</option>
            </select>
            <button
              onClick={toggleAutoPilot}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoPilot.enabled ? "bg-emerald-500" : "bg-zinc-700"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoPilot.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </motion.div>
  

      {/* ─── Hero Metric ─── */}
      <motion.div
        variants={fadeUp}
        className="relative bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-8 md:p-10 border border-white/5 mb-6 overflow-hidden group"
      >
        <div className="absolute -right-8 -top-8 text-[12rem] font-black text-white/[0.03] pointer-events-none select-none leading-none">
          ₹
        </div>
        <div className="relative z-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Recovered</span>
            </div>
            <div className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
              ₹{recoveredAmt.toLocaleString('en-IN')}
            </div>
            <div className="text-sm text-zinc-500 mt-2 font-medium">
              {m.recovered_count} of {m.total_transactions} transactions recovered
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{m.recovery_rate}%</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      </motion.div>

      {/* ─── Stat Strip ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -3 }}
            className="relative group bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-5 border border-white/5 overflow-hidden transition-all hover:border-white/15"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${s.color} group-hover:bg-white/10 transition-colors`}>
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">{s.label}</div>
                <div className="text-xl font-extrabold text-white truncate">{s.value}</div>
              </div>
            </div>
            <div className="text-xs text-zinc-600 mt-2 ml-12">{s.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Timeline Chart ─── */}
      <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5 mb-6">
        <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Recovery Over Time</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={m.recovery_over_time || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={10} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100/1000).toFixed(0)}k`} />
            <Tooltip {...tooltipStyle} formatter={(v) => `₹${(v/100).toLocaleString('en-IN')}`} labelStyle={{ color: '#ffffff' }} />
            <Area type="monotone" dataKey="amount" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#34d399', stroke: '#000', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>


      {/* ─── Recovery Pipeline ─── */}
      {m.funnel && m.funnel.length > 0 && (
        <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/5 mb-6">
          <div className="flex items-center gap-2 mb-8">
            <Filter className="w-4 h-4 text-zinc-500" />
            <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest">Recovery Pipeline</h2>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between w-full relative gap-6 md:gap-0">
            {/* Background connection line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-[5%] right-[5%] h-[2px] bg-gradient-to-r from-zinc-800 via-zinc-700/50 to-zinc-800 -translate-y-1/2 z-0" />
            
            {m.funnel.map((stage, i) => {
              const maxCount = Math.max(...m.funnel.map(s => s.count), 1);
              const pct = (stage.count / maxCount) * 100;
              const isLast = i === m.funnel.length - 1;
              
              return (
                <div key={stage.stage} className="relative z-10 flex flex-col items-center flex-1 w-full md:w-auto">
                  
                  {/* The Node */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.5, type: "spring", bounce: 0.4 }}
                    className="flex items-center justify-center relative group w-full md:w-auto"
                  >
                    <div 
                      className="w-full max-w-[120px] md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center border transition-all duration-300 relative bg-zinc-950/80 shadow-2xl backdrop-blur-md py-4 md:py-0"
                      style={{ 
                        borderColor: `${stage.color}30`,
                        boxShadow: `0 10px 30px -10px ${stage.color}20, inset 0 0 20px ${stage.color}05` 
                      }}
                    >
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                           style={{ background: `radial-gradient(circle at center, ${stage.color}15 0%, transparent 70%)` }} />
                           
                      <span className="text-2xl md:text-xl font-black text-white relative z-10 tracking-tight">{stage.count}</span>
                    </div>

                    {/* Chevron (mobile) */}
                    {!isLast && (
                      <div className="md:hidden mt-4 mb-2">
                        <ChevronRight className="w-5 h-5 text-zinc-700 rotate-90" />
                      </div>
                    )}
                  </motion.div>
                  
                  {/* Label */}
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 + 0.2 }}
                    className="mt-4 md:mt-5 text-center"
                  >
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block whitespace-nowrap">{stage.stage}</span>
                    <div className="mt-1.5 flex items-center justify-center gap-1.5">
                      <div className="h-1 w-8 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono">{pct.toFixed(0)}%</span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {m.funnel.length >= 2 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-3 mt-10 pt-6 border-t border-white/5"
            >
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-widest">Net Conversion</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-emerald-400">
                    {m.funnel[0].count > 0
                      ? ((m.funnel[m.funnel.length - 1].count / m.funnel[0].count) * 100).toFixed(1)
                      : 0}%
                  </span>
                  <span className="text-xs font-medium text-zinc-600 bg-black/30 px-2 py-0.5 rounded-md">
                    {m.funnel[m.funnel.length - 1].count} of {m.funnel[0].count} recovered
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ─── Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
          <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Recovery by Type</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total" fill="#27272a" radius={[6,6,0,0]} name="Total" />
              <Bar dataKey="recovered" fill="#ffffff" radius={[6,6,0,0]} name="Recovered" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
          <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={2} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#71717a', fontWeight: 500 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ─── Action Effectiveness ─── */}
      {actionData.length > 0 && (
        <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
          <h2 className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Action Effectiveness</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={actionData} layout="vertical" barSize={14}>
              <XAxis type="number" domain={[0,100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={140} />
              <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
              <Bar dataKey="success" fill="url(#grad)" radius={[0,8,8,0]} name="Success Rate">
                <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3f3f46"/><stop offset="100%" stopColor="#ffffff"/></linearGradient></defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </motion.div>
  );
}
