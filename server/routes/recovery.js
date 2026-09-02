const express = require("express");
const router = express.Router();
const { queryAll, run } = require("../db/connection");
const JobManager = require("../services/jobManager");

// POST /api/recovery/start — kick off a background recovery job
router.post("/start", async (req, res) => {
  try {
        const limit = parseInt(req.body.limit) || 10;
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
        `SELECT * FROM transactions WHERE id = ? AND status IN ('failed', 'abandoned', 'overdue')`,
        [transactionId]
      );
    } else {
      transactions = await queryAll(
        `SELECT * FROM transactions
         WHERE status IN ('failed', 'abandoned', 'overdue')
         AND attempt_count < max_attempts LIMIT ?`,
        [limit]
      );
    }

    if (transactions.length === 0) {
      return res.json({ runId: null, totalTransactions: 0, message: "No transactions to recover" });
    }

    const totalAtRisk = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Create recovery run record in DB
    const { lastInsertRowid: runId } = await run(
      `INSERT INTO recovery_runs (total_transactions, total_at_risk_amount) VALUES (?, ?) RETURNING id`,
      [transactions.length, totalAtRisk]
    );

    // Start background job (returns immediately)
    JobManager.startJob(runId, { limit, transactionId });

    res.json({ runId, totalTransactions: transactions.length });
  } catch (err) {
    console.error("Recovery start error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recovery/stream/:runId — SSE endpoint that subscribes to an existing job
// Supports reconnection via ?lastIndex=N to replay missed logs
router.get("/stream/:runId", async (req, res) => {
  const runId = parseInt(req.params.runId);
  const lastIndex = parseInt(req.query.lastIndex) || 0;

  const job = JobManager.getJob(runId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Replay all missed logs from lastIndex onwards
  for (let i = lastIndex; i < job.logs.length; i++) {
    const log = job.logs[i];
    res.write(
      `event: ${log.type}\ndata: ${JSON.stringify({ ...log.data, _index: i })}\n\n`
    );
  }

  // If job is already done, close immediately after replaying
  if (job.status !== "running") {
    return res.end();
  }

  // Subscribe for future live logs
  JobManager.subscribe(runId, res);

  // Clean up on disconnect (navigating away, closing tab, etc.)
  req.on("close", () => {
    JobManager.unsubscribe(runId, res);
    // NOTE: The job keeps running! Only the SSE listener is removed.
  });
});

// GET /api/recovery/status/:runId — JSON status check (polling fallback)
router.get("/status/:runId", async (req, res) => {
  const runId = parseInt(req.params.runId);
  const job = JobManager.getJob(runId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json({
    runId: job.runId,
    status: job.status,
    logCount: job.logs.length,
    results: job.results,
    summary: job.summary,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

// GET /api/recovery/latest — get the most recent job info (for reconnection)
router.get("/latest", async (req, res) => {
  const job = JobManager.getLatestJob();
  if (!job) {
    return res.json({ runId: null });
  }

  res.json({
    runId: job.runId,
    status: job.status,
    logCount: job.logs.length,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

// GET /api/recovery/runs — list all past runs
router.get("/runs", async (req, res) => {
  try {
    const runs = await queryAll("SELECT * FROM recovery_runs ORDER BY started_at DESC");
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
