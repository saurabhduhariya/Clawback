// Notification policy (P2-5): decide whether a real Razorpay call may actually
// SMS/email a customer.
//
//   NOTIFY_CUSTOMERS=true   enables notifications at all (default OFF — the seed
//                           data contains fabricated contacts).
//   NOTIFY_ALLOWLIST="a@b.c,+910000000000"   optional comma list. When set and
//                           non-empty, only addresses/phones in it may be
//                           notified outside production.
//
// When notifications are off, the code STILL creates the Razorpay entity (so the
// demo shows a real payment link / invoice) — it just doesn't push SMS/email.
function notifyAllowed({ email, contact } = {}) {
  if (process.env.NOTIFY_CUSTOMERS !== "true") return false;
  if (process.env.NODE_ENV === "production") return true; // operator opted in

  const allowlist = (process.env.NOTIFY_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) return true; // opted in, no list → allow

  const hit = (v) => !!v && allowlist.includes(String(v).trim().toLowerCase());
  return hit(email) || hit(contact);
}

module.exports = { notifyAllowed };
