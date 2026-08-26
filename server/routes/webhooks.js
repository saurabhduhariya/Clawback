const express = require('express');
const crypto = require('crypto');
const { run, queryOne } = require('../db/connection');
const buildRecoveryGraph = require('../graph/recoveryGraph');
const router = express.Router();

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_secret';

router.post('/razorpay', async (req, res) => {
  // 1. Verify Signature
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).send('Missing signature');
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== signature) {
    return res.status(400).send('Invalid signature');
  }

  // Acknowledge receipt quickly
  res.status(200).send('Webhook received');

  // 2. Process event asynchronously
  const event = req.body;
  
  if (event.event === 'payment.failed') {
    const payment = event.payload.payment.entity;
    
    // Insert into transactions if doesn't exist
    const existing = queryOne('SELECT id FROM transactions WHERE id = ?', [payment.id]);
    
    if (!existing) {
      run(
        `INSERT INTO transactions 
        (id, amount, currency, status, customer_name, customer_email, customer_phone, failure_reason, failure_source, type, max_attempts) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payment.id,
          payment.amount,
          payment.currency,
          'failed',
          payment.email || 'Unknown', // Basic fallback
          payment.email || 'unknown@example.com',
          payment.contact || '0000000000',
          payment.error_description || 'Unknown error',
          payment.error_source || 'unknown',
          'payment',
          3 // default max attempts
        ]
      );
    }

    // 3. Trigger LangGraph agent autonomously
    try {
      const graph = buildRecoveryGraph();
      // Using 0 as a special runId for automated webhooks
      const result = await graph.invoke({ transactionId: payment.id, runId: 0 });
      console.log(`[Webhook] Autonomous recovery complete for ${payment.id}. Action taken: ${result.chosenAction}`);
    } catch (err) {
      console.error(`[Webhook] Error in autonomous recovery for ${payment.id}:`, err.message);
    }
  }
});

module.exports = router;
