const express = require('express');
const crypto = require('crypto');
const { run } = require('../db/connection');
const buildRecoveryGraph = require('../graph/recoveryGraph');
const { createAdHocRun, completeAdHocRun } = require('../services/runRecord');
const router = express.Router();

// Never fall back to a placeholder secret — a default of 'your_secret' means
// anyone who reads the source can forge a webhook. Missing secret = reject.
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
if (!webhookSecret) {
  const msg =
    '[webhooks] RAZORPAY_WEBHOOK_SECRET is not set — /api/webhooks/razorpay will reject every request.';
  if (process.env.NODE_ENV === 'production') {
    // Fail fast rather than deploy a route that silently drops real events.
    console.error(msg);
  }
  console.warn(msg);
}

/**
 * Razorpay signs the RAW request bytes. Computing the HMAC over
 * JSON.stringify(req.body) re-serialises the parsed object, so key order and
 * whitespace differ from what Razorpay signed and every legitimate webhook was
 * rejected. express.raw() is mounted on this route only (see index.js), before
 * the global express.json(), so req.body is the original Buffer here.
 */
function verifySignature(rawBody, signature) {
  if (!webhookSecret || !signature || !Buffer.isBuffer(rawBody)) return false;

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  // timingSafeEqual throws on length mismatch, so compare lengths first.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Record the event id, returning false if we've already seen it. Razorpay
 * retries delivery; without this each retry launched another agent run.
 */
async function claimEvent(eventId, eventType) {
  if (!eventId) return true; // nothing to dedupe on — process it
  try {
    const { changes } = await run(
      `INSERT INTO webhook_events (event_id, event_type)
       VALUES (?, ?) ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType || '']
    );
    return changes > 0;
  } catch (err) {
    // A missing webhook_events table shouldn't drop real events — warn and
    // process (run `node db/migrate.js` to create it).
    console.error('[Webhook] Dedupe check failed, processing anyway:', err.message);
    return true;
  }
}

router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).send('Missing signature');
  }

  if (!verifySignature(req.body, signature)) {
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).send('Malformed JSON body');
  }

  // Acknowledge fast — Razorpay times out slow endpoints and retries.
  res.status(200).send('Webhook received');

  // Everything past the response is fire-and-forget. The old code left bare
  // awaits out here, so any throw became an unhandled rejection that could take
  // the process down.
  try {
    // Razorpay sends `id` at the top level (x-razorpay-event-id mirrors it).
    const eventId = event.id || req.headers['x-razorpay-event-id'] || null;
    const fresh = await claimEvent(eventId, event.event);
    if (!fresh) {
      console.log(`[Webhook] Duplicate event ${eventId} ignored.`);
      return;
    }

    if (event.event !== 'payment.failed') return;

    const payment = event.payload?.payment?.entity;
    if (!payment?.id) {
      console.warn('[Webhook] payment.failed with no payment entity — skipped.');
      return;
    }

    // Insert-or-ignore rather than check-then-insert: two deliveries of the same
    // event can otherwise both pass the existence check and race to a duplicate
    // primary key.
    await run(
      `INSERT INTO transactions
      (id, amount, currency, status, customer_name, customer_email, customer_phone, failure_reason, failure_source, type, max_attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING`,
      [
        payment.id,
        payment.amount,
        payment.currency || 'INR',
        'failed',
        payment.email || 'Unknown', // Basic fallback
        payment.email || 'unknown@example.com',
        payment.contact || '0000000000',
        payment.error_description || 'Unknown error',
        payment.error_source || 'unknown',
        'payment',
        3, // default max attempts
      ]
    );

    // A real recovery_runs row, so the agent's audit insert satisfies its FK.
    const runId = await createAdHocRun('webhook', payment.amount || 0);

    const graph = buildRecoveryGraph();
    const result = await graph.invoke({ transactionId: payment.id, runId });
    await completeAdHocRun(runId, {
      recovered: result?.recoveryResult === 'success' ? payment.amount || 0 : 0,
    });

    console.log(
      `[Webhook] Autonomous recovery complete for ${payment.id} (run ${runId}). ` +
      `Action: ${result?.chosenAction}. Result: ${result?.recoveryResult}`
    );
  } catch (err) {
    console.error('[Webhook] Error processing event:', err.message);
  }
});

module.exports = router;
