const razorpay = require("../../config/razorpay");
const { notifyAllowed } = require("../../config/notifyPolicy");

// Razorpay caps reference_id / receipt at 40 characters.
const MAX_REF_LEN = 40;
const buildRef = (prefix, transactionId, attemptNumber) =>
  `${prefix}${transactionId}_a${attemptNumber}`.slice(0, MAX_REF_LEN);

async function execute(state) {
  const { transaction, chosenAction, diagnosis } = state;
  const channel = diagnosis?.preferred_channel || 'email';
  const currency = transaction.currency || 'INR';
  const attemptNumber = (Number(transaction.attempt_count) || 0) + 1;

  // Whether this run may actually SMS/email the customer. The seeded data holds
  // fabricated contacts, so notifications are OFF unless NOTIFY_CUSTOMERS=true.
  // The Razorpay entity is still created either way, so the demo shows a real
  // link — we just don't push it at a stranger.
  const mayNotify = notifyAllowed({
    email: transaction.customer_email,
    contact: transaction.customer_phone,
  });

  let apiResponse = null, apiCalled = "", refId = "", shortUrl = "";

  // isRealApiCall: we actually hit the Razorpay API (vs. a simulated channel).
  // failed: the action we attempted did not succeed. Downstream nodes rely on
  // these two flags to decide what may legitimately be called a recovery.
  let isRealApiCall = false;
  let failed = false;

  // Correlates the Razorpay entity back to our row (used by payment.captured).
  const notes = {
    transaction_id: transaction.id,
    attempt: String(attemptNumber),
  };

  try {
    switch (chosenAction) {
      case "create_payment_link": {
        isRealApiCall = true;
        apiCalled = "POST /v1/payment_links";
        const result = await razorpay.paymentLink.create({
          amount: transaction.amount,
          currency,
          description: diagnosis?.customer_message || `Recovery: failed ${transaction.type} - ${transaction.id}`,
          customer: {
            name: transaction.customer_name,
            email: transaction.customer_email,
            contact: transaction.customer_phone,
          },
          notify: {
            sms: mayNotify,
            email: mayNotify,
            whatsapp: mayNotify && channel === 'whatsapp',
          },
          reminder_enable: mayNotify,
          // Must be unique per Razorpay account — a bare transaction.id makes
          // every retry fail with "reference_id already exists".
          reference_id: buildRef('', transaction.id, attemptNumber),
          notes,
        });
        apiResponse = result;
        refId = result.id;
        shortUrl = result.short_url;
        break;
      }

      case "send_invoice": {
        isRealApiCall = true;
        apiCalled = "POST /v1/invoices";
        const result = await razorpay.invoices.create({
          type: "invoice",
          customer: {
            name: transaction.customer_name,
            email: transaction.customer_email,
            contact: transaction.customer_phone,
          },
          line_items: [{
            name: `Outstanding payment - ${transaction.id}`,
            amount: transaction.amount,
            currency,
            quantity: 1,
          }],
          description: `Recovery invoice for ${transaction.id}`,
          receipt: buildRef('inv_', transaction.id, attemptNumber),
          sms_notify: mayNotify ? 1 : 0,
          email_notify: mayNotify ? 1 : 0,
          notes,
        });
        apiResponse = result;
        refId = result.id;
        shortUrl = result.short_url || "";
        break;
      }

      case "retry_payment": {
        isRealApiCall = true;
        apiCalled = "POST /v1/orders";
        const result = await razorpay.orders.create({
          amount: transaction.amount,
          currency,
          receipt: buildRef('retry_', transaction.id, attemptNumber),
          notes,
        });
        apiResponse = result;
        refId = result.id;
        break;
      }

      case "send_reminder": {
        // Simulated channel — no external API exists for this yet.
        apiCalled = channel === 'whatsapp' ? "WHATSAPP_REMINDER" : channel === 'sms' ? "SMS_REMINDER" : "EMAIL_REMINDER";
        apiResponse = {
          type: "reminder",
          channel: channel,
          simulated: true,
          // No external reminder API exists yet, so nothing is dispatched
          // regardless — this records what the policy would have permitted.
          notifications_enabled: mayNotify,
          to: channel === 'email' ? transaction.customer_email : transaction.customer_phone,
          message: diagnosis?.customer_message || `Hi ${transaction.customer_name}, your payment of ₹${(transaction.amount / 100).toFixed(2)} is pending.`,
          sent_at: new Date().toISOString(),
        };
        refId = `reminder_${channel}_a${attemptNumber}`;
        break;
      }

      case "escalate_manual": {
        apiCalled = "MANUAL_ESCALATION";
        apiResponse = { escalated_to: "finance_team", simulated: true, reason: "Automated recovery handed off for manual review" };
        refId = `escalation_a${attemptNumber}`;
        break;
      }

      case "mark_unrecoverable": {
        apiCalled = "NONE";
        apiResponse = { reason: "Non-retryable failure type" };
        break;
      }

      default: {
        // An action we don't know how to perform must never look like a win.
        failed = true;
        apiCalled = "UNKNOWN_ACTION";
        apiResponse = { error: `No execution path for action "${chosenAction}"` };
        console.warn(`[execute] Unhandled action "${chosenAction}" for ${transaction.id}`);
        break;
      }
    }
  } catch (error) {
    failed = true;
    apiResponse = { error: error.message, statusCode: error.statusCode || 500 };
    apiCalled = apiCalled || "ERROR";
  }

  // A live call that returned nothing usable is a failure, not a success.
  if (isRealApiCall && !refId) {
    failed = true;
    apiResponse = apiResponse || { error: "Razorpay returned no entity id" };
  }

  return {
    razorpayResponse: {
      api_called: apiCalled,
      is_real_api_call: isRealApiCall,
      failed,
      notifications_enabled: mayNotify,
      request: {
        amount: transaction.amount,
        currency,
        customer: transaction.customer_name,
        attempt: attemptNumber,
      },
      response: apiResponse,
      ref_id: refId,
      short_url: shortUrl,
    },
    auditLog: {
      step: "execute",
      timestamp: new Date().toISOString(),
      detail: failed
        ? `Called ${apiCalled} — FAILED: ${apiResponse?.error || 'unknown error'}`
        : `Called ${apiCalled}. Ref: ${refId || 'n/a'}${shortUrl ? " → " + shortUrl : ""}` +
          (isRealApiCall && !mayNotify ? " (customer notifications suppressed — dry run)" : ""),
    },
  };
}

module.exports = execute;
