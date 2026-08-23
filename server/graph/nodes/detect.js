const { queryOne } = require("../../db/connection");

async function detect(state) {
  const row = queryOne("SELECT * FROM transactions WHERE id = ?", [state.transactionId]);

  if (!row) {
    throw new Error(`Transaction ${state.transactionId} not found`);
  }

  return {
    transaction: row,
    auditLog: {
      step: "detect",
      timestamp: new Date().toISOString(),
      detail: `Loaded ${row.type} transaction: ₹${(row.amount / 100).toFixed(2)} | ${row.failure_reason} | attempts: ${row.attempt_count}/${row.max_attempts}`,
    },
  };
}

module.exports = detect;
