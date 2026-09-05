require("dotenv").config({ path: __dirname + "/../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase") ? { rejectUnauthorized: false } : false
});

async function getDb() {
  return pool;
}

function saveDb() {
  // No-op for PostgreSQL
}

async function queryAll(sql, params = []) {
  // If query already uses $1 style, skip conversion
  const pgSql = /\$\d/.test(sql) ? sql : sql.replace(/\?/g, (() => { let i = 1; return () => "$" + (i++); })());
  const result = await pool.query(pgSql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function run(sql, params = []) {
  // If query already uses $1 style, skip conversion
  const pgSql = /\$\d/.test(sql) ? sql : sql.replace(/\?/g, (() => { let i = 1; return () => "$" + (i++); })());
  
  const result = await pool.query(pgSql, params);
  
  // If the query has RETURNING id, result.rows[0].id will be present.
  let lastInsertRowid = 0;
  if (result.rows && result.rows.length > 0 && result.rows[0].id) {
     lastInsertRowid = result.rows[0].id;
  }
  
  return { changes: result.rowCount, lastInsertRowid };
}

module.exports = { getDb, saveDb, queryAll, queryOne, run, pool };
