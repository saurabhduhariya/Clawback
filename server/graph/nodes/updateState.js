const { run } = require("../../db/connection");

async function updateState(state) {
  const { transaction, recoveryResult, simulatedOutcome, chosenAction,
          diagnosis, guardrailResult, razorpayResponse, runId, actionReason } = state;

  // 1. Fetch the latest transaction state to prevent race conditions overwriting success
  const { queryAll } = require("../../db/connection");
  const latestTxns = await queryAll('SELECT status, recovered_amount, attempt_count FROM transactions WHERE id = ?', [transaction.id]);
  const latestTxn = latestTxns[0] || transaction;

  let newStatus = latestTxn.status;
  let recoveredAmount = latestTxn.recovered_amount || 0;

  if (recoveryResult === "success") {
    newStatus = "recovered";
    recoveredAmount = transaction.amount;
  } else if (chosenAction === "mark_unrecoverable" || guardrailResult?.reason === "blocked_max_attempts") {
    // Only mark unrecoverable if it wasn't already successfully recovered by a concurrent run
    if (latestTxn.status !== "recovered") {
      newStatus = "unrecoverable";
    }
  }

  // Only increment attempt count if the guardrails actually allowed an action
  const increment = (guardrailResult && !guardrailResult.allowed) ? 0 : 1;
  const newAttemptCount = latestTxn.attempt_count + increment;

  // 1. Update the transaction row
  await run(
    `UPDATE transactions SET status = ?, attempt_count = ?,
     recovered_amount = ?, updated_at = NOW() WHERE id = ?`,
    [newStatus, newAttemptCount, recoveredAmount, transaction.id]
  );

  // 2. Insert audit trail record
  await run(
    `INSERT INTO recovery_actions (
      transaction_id, run_id, attempt_number, diagnosis, guardrail_check,
      chosen_action, action_reason, razorpay_api_called, razorpay_request,
      razorpay_response, razorpay_ref_id, razorpay_short_url,
      simulated_outcome, recovery_result
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id, runId, newAttemptCount,
      JSON.stringify(diagnosis), guardrailResult?.reason || "passed",
      chosenAction || "none", actionReason || "",
      razorpayResponse?.api_called || "", JSON.stringify(razorpayResponse?.request || {}),
      JSON.stringify(razorpayResponse?.response || {}), razorpayResponse?.ref_id || "",
      razorpayResponse?.short_url || "", simulatedOutcome || "", recoveryResult || "skipped",
    ]
  );

  return {
    auditLog: {
      step: "complete", timestamp: new Date().toISOString(),
      detail: `Result: ${recoveryResult || "skipped"}. Status → ${newStatus}. ₹${(recoveredAmount / 100).toFixed(2)} recovered.`,
    },
  };
}

module.exports = updateState;
