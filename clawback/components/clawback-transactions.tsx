'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bot, ChevronDown, ChevronRight, Clock3, Download, FolderOpen, Menu, Search, ShieldAlert } from 'lucide-react'

type Status = 'Recovered' | 'Failed' | 'Overdue' | 'Abandoned'
type Risk = 'High' | 'Med' | 'Low'

type Transaction = {
  customer: string
  email: string
  amount: number
  type: string
  recovered: number
  attempts: number
  risk: Risk
  score: number
  status: Status
}

const transactions: Transaction[] = [
  { customer: 'Aarav Mehta', email: 'aarav.mehta@luminex.in', amount: 28400, type: 'Payment', recovered: 28400, attempts: 2, risk: 'Low', score: 18, status: 'Recovered' },
  { customer: 'Maya Patel', email: 'maya.patel@northstar.co', amount: 18900, type: 'Subscription', recovered: 0, attempts: 4, risk: 'High', score: 86, status: 'Failed' },
  { customer: 'Rohan Shah', email: 'rohan.shah@orbitlabs.io', amount: 45600, type: 'Invoice', recovered: 22800, attempts: 3, risk: 'Med', score: 57, status: 'Overdue' },
  { customer: 'Priya Nair', email: 'priya.nair@studioseven.com', amount: 12600, type: 'Checkout', recovered: 12600, attempts: 1, risk: 'Low', score: 12, status: 'Recovered' },
  { customer: 'Kabir Singh', email: 'kabir.singh@vertexpay.in', amount: 67200, type: 'Payment', recovered: 0, attempts: 5, risk: 'High', score: 94, status: 'Abandoned' },
  { customer: 'Ishita Rao', email: 'ishita.rao@fieldnote.app', amount: 9800, type: 'Subscription', recovered: 9800, attempts: 2, risk: 'Low', score: 24, status: 'Recovered' },
  { customer: 'Dev Malhotra', email: 'dev.malhotra@atlasworks.io', amount: 32100, type: 'Invoice', recovered: 0, attempts: 3, risk: 'Med', score: 61, status: 'Failed' },
  { customer: 'Ananya Kapoor', email: 'ananya.kapoor@monsoon.design', amount: 21750, type: 'Payment', recovered: 10875, attempts: 2, risk: 'Med', score: 49, status: 'Overdue' },
]

const formatINR = (value: number) => `₹${value.toLocaleString('en-IN')}`

export default function ClawbackTransactions() {
  const [active, setActive] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)
  const [interval, setIntervalValue] = useState('Every 6h')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Status')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 650)
    return () => window.clearTimeout(timer)
  }, [])
  const filtered = useMemo(() => transactions.filter((transaction) => {
    const matchesQuery = `${transaction.customer} ${transaction.email}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (status === 'All Status' || transaction.status === status)
  }), [query, status])
  const exportCsv = () => {
    const csv = ['Customer,Email,Amount,Type,Recovered,Attempts,Risk,Status', ...transactions.map((t) => `${t.customer},${t.email},${t.amount},${t.type},${t.recovered},${t.attempts},${t.risk},${t.status}`)].join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'clawback-transactions.csv'; link.click(); URL.revokeObjectURL(link.href)
  }
  return <main className="dashboard-shell transactions-shell">
    <div className="dashboard-glow glow-one" />
    <header className="topbar">
      <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button>
      <div className="brand"><span className="brand-mark"><Bot /></span><span>Clawback</span><span className="brand-divider" /><span className="brand-subtitle">AI revenue recovery</span></div>
      <nav className={mobileNav ? 'topnav open' : 'topnav'}><a href="/">Overview</a><a className="active" href="/transactions">Transactions</a><a href="/#activity">Recovery</a></nav>
      <div className="top-actions"><button className="export-button" onClick={exportCsv}><Download /> Export CSV</button><button className={`autopilot ${active ? 'is-active' : ''}`} onClick={() => setActive(!active)}><span className="status-dot" /> Auto-Pilot <span className="autopilot-status">{active ? 'Active' : 'Paused'}</span></button><label className="interval"><Clock3 /><select aria-label="Recovery interval" value={interval} onChange={(event) => setIntervalValue(event.target.value)}><option>Every 2h</option><option>Every 6h</option><option>Every 12h</option><option>Every 24h</option></select><ChevronDown /></label></div>
    </header>
    <div className="page-content transactions-content">
      <section className="transactions-header reveal"><div><p className="eyebrow"><span className="live-pip" /> Recovery ledger</p><h1>Transactions</h1><p>Track every payment recovery attempt across your revenue engine.</p></div><div className="transaction-controls"><label className="search-box"><Search /><input aria-label="Search customers" placeholder="Search customers..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="status-filter"><select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value)}><option>All Status</option><option>Pending</option><option>Recovering</option><option>Recovered</option><option>Failed</option><option>Overdue</option><option>Abandoned</option></select><ChevronDown /></label></div></section>
      <section className="transaction-table-card reveal delay-one">{loading ? <div className="transaction-skeleton" aria-label="Loading transactions">{Array.from({ length: 6 }).map((_, index) => <div className="skeleton-row" key={index}>{Array.from({ length: 8 }).map((__, column) => <span className={`skeleton-bar skeleton-${column}`} key={column} />)}</div>)}</div> : <><div className="table-scroll"><table><thead><tr><th>Customer</th><th>Amount</th><th>Type</th><th>Recovered</th><th>Attempts</th><th>Risk</th><th>Status</th><th aria-label="Open transaction" /></tr></thead><tbody>{filtered.map((transaction, index) => <tr key={transaction.email} style={{ animationDelay: `${index * .03}s` }}><td><strong>{transaction.customer}</strong><small>{transaction.email}</small></td><td className="mono">{formatINR(transaction.amount)}</td><td>{transaction.type}</td><td className={transaction.recovered ? 'recovered mono' : 'muted mono'}>{transaction.recovered ? formatINR(transaction.recovered) : '-'}</td><td>{transaction.attempts}</td><td><span className={`risk-badge ${transaction.recovered ? 'risk-resolved' : `risk-${transaction.risk.toLowerCase()}`}`} title={`AI Risk Score: ${transaction.score}/100 (${transaction.recovered ? 'Resolved' : transaction.risk})`}><ShieldAlert />{transaction.recovered ? 'Resolved' : transaction.risk}</span></td><td><span className={`status-badge status-${transaction.status.toLowerCase()}`}><i />{transaction.status}</span></td><td><ChevronRight className="row-arrow" /></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="transaction-empty"><FolderOpen /><strong>No transactions found</strong><span>Try adjusting your filters or search query</span></div>}</>}</section>
      <footer><span>Clawback <small>AI-powered revenue recovery</small></span><span>Powered by <b>Razorpay</b> <span className="footer-dot" /> All systems operational</span></footer>
    </div>
  </main>
}
