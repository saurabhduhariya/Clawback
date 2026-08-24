import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../utils/api';
import { Wallet, CheckCircle, TrendingUp, AlertTriangle, Activity, ArrowUpRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMetrics().then(setM).catch(console.error).finally(() => setLoading(false));
  }, []);

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
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl font-bold mb-1 text-white">Dashboard</h1>
        <p className="text-zinc-500 text-sm">Revenue recovery intelligence at a glance</p>
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
