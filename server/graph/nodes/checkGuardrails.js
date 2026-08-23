const { queryOne } = require("../../db/connection");
const { MAX_RECOVERY_ATTEMPTS, MIN_HOURS_BETWEEN_ATTEMPTS } = require("../../config/constants");

async function checkGuardrails(state) {
  const { transaction, diagnosis } = state;
  const ts = new Date().toISOString();

  // Rule 1: Max attempts reached?
  if (transaction.attempt_count >= MAX_RECOVERY_ATTEMPTS) {
    return {
      guardrailResult: { allowed: false, reason: "blocked_max_attempts" },
      auditLog: { step: "guardrails", timestamp: ts, detail: `BLOCKED: Max attempts (${MAX_RECOVERY_ATTEMPTS}) reached` },
    };
  }

  // Rule 2: Is this retryable?
  if (diagnosis && !diagnosis.is_retryable) {
    return {
      guardrailResult: { allowed: false, reason: "blocked_unrecoverable" },
      auditLog: { step: "guardrails", timestamp: ts, detail: "BLOCKED: Diagnosed as non-retryable" },
    };
  }

  // Rule 3: Cooldown — check time since last attempt
  const lastAction = queryOne(
    "SELECT created_at FROM recovery_actions WHERE transaction_id = ? ORDER BY created_at DESC LIMIT 1",
    [transaction.id]
  );

  if (lastAction) {
    const hoursSince = (Date.now() - new Date(lastAction.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince < MIN_HOURS_BETWEEN_ATTEMPTS) {
      return {
        guardrailResult: { allowed: false, reason: "blocked_cooldown" },
        auditLog: { step: "guardrails", timestamp: ts, detail: `BLOCKED: ${hoursSince.toFixed(1)}h since last attempt (min: ${MIN_HOURS_BETWEEN_ATTEMPTS}h)` },
      };
    }
  }

  // All checks passed
  return {
    guardrailResult: { allowed: true, reason: "passed" },
    auditLog: { step: "guardrails", timestamp: ts, detail: "PASSED: All guardrail checks cleared" },
  };
}

module.exports = checkGuardrails;
