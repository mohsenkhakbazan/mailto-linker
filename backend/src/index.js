import express from "express";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config.js";
import { apiRouter } from "./routes/api.js";
import { resolveRouter } from "./routes/resolve.js";
import { createLimiter } from "./middleware/rateLimit.js";
import { requireCreateKey } from "./middleware/apiKey.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { deleteExpired, deleteIpDailyBefore } from "./storage/repo.js";

const logger = pino({ level: config.nodeEnv === "production" ? "info" : "debug" });

const app = express();
app.disable("x-powered-by");

// Critical behind nginx so req.ip works correctly (rate limiting & IP daily cap)
app.set("trust proxy", 1);

app.use(helmet());
app.use(pinoHttp({ logger }));

// Prevent huge payloads
app.use(express.json({ limit: "64kb" }));

// Static frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");
app.use("/", express.static(frontendDir, { extensions: ["html"] }));

// API: rate limit + (optional) API key protection + routes
app.use("/api", createLimiter, requireCreateKey, apiRouter);

// Health + resolver
app.use("/", resolveRouter);

app.use(notFound);
app.use(errorHandler);

// Cleanup expired links + old ip_daily rows periodically
function utcDayString(nowMs) {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysUtc(dayStr, daysDelta) {
  // dayStr YYYY-MM-DD -> shift by daysDelta and return YYYY-MM-DD
  const [y, m, d] = dayStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + daysDelta);
  return utcDayString(dt.getTime());
}

function runCleanup() {
  const now = Date.now();

  const deleted = deleteExpired(now);
  if (deleted > 0) logger.info({ deleted }, "Deleted expired links");

  // Keep ip_daily table small: retain last 3 days (today + 2 back)
  const today = utcDayString(now);
  const cutoff = addDaysUtc(today, -2); // delete before cutoff (older than 2 days)
  const deletedIp = deleteIpDailyBefore(cutoff);
  if (deletedIp > 0) logger.info({ deletedIp }, "Deleted old ip_daily rows");
}

runCleanup();
setInterval(runCleanup, config.cleanupIntervalMinutes * 60 * 1000);

app.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv, publicBaseUrl: config.publicBaseUrl },
    "Server started"
  );
});
