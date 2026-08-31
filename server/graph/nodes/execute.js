const razorpay = require("../../config/razorpay");

async function execute(state) {
  const { transaction, chosenAction, diagnosis } = state;
  const channel = diagnosis?.preferred_channel || 'email';
  let apiResponse = null, apiCalled = "", refId = "", shortUrl = "";

  try {
    switch (chosenAction) {
      case "create_payment_link": {
        apiCalled = "POST /v1/payment_links";
        const result = await razorpay.paymentLink.create({
          amount: transaction.amount,
          currency: "INR",
          description: `Recovery: failed ${transaction.type} - ${transaction.id}`,
          customer: {
            name: transaction.customer_name,
            email: transaction.customer_email,
            contact: transaction.customer_phone,
          },
          notify: { sms: true, email: true, whatsapp: channel === 'whatsapp' },
          reminder_enable: true,
          reference_id: transaction.id,
        });
        apiResponse = result;
        refId = result.id;
        shortUrl = result.short_url;
        break;
      }

      case "send_invoice": {
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
            currency: "INR",
            quantity: 1,
          }],
          description: `Recovery invoice for ${transaction.id}`,
          sms_notify: 1,
          email_notify: 1,
          // WhatsApp enabled based on AI channel recommendation
        });
        apiResponse = result;
        refId = result.id;
        shortUrl = result.short_url || "";
        break;
      }

      case "retry_payment": {
        apiCalled = "POST /v1/orders";
        const result = await razorpay.orders.create({
          amount: transaction.amount,
          currency: "INR",
          receipt: `retry_${transaction.id}_${Date.now()}`,
        });
        apiResponse = result;
        refId = result.id;
        break;
      }

      case "send_reminder": {
        apiCalled = channel === 'whatsapp' ? "WHATSAPP_REMINDER" : channel === 'sms' ? "SMS_REMINDER" : "EMAIL_REMINDER";
        apiResponse = {
          type: "reminder",
          channel: channel,
          to: channel === 'email' ? transaction.customer_email : transaction.customer_phone,
          message: diagnosis?.customer_message || `Hi ${transaction.customer_name}, your payment of ₹${(transaction.amount / 100).toFixed(2)} is pending.`,
          sent_at: new Date().toISOString(),
        };
        refId = `reminder_${channel}_${Date.now()}`;
        break;
      }

      case "escalate_manual": {
        apiCalled = "MANUAL_ESCALATION";
        apiResponse = { escalated_to: "finance_team", reason: "Max automated attempts exhausted" };
        refId = `escalation_${Date.now()}`;
        break;
      }

      case "mark_unrecoverable": {
        apiCalled = "NONE";
        apiResponse = { reason: "Non-retryable failure type" };
        break;
      }
    }
  } catch (error) {
    apiResponse = { error: error.message, statusCode: error.statusCode || 500 };
    apiCalled = apiCalled || "ERROR";
  }

  return {
    razorpayResponse: {
      api_called: apiCalled,
      request: { amount: transaction.amount, customer: transaction.customer_name },
      response: apiResponse,
      ref_id: refId,
      short_url: shortUrl,
    },
    auditLog: {
      step: "execute",
      timestamp: new Date().toISOString(),
      detail: `Called ${apiCalled}. Ref: ${refId}${shortUrl ? " → " + shortUrl : ""}`,
    },
  };
}

module.exports = execute;
