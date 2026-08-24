import re

with open("client/src/pages/RecoveryRun.jsx", "r") as f:
    content = f.read()

imports = "import { Zap, Play } from 'lucide-react';\n"
if "lucide-react" not in content:
    content = content.replace("import { api } from '../utils/api';", "import { api } from '../utils/api';\n" + imports)

# Replace background ⚡
content = content.replace(
    '<div className="absolute -right-10 -top-10 text-9xl font-black text-white/5 pointer-events-none select-none">\n          ⚡\n        </div>',
    '<div className="absolute -right-10 -top-10 text-white/5 pointer-events-none select-none">\n          <Zap className="w-64 h-64" />\n        </div>'
)

# Replace box ⚡
content = content.replace(
    '<div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl mb-6 border border-white/10">\n            ⚡\n          </div>',
    '<div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 border border-white/10">\n            <Zap className="w-6 h-6 text-white" />\n          </div>'
)

# Replace ▶
content = content.replace(
    '<span className="text-zinc-500 group-hover:text-white transition-colors">▶</span>',
    '<Play className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />'
)

with open("client/src/pages/RecoveryRun.jsx", "w") as f:
    f.write(content)
