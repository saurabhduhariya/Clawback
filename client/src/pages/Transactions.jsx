import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../utils/api';
import { FolderOpen, RefreshCw, Search, ChevronRight } from 'lucide-react';

const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="skeleton h-14 rounded-lg" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Transactions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getTransactions().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = data
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => !search || t.customer_name?.toLowerCase().includes(search.toLowerCase()) || t.id?.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div
      className="px-6 py-8 max-w-[1440px] mx-auto relative z-10"
      variants={stagger} initial="hidden" animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-white">Transactions</h1>
          <p className="text-zinc-500 text-sm">Monitor and recover failed payments</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>
          {/* Filter */}
          <select
            className="filter-select bg-black/50 border border-white/10 text-zinc-300 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-white/25 transition-colors w-36"
            value={filter} onChange={(e) => setFilter(e.target.value)}
          >
            <option className="bg-zinc-900" value="all">All Status</option>
            <option className="bg-zinc-900" value="pending">Pending</option>
            <option className="bg-zinc-900" value="recovering">Recovering</option>
            <option className="bg-zinc-900" value="completed">Completed</option>
            <option className="bg-zinc-900" value="failed">Failed</option>
          </select>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
        {loading ? <TableSkeleton /> : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <FolderOpen className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No transactions found</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-4 text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">Customer</th>
                  <th className="px-5 py-4 text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">Amount</th>
                  <th className="px-5 py-4 text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">Type</th>
                  <th className="px-5 py-4 text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">Recovered</th>
                  <th className="px-5 py-4 text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">Rate</th>
                  <th className="px-5 py-4 text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-4 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                    onClick={() => navigate(`/transactions/${r.id}`)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm text-white">{r.customer_name}</div>
                      <div className="text-[11px] text-zinc-600 font-mono">{r.customer_email}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-white">{fmt(r.amount)}</td>
                    <td className="px-5 py-4 text-sm text-zinc-400 capitalize">{r.type.replace('_', ' ')}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-400">{fmt(r.total_recovered)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-white">{r.recovery_rate}%</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.6rem] font-bold uppercase tracking-wider ${
                        r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/60 text-zinc-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'completed' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
