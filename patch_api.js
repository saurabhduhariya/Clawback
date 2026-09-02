const fs = require('fs');
const file = 'client/src/utils/api.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const BASE_URL = '/api';", 
  "const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';"
);

fs.writeFileSync(file, code);
