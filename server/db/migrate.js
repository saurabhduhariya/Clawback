/**
 * Idempotent schema additions for Phase 2. Safe to run repeatedly.
 *
 *   node db/migrate.js
 *
 * Adds:
 *   - recovery_runs.source   — 'batch' | 'scheduler' | 'webhook' | 'chat' | 'manual' (P2-4)
 *   - webhook_events         — Razorpay event-id dedupe table (P2-3)
 *
 * The full migration runner is P4-5; this is the minimum Phase 2 needs so the
 * webhook and chat recovery paths stop violating their foreign key.
 */
const { getDb } = require("./connection");

const STATEMENTS = [
  [
    "recovery_runs.source column",
    `ALTER TABLE recovery_runs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'batch'`,
  ],
  [
    "webhook_events table",
    `CREATE TABLE IF NOT EXISTS webhook_events (
       event_id     TEXT PRIMARY KEY,
       event_type   TEXT,
       received_at  TIMESTAMP DEFAULT NOW()
     )`,
  ],
];

async function migrate() {
  const pool = await getDb();
  console.log("Applying Phase 2 schema additions...\n");

  for (const [label, sql] of STATEMENTS) {
    await pool.query(sql);
    console.log(`✅ ${label}`);
  }

  console.log("\n🎉 Migration complete.");
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = migrate;
