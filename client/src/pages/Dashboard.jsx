import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { BarChart as BarChartIcon, Wallet, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#ffffff', '#52525b', '#27272a'];
const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const tooltipStyle = {
  contentStyle: { background: 'rgba(9, 9, 11, 0.95)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', backdropFilter: 'blur(8px)' },
  labelStyle: { color: '#a1a1aa' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

export default function Dashboard() {
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMetrics().then(setM).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center gap-3 py-20 text-zinc-400"><span className="spinner" />Loading dashboard...</div>;
  if (!m) return <div className="text-center py-20 text-zinc-500"><p className="flex justify-center mb-4 opacity-50"><BarChartIcon className="w-10 h-10" /></p><p>No data yet. Run a recovery first.</p></div>;

  const cards = [
    { icon: <Wallet className="w-5 h-5 text-white" />, label: 'Total At Risk', value: fmt(m.total_at_risk), sub: `${m.total_transactions} transactions` },
    { icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, label: 'Recovered', value: fmt(m.total_recovered), sub: `${m.recovered_count} transactions` },
    { icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, label: 'Recovery Rate', value: `${m.recovery_rate}%`, sub: 'of total at-risk' },
    { icon: <AlertTriangle className="w-5 h-5 text-red-400" />, label: 'Unrecoverable', value: fmt(m.total_unrecoverable), sub: `${m.unrecoverable_count} transactions` },
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
    <div className="px-6 py-8 max-w-[1440px] mx-auto relative z-10">
      <h1 className="text-3xl font-bold mb-1 text-white">Dashboard</h1>
      <p className="text-zinc-400 text-sm mb-7">Revenue recovery intelligence at a glance</p>

      {/* Metric Cards - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c, i) => (
          <div key={i} className={`animate-in stagger-${i+1} relative group bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5 overflow-hidden transition-all hover:bg-zinc-900/80 hover:border-white/20 shadow-2xl flex flex-col`}>
            <div className="absolute -right-4 -top-8 text-9xl font-black text-white/5 group-hover:text-white/10 transition-colors pointer-events-none select-none">
              0{i+1}
            </div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl mb-4 border border-white/10 group-hover:bg-white/20 transition-colors">
                {c.icon}
              </div>
              <div className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest mb-1">{c.label}</div>
              <div className="text-3xl font-extrabold tracking-tight text-white">{c.value}</div>
              <div className="text-xs text-zinc-500 mt-2 font-medium">{c.sub}</div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="relative group bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5 overflow-hidden transition-all hover:bg-zinc-900/80 hover:border-white/20 shadow-2xl animate-in stagger-3">
          <h2 className="text-[0.75rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Recovery by Type</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total" fill="#27272a" radius={[6,6,0,0]} name="Total" />
              <Bar dataKey="recovered" fill="#ffffff" radius={[6,6,0,0]} name="Recovered" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="relative group bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5 overflow-hidden transition-all hover:bg-zinc-900/80 hover:border-white/20 shadow-2xl animate-in stagger-3">
          <h2 className="text-[0.75rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Effectiveness */}
      {actionData.length > 0 && (
        <div className="relative group bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5 overflow-hidden transition-all hover:bg-zinc-900/80 hover:border-white/20 shadow-2xl animate-in stagger-4">
          <h2 className="text-[0.75rem] font-bold text-zinc-400 uppercase tracking-widest mb-6">Action Effectiveness</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={actionData} layout="vertical" barSize={16}>
              <XAxis type="number" domain={[0,100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={150} />
              <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
              <Bar dataKey="success" fill="url(#grad)" radius={[0,8,8,0]} name="Success Rate">
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#52525b"/>
                    <stop offset="100%" stopColor="#ffffff"/>
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
