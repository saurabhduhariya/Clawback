const express = require("express");
const router = express.Router();
const { queryAll, queryOne, run } = require("../db/connection");
const buildRecoveryGraph = require("../graph/recoveryGraph");

// POST /api/recovery/run — trigger a full batch recovery
router.post("/run", async (req, res) => {
  try {
    // 1. Get all recoverable transactions
    const transactions = queryAll(
      `SELECT * FROM transactions
       WHERE status IN ('failed', 'abandoned', 'overdue')
       AND attempt_count < max_attempts`
    );

    if (transactions.length === 0) {
      return res.json({ message: "No transactions to recover", runId: null, results: [] });
    }

    // 2. Create a recovery_runs record
    const totalAtRisk = transactions.reduce((sum, t) => sum + t.amount, 0);
    const { lastInsertRowid: runId } = run(
      `INSERT INTO recovery_runs (total_transactions, total_at_risk_amount) VALUES (?, ?)`,
      [transactions.length, totalAtRisk]
    );

    // 3. Build the LangGraph and process each transaction
    const graph = buildRecoveryGraph();
    const results = [];

    for (const txn of transactions) {
      try {
        const result = await graph.invoke({
          transactionId: txn.id,
          runId: runId,
        });
        results.push({
          id: txn.id,
          customer: txn.customer_name,
          amount: txn.amount,
          type: txn.type,
          action: result.chosenAction,
          result: result.recoveryResult,
          outcome: result.simulatedOutcome,
        });
      } catch (err) {
        console.error(`Error processing ${txn.id}:`, err.message);
        results.push({ id: txn.id, result: "error", error: err.message });
      }
    }

    // 4. Calculate final metrics
    const successResults = results.filter((r) => r.result === "success");
    const totalRecovered = successResults.reduce((sum, r) => sum + (r.amount || 0), 0);
    const recoveryRate = totalAtRisk > 0 ? ((totalRecovered / totalAtRisk) * 100).toFixed(1) : 0;

    // Update run summary
    run(
      `UPDATE recovery_runs SET
        completed_at = datetime('now'), status = 'completed',
        total_recovered = ?, recovery_rate = ?
       WHERE id = ?`,
      [totalRecovered, parseFloat(recoveryRate), runId]
    );

    res.json({
      runId,
      totalProcessed: transactions.length,
      totalAtRisk,
      totalRecovered,
      recoveryRate: parseFloat(recoveryRate),
      results,
    });
  } catch (err) {
    console.error("Recovery run error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recovery/runs — list all past runs
router.get("/runs", (req, res) => {
  try {
    const runs = queryAll("SELECT * FROM recovery_runs ORDER BY started_at DESC");
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
