import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GlassDropdown from '../components/GlassDropdown';
import { api } from '../utils/api';
import { Bot, ChevronDown, ChevronRight, Clock3, Download, FolderOpen, Menu, Search, ShieldAlert, Zap, PlusCircle, X } from 'lucide-react';

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
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [mockData, setMockData] = useState({ customer_name: '', customer_email: '', customer_phone: '', amount: '', failure_reason: 'expired_card' });
  const [isSubmittingMock, setIsSubmittingMock] = useState(false);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All Status');
  const [autoPilot, setAutoPilot] = useState({ enabled: false, intervalHours: 6 });

  
  const handleMockSubmit = async (e) => {
    e.preventDefault();
    if (!mockData.customer_name || !mockData.customer_email || !mockData.amount) {
      alert('Please fill in all fields');
      return;
    }
    setIsSubmittingMock(true);
    try {
      const res = await fetch('/api/transactions/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create mock transaction');
      
      alert('Mock transaction injected successfully!');
      setIsMockModalOpen(false);
      setMockData({ customer_name: '', customer_email: '', customer_phone: '', amount: '', failure_reason: 'expired_card' });
      api.getTransactions().then(txns => setTransactions(txns));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingMock(false);
    }
  };

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

  const exportCsv = () => window.open(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/export/csv` : 'http://localhost:3001/api/export/csv', '_blank');

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
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><span>Clawback</span><span className="brand-divider" /><span className="brand-subtitle">AI revenue recovery</span></div>
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
          <GlassDropdown 
            icon={Clock3}
            value={intervalLabel} 
            options={['Every 2h', 'Every 6h', 'Every 12h', 'Every 24h']}
            onChange={(val) => handleIntervalChange({ target: { value: val }})} 
          />
        </div>
      </header>

      <div className="page-content transactions-content">
        <section className="transactions-header reveal" style={{ position: 'relative', zIndex: 50 }}>
          <div>
            <p className="eyebrow"><span className="live-pip" /> Recovery ledger</p>
            <h1>Transactions</h1>
            <p>Track every payment recovery attempt across your revenue engine.</p>
          </div>
          
          <div className="transaction-controls">
            <button 
              className="run-single-btn" 
              onClick={() => setIsMockModalOpen(true)}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginRight: '8px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)' }}
            >
              <PlusCircle size={16} /> Add Live Test
            </button>
            <label className="search-box">

              <Search />
              <input aria-label="Search customers" placeholder="Search customers..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <GlassDropdown 
              value={status} 
              options={['All Status', 'Pending', 'Recovering', 'Recovered', 'Failed', 'Overdue', 'Abandoned']}
              onChange={(val) => setStatus(val)} 
            />
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
                      const isUnrecoverable = (t.status || '').toLowerCase() === 'unrecoverable';
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
                          
                          <td>
                            {(!isRecovered && !isUnrecoverable) ? (
                              <button 
                                className="run-single-btn" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  navigate('/recover', { state: { autoRun: true, transactionId: t.id, customer: t.customer_name || t.customer } }); 
                                }}
                                style={{
                                  background: 'rgba(52,211,153,0.1)',
                                  border: '1px solid rgba(52,211,153,0.2)',
                                  color: '#34d399',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(52,211,153,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(52,211,153,0.1)';
                                }}
                              >
                                Recover
                              </button>
                            ) : (
                              <ChevronRight className="row-arrow" />
                            )}
                          </td>
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
          
        </footer>
      </div>
    
      {isMockModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMockModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsMockModalOpen(false)}><X size={20}/></button>
            <div className="modal-header">
              <h2>Inject Mock Transaction</h2>
              <p>Add a fake failed payment to test the AI agent live.</p>
            </div>
            
            <form onSubmit={handleMockSubmit} className="mock-form">
              <div className="form-group">
                <label>Customer Name</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Hackathon Judge" 
                  value={mockData.customer_name}
                  onChange={e => setMockData({...mockData, customer_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Real Email (to receive link)</label>
                <input 
                  type="email" 
                  className="glass-input" 
                  placeholder="judge@example.com" 
                  value={mockData.customer_email}
                  onChange={e => setMockData({...mockData, customer_email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Real Phone (Optional for SMS/WhatsApp)</label>
                <input 
                  type="tel" 
                  className="glass-input" 
                  placeholder="+919876543210" 
                  value={mockData.customer_phone}
                  onChange={e => setMockData({...mockData, customer_phone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Amount (INR)</label>
                <input 
                  type="number" 
                  className="glass-input" 
                  placeholder="e.g. 5000" 
                  value={mockData.amount}
                  onChange={e => setMockData({...mockData, amount: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Failure Reason</label>
                <select 
                  className="glass-input" 
                  value={mockData.failure_reason}
                  onChange={e => setMockData({...mockData, failure_reason: e.target.value})}
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
                >
                  <option value="expired_card">Expired Card (Sends Payment Link)</option>
                  <option value="insufficient_funds">Insufficient Funds (Sends Payment Link)</option>
                  <option value="network_timeout">Network Timeout (Retries)</option>
                  <option value="mandate_revoked">Mandate Revoked (Marks Unrecoverable)</option>
                </select>
              </div>
              <button type="submit" className="primary-btn submit-btn" disabled={isSubmittingMock}>
                {isSubmittingMock ? 'Injecting...' : 'Add Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>

  );
}
