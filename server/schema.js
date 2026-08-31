require("dotenv").config({ path: ".env" });
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase") ? { rejectUnauthorized: false } : false
});
async function run() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transactions';");
  console.log(res.rows);
  const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'recovery_runs';");
  console.log(res2.rows);
  process.exit(0);
}
run();
