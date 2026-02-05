import express from "express";
import { config } from "../config.js";
import { validateCreatePayload } from "../utils/validate.js";
import { generateId } from "../utils/id.js";
import {
  insertLink,
  countLinks,
  getIpDailyCount,
  incrementIpDaily
} from "../storage/repo.js";

export const apiRouter = express.Router();

function utcDayString(nowMs) {
  // YYYY-MM-DD in UTC
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

apiRouter.post("/create", (req, res) => {
  // Hard cap total links to prevent disk abuse
  const total = countLinks();
  if (total >= config.maxTotalLinks) {
    return res.status(503).json({
      error: "Service temporarily unavailable",
      details: [`Storage limit reached (MAX_TOTAL_LINKS=${config.maxTotalLinks}). Try again later.`]
    });
  }

  // Per-IP daily cap
  const now = Date.now();
  const day = utcDayString(now);
  const ip = req.ip || "unknown";
  const used = getIpDailyCount(ip, day);

  if (used >= config.ipDailyLimit) {
    return res.status(429).json({
      error: "Daily limit reached",
      details: [`This server allows up to ${config.ipDailyLimit} link creations per IP per day.`]
    });
  }

  const v = validateCreatePayload(req.body);
  if (!v.ok) {
    return res.status(400).json({ error: "Validation failed", details: v.errors });
  }

  const expiresAt = now + v.value.ttlDays * 24 * 60 * 60 * 1000;

  // Generate short URL-safe ID, handle rare collisions by retrying
  let id = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    id = generateId(8);
    try {
      insertLink({
        id,
        payload: {
          to: v.value.to,
          cc: v.value.cc,
          subject: v.value.subject,
          body: v.value.body
        },
        createdAt: now,
        expiresAt
      });

      // Only increment IP usage once creation succeeds
      incrementIpDaily(ip, day);

      const url = `${config.publicBaseUrl}/${id}`;
      return res.json({ id, url });
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }

  return res.status(500).json({ error: "Failed to create link" });
});
