/**
 * データベース抽象化レイヤー
 * - ローカル開発: sql.js (ファイルベースSQLite)
 * - 本番 (Vercel): @libsql/client (Turso クラウドSQLite)
 */

let dbMode = null; // 'turso' | 'local'
let localDb = null;
let tursoClient = null;
let localSaveTimer = null;

const TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS prizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    points_required INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL,
    admin_id INTEGER NOT NULL,
    admin_lat REAL,
    admin_lng REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (admin_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS point_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT DEFAULT '',
    qr_code_id INTEGER,
    prize_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
    FOREIGN KEY (prize_id) REFERENCES prizes(id)
  )`,
  `CREATE TABLE IF NOT EXISTS scan_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    qr_code_id INTEGER NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id)
  )`
];

async function getDb() {
  if (dbMode) return;

  if (process.env.TURSO_DATABASE_URL) {
    // --- 本番: Turso ---
    const { createClient } = require('@libsql/client');
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    dbMode = 'turso';
  } else {
    // --- ローカル: sql.js ---
    const initSqlJs = require('sql.js');
    const path = require('path');
    const fs = require('fs');
    const DB_PATH = path.join(__dirname, '..', 'data', 'stamp_rally.db');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      localDb = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      localDb = new SQL.Database();
    }
    dbMode = 'local';
  }

  // テーブル作成
  for (const sql of TABLES_SQL) {
    await runQuery(sql);
  }
}

function saveLocalDb() {
  if (dbMode !== 'local' || !localDb) return;
  // デバウンス: 連続書き込み時に毎回保存しない
  if (localSaveTimer) clearTimeout(localSaveTimer);
  localSaveTimer = setTimeout(() => {
    const path = require('path');
    const fs = require('fs');
    const DB_PATH = path.join(__dirname, '..', 'data', 'stamp_rally.db');
    const data = localDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }, 100);
}

async function runQuery(sql, params = []) {
  if (dbMode === 'turso') {
    await tursoClient.execute({ sql, args: params });
  } else {
    localDb.run(sql, params);
    saveLocalDb();
  }
}

async function getOne(sql, params = []) {
  if (dbMode === 'turso') {
    const result = await tursoClient.execute({ sql, args: params });
    return result.rows[0] || null;
  } else {
    const stmt = localDb.prepare(sql);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) result = stmt.getAsObject();
    stmt.free();
    return result;
  }
}

async function getAll(sql, params = []) {
  if (dbMode === 'turso') {
    const result = await tursoClient.execute({ sql, args: params });
    return [...result.rows];
  } else {
    const stmt = localDb.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  }
}

async function getLastInsertId() {
  const row = await getOne('SELECT last_insert_rowid() as id');
  return row ? row.id : null;
}

module.exports = { getDb, runQuery, getOne, getAll, getLastInsertId };
