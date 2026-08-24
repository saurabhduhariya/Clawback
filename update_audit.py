import re

with open("client/src/pages/AuditTrail.jsx", "r") as f:
    content = f.read()

imports = "import { Search, ArrowLeft, Check, X, ExternalLink } from 'lucide-react';\n"
if "lucide-react" not in content:
    content = content.replace("import { api } from '../utils/api';", "import { api } from '../utils/api';\n" + imports)

# Replace 🔍
content = content.replace(
    '<p className="text-4xl mb-3 opacity-50">🔍</p>',
    '<p className="flex justify-center mb-3 opacity-50"><Search className="w-10 h-10" /></p>'
)

# Replace ←
content = content.replace(
    '<span className="text-zinc-600">←</span>',
    '<ArrowLeft className="w-4 h-4 text-zinc-600" />'
)

# Replace ✓ / ✗ in retryable
content = content.replace(
    "{diag.is_retryable ? '✓ Yes' : '✗ No'}",
    "{diag.is_retryable ? <span className=\"flex items-center gap-1\"><Check className=\"w-4 h-4\" /> Yes</span> : <span className=\"flex items-center gap-1\"><X className=\"w-4 h-4\" /> No</span>}"
)

# Replace ↗
content = content.replace(
    '{a.razorpay_short_url} ↗</a>',
    '<span className="flex items-center gap-1">{a.razorpay_short_url} <ExternalLink className="w-3 h-3" /></span></a>'
)

# Replace ✓ / ✗ in Result
content = content.replace(
    "{isSuccess ? '✓ Recovered' : '✗ ' + a.recovery_result}",
    "{isSuccess ? <span className=\"flex items-center gap-1\"><Check className=\"w-4 h-4\" /> Recovered</span> : <span className=\"flex items-center gap-1\"><X className=\"w-4 h-4\" /> {a.recovery_result}</span>}"
)

with open("client/src/pages/AuditTrail.jsx", "w") as f:
    f.write(content)
