import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Bell, Bot, BrainCircuit, Check, CircleDollarSign, Database, Gauge, GitBranch, Layers3, Mail, Menu, Play, Radar, RefreshCw, ShieldCheck, Sparkles, Target, Webhook, X } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchApi } from '../utils/api'

const metrics = [{ day: 'Aug 26', value: 18 }, { day: 'Aug 27', value: 26 }, { day: 'Aug 28', value: 22 }, { day: 'Aug 29', value: 34 }, { day: 'Aug 30', value: 31 }, { day: 'Aug 31', value: 42 }, { day: 'Sep 01', value: 49 }]
const features = [
  [Radar, 'Smart Detection', 'Automatically detects failed payments from Razorpay webhooks in real-time with zero manual monitoring.', 'green'],
  [BrainCircuit, 'AI Diagnosis', 'LangGraph agents analyze failure reasons and pick the optimal recovery strategy.', 'blue'],
  [RefreshCw, 'Multi-Channel Recovery', 'Retries payments, sends reminders, or creates payment links based on AI decisions.', 'amber'],
  [ShieldCheck, 'Guardrail System', 'Safety checks prevent duplicate charges, respect rate limits, and enforce business rules.', 'red'],
  [Target, 'Risk Scoring', 'Hybrid AI scoring predicts recovery probability and prioritizes high-value transactions.', 'purple'],
  [Gauge, 'Auto-Pilot Mode', 'Schedule autonomous recovery runs every 2–24 hours. Set it and forget it.', 'green'],
]
const steps = [
  [Webhook, 'Detect failed payment', 'Webhook trigger'], [Target, 'Calculate risk score', 'AI probability model'], [BrainCircuit, 'Diagnose failure reason', 'LLM analysis'], [ShieldCheck, 'Run guardrail checks', 'Safety validation'], [GitBranch, 'Pick recovery strategy', 'AI decision engine'], [CircleDollarSign, 'Execute recovery action', 'Razorpay API call'], [Bell, 'Simulate outreach', 'WhatsApp or email notification'], [Database, 'Update transaction state', 'DB plus dashboard refresh'],
]

