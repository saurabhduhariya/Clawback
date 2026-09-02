const fs = require('fs');

const files = [
  'client/src/pages/Transactions.jsx',
  'client/src/pages/Dashboard.jsx',
  'client/src/components/RecoverBot.jsx',
  'client/src/context/RecoveryContext.jsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  
  if (file.includes('RecoveryContext.jsx')) {
    code = code.replace("const API_BASE = 'http://localhost:3001/api';", "const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3001/api';");
  } else if (file.includes('Transactions.jsx') || file.includes('Dashboard.jsx')) {
    code = code.replace("window.open('http://localhost:3001/api/export/csv'", "window.open(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/export/csv` : 'http://localhost:3001/api/export/csv'");
  } else if (file.includes('RecoverBot.jsx')) {
    code = code.replace("fetch('http://localhost:3001/api/chat'", "fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/chat` : 'http://localhost:3001/api/chat'");
  }

  fs.writeFileSync(file, code);
});
