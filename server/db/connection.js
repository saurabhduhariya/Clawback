const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

let db = null;

/**
 * Initialize and return the SQLite database instance.
 * Loads existing DB file if present, otherwise creates a new one.
 */
async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing database file if it exists
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  return db;
}

/**
 * Save the in-memory database to disk.
 * Call this after any write operation (INSERT, UPDATE, DELETE).
 */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Helper: Run a SELECT query and return all rows as an array of objects.
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Helper: Run a SELECT query and return the first row as an object (or null).
 */
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: Run an INSERT/UPDATE/DELETE statement.
 * Returns { changes, lastInsertRowid }.
 */
function run(sql, params = []) {
  db.run(sql, params);
  const changes = db.getRowsModified();
  const lastId = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return { changes, lastInsertRowid: lastId ? lastId.id : 0 };
}

module.exports = { getDb, saveDb, queryAll, queryOne, run, DB_PATH };
