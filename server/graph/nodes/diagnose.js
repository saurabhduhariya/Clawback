const llm = require("../../config/gemini");

async function diagnose(state) {
  const { transaction } = state;

  const prompt = `You are a payment recovery analyst at a fintech company.
Analyze this failed transaction and provide a structured diagnosis.

Transaction Details:
- Type: ${transaction.type}
- Amount: ₹${(transaction.amount / 100).toFixed(2)}
- Failure Reason: ${transaction.failure_reason}
- Failure Source: ${transaction.failure_source}
- Previous Recovery Attempts: ${transaction.attempt_count}
- Customer: ${transaction.customer_name}

Respond ONLY with valid JSON in this exact format (no markdown, no backticks):
{
  "root_cause": "Brief explanation of why this payment failed",
  "is_retryable": true,
  "urgency": "high",
  "recommended_action": "create_payment_link",
  "reasoning": "Why you recommend this specific action",
  "customer_message": "A polite message to include if contacting the customer"
}

Rules:
- mandate_revoked and invoice_overdue_60 are NOT retryable (is_retryable = false)
- If attempt_count >= 2, recommend "escalate_manual"
- For insufficient_funds, suggest "create_payment_link" not "retry_payment"
- For network_timeout, "retry_payment" is safe
- urgency must be "high", "medium", or "low"
- recommended_action must be one of: "create_payment_link", "send_invoice", "send_reminder", "retry_payment", "escalate_manual", "mark_unrecoverable"`;

  try {
    const response = await llm.invoke(prompt);
    const text = response.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const diagnosis = JSON.parse(text);

    return {
      diagnosis,
      auditLog: {
        step: "diagnose",
        timestamp: new Date().toISOString(),
        detail: `Root cause: ${diagnosis.root_cause}. Recommended: ${diagnosis.recommended_action}. Urgency: ${diagnosis.urgency}`,
      },
    };
  } catch (err) {
    // Fallback if LLM fails or returns invalid JSON
    const fallback = {
      root_cause: `Payment failed due to ${transaction.failure_reason}`,
      is_retryable: !["mandate_revoked", "invoice_overdue_60"].includes(transaction.failure_reason),
      urgency: "medium",
      recommended_action: transaction.attempt_count >= 2 ? "escalate_manual" : "create_payment_link",
      reasoning: "Fallback diagnosis - LLM was unavailable",
      customer_message: `Hi ${transaction.customer_name}, your payment of ₹${(transaction.amount / 100).toFixed(2)} could not be processed. Please try again.`,
    };

    return {
      diagnosis: fallback,
      auditLog: {
        step: "diagnose",
        timestamp: new Date().toISOString(),
        detail: `LLM error (${err.message}). Used fallback diagnosis. Recommended: ${fallback.recommended_action}`,
      },
    };
  }
}

module.exports = diagnose;
