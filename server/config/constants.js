module.exports = {
  // ============================================
  // GUARDRAIL RULES
  // ============================================
  MAX_RECOVERY_ATTEMPTS: 3,
  MAX_DAILY_CONTACTS_PER_CUSTOMER: 2,

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
  // What % of customers pay after each recovery action type
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
