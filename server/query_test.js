require("dotenv").config({ path: ".env" });
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes("supabase") ? { rejectUnauthorized: false } : false });
async function run() {
  const res = await pool.query(`
    SELECT 
      DATE(updated_at) as date,
      SUM(CASE WHEN status = 'recovered' THEN recovered_amount ELSE 0 END) as recovered,
      SUM(CASE WHEN status = 'unrecoverable' THEN amount ELSE 0 END) as failed
    FROM transactions
    WHERE status IN ('recovered', 'unrecoverable')
    GROUP BY DATE(updated_at)
    ORDER BY date ASC
    LIMIT 30;
  `);
  console.log(res.rows);
  process.exit(0);
}
run();
