const fs = require('fs');
const path = require('path');

const txPath = path.join(__dirname, 'client/src/pages/Transactions.jsx');
let txContent = fs.readFileSync(txPath, 'utf8');

txContent = txContent.replace(/import \{ Bot, ChevronDown, ChevronRight, Clock3, Download, FolderOpen, Menu, Search, ShieldAlert \} from 'lucide-react';/, 
  "import { Bot, ChevronDown, ChevronRight, Clock3, Download, FolderOpen, Menu, Search, ShieldAlert, Zap } from 'lucide-react';");

fs.writeFileSync(txPath, txContent);
console.log('Fixed Zap import');
