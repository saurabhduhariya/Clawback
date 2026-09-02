const fs = require('fs');
const path = require('path');

const recoveryPath = path.join(__dirname, 'server/routes/recovery.js');
let content = fs.readFileSync(recoveryPath, 'utf8');

const newLogic = `    const limit = parseInt(req.body.limit) || 10;
    const transactionId = req.body.transactionId;

    // Prevent duplicate concurrent runs
    const latest = JobManager.getLatestJob();
    if (latest && latest.status === "running") {
      return res.status(409).json({
        error: "A recovery job is already running",
        runId: latest.runId,
      });
    }

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
  /const limit = parseInt\(req\.body\.limit\) \|\| 10;[\s\S]*?\[limit\]\s*\);/,
  newLogic
);

content = content.replace(
  'JobManager.startJob(runId, limit);',
  'JobManager.startJob(runId, { limit, transactionId });'
);

fs.writeFileSync(recoveryPath, content);
console.log('recovery.js patched successfully');
