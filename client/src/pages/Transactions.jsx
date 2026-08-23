import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const fmt = (p) => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('all');
  const [typeF, setTypeF] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const p = {};
    if (statusF !== 'all') p.status = statusF;
    if (typeF !== 'all') p.type = typeF;
    api.getTransactions(p).then(setTxns).catch(console.error).finally(() => setLoading(false));
  }, [statusF, typeF]);

  const total = txns.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="px-6 py-8 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Transactions</h1>
      <p className="text-txt-secondary text-sm mb-7">All failed, abandoned, and overdue transactions</p>

      <div className="flex gap-2 items-center mb-4 flex-wrap">
        <select className="filter-select px-3.5 py-2 rounded-lg border border-border-glass bg-glass text-txt-primary text-sm font-sans cursor-pointer transition-all hover:border-border-glass-hover focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_3px_rgba(79,125,245,0.15)] backdrop-blur-lg" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="failed">Failed</option>
          <option value="abandoned">Abandoned</option>
          <option value="overdue">Overdue</option>
          <option value="recovered">Recovered</option>
          <option value="unrecoverable">Unrecoverable</option>
        </select>
        <select className="filter-select px-3.5 py-2 rounded-lg border border-border-glass bg-glass text-txt-primary text-sm font-sans cursor-pointer transition-all hover:border-border-glass-hover focus:outline-none focus:border-accent-blue backdrop-blur-lg" value={typeF} onChange={e => setTypeF(e.target.value)}>
          <option value="all">All Types</option>
          <option value="payment">Payment</option>
          <option value="checkout">Checkout</option>
          <option value="subscription">Subscription</option>
          <option value="invoice">Invoice</option>
        </select>
        <span className="ml-auto text-txt-muted text-xs font-medium">{txns.length} transactions · {fmt(total)}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-txt-secondary"><span className="spinner" />Loading...</div>
      ) : txns.length === 0 ? (
        <div className="text-center py-20 text-txt-muted"><p className="text-4xl mb-3 opacity-50">🔍</p><p>No transactions match your filters</p></div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Transaction ID', 'Customer', 'Amount', 'Type', 'Status', 'Failure Reason', 'Attempts'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[0.68rem] font-semibold text-txt-muted uppercase tracking-wider border-b border-border-glass bg-white/[0.01]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id} className="cursor-pointer transition-all hover:bg-accent-blue/[0.04] border-b border-white/[0.03]" onClick={() => navigate('/audit/' + t.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-txt-secondary">{t.id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{t.customer_name}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{fmt(t.amount)}</td>
                    <td className="px-4 py-3 text-sm capitalize text-txt-secondary">{t.type}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-txt-secondary">{t.failure_reason}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-sm ${t.attempt_count >= t.max_attempts ? 'text-accent-red' : 'text-txt-secondary'}`}>
                        {t.attempt_count}/{t.max_attempts}
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
