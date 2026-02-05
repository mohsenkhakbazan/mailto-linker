import Database from "better-sqlite3";
import { config } from "../config.js";
import fs from "fs";
import path from "path";

function ensureDirForFile(filepath) {
  const dir = path.dirname(filepath);
  fs.mkdirSync(dir, { recursive: true });
}

ensureDirForFile(config.sqlitePath);

export const db = new Database(config.sqlitePath);

// Improve concurrency
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

db.exec(`
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  last_access_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);

-- Per-IP daily counter table (Part C)
-- day is stored as YYYY-MM-DD (UTC)
CREATE TABLE IF NOT EXISTS ip_daily (
  ip TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (ip, day)
);

CREATE INDEX IF NOT EXISTS idx_ip_daily_day ON ip_daily(day);
`);
