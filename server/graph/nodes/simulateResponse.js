const { SIMULATION_RATES } = require("../../config/constants");

async function simulateResponse(state) {
  const { chosenAction } = state;

  // Non-action types don't need simulation
  if (["escalate_manual", "mark_unrecoverable"].includes(chosenAction)) {
    const outcome = chosenAction === "mark_unrecoverable" ? "unrecoverable" : "escalated";
    return {
      simulatedOutcome: outcome,
      recoveryResult: chosenAction === "mark_unrecoverable" ? "failed" : "pending",
      auditLog: {
        step: "simulate", timestamp: new Date().toISOString(),
        detail: `No customer simulation needed (action: ${chosenAction})`,
      },
    };
  }

  // Roll the dice based on action type probabilities
  const rates = SIMULATION_RATES[chosenAction] || { paid: 0.3, ignored: 0.5, failed_again: 0.2 };
  const rand = Math.random();

  let outcome;
  if (rand < rates.paid) outcome = "paid";
  else if (rand < rates.paid + rates.ignored) outcome = "ignored";
  else outcome = "failed_again";

  return {
    simulatedOutcome: outcome,
    recoveryResult: outcome === "paid" ? "success" : "failed",
    auditLog: {
      step: "simulate", timestamp: new Date().toISOString(),
      detail: `Customer response: ${outcome} (${(rates.paid * 100)}% success rate for ${chosenAction})`,
    },
  };
}

module.exports = simulateResponse;