export default function Landing() {
  const [menu, setMenu] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [realMetrics, setRealMetrics] = useState(null)
  useEffect(() => {
    fetchApi('/metrics').then(data => setRealMetrics(data)).catch(console.error)
  }, [])
  const formatAmt = (amt) => {
    if (amt >= 100000) return '₹' + (amt / 100000).toFixed(2) + 'L';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  useEffect(() => { const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible')), { threshold: .12 }); document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el)); return () => observer.disconnect() }, [])
  return <main className="landing-shell">
    <div className="landing-grid" /><div className="landing-orb" /><div className="landing-sweep sweep-one" /><div className="landing-sweep sweep-two" />
    <header className="landing-nav"><Link to="/" className="brand"><span>Clawback</span></Link><button className="landing-menu" aria-label="Toggle navigation" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button><nav className={menu ? 'landing-links open' : 'landing-links'}><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#built-with">Built with</a></nav><Link to="/dashboard" className="landing-launch">Launch Dashboard <ArrowRight /></Link></header>
    <section className="landing-hero"><p className="landing-kicker landing-reveal"><span className="live-pip" /> Autonomous revenue recovery</p><h1 className="landing-reveal delay-one">Failed payments<br /><span>recover themselves.</span></h1><p className="landing-subtitle landing-reveal delay-two">Clawback uses LangGraph AI agents to autonomously detect, diagnose, and recover failed Razorpay payments — without human intervention.</p><div className="landing-actions landing-reveal delay-three"><Link to="/dashboard" className="landing-primary">Launch Dashboard <ArrowRight /></Link><button className="landing-secondary" onClick={() => setShowDemo(true)}><Play /> Watch Demo</button></div><div className="hero-stats landing-reveal delay-four"><span><i /> {realMetrics ? formatAmt(realMetrics.total_recovered) : "₹3.19L"} recovered</span><span><i /> {realMetrics ? realMetrics.recovery_rate + "%" : "56.8%"} recovery rate</span><span><i /> &lt; 2 min avg recovery</span></div></section>
    <section className="trust-bar" id="built-with"><p>Built for the Razorpay ecosystem</p><div><span><CircleDollarSign /> Razorpay</span><span><GitBranch /> LangGraph</span><span><Layers3 /> Node.js</span><span><Database /> PostgreSQL</span><span><Activity /> React</span></div></section>
    <section className="landing-section" id="features"><div className="landing-heading landing-reveal"><p className="landing-kicker">Capabilities</p><h2>Everything you need to stop revenue leakage.</h2><p>Clawback handles the entire recovery pipeline autonomously.</p></div><div className="feature-grid">{features.map(([Icon, title, description, tone], index) => <article className={`feature-card landing-reveal delay-${(index % 4) + 1}`} key={title}><span className={`feature-icon ${tone}`}><Icon /></span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
    <section className="landing-section process-section" id="how-it-works"><div className="landing-heading landing-reveal"><p className="landing-kicker">How it works</p><h2>From failure to recovery in 8 intelligent steps.</h2></div><div className="timeline">{steps.map(([Icon, title, detail], index) => <div className="timeline-step landing-reveal" key={title}><div className="timeline-card"><span className="timeline-icon"><Icon /></span><div><h3>{title}</h3><p>{detail}</p></div></div><span className="timeline-number">{String(index + 1).padStart(2, '0')}</span></div>)}</div></section>
    <section className="landing-section preview-section"><div className="landing-heading landing-reveal"><p className="landing-kicker">Live dashboard preview</p><h2>Real-time visibility into every recovery.</h2></div><div className="mini-dashboard landing-reveal"><div className="mini-glow" /><div className="mini-stats"><MiniStat label="Revenue at risk" value={realMetrics ? formatAmt(realMetrics.total_at_risk) : "₹5,63,444"} /><MiniStat label="Recovered" value={realMetrics ? formatAmt(realMetrics.total_recovered) : "₹3,19,997"} green /><MiniStat label="Recovery rate" value={realMetrics ? realMetrics.recovery_rate + "%" : "56.8%"} /></div><div className="mini-chart"><div><strong>Recovery over time</strong><span>Last 7 days</span></div><ResponsiveContainer width="100%" height="100%"><AreaChart data={realMetrics && realMetrics.recovery_over_time ? realMetrics.recovery_over_time.map(d => ({ day: d.date.slice(5), value: d.amount })) : metrics}><defs><linearGradient id="landingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" stopOpacity=".35" /><stop offset="1" stopColor="#34d399" stopOpacity="0" /></linearGradient></defs><XAxis dataKey="day" hide /><YAxis hide /><Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} /><Area type="monotone" dataKey="value" stroke="#34d399" fill="url(#landingFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></div></section>
    <section className="landing-cta landing-reveal"><Sparkles /><h2>Stop losing revenue.<br /><span>Start recovering.</span></h2><p>Deploy Clawback in minutes. No code changes to your Razorpay integration.</p><Link to="/dashboard" className="landing-primary">Launch Dashboard <ArrowRight /></Link></section>
    <footer className="landing-footer"><span>Clawback — AI-powered revenue recovery</span></footer>
    {showDemo && <div className="demo-overlay" role="dialog" aria-modal="true" aria-label="Clawback demo"><div className="demo-modal"><button aria-label="Close demo" onClick={() => setShowDemo(false)}><X /></button><Play /><h2>Autonomous recovery, in motion.</h2><p>Watch the Clawback agent detect, diagnose, and recover a failed payment in under two minutes.</p><div className="demo-terminal"><span>01</span> webhook.received <b>✓</b><span>02</span> risk.score.calculated <b>✓</b><span>03</span> recovery.strategy.executed <b>✓</b></div></div></div>}
  </main>
}
function MiniStat({ label, value, green }) { return <div><span>{label}</span><strong className={green ? 'green-text' : ''}>{value}</strong><small>+18.6%</small></div> }
