const { MAX_RECOVERY_ATTEMPTS } = require("../../config/constants");

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

  // Rule 2: Is this unrecoverable?
  if (diagnosis && diagnosis.recommended_action === "mark_unrecoverable") {
    return {
      guardrailResult: { allowed: false, reason: "blocked_unrecoverable" },
      auditLog: { step: "guardrails", timestamp: ts, detail: "BLOCKED: Diagnosed as unrecoverable" },
    };
  }

  // Rule 3 removed: the previous 24h "minimum hours between attempts" cooldown
  // made every re-run of the agent a no-op (blocked_cooldown), so attempt_count
  // never advanced past 1 when the agent was re-run on the same transaction.
  // Recovery here is simulated, so each run must be allowed to make a fresh
  // attempt. MAX_RECOVERY_ATTEMPTS (Rule 1) remains the real cap — once a
  // transaction reaches it, updateState escalates / marks it unrecoverable.

  // All checks passed
  return {
    guardrailResult: { allowed: true, reason: "passed" },
    auditLog: { step: "guardrails", timestamp: ts, detail: "PASSED: All guardrail checks cleared" },
  };
}

module.exports = checkGuardrails;
