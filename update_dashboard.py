import re

with open("client/src/pages/Dashboard.jsx", "r") as f:
    content = f.read()

imports = "import { BarChart as BarChartIcon, Wallet, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';\n"
if "lucide-react" not in content:
    content = content.replace("import { api } from '../utils/api';", "import { api } from '../utils/api';\n" + imports)

# Replace 'No data' icon
content = content.replace(
    '<p className="text-4xl mb-4 opacity-50">📊</p>',
    '<p className="flex justify-center mb-4 opacity-50"><BarChartIcon className="w-10 h-10" /></p>'
)

# Replace cards array
old_cards = """  const cards = [
    { icon: '💰', label: 'Total At Risk', value: fmt(m.total_at_risk), sub: `${m.total_transactions} transactions` },
    { icon: '✅', label: 'Recovered', value: fmt(m.total_recovered), sub: `${m.recovered_count} transactions` },
    { icon: '📈', label: 'Recovery Rate', value: `${m.recovery_rate}%`, sub: 'of total at-risk' },
    { icon: '⚠️', label: 'Unrecoverable', value: fmt(m.total_unrecoverable), sub: `${m.unrecoverable_count} transactions` },
  ];"""

new_cards = """  const cards = [
    { icon: <Wallet className="w-5 h-5 text-white" />, label: 'Total At Risk', value: fmt(m.total_at_risk), sub: `${m.total_transactions} transactions` },
    { icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, label: 'Recovered', value: fmt(m.total_recovered), sub: `${m.recovered_count} transactions` },
    { icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, label: 'Recovery Rate', value: `${m.recovery_rate}%`, sub: 'of total at-risk' },
    { icon: <AlertTriangle className="w-5 h-5 text-red-400" />, label: 'Unrecoverable', value: fmt(m.total_unrecoverable), sub: `${m.unrecoverable_count} transactions` },
  ];"""
content = content.replace(old_cards, new_cards)

with open("client/src/pages/Dashboard.jsx", "w") as f:
    f.write(content)
