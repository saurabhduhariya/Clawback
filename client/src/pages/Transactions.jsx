import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { FolderOpen, RefreshCw } from 'lucide-react';


const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function Transactions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.getTransactions().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="px-6 py-8 max-w-[1440px] mx-auto relative z-10">
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-white">Transactions</h1>
          <p className="text-zinc-400 text-sm">Monitoring and recovering failed payments.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              className="filter-select appearance-none bg-black/50 border border-white/10 text-zinc-300 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-white/30 transition-colors w-40"
              value={filter} onChange={(e) => setFilter(e.target.value)}
            >
              <option className="bg-zinc-900 text-white" value="all">All Status</option>
              <option className="bg-zinc-900 text-white" value="pending">Pending</option>
              <option className="bg-zinc-900 text-white" value="recovering">Recovering</option>
              <option className="bg-zinc-900 text-white" value="completed">Completed</option>
              <option className="bg-zinc-900 text-white" value="failed">Failed</option>
            </select>
          </div>
          <button className="bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 px-5 py-2 rounded-lg text-xs font-bold tracking-[0.1em] uppercase transition-all shadow-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-zinc-500" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-zinc-400"><span className="spinner" />Loading transactions...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-zinc-900/20 rounded-2xl border border-white/5"><p className="flex justify-center mb-4 opacity-50"><FolderOpen className="w-10 h-10" /></p><p>No transactions found.</p></div>
      ) : (
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden shadow-2xl animate-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 bg-black/40">
                  <th className="px-5 py-4 text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest">ID</th>
                  <th className="px-5 py-4 text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest">Customer</th>
                  <th className="px-5 py-4 text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest">Amount</th>
                  <th className="px-5 py-4 text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest">Type</th>
                  <th className="px-5 py-4 text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest">Recovered</th>
                  <th className="px-5 py-4 text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest">Rate</th>
                  <th className="px-5 py-4 text-[0.7rem] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/transactions/${r.id}`)}
                    className="hover:bg-zinc-900/80 transition-colors cursor-pointer group">
                    <td className="px-5 py-4 font-mono text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">{r.id.split('_')[1] || r.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm text-white">{r.customer_name}</div>
                      <div className="text-xs text-zinc-500">{r.customer_email}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-white">{fmt(r.amount)}</td>
                    <td className="px-5 py-4 text-sm text-zinc-400 capitalize">{r.type.replace('_', ' ')}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-400">{fmt(r.total_recovered)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-white">{r.recovery_rate}%</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider border ${r.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/50 border-white/10 text-zinc-300'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'completed' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
