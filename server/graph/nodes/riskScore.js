const { queryAll } = require("../../db/connection");

/**
 * AI Risk Score Calculator (0-100)
 * Factors:
 *  - Number of past failures (more = higher risk)
 *  - Amount at risk (higher = higher risk)  
 *  - Failure type severity
 *  - Days since first failure (older = higher risk)
 */
async function riskScore(state) {
  const { transaction } = state;
  let score = 0;

  // Factor 1: Past failures (0-30 points)
  const pastFailures = await queryAll(
    `SELECT COUNT(*) as cnt FROM recovery_actions 
     WHERE transaction_id = $1 AND recovery_result != 'success'`,
    [transaction.id]
  );
  const failCount = Number(pastFailures[0]?.cnt || 0);
  score += Math.min(failCount * 10, 30);

  // Factor 2: Amount at risk (0-25 points)
  const amountINR = transaction.amount / 100;
  if (amountINR > 50000) score += 25;
  else if (amountINR > 10000) score += 18;
  else if (amountINR > 5000) score += 12;
  else if (amountINR > 1000) score += 6;

  // Factor 3: Failure type severity (0-25 points)
  const severeFailures = {
    'mandate_revoked': 25,
    'invoice_overdue_60': 22,
    'invoice_overdue_30': 15,
    'expired_card': 18,
    'authentication_failed': 14,
    'card_declined': 12,
    'insufficient_funds': 10,
    'user_abandoned': 8,
    'session_timeout': 5,
    'network_timeout': 3,
  };
  score += severeFailures[transaction.failure_reason] || 10;

  // Factor 4: Age of failure (0-20 points)
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(transaction.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceCreation > 30) score += 20;
  else if (daysSinceCreation > 14) score += 14;
  else if (daysSinceCreation > 7) score += 8;
  else score += 3;

  // Clamp to 0-100
  score = Math.min(Math.max(Math.round(score), 0), 100);

  return {
    riskScore: score,
    auditLog: {
      step: "riskScore",
      timestamp: new Date().toISOString(),
      detail: `Risk score: ${score}/100. Factors: ${failCount} past failures, ₹${amountINR.toFixed(0)} at risk, ${transaction.failure_reason}, ${daysSinceCreation}d old`,
    },
  };
}

module.exports = riskScore;
