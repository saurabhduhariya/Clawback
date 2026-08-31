const { getDb } = require("./connection");

async function setup() {
  const pool = await getDb();

  console.log("Creating database tables...\n");

  // Create transactions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id              TEXT PRIMARY KEY,
      customer_name   TEXT NOT NULL,
      customer_email  TEXT NOT NULL,
      customer_phone  TEXT NOT NULL,
      amount          INTEGER NOT NULL,
      currency        TEXT DEFAULT 'INR',
      type            TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'failed',
      failure_reason  TEXT NOT NULL,
      failure_source  TEXT,
      attempt_count   INTEGER DEFAULT 0,
      max_attempts    INTEGER DEFAULT 3,
      razorpay_order_id   TEXT,
      razorpay_payment_id TEXT,
      recovered_amount    INTEGER DEFAULT 0,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("✅ Table \"transactions\" created");

  // Create recovery_runs (has to be before recovery_actions for foreign key)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recovery_runs (
      id                    SERIAL PRIMARY KEY,
      started_at            TIMESTAMP DEFAULT NOW(),
      completed_at          TIMESTAMP,
      status                TEXT DEFAULT 'running',
      total_transactions    INTEGER DEFAULT 0,
      total_at_risk_amount  INTEGER DEFAULT 0,
      total_recovered       INTEGER DEFAULT 0,
      total_unrecoverable   INTEGER DEFAULT 0,
      total_pending         INTEGER DEFAULT 0,
      recovery_rate         REAL DEFAULT 0.0,
      actions_taken         INTEGER DEFAULT 0,
      actions_skipped       INTEGER DEFAULT 0,
      payment_links_created INTEGER DEFAULT 0,
      invoices_created      INTEGER DEFAULT 0,
      reminders_sent        INTEGER DEFAULT 0,
      escalations           INTEGER DEFAULT 0
    );
  `);
  console.log("✅ Table \"recovery_runs\" created");

  // Create recovery_actions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recovery_actions (
      id              SERIAL PRIMARY KEY,
      transaction_id  TEXT NOT NULL,
      run_id          INTEGER NOT NULL,
      attempt_number  INTEGER NOT NULL,
      diagnosis       TEXT,
      guardrail_check TEXT NOT NULL,
      chosen_action   TEXT,
      action_reason   TEXT,
      razorpay_api_called  TEXT,
      razorpay_request     TEXT,
      razorpay_response    TEXT,
      razorpay_ref_id      TEXT,
      razorpay_short_url   TEXT,
      simulated_outcome    TEXT,
      recovery_result      TEXT NOT NULL,
      created_at      TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (run_id) REFERENCES recovery_runs(id)
    );
  `);
  console.log("✅ Table \"recovery_actions\" created");

  console.log("\n🎉 Database setup complete!");
  process.exit(0);
}

setup().catch(err => {
  console.error(err);
  process.exit(1);
});
