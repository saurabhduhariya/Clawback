const { pool } = require("../db/connection");

/**
 * Read-only SQL gateway for the LLM's query_database tool (P2-1).
 *
 * The chat agent takes untrusted user input, so any SQL it emits is
 * attacker-influenced. Layered defence, cheapest check first:
 *   1. Allowlist shape — must be a single bare SELECT / WITH.
 *   2. Denylist — no statement separators, comments, or DDL/DML keywords.
 *   3. Enforced LIMIT, so a bare `SELECT * FROM transactions` can't stream the
 *      whole customer table into the model context.
 *   4. Executed inside `BEGIN TRANSACTION READ ONLY` with a statement_timeout,
 *      then always ROLLBACK — this is the layer that survives a regex bypass.
 *
 * Layer 4 is the real boundary; 1–3 keep obvious abuse out of the logs. The
 * strongest version of this (a Postgres role with SELECT-only grants and its own
 * pool) is noted in the plan as the follow-up — a read-only transaction already
 * blocks writes, but a dedicated role would also survive a superuser mistake.
 */

const MAX_ROWS = 50;
const STATEMENT_TIMEOUT_MS = Number(process.env.SQL_TOOL_TIMEOUT_MS || 3000);

// Keywords that must never appear, even inside an otherwise-SELECT query.
const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|copy|call|do|vacuum|analyze|reindex|cluster|listen|notify|set|reset|lock|prepare|execute|deallocate|discard|refresh|import|pg_read_file|pg_ls_dir|pg_sleep|dblink|lo_import|lo_export)\b/i;

// Statement separators / comment starters — the classic stacked-query escape.
const SEPARATORS = /(;|--|\/\*|\*\/)/;

function validate(sql) {
  if (typeof sql !== "string" || !sql.trim()) {
    return "Query must be a non-empty string.";
  }
  const q = sql.trim();

  if (q.length > 4000) return "Query too long.";
  if (!/^\s*(select|with)\b/i.test(q)) {
    return "Only SELECT queries are allowed. Rewrite this as a SELECT.";
  }
  // A trailing semicolon is harmless and common; strip it before the separator
  // check so we only reject genuine stacked statements.
  const body = q.replace(/;\s*$/, "");
  if (SEPARATORS.test(body)) {
    return "Query may not contain ';', '--', or block comments.";
  }
  if (FORBIDDEN.test(body)) {
    return "Query contains a forbidden keyword. This tool is read-only.";
  }
  return null;
}

function enforceLimit(sql) {
  const q = sql.trim().replace(/;\s*$/, "");
  // Already limited? Clamp it down if the model asked for more than we allow.
  const m = q.match(/\blimit\s+(\d+)\s*$/i);
  if (m) {
    const asked = parseInt(m[1], 10);
    if (asked <= MAX_ROWS) return q;
    return q.replace(/\blimit\s+\d+\s*$/i, `LIMIT ${MAX_ROWS}`);
  }
  return `${q} LIMIT ${MAX_ROWS}`;
}

/**
 * Run one untrusted SELECT. Resolves to { rows } or throws with a message that
 * is safe to hand back to the model.
 */
async function runReadOnlyQuery(sql) {
  const problem = validate(sql);
  if (problem) throw new Error(problem);

  const finalSql = enforceLimit(sql);
  const client = await pool.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    const result = await client.query(finalSql);
    return { rows: result.rows, sql: finalSql };
  } finally {
    // Always roll back: nothing this tool does may ever be committed.
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection already broken — releasing it is enough */
    }
    client.release();
  }
}

module.exports = { runReadOnlyQuery, MAX_ROWS };
