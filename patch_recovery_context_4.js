const fs = require('fs');
const path = require('path');

const contextPath = path.join(__dirname, 'client/src/context/RecoveryContext.jsx');
let content = fs.readFileSync(contextPath, 'utf8');

content = content.replace(
  'const startRecovery = useCallback(async (limit = 10) => {',
  'const startRecovery = useCallback(async (options = { limit: 10 }) => {'
);

// We want to handle cases where someone calls startRecovery(10) instead of options object (backwards compatibility).
const bodyLogic = `let bodyPayload;
    if (typeof options === 'number') {
      bodyPayload = { limit: options };
    } else {
      bodyPayload = { limit: options.limit || options.count || 10, transactionId: options.transactionId };
    }

    try {
      const res = await fetch(\`\${API_BASE}/recovery/start\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });`;

content = content.replace(
  /try \{\s*const res = await fetch\(`\$\{API_BASE\}\/recovery\/start`, \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ limit \}\),\s*\}\);/,
  bodyLogic
);

fs.writeFileSync(contextPath, content);
console.log('RecoveryContext.jsx patched again');
