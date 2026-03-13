const Database = require('better-sqlite3');
const path = require('path');

function initDb(dbPath) {
  const db = new Database(dbPath || path.join(__dirname, 'data.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);
  `);

  return db;
}

function insertSnapshot(db, data) {
  const stmt = db.prepare('INSERT INTO snapshots (data_json) VALUES (?)');
  stmt.run(JSON.stringify(data));
}

function getLatest(db) {
  const row = db.prepare('SELECT * FROM snapshots ORDER BY id DESC LIMIT 1').get();
  if (!row) return null;
  return { id: row.id, timestamp: row.timestamp, data: JSON.parse(row.data_json) };
}

function getHistory(db, hours = 24) {
  const rows = db.prepare(
    "SELECT * FROM snapshots WHERE timestamp >= datetime('now', ? || ' hours') ORDER BY timestamp ASC"
  ).all(`-${hours}`);
  return rows.map(r => ({ id: r.id, timestamp: r.timestamp, data: JSON.parse(r.data_json) }));
}

function pruneOld(db, days = 7) {
  db.prepare("DELETE FROM snapshots WHERE timestamp < datetime('now', ? || ' days')").run(`-${days}`);
}

module.exports = { initDb, insertSnapshot, getLatest, getHistory, pruneOld };
