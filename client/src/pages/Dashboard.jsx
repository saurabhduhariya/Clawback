import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];
const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const tooltipStyle = {
  contentStyle: { background: 'rgba(10,10,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' },
  labelStyle: { color: '#8888aa' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

export default function Dashboard() {
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMetrics().then(setM).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center gap-3 py-20 text-txt-secondary"><span className="spinner" />Loading dashboard...</div>;
  if (!m) return <div className="text-center py-20 text-txt-muted"><p className="text-4xl mb-4 opacity-50">📊</p><p>No data yet. Run a recovery first.</p></div>;

  const cards = [
    { icon: '💰', label: 'Total At Risk', value: fmt(m.total_at_risk), sub: `${m.total_transactions} transactions`, color: 'blue' },
    { icon: '✅', label: 'Recovered', value: fmt(m.total_recovered), sub: `${m.recovered_count} transactions`, color: 'green' },
    { icon: '📈', label: 'Recovery Rate', value: `${m.recovery_rate}%`, sub: 'of total at-risk', color: 'purple' },
    { icon: '⚠️', label: 'Unrecoverable', value: fmt(m.total_unrecoverable), sub: `${m.unrecoverable_count} transactions`, color: 'red' },
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

  const gradients = {
    blue: 'from-accent-blue/20 to-accent-cyan/5',
    green: 'from-accent-green/20 to-accent-cyan/5',
    purple: 'from-accent-purple/20 to-accent-pink/5',
    red: 'from-accent-red/20 to-accent-orange/5',
  };

  const topBorders = {
    blue: 'via-accent-blue to-accent-cyan',
    green: 'via-accent-green to-accent-cyan',
    purple: 'via-accent-purple to-accent-pink',
    red: 'via-accent-red to-accent-orange',
  };

  return (
    <div className="px-6 py-8 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Dashboard</h1>
      <p className="text-txt-secondary text-sm mb-7">Revenue recovery intelligence at a glance</p>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {cards.map((c, i) => (
          <div key={i} className={`animate-in stagger-${i+1} glass rounded-2xl p-5 relative overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_0_40px_rgba(79,125,245,0.08)]`}>
            <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent ${topBorders[c.color]}`} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 bg-gradient-to-br ${gradients[c.color]}`}>
              {c.icon}
            </div>
            <div className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-1">{c.label}</div>
            <div className="text-2xl font-extrabold tracking-tight">{c.value}</div>
            <div className="text-xs text-txt-muted mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6 max-lg:grid-cols-1">
        <div className="glass rounded-2xl p-6 animate-in">
          <h2 className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-5">Recovery by Type</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total" fill="#4f7df520" radius={[6,6,0,0]} name="Total" stroke="#4f7df5" strokeWidth={1} />
              <Bar dataKey="recovered" fill="#10b98140" radius={[6,6,0,0]} name="Recovered" stroke="#10b981" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6 animate-in">
          <h2 className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-5">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(10,10,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#8888aa' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Effectiveness */}
      {actionData.length > 0 && (
        <div className="glass rounded-2xl p-6 animate-in">
          <h2 className="text-[0.7rem] font-semibold text-txt-secondary uppercase tracking-wider mb-5">Action Effectiveness</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={actionData} layout="vertical" barSize={16}>
              <XAxis type="number" domain={[0,100]} tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} width={150} />
              <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
              <Bar dataKey="success" fill="url(#grad)" radius={[0,8,8,0]} name="Success Rate">
                <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4f7df5"/><stop offset="100%" stopColor="#06d6a0"/></linearGradient></defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
