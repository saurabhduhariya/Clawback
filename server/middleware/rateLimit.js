// Tiny dependency-free fixed-window rate limiter (P2-2). express-rate-limit is
// not installed, so a ~30-line in-memory bucket keeps the blast radius small.
// Only intended to slow drive-by abuse on the mutating endpoints; a real deploy
// behind a load balancer would want a shared store.

const PRUNE_EVERY = 2000; // prune the map once it holds this many keys

function rateLimit({ windowMs = 60_000, max = 100, name = "rate_limit" } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }

  return function rateLimitMiddleware(req, res, next) {
    if (process.env.RATE_LIMIT_DISABLED === "true") return next();

    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();

    let rec = hits.get(key);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(key, rec);
      if (hits.size > PRUNE_EVERY) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
    }
    rec.count += 1;

    if (rec.count > max) {
      return res.status(429).json({
        error: "Too many requests. Please slow down and try again shortly.",
      });
    }
    next();
  };
}

module.exports = { rateLimit };
