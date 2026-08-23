const { STRATEGY_MATRIX, NON_RETRYABLE_REASONS } = require("../../config/constants");

async function pickStrategy(state) {
  const { transaction, diagnosis } = state;
  const attemptNum = transaction.attempt_count + 1;

  let action;
  if (NON_RETRYABLE_REASONS.includes(transaction.failure_reason)) {
    action = "mark_unrecoverable";
  } else {
    action = STRATEGY_MATRIX[transaction.type]?.[attemptNum] || "escalate_manual";
  }

  return {
    chosenAction: action,
    actionReason: diagnosis?.reasoning || "Rule-based strategy selection",
    auditLog: {
      step: "strategy",
      timestamp: new Date().toISOString(),
      detail: `Chose: ${action} (attempt ${attemptNum} for ${transaction.type})`,
    },
  };
}

module.exports = pickStrategy;
