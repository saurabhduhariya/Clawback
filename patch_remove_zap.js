const fs = require('fs');
const path = require('path');

const txPath = path.join(__dirname, 'client/src/pages/Transactions.jsx');
let txContent = fs.readFileSync(txPath, 'utf8');

txContent = txContent.replace(/<Zap size=\{12\} \/> /g, '');

fs.writeFileSync(txPath, txContent);
console.log('Removed Zap icon from Recover button');
