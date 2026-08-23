const express = require("express");
const router = express.Router();
const { queryAll, queryOne } = require("../db/connection");

// GET /api/audit/:transactionId — full audit trail for one transaction
router.get("/:transactionId", (req, res) => {
  try {
    const transaction = queryOne("SELECT * FROM transactions WHERE id = ?", [req.params.transactionId]);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const actions = queryAll(
      `SELECT * FROM recovery_actions WHERE transaction_id = ? ORDER BY created_at ASC`,
      [req.params.transactionId]
    );

    // Parse JSON fields for cleaner response
    const parsedActions = actions.map(a => ({
      ...a,
      diagnosis: a.diagnosis ? JSON.parse(a.diagnosis) : null,
      razorpay_request: a.razorpay_request ? JSON.parse(a.razorpay_request) : null,
      razorpay_response: a.razorpay_response ? JSON.parse(a.razorpay_response) : null,
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
