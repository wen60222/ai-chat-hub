const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'aichat.db');
let db = null;
let SQL = null;

async function getDb() {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initSchema();
  seedAdmin();
  persist();

  return db;
}

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('user','admin')),
    credits INTEGER DEFAULT 0,
    subscription_plan TEXT DEFAULT 'free' CHECK(subscription_plan IN ('free','basic','pro','unlimited')),
    subscription_expires TEXT,
    daily_usage INTEGER DEFAULT 0,
    daily_reset_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT '新对话',
    model TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    key_value TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    last_used TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    model TEXT NOT NULL,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','refunded')),
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Indexes
  try { db.run('CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)'); } catch(e) {}
  try { db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)'); } catch(e) {}
  try { db.run('CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id)'); } catch(e) {}
  try { db.run('CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(created_at)'); } catch(e) {}
}

function seedAdmin() {
  const stmt = db.prepare('SELECT id FROM users WHERE role = ?');
  stmt.bind(['admin']);
  const hasAdmin = stmt.step();
  stmt.free();
  
  if (!hasAdmin) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123456', 10);
    db.run('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      'admin', process.env.ADMIN_EMAIL || 'admin@aichat.com', hash, 'admin'
    ]);
    console.log('[DB] Admin account created');
  }
}

// === Query helpers ===

function get(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    stmt.free();
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  persist();
}

module.exports = { getDb, get, all, run };
