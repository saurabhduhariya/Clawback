const express = require("express");
const router = express.Router();
const { queryAll, run } = require("../db/connection");
const buildRecoveryGraph = require("../graph/recoveryGraph");

// GET /api/recovery/stream — trigger a full batch recovery and stream logs via SSE
router.get("/stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // 1. Get recoverable transactions
    const transactions = queryAll(
      `SELECT * FROM transactions
       WHERE status IN ('failed', 'abandoned', 'overdue')
       AND attempt_count < max_attempts LIMIT ?`,
      [limit]
    );

    if (transactions.length === 0) {
      sendEvent("complete", { message: "No transactions to recover", results: [] });
      return res.end();
    }

    sendEvent("info", { message: `Found ${transactions.length} transactions to process.` });

    // 2. Create recovery run
    const totalAtRisk = transactions.reduce((sum, t) => sum + t.amount, 0);
    const { lastInsertRowid: runId } = run(
      `INSERT INTO recovery_runs (total_transactions, total_at_risk_amount) VALUES (?, ?)`,
      [transactions.length, totalAtRisk]
    );

    const graph = buildRecoveryGraph();
    const results = [];
    let totalRecovered = 0;

    // 3. Process each transaction
    for (const txn of transactions) {
      sendEvent("info", { message: `Processing transaction ${txn.id} for ${txn.customer_name}` });
      
      try {
        let finalState = null;
        const stream = await graph.stream({ transactionId: txn.id, runId }, { streamMode: "updates" });
        
        for await (const chunk of stream) {
          // chunk is an object like { diagnose: { diagnosis: {...} } }
          const nodeName = Object.keys(chunk)[0];
          const nodeData = chunk[nodeName];
          
          if (nodeData.auditLog) {
            sendEvent("log", { 
              transactionId: txn.id, 
              node: nodeName, 
              detail: nodeData.auditLog.detail 
            });
          }
          finalState = { ...finalState, ...nodeData };
        }

        const isSuccess = finalState?.recoveryResult === "success";
        if (isSuccess) totalRecovered += txn.amount;

        results.push({
          id: txn.id,
          customer: txn.customer_name,
          amount: txn.amount,
          type: txn.type,
          action: finalState?.chosenAction,
          result: finalState?.recoveryResult,
        });

      } catch (err) {
        console.error(`Error processing ${txn.id}:`, err.message);
        sendEvent("error", { transactionId: txn.id, error: err.message });
        results.push({ id: txn.id, result: "error", error: err.message });
      }
    }

    const recoveryRate = totalAtRisk > 0 ? ((totalRecovered / totalAtRisk) * 100).toFixed(1) : 0;

    // Update run summary
    run(
      `UPDATE recovery_runs SET
        completed_at = datetime('now'), status = 'completed',
        total_recovered = ?, recovery_rate = ?
       WHERE id = ?`,
      [totalRecovered, parseFloat(recoveryRate), runId]
    );

    sendEvent("complete", {
      runId,
      totalProcessed: transactions.length,
      totalAtRisk,
      totalRecovered,
      recoveryRate: parseFloat(recoveryRate),
      results,
    });
    res.end();

  } catch (err) {
    console.error("Recovery run error:", err);
    sendEvent("error", { error: err.message });
    res.end();
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
