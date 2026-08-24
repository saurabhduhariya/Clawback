import re

with open("client/src/pages/Transactions.jsx", "r") as f:
    content = f.read()

imports = "import { FolderOpen, RefreshCw } from 'lucide-react';\n"
if "lucide-react" not in content:
    content = content.replace("import { api } from '../utils/api';", "import { api } from '../utils/api';\n" + imports)

# Replace 📂
content = content.replace(
    '<p className="text-4xl mb-4 opacity-50">📂</p>',
    '<p className="flex justify-center mb-4 opacity-50"><FolderOpen className="w-10 h-10" /></p>'
)

# Replace ⟳
content = content.replace(
    '<span className="text-zinc-500">⟳</span> Refresh',
    '<RefreshCw className="w-4 h-4 text-zinc-500" /> Refresh'
)

with open("client/src/pages/Transactions.jsx", "w") as f:
    f.write(content)
