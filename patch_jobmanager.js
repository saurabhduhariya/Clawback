const fs = require('fs');
const path = require('path');

const jobManagerPath = path.join(__dirname, 'server/services/jobManager.js');
let content = fs.readFileSync(jobManagerPath, 'utf8');

content = content.replace(
  'static startJob(runId, limit = 10) {',
  'static startJob(runId, options = {}) {'
);

content = content.replace(
  'this._executeJob(job, limit).catch((err) => {',
  'this._executeJob(job, options).catch((err) => {'
);

content = content.replace(
  'static async _executeJob(job, limit) {',
  'static async _executeJob(job, options) {'
);

const newExecute = `    const { limit = 10, transactionId } = options;
    try {
      let transactions = [];
      if (transactionId) {
        transactions = await queryAll(
          \`SELECT * FROM transactions WHERE id = ? AND status IN ('failed', 'abandoned', 'overdue')\`,
          [transactionId]
        );
      } else {
        transactions = await queryAll(
          \`SELECT * FROM transactions
           WHERE status IN ('failed', 'abandoned', 'overdue')
           AND attempt_count < max_attempts LIMIT ?\`,
          [limit]
        );
      }`;

content = content.replace(
  /try \{\s*const transactions = await queryAll\([\s\S]*?\[limit\]\s*\);/,
  newExecute
);

fs.writeFileSync(jobManagerPath, content);
console.log('JobManager patched successfully');
