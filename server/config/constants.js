module.exports = {
  // ============================================
  // GUARDRAIL RULES
  // ============================================
  MAX_RECOVERY_ATTEMPTS: 3,
  MAX_DAILY_CONTACTS_PER_CUSTOMER: 2,

  // ============================================
  // TRANSACTION STATUSES
  // Single source of truth for the status vocabulary.
  // ============================================
  STATUS: {
    FAILED: 'failed',
    ABANDONED: 'abandoned',
    OVERDUE: 'overdue',
    RECOVERY_SENT: 'recovery_sent',
    ESCALATED: 'escalated',
    RECOVERED: 'recovered',
    UNRECOVERABLE: 'unrecoverable',
  },

  // Statuses the agent may pick up for a fresh recovery attempt.
  // 'recovery_sent' is included deliberately: a dispatched link that went
  // unanswered must escalate on a later attempt rather than sit forever.
  RECOVERABLE_STATUSES: ['failed', 'abandoned', 'overdue', 'recovery_sent'],

  // Statuses whose amount is still outstanding — i.e. genuinely "at risk".
  // 'escalated' is at risk but NOT auto-recoverable (a human owns it now).
  AT_RISK_STATUSES: ['failed', 'abandoned', 'overdue', 'recovery_sent', 'escalated'],

  // Every guardrail block reason MUST map to a terminal status here. An
  // unmapped reason would leave the transaction selectable on every future
  // run; updateState.js warns loudly and burns an attempt as a safety net.
  TERMINAL_GUARDRAIL_STATUS: {
    blocked_max_attempts: 'unrecoverable',
    blocked_unrecoverable: 'unrecoverable',
  },

  // ============================================
  // RECOVERY RESULTS
  // 'success' means money was actually collected — nothing else may claim it.
  // ============================================
  RECOVERY_RESULT: {
    SUCCESS: 'success',        // customer paid
    DISPATCHED: 'dispatched',  // outreach delivered, no payment yet
    ESCALATED: 'escalated',    // handed to a human
    FAILED: 'failed',          // action failed, or customer declined again
  },

  // ============================================
  // FAILURE TYPES
  // ============================================
  FAILURE_TYPES: {
    CARD_DECLINED: 'card_declined',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    NETWORK_TIMEOUT: 'network_timeout',
    EXPIRED_CARD: 'expired_card',
    AUTH_FAILED: 'authentication_failed',
    USER_ABANDONED: 'user_abandoned',
    SESSION_TIMEOUT: 'session_timeout',
    MANDATE_REVOKED: 'mandate_revoked',
    INVOICE_OVERDUE_30: 'invoice_overdue_30',
    INVOICE_OVERDUE_60: 'invoice_overdue_60',
  },

  // ============================================
  // TRANSACTION TYPES
  // ============================================
  TRANSACTION_TYPES: ['payment', 'subscription', 'invoice', 'checkout'],

  // ============================================
  // SIMULATION PROBABILITIES
  // Modelled customer behaviour AFTER an action was successfully dispatched.
  // These never apply to an action that failed at the API layer.
  // ============================================
  SIMULATION_RATES: {
    create_payment_link: { paid: 0.55, ignored: 0.30, failed_again: 0.15 },
    send_invoice:        { paid: 0.45, ignored: 0.40, failed_again: 0.15 },
    send_reminder:       { paid: 0.30, ignored: 0.55, failed_again: 0.15 },
    retry_payment:       { paid: 0.40, ignored: 0.00, failed_again: 0.60 },
  },

  // ============================================
  // STRATEGY MATRIX
  // Maps [transaction_type][attempt_number] -> recovery action
  // ============================================
  STRATEGY_MATRIX: {
    payment: {
      1: 'retry_payment',
      2: 'create_payment_link',
      3: 'send_reminder',
    },
    checkout: {
      1: 'create_payment_link',
      2: 'send_reminder',
      3: 'escalate_manual',
    },
    subscription: {
      1: 'retry_payment',
      2: 'create_payment_link',
      3: 'send_reminder',
    },
    invoice: {
      1: 'send_invoice',
      2: 'send_reminder',
      3: 'escalate_manual',
    },
  },


  // ============================================
  // MULTI-CHANNEL OUTREACH PREFERENCES
  // Priority order per transaction type
  // ============================================
  CHANNEL_PREFERENCE: {
    payment:      ['email', 'whatsapp', 'sms'],
    subscription: ['whatsapp', 'email', 'sms'],
    invoice:      ['email', 'sms'],
    checkout:     ['whatsapp', 'email'],
  },
  // Failure reasons that should never be retried
  NON_RETRYABLE_REASONS: ['mandate_revoked', 'invoice_overdue_60'],

  // ============================================
  // RAZORPAY TEST CREDENTIALS (for documentation only)
  // ============================================
  TEST_CARDS: {
    VISA: '4111 1111 1111 1111',
    MASTERCARD: '5267 3181 8797 5449',
  },
  TEST_UPI: {
    SUCCESS: 'success@razorpay',
    FAILURE: 'failure@razorpay',
  },
};
