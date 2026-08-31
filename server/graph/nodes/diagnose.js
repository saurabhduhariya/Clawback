const { getStructuredLlm } = require("../../config/gemini");
const { z } = require("zod");

// Define the structured output schema
const diagnosisSchema = z.object({
  root_cause: z.string().describe("Brief explanation of why this payment failed"),
  is_retryable: z.boolean().describe("Whether this failure can be retried"),
  urgency: z.enum(["high", "medium", "low"]).describe("Urgency of the recovery action"),
  recommended_action: z.enum([
    "create_payment_link",
    "send_invoice",
    "send_reminder",
    "retry_payment",
    "escalate_manual",
    "mark_unrecoverable"
  ]).describe("The best action to recover this payment"),
  reasoning: z.string().describe("Why you recommend this specific action"),
  customer_message: z.string().describe("A polite message to include if contacting the customer"),
  preferred_channel: z.enum(["email", "whatsapp", "sms"]).describe("Best channel to reach this customer: 'whatsapp' for urgent/young users, 'email' for invoices/formal, 'sms' for quick nudges")
});

async function diagnose(state) {
  const { transaction, riskScore } = state;

  const prompt = `You are a payment recovery analyst at a fintech company.
Analyze this failed transaction and provide a structured diagnosis.

Transaction Details:
- Type: ${transaction.type}
- Amount: ₹${(transaction.amount / 100).toFixed(2)}
- Failure Reason: ${transaction.failure_reason}
- Failure Source: ${transaction.failure_source}
- Previous Recovery Attempts: ${transaction.attempt_count}
- Customer: ${transaction.customer_name}
- AI Risk Score: ${riskScore || 'N/A'}/100${riskScore > 70 ? ' (HIGH RISK — escalate faster)' : riskScore > 40 ? ' (MEDIUM RISK)' : ' (LOW RISK — gentle approach)'}

Channel preference by transaction type:
- payment: email > whatsapp > sms
- subscription: whatsapp > email > sms  
- invoice: email > sms
- checkout: whatsapp > email

Rules:
- mandate_revoked and invoice_overdue_60 are NOT retryable (is_retryable = false)
- If attempt_count >= 2, recommend "escalate_manual"
- For insufficient_funds, suggest "create_payment_link" not "retry_payment"
- For network_timeout, "retry_payment" is safe`;

  try {
    const structuredLlm = getStructuredLlm(diagnosisSchema);
    const diagnosis = await structuredLlm.invoke(prompt);

    return {
      diagnosis,
      auditLog: {
        step: "diagnose",
        timestamp: new Date().toISOString(),
        detail: `Root cause: ${diagnosis.root_cause}. Recommended: ${diagnosis.recommended_action} via ${diagnosis.preferred_channel}. Urgency: ${diagnosis.urgency}`,
      },
    };
  } catch (err) {
    console.error("LLM Error:", err.message);
    const fallback = {
      root_cause: `Payment failed due to ${transaction.failure_reason}`,
      is_retryable: !["mandate_revoked", "invoice_overdue_60"].includes(transaction.failure_reason),
      urgency: "medium",
      recommended_action: transaction.attempt_count >= 2 ? "escalate_manual" : "create_payment_link",
      reasoning: "Fallback diagnosis - LLM was unavailable",
      customer_message: `Hi ${transaction.customer_name}, your payment of ₹${(transaction.amount / 100).toFixed(2)} could not be processed. Please try again.`,
      preferred_channel: transaction.type === 'subscription' ? 'whatsapp' : 'email',
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
