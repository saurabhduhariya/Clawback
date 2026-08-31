/**
 * JobManager — In-memory job store that decouples recovery execution
 * from HTTP connections. The LangGraph pipeline runs in the background
 * and pushes logs to subscribers (SSE connections) in real-time.
 * If a client disconnects and reconnects, it replays missed logs.
 */
const buildRecoveryGraph = require("../graph/recoveryGraph");
const { queryAll, run } = require("../db/connection");

// Map<runId, JobState>
const jobs = new Map();

class JobManager {
  /**
   * Start a background recovery job. Returns immediately.
   * The pipeline runs asynchronously and is NOT tied to any HTTP response.
   */
  static startJob(runId, limit = 10) {
    const job = {
      runId,
      status: "running", // running | completed | error
      logs: [],
      results: [],
      summary: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      listeners: new Set(), // SSE response objects currently subscribed
    };

    jobs.set(runId, job);

    // Fire and forget — runs in background
    this._executeJob(job, limit).catch((err) => {
      console.error(`[JobManager] Job ${runId} fatal error:`, err);
      job.status = "error";
      job.completedAt = new Date().toISOString();
      this._pushLog(job, "error", { error: err.message });
    });

    return job;
  }

  /**
   * The actual recovery pipeline execution (runs in background)
   */
  static async _executeJob(job, limit) {
    try {
      const transactions = await queryAll(
        `SELECT * FROM transactions
         WHERE status IN ('failed', 'abandoned', 'overdue')
         AND attempt_count < max_attempts LIMIT ?`,
        [limit]
      );

      if (transactions.length === 0) {
        this._pushLog(job, "complete", {
          message: "No transactions to recover",
          results: [],
        });
        job.status = "completed";
        job.completedAt = new Date().toISOString();
        return;
      }

      this._pushLog(job, "info", {
        message: `Found ${transactions.length} transactions to process.`,
      });

      const graph = buildRecoveryGraph();
      let totalRecovered = 0;
      const totalAtRisk = transactions.reduce((sum, t) => sum + t.amount, 0);

      for (const txn of transactions) {
        this._pushLog(job, "info", {
          message: `Processing transaction ${txn.id} for ${txn.customer_name}`,
        });

        try {
          let finalState = null;
          const stream = await graph.stream(
            { transactionId: txn.id, runId: job.runId },
            { streamMode: "updates" }
          );

          for await (const chunk of stream) {
            const nodeName = Object.keys(chunk)[0];
            const nodeData = chunk[nodeName];

            if (nodeData.auditLog) {
              this._pushLog(job, "log", {
                transactionId: txn.id,
                node: nodeName,
                detail: nodeData.auditLog.detail,
              });
              // Artificial delay so the graph nodes light up visually
              await new Promise((r) => setTimeout(r, 1200));
            }
            finalState = { ...finalState, ...nodeData };
          }

          const isSuccess = finalState?.recoveryResult === "success";
          if (isSuccess) totalRecovered += txn.amount;

          job.results.push({
            id: txn.id,
            customer: txn.customer_name,
            amount: txn.amount,
            type: txn.type,
            action: finalState?.chosenAction,
            result: finalState?.recoveryResult,
          });
        } catch (err) {
          console.error(`[JobManager] Error processing ${txn.id}:`, err.message);
          this._pushLog(job, "error", {
            transactionId: txn.id,
            error: err.message,
          });
          job.results.push({ id: txn.id, result: "error", error: err.message });
        }
      }

      const recoveryRate =
        totalAtRisk > 0
          ? ((totalRecovered / totalAtRisk) * 100).toFixed(1)
          : 0;

      // Update run summary in DB
      await run(
        `UPDATE recovery_runs SET
          completed_at = NOW(), status = 'completed',
          total_recovered = ?, recovery_rate = ?
         WHERE id = ?`,
        [totalRecovered, parseFloat(recoveryRate), job.runId]
      );

      job.summary = {
        runId: job.runId,
        totalProcessed: transactions.length,
        totalAtRisk,
        totalRecovered,
        recoveryRate: parseFloat(recoveryRate),
        results: job.results,
      };

      this._pushLog(job, "complete", job.summary);
      job.status = "completed";
      job.completedAt = new Date().toISOString();
    } catch (err) {
      console.error(`[JobManager] Job ${job.runId} error:`, err);
      this._pushLog(job, "error", { error: err.message });
      job.status = "error";
      job.completedAt = new Date().toISOString();
    }
  }

  /**
   * Push a log entry to the job and notify all SSE listeners
   */
  static _pushLog(job, type, data) {
    const entry = { type, data, index: job.logs.length };
    job.logs.push(entry);

    // Broadcast to all active SSE connections
    for (const listener of job.listeners) {
      try {
        listener.write(
          `event: ${type}\ndata: ${JSON.stringify({ ...data, _index: entry.index })}\n\n`
        );
      } catch (e) {
        // Listener disconnected silently, remove it
        job.listeners.delete(listener);
      }
    }
  }

  static getJob(runId) {
    return jobs.get(Number(runId)) || null;
  }

  static getLatestJob() {
    let latest = null;
    for (const job of jobs.values()) {
      if (!latest || job.startedAt > latest.startedAt) {
        latest = job;
      }
    }
    return latest;
  }

  static subscribe(runId, res) {
    const job = jobs.get(Number(runId));
    if (job) job.listeners.add(res);
  }

  static unsubscribe(runId, res) {
    const job = jobs.get(Number(runId));
    if (job) job.listeners.delete(res);
  }
}

module.exports = JobManager;
