import re

with open("client/src/pages/Landing.jsx", "r") as f:
    content = f.read()

imports = "import { Search, BrainCircuit, ShieldCheck, Zap, BarChart3, ClipboardList, BarChart2, CheckCircle2, TrendingUp, Network } from 'lucide-react';\n"
if "lucide-react" not in content:
    content = content.replace("import { motion } from 'framer-motion';", "import { motion } from 'framer-motion';\n" + imports)

# Replace features array
old_features = """  const features = [
    { icon: '🔍', title: 'Auto-Detection', desc: 'Continuously monitors your Razorpay transactions — catches failed payments, abandoned checkouts, and overdue invoices automatically.' },
    { icon: '🧠', title: 'AI Root-Cause Diagnosis', desc: 'Gemini AI analyzes each failure — determines if retryable, urgency level, and the optimal recovery action to take.' },
    { icon: '🛡️', title: 'Smart Guardrails', desc: 'Prevents over-contacting customers with max retry limits, cooldown timers, and non-retryable failure detection.' },
    { icon: '⚡', title: 'One-Click Recovery', desc: 'Creates real Razorpay payment links, invoices, and retry orders through live API calls in test mode.' },
    { icon: '📊', title: 'Recovery Analytics', desc: 'Real-time dashboard with charts showing recovery rates by type, action effectiveness, and run history.' },
    { icon: '📋', title: 'Full Audit Trail', desc: 'Every AI decision, API call, and customer outcome logged with complete explainability for each transaction.' },
  ];"""

new_features = """  const features = [
    { icon: <Search className="w-5 h-5" />, title: 'Auto-Detection', desc: 'Continuously monitors your Razorpay transactions — catches failed payments, abandoned checkouts, and overdue invoices automatically.' },
    { icon: <BrainCircuit className="w-5 h-5" />, title: 'AI Root-Cause Diagnosis', desc: 'Gemini AI analyzes each failure — determines if retryable, urgency level, and the optimal recovery action to take.' },
    { icon: <ShieldCheck className="w-5 h-5" />, title: 'Smart Guardrails', desc: 'Prevents over-contacting customers with max retry limits, cooldown timers, and non-retryable failure detection.' },
    { icon: <Zap className="w-5 h-5" />, title: 'One-Click Recovery', desc: 'Creates real Razorpay payment links, invoices, and retry orders through live API calls in test mode.' },
    { icon: <BarChart3 className="w-5 h-5" />, title: 'Recovery Analytics', desc: 'Real-time dashboard with charts showing recovery rates by type, action effectiveness, and run history.' },
    { icon: <ClipboardList className="w-5 h-5" />, title: 'Full Audit Trail', desc: 'Every AI decision, API call, and customer outcome logged with complete explainability for each transaction.' },
  ];"""
content = content.replace(old_features, new_features)

# Replace StatCards
content = content.replace(
    '<StatCard icon="📊" value="120+" label="Transactions Monitored" delay={0} />',
    '<StatCard icon={<BarChart2 className="w-6 h-6 text-zinc-400" />} value="120+" label="Transactions Monitored" delay={0} />'
)
content = content.replace(
    '<StatCard icon="✅" value="36" label="Payments Recovered" delay={0.1} />',
    '<StatCard icon={<CheckCircle2 className="w-6 h-6 text-zinc-400" />} value="36" label="Payments Recovered" delay={0.1} />'
)
content = content.replace(
    '<StatCard icon="📈" value="26.6%" label="Recovery Rate" delay={0.2} />',
    '<StatCard icon={<TrendingUp className="w-6 h-6 text-zinc-400" />} value="26.6%" label="Recovery Rate" delay={0.2} />'
)
content = content.replace(
    '<StatCard icon="🔗" value="7" label="LangGraph Nodes" delay={0.3} />',
    '<StatCard icon={<Network className="w-6 h-6 text-zinc-400" />} value="7" label="LangGraph Nodes" delay={0.3} />'
)

with open("client/src/pages/Landing.jsx", "w") as f:
    f.write(content)
