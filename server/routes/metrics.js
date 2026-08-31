const express = require("express");
const router = express.Router();
const { queryAll, queryOne } = require("../db/connection");

// GET /api/metrics — full dashboard summary
router.get("/", async (req, res) => {
  try {
    const total = await queryOne("SELECT COUNT(*) as count, SUM(amount) as total_amount FROM transactions");
    const recovered = await queryOne("SELECT COUNT(*) as count, SUM(recovered_amount) as total FROM transactions WHERE status = 'recovered'");
    const unrecoverable = await queryOne("SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE status = 'unrecoverable'");
    const pending = await queryOne("SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE status IN ('failed','abandoned','overdue')");

    // By type breakdown
    const byType = (await queryAll(`
      SELECT type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recovered,
        SUM(CASE WHEN status = 'recovered' THEN recovered_amount ELSE 0 END) as recovered_amount,
        SUM(amount) as total_amount
      FROM transactions GROUP BY type
    `)).map(row => ({
      ...row,
      rate: row.total > 0 ? parseFloat(((row.recovered / row.total) * 100).toFixed(1)) : 0,
    }));

    // By failure reason breakdown
    const byReason = (await queryAll(`
      SELECT failure_reason,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recovered,
        SUM(amount) as total_amount
      FROM transactions GROUP BY failure_reason ORDER BY total DESC
    `)).map(row => ({
      ...row,
      rate: row.total > 0 ? parseFloat(((row.recovered / row.total) * 100).toFixed(1)) : 0,
    }));

    // Action effectiveness
    const byAction = (await queryAll(`
      SELECT chosen_action,
        COUNT(*) as total,
        SUM(CASE WHEN recovery_result = 'success' THEN 1 ELSE 0 END) as successes
      FROM recovery_actions WHERE chosen_action IS NOT NULL AND chosen_action != 'none'
      GROUP BY chosen_action
    `)).map(row => ({
      ...row,
      rate: row.total > 0 ? parseFloat(((row.successes / row.total) * 100).toFixed(1)) : 0,
    }));

    // Recent runs
    const recentRuns = await queryAll("SELECT * FROM recovery_runs ORDER BY started_at DESC LIMIT 5");

    // Recovery over time (last 14 days filled with 0s for empty days)
    const rawRecoveryOverTime = await queryAll(`
      SELECT TO_CHAR(updated_at, 'YYYY-MM-DD') as date, SUM(recovered_amount) as amount
      FROM transactions
      WHERE status = 'recovered'
      GROUP BY TO_CHAR(updated_at, 'YYYY-MM-DD')
      ORDER BY date ASC
      LIMIT 30
    `);

    const recoveryOverTime = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Format as YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const match = rawRecoveryOverTime.find(r => r.date === dateStr);
      recoveryOverTime.push({
        date: dateStr,
        amount: match ? Number(match.amount) : 0
      });
    }

    const totalAtRisk = Number(total.total_amount) || 0;
    const totalRecovered = Number(recovered.total) || 0;
    const recoveryRate = totalAtRisk > 0 ? parseFloat(((totalRecovered / totalAtRisk) * 100).toFixed(1)) : 0;

    res.json({
      total_transactions: Number(total.count),
      total_at_risk: totalAtRisk,
      total_recovered: totalRecovered,
      total_unrecoverable: Number(unrecoverable.total) || 0,
      total_pending: Number(pending.total) || 0,
      recovery_rate: recoveryRate,
      recovered_count: Number(recovered.count),
      unrecoverable_count: Number(unrecoverable.count),
      pending_count: Number(pending.count),
      by_type: byType,
      by_reason: byReason,
      by_action: byAction,
      recent_runs: recentRuns,
      recovery_over_time: recoveryOverTime,
    });
  } catch (err) {
    console.error("Metrics error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
