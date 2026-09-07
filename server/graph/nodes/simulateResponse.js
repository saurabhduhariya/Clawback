const { SIMULATION_RATES, RECOVERY_RESULT } = require("../../config/constants");

/**
 * Decide what a dispatched recovery action actually produced.
 *
 * The old code treated any truthy `ref_id` (execute.js synthesised fake refs
 * for reminders and escalations) as an automatic, 100% recovery — false money.
 * The only honest source of a "recovered" row is a customer who paid. A link
 * that Razorpay accepted is outreach delivered, nothing more; whether the
 * customer pays is modelled by SIMULATION_RATES.
 */
async function simulateResponse(state) {
  const { chosenAction, razorpayResponse } = state;
  const ts = new Date().toISOString();

  // 1) The action failed at the API / execution layer (thrown error, unknown
  //    action, or a live call that returned no entity id). The customer never
  //    saw it, so their behaviour is unobservable — never dice-roll a failure
  //    into a success.
  const failedCall =
    !razorpayResponse ||
    razorpayResponse.failed === true ||
    !!(razorpayResponse.response && razorpayResponse.response.error);

  if (failedCall) {
    const where =
      (razorpayResponse && razorpayResponse.response && razorpayResponse.response.error) ||
      (razorpayResponse && razorpayResponse.api_called) ||
      "no response";
    return {
      simulatedOutcome: "api_error",
      recoveryResult: RECOVERY_RESULT.FAILED,
      auditLog: {
        step: "simulate",
        timestamp: ts,
        detail: `Action failed before reaching the customer (${where}). Not simulated.`,
      },
    };
  }

  // 2) Non-revenue actions have no customer behaviour to model and can never
  //    claim a recovery.
  if (chosenAction === "mark_unrecoverable") {
    return {
      simulatedOutcome: "unrecoverable",
      recoveryResult: RECOVERY_RESULT.FAILED,
      auditLog: {
        step: "simulate",
        timestamp: ts,
        detail: "Marked unrecoverable — no simulation needed.",
      },
    };
  }

  if (chosenAction === "escalate_manual") {
    return {
      simulatedOutcome: "escalated",
      recoveryResult: RECOVERY_RESULT.ESCALATED,
      auditLog: {
        step: "simulate",
        timestamp: ts,
        detail: "Recovery handed to a human — never recorded as recovered.",
      },
    };
  }

  // 3) The action was dispatched: a link sent, invoice raised, order created or
  //    reminder delivered. Whether the customer pays is the simulation. ONLY a
  //    'paid' roll is money collected; 'ignored' and 'failed_again' both mean
  //    "still unpaid", so they stay 'dispatched' (updateState parks them in
  //    recovery_sent so a later run can escalate them).
  const rates =
    SIMULATION_RATES[chosenAction] || { paid: 0.3, ignored: 0.5, failed_again: 0.2 };
  const rand = Math.random();

  let outcome;
  if (rand < rates.paid) outcome = "paid";
  else if (rand < rates.paid + rates.ignored) outcome = "ignored";
  else outcome = "failed_again";

  const collected = outcome === "paid";

  return {
    simulatedOutcome: outcome,
    recoveryResult: collected ? RECOVERY_RESULT.SUCCESS : RECOVERY_RESULT.DISPATCHED,
    auditLog: {
      step: "simulate",
      timestamp: ts,
      detail: collected
        ? `Customer paid (${(rates.paid * 100).toFixed(0)}% pay rate for ${chosenAction}).`
        : `Customer ${outcome} — ${chosenAction} delivered but not yet paid.`,
    },
  };
}

module.exports = simulateResponse;
