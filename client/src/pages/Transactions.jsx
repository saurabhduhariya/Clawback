import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { Bot, ChevronDown, ChevronRight, Clock3, Download, FolderOpen, Menu, Search, ShieldAlert } from 'lucide-react';

const formatINR = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function riskLevel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Med';
  return 'Low';
}

export default function Transactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All Status');
  const [autoPilot, setAutoPilot] = useState({ enabled: false, intervalHours: 6 });

  useEffect(() => {
    Promise.all([
      api.getTransactions(),
      api.getSchedulerStatus().catch(() => ({ enabled: false, intervalHours: 6 }))
    ]).then(([txns, sched]) => {
      setTransactions(txns);
      setAutoPilot(sched);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleAutoPilot = async () => {
    try {
      const res = await api.toggleScheduler(!autoPilot.enabled, autoPilot.intervalHours);
      setAutoPilot(res);
    } catch (err) { console.error(err); }
  };

  const handleIntervalChange = async (e) => {
    const hours = parseInt(e.target.value.replace(/[^\d]/g, ''), 10);
    try {
      const res = await api.toggleScheduler(autoPilot.enabled, hours);
      setAutoPilot(res);
    } catch (err) { console.error(err); }
  };

  const exportCsv = () => window.open('http://localhost:3001/api/export/csv', '_blank');

  const filtered = useMemo(() => transactions.filter((t) => {
    const name = (t.customer_name || t.customer || '').toLowerCase();
    const email = (t.customer_email || t.email || '').toLowerCase();
    const matchesQuery = `${name} ${email}`.includes(query.toLowerCase());
    const txStatus = (t.status || '').toLowerCase();
    const filterStatus = status.toLowerCase();
    return matchesQuery && (status === 'All Status' || txStatus === filterStatus);
  }), [transactions, query, status]);

  const intervalLabel = `Every ${autoPilot.intervalHours || 6}h`;

  return (
    <main className="dashboard-shell transactions-shell">
      <div className="dashboard-glow glow-one" />
      <header className="topbar">
        <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button>
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><span className="brand-mark"><Bot /></span><span>Clawback</span><span className="brand-divider" /><span className="brand-subtitle">AI revenue recovery</span></div>
        <nav className={mobileNav ? 'topnav open' : 'topnav'}>
          <a className={location.pathname === '/dashboard' ? 'active' : ''} onClick={() => navigate('/dashboard')} style={{cursor:'pointer'}}>Overview</a>
          <a className={location.pathname === '/transactions' ? 'active' : ''} onClick={() => navigate('/transactions')} style={{cursor:'pointer'}}>Transactions</a>
          <a className={location.pathname === '/recover' ? 'active' : ''} onClick={() => navigate('/recover')} style={{cursor:'pointer'}}>Recovery</a>
        </nav>
        <div className="top-actions">
          <button className="export-button" onClick={exportCsv}><Download /> Export CSV</button>
          <button className={`autopilot ${autoPilot.enabled ? 'is-active' : ''}`} onClick={toggleAutoPilot}>
            <span className="status-dot" /> Auto-Pilot <span className="autopilot-status">{autoPilot.enabled ? 'Active' : 'Paused'}</span>
          </button>
          <label className="interval">
            <Clock3 />
            <select aria-label="Recovery interval" value={intervalLabel} onChange={handleIntervalChange}>
              <option>Every 2h</option><option>Every 6h</option><option>Every 12h</option><option>Every 24h</option>
            </select>
            <ChevronDown />
          </label>
        </div>
      </header>

      <div className="page-content transactions-content">
        <section className="transactions-header reveal">
          <div>
            <p className="eyebrow"><span className="live-pip" /> Recovery ledger</p>
            <h1>Transactions</h1>
            <p>Track every payment recovery attempt across your revenue engine.</p>
          </div>
          <div className="transaction-controls">
            <label className="search-box">
              <Search />
              <input aria-label="Search customers" placeholder="Search customers..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label className="status-filter">
              <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>All Status</option><option>Pending</option><option>Recovering</option><option>Recovered</option><option>Failed</option><option>Overdue</option><option>Abandoned</option>
              </select>
              <ChevronDown />
            </label>
          </div>
        </section>

        <section className="transaction-table-card reveal delay-one">
          {loading ? (
            <div className="transaction-skeleton" aria-label="Loading transactions">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="skeleton-row" key={i}>
                  {Array.from({ length: 8 }).map((__, c) => <span className={`skeleton-bar skeleton-${c}`} key={c} />)}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table>
                  <thead><tr>
                    <th>Customer</th><th>Amount</th><th>Type</th><th>Recovered</th><th>Attempts</th><th>Risk</th><th>Status</th><th aria-label="Open transaction" />
                  </tr></thead>
                  <tbody>
                    {filtered.map((t, index) => {
                      const isRecovered = (t.status || '').toLowerCase() === 'recovered';
                      const score = t.risk_score || 0;
                      const risk = riskLevel(score);
                      const amt = t.amount || 0;
                      const recovered = isRecovered ? amt : 0;
                      return (
                        <tr key={t.id || index} style={{ animationDelay: `${index * 0.03}s` }} onClick={() => t.id && navigate(`/transactions/${t.id}`)}>
                          <td><strong>{t.customer_name || t.customer || 'Unknown'}</strong><small>{t.customer_email || t.email || ''}</small></td>
                          <td className="mono">{formatINR(amt / 100)}</td>
                          <td>{(t.failure_reason || t.type || 'Payment').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                          <td className={recovered ? 'recovered mono' : 'muted mono'}>{recovered ? formatINR(recovered / 100) : '-'}</td>
                          <td>{t.attempt_count || t.attempts || 0}</td>
                          <td>
                            <span className={`risk-badge ${isRecovered ? 'risk-resolved' : `risk-${risk.toLowerCase()}`}`} title={`AI Risk Score: ${score}/100 (${isRecovered ? 'Resolved' : risk})`}>
                              <ShieldAlert />{isRecovered ? 'Resolved' : risk}
                            </span>
                          </td>
                          <td><span className={`status-badge status-${(t.status || 'failed').toLowerCase()}`}><i />{t.status || 'Failed'}</span></td>
                          <td><ChevronRight className="row-arrow" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="transaction-empty">
                  <FolderOpen /><strong>No transactions found</strong><span>Try adjusting your filters or search query</span>
                </div>
              )}
            </>
          )}
        </section>

        <footer>
          <span>Clawback <small>AI-powered revenue recovery</small></span>
          <span>Powered by <b>Razorpay</b> <span className="footer-dot" /> All systems operational</span>
        </footer>
      </div>
    </main>
  );
}
