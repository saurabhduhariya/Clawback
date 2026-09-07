const crypto = require("crypto");

// Shared-secret auth for mutating / PII endpoints (P2-2).
// The key is accepted either as the `x-api-key` header (fetch/XHR) or as the
// `?api_key=` query param (EventSource and <a download>-style navigation can't
// set headers). A Vite-bundled key is a drive-by shield, not real auth — if
// this app outlives the hackathon, replace it with real sessions.
let warnedDev = false;

function requireApiKey(req, res, next) {
  const configured = process.env.API_KEY;

  if (!configured) {
    // Fail closed in production (never run an open, live backend silently).
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "API key not configured on the server" });
    }
    // Dev convenience: warn once, stay usable out of the box.
    if (!warnedDev) {
      warnedDev = true;
      console.warn(
        "[auth] API_KEY is not set — protected routes are open. Set API_KEY (server) " +
        "and VITE_API_KEY (client build) before deploying."
      );
    }
    return next();
  }

  const candidate = String(req.get("x-api-key") || req.query.api_key || "");
  const expected = Buffer.from(configured);
  const actual = Buffer.from(candidate);

  const ok =
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected);

  if (!ok) {
    return res.status(401).json({ error: "Unauthorized: missing or invalid API key" });
  }
  next();
}

module.exports = { requireApiKey };
