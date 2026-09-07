const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { getDb } = require('./db/connection');
const { router: schedulerRouter, startScheduler } = require('./services/scheduler');
const { requireApiKey } = require('./middleware/auth');
const { rateLimit } = require('./middleware/rateLimit');

const app = express();

// Render/Heroku-style proxies: trust the hop so req.ip is the real client and
// the rate limiter doesn't bucket the whole internet under one address.
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// CORS — allowlist instead of a wide-open cors(). ALLOWED_ORIGINS is a comma
// separated list; with none set we fall back to local dev origins.
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin, curl, or a server-to-server call.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Webhooks are mounted BEFORE express.json() with a raw body parser: Razorpay
// signs the raw bytes, so the HMAC must be computed over the original buffer,
// not a re-serialised object. This route authenticates by signature, so it is
// deliberately exempt from the API key.
// ---------------------------------------------------------------------------
app.use(
  '/api/webhooks',
  express.raw({ type: 'application/json', limit: '1mb' }),
  require('./routes/webhooks')
);

// Everything below parses JSON normally.
app.use(express.json({ limit: '256kb' }));

// Health check — unauthenticated on purpose (uptime probes).
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Rate limits: strict where a request costs money or LLM tokens.
// ---------------------------------------------------------------------------
const chatLimiter = rateLimit({ windowMs: 60_000, max: 15, name: 'chat' });
const recoveryLimiter = rateLimit({ windowMs: 60_000, max: 10, name: 'recovery' });
const readLimiter = rateLimit({ windowMs: 60_000, max: 240, name: 'read' });

// ---------------------------------------------------------------------------
// Routes. Read-only aggregate endpoints stay open so the public dashboard demo
// still loads; anything that mutates, spends money, or returns customer PII is
// behind the shared secret.
// ---------------------------------------------------------------------------
app.use('/api/metrics', readLimiter, require('./routes/metrics'));
app.use('/api/audit', readLimiter, require('./routes/audit'));

// /transactions is PII (names, emails, phones) — protected, including the
// /mock injector that can fire real Razorpay notifications at any address.
app.use('/api/transactions', readLimiter, requireApiKey, require('./routes/transactions'));

// Full customer CSV dump.
app.use('/api/export', readLimiter, requireApiKey, require('./routes/export'));

// These spend money / LLM quota.
app.use('/api/recovery', recoveryLimiter, requireApiKey, require('./routes/recovery'));
app.use('/api/chat', chatLimiter, requireApiKey, require('./routes/chat'));
app.use('/api/scheduler', recoveryLimiter, requireApiKey, schedulerRouter);

// CORS rejections arrive here as errors — answer with 403 rather than a stack.
app.use((err, req, res, next) => {
  if (err && /not allowed by CORS/.test(err.message)) {
    return res.status(403).json({ error: err.message });
  }
  if (res.headersSent) return next(err);

  // body-parser and friends set their own status (e.g. 400 for malformed JSON,
  // 413 for an oversized body) — honour it instead of flattening to 500.
  const status = err?.status || err?.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: err.expose ? err.message : 'Bad request' });
  }

  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize DB then start server
const PORT = process.env.PORT || 3001;

getDb().then(() => {
  app.listen(PORT, () => {
    startScheduler();
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`CORS allowlist: ${allowedOrigins.join(', ')}`);
    console.log(
      `Customer notifications: ${process.env.NOTIFY_CUSTOMERS === 'true' ? 'ON' : 'OFF (dry-run)'}`
    );
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
