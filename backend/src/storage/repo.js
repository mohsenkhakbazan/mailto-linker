import { db } from "./db.js";

const insertStmt = db.prepare(`
  INSERT INTO links (id, payload_json, created_at, expires_at)
  VALUES (@id, @payload_json, @created_at, @expires_at)
`);

const getStmt = db.prepare(`
  SELECT id, payload_json, created_at, expires_at, hits, last_access_at
  FROM links
  WHERE id = ?
`);

const touchStmt = db.prepare(`
  UPDATE links
  SET hits = hits + 1, last_access_at = ?
  WHERE id = ?
`);

const deleteExpiredStmt = db.prepare(`
  DELETE FROM links
  WHERE expires_at < ?
`);

const deleteByIdStmt = db.prepare(`
  DELETE FROM links
  WHERE id = ?
`);

const countLinksStmt = db.prepare(`
  SELECT COUNT(*) AS c FROM links
`);

const getIpDailyStmt = db.prepare(`
  SELECT count FROM ip_daily WHERE ip = ? AND day = ?
`);

const upsertIpDailyStmt = db.prepare(`
  INSERT INTO ip_daily (ip, day, count)
  VALUES (?, ?, 1)
  ON CONFLICT(ip, day)
  DO UPDATE SET count = count + 1
`);

const deleteOldIpDailyStmt = db.prepare(`
  DELETE FROM ip_daily WHERE day < ?
`);

export function insertLink({ id, payload, createdAt, expiresAt }) {
  insertStmt.run({
    id,
    payload_json: JSON.stringify(payload),
    created_at: createdAt,
    expires_at: expiresAt
  });
}

export function getLink(id) {
  const row = getStmt.get(id);
  if (!row) return null;
  return {
    id: row.id,
    payload: JSON.parse(row.payload_json),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    hits: row.hits,
    lastAccessAt: row.last_access_at
  };
}

export function touchLink(id, now) {
  touchStmt.run(now, id);
}

export function deleteExpired(now) {
  return deleteExpiredStmt.run(now).changes;
}

export function deleteById(id) {
  return deleteByIdStmt.run(id).changes;
}

export function countLinks() {
  return countLinksStmt.get().c;
}

export function getIpDailyCount(ip, day) {
  const row = getIpDailyStmt.get(ip, day);
  return row ? row.count : 0;
}

export function incrementIpDaily(ip, day) {
  upsertIpDailyStmt.run(ip, day);
}

export function deleteIpDailyBefore(dayCutoff) {
  // delete rows older than cutoff day string YYYY-MM-DD
  return deleteOldIpDailyStmt.run(dayCutoff).changes;
}
