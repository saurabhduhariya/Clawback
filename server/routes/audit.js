const express = require("express");
const router = express.Router();
const { queryAll, queryOne } = require("../db/connection");

// GET /api/audit/:transactionId — full audit trail for one transaction
router.get("/:transactionId", async (req, res) => {
  try {
    const transaction = await queryOne("SELECT * FROM transactions WHERE id = ?", [req.params.transactionId]);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const actions = await queryAll(
      `SELECT * FROM recovery_actions WHERE transaction_id = ? ORDER BY created_at ASC`,
      [req.params.transactionId]
    );

    // Parse JSON fields for cleaner response
    const parsedActions = actions.map(a => ({
      ...a,
      diagnosis: a.diagnosis ? (typeof a.diagnosis === 'string' ? JSON.parse(a.diagnosis) : a.diagnosis) : null,
      razorpay_request: a.razorpay_request ? (typeof a.razorpay_request === 'string' ? JSON.parse(a.razorpay_request) : a.razorpay_request) : null,
      razorpay_response: a.razorpay_response ? (typeof a.razorpay_response === 'string' ? JSON.parse(a.razorpay_response) : a.razorpay_response) : null,
    }));

    res.json({
      transaction,
      actions: parsedActions,
      total_attempts: actions.length,
      last_action: parsedActions.length > 0 ? parsedActions[parsedActions.length - 1] : null,
    });
  } catch (err) {
    console.error("Audit error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
