const { queryAll, run } = require("../../db/connection");
const {
  RECOVERY_RESULT,
  TERMINAL_GUARDRAIL_STATUS,
} = require("../../config/constants");

async function updateState(state) {
  const { transaction, recoveryResult, simulatedOutcome, chosenAction,
          diagnosis, guardrailResult, razorpayResponse, runId, actionReason } = state;

  // Fetch the latest transaction so a concurrent run that already recovered the
  // row can't be overwritten or downgraded by this one.
  const latestTxns = await queryAll(
    "SELECT status, recovered_amount, attempt_count FROM transactions WHERE id = ?",
    [transaction.id]
  );
  const latestTxn = latestTxns[0] || transaction;

  const wasRecoveredElsewhere = latestTxn.status === "recovered";
  let newStatus = latestTxn.status;
  let recoveredAmount = latestTxn.recovered_amount || 0;

  // Money actually collected — the ONLY result that may claim a recovery.
  if (recoveryResult === RECOVERY_RESULT.SUCCESS) {
    newStatus = "recovered";
    recoveredAmount = transaction.amount;
  } else if (!wasRecoveredElsewhere) {
    // Guardrail block → terminal status. Map-based so a future reason can't
    // silently re-create the blocked_unrecoverable infinite loop (the row used
    // to stay 'failed', never advance, and be re-selected on every run).
    if (guardrailResult && guardrailResult.allowed === false) {
      const terminal = TERMINAL_GUARDRAIL_STATUS[guardrailResult.reason];
      if (terminal) {
        newStatus = terminal;
      } else {
        // Unknown block reason: don't invent a state. The attempt-consumption
        // rule below still burns one attempt as a safety net against looping.
        console.warn(
          `[updateState] Unmapped guardrail reason "${guardrailResult.reason}" for transaction ${transaction.id}`
        );
      }
    } else if (chosenAction === "mark_unrecoverable") {
      // pickStrategy can emit this directly for a non-retryable failure_reason
      // that diagnose didn't flag; simulateResponse returns FAILED for it.
      newStatus = "unrecoverable";
    } else if (recoveryResult === RECOVERY_RESULT.ESCALATED) {
      // Handed to a human — the agent must not re-select it.
      newStatus = "escalated";
    } else if (recoveryResult === RECOVERY_RESULT.DISPATCHED) {
      // Outreach delivered but unpaid — park in recovery_sent so a later run
      // can escalate it (or, eventually, a payment.captured webhook recovers it).
      newStatus = "recovery_sent";
    }
    // RECOVERY_RESULT.FAILED (api_error, unknown action) leaves the status
    // untouched — the money is still outstanding and honestly still 'failed'.
  }

  // An attempt is only consumed when guardrails let the action through. Blocked
  // runs end in a terminal status above, so their attempt budget is moot.
  const attemptConsumed = guardrailResult && guardrailResult.allowed === false ? 0 : 1;
  const newAttemptCount = latestTxn.attempt_count + attemptConsumed;

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
      detail: newStatus === "recovered"
        ? `Result: ${recoveryResult}. Status → recovered. ₹${(recoveredAmount / 100).toFixed(2)} recovered.`
        : `Result: ${recoveryResult || "skipped"}. Status → ${newStatus}. Amount still outstanding.`,
    },
  };
}

module.exports = updateState;
