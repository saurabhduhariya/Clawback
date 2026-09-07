const { run } = require("../db/connection");

/**
 * Create a real `recovery_runs` row for a one-off, non-batch recovery (P2-4).
 *
 * `recovery_actions.run_id` is NOT NULL with an FK to `recovery_runs(id)`, and
 * no row with id 0 exists — so the old `runId: 0` used by the webhook and chat
 * paths made every one of their audit inserts fail. Each ad-hoc recovery now
 * gets its own lightweight run row, tagged with where it came from.
 *
 * @param {'webhook'|'chat'|'manual'} source
 * @param {number} atRiskAmount  amount in paise, for the runs list
 * @returns {Promise<number|null>} the new run id, or null if the insert failed
 */
async function createAdHocRun(source, atRiskAmount = 0) {
  try {
    const { lastInsertRowid } = await run(
      `INSERT INTO recovery_runs (total_transactions, total_at_risk_amount, source)
       VALUES (?, ?, ?) RETURNING id`,
      [1, atRiskAmount, source]
    );
    return lastInsertRowid || null;
  } catch (err) {
    console.error(`[runRecord] Failed to create ${source} run row:`, err.message);
    return null;
  }
}

/** Close out an ad-hoc run once its single transaction has been processed. */
async function completeAdHocRun(runId, { recovered = 0 } = {}) {
  if (!runId) return;
  try {
    await run(
      `UPDATE recovery_runs
         SET completed_at = NOW(), status = 'completed',
             total_recovered = ?, recovery_rate = ?
       WHERE id = ?`,
      [recovered, recovered > 0 ? 100 : 0, runId]
    );
  } catch (err) {
    console.error(`[runRecord] Failed to complete run ${runId}:`, err.message);
  }
}

module.exports = { createAdHocRun, completeAdHocRun };
