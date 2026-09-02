const fs = require('fs');
const path = require('path');

const contextPath = path.join(__dirname, 'client/src/context/RecoveryContext.jsx');
let content = fs.readFileSync(contextPath, 'utf8');

// The startRecovery function likely has a body object
content = content.replace(
  'body: JSON.stringify({ limit: count, daysBack })',
  'body: JSON.stringify({ limit: count, daysBack, transactionId })'
);

content = content.replace(
  'const startRecovery = async ({ count, daysBack, autoExecute }) => {',
  'const startRecovery = async ({ count, daysBack, autoExecute, transactionId }) => {'
);

fs.writeFileSync(contextPath, content);
console.log('RecoveryContext.jsx patched successfully');
