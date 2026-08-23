const express = require("express");
const router = express.Router();
const { queryAll, queryOne } = require("../db/connection");

// GET /api/metrics — full dashboard summary
router.get("/", (req, res) => {
  try {
    const total = queryOne("SELECT COUNT(*) as count, SUM(amount) as total_amount FROM transactions");
    const recovered = queryOne("SELECT COUNT(*) as count, SUM(recovered_amount) as total FROM transactions WHERE status = 'recovered'");
    const unrecoverable = queryOne("SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE status = 'unrecoverable'");
    const pending = queryOne("SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE status IN ('failed','abandoned','overdue')");

    // By type breakdown
    const byType = queryAll(`
      SELECT type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recovered,
        SUM(CASE WHEN status = 'recovered' THEN recovered_amount ELSE 0 END) as recovered_amount,
        SUM(amount) as total_amount
      FROM transactions GROUP BY type
    `).map(row => ({
      ...row,
      rate: row.total > 0 ? parseFloat(((row.recovered / row.total) * 100).toFixed(1)) : 0,
    }));

    // By failure reason breakdown
    const byReason = queryAll(`
      SELECT failure_reason,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recovered,
        SUM(amount) as total_amount
      FROM transactions GROUP BY failure_reason ORDER BY total DESC
    `).map(row => ({
      ...row,
      rate: row.total > 0 ? parseFloat(((row.recovered / row.total) * 100).toFixed(1)) : 0,
    }));

    // Action effectiveness
    const byAction = queryAll(`
      SELECT chosen_action,
        COUNT(*) as total,
        SUM(CASE WHEN recovery_result = 'success' THEN 1 ELSE 0 END) as successes
      FROM recovery_actions WHERE chosen_action IS NOT NULL AND chosen_action != 'none'
      GROUP BY chosen_action
    `).map(row => ({
      ...row,
      rate: row.total > 0 ? parseFloat(((row.successes / row.total) * 100).toFixed(1)) : 0,
    }));

    // Recent runs
    const recentRuns = queryAll("SELECT * FROM recovery_runs ORDER BY started_at DESC LIMIT 5");

    const totalAtRisk = total.total_amount || 0;
    const totalRecovered = recovered.total || 0;
    const recoveryRate = totalAtRisk > 0 ? parseFloat(((totalRecovered / totalAtRisk) * 100).toFixed(1)) : 0;

    res.json({
      total_transactions: total.count,
      total_at_risk: totalAtRisk,
      total_recovered: totalRecovered,
      total_unrecoverable: unrecoverable.total || 0,
      total_pending: pending.total || 0,
      recovery_rate: recoveryRate,
      recovered_count: recovered.count,
      unrecoverable_count: unrecoverable.count,
      pending_count: pending.count,
      by_type: byType,
      by_reason: byReason,
      by_action: byAction,
      recent_runs: recentRuns,
    });
  } catch (err) {
    console.error("Metrics error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
