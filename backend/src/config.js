import dotenv from "dotenv";

dotenv.config();

function num(name, fallback) {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(name, fallback) {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: str("NODE_ENV", "development"),
  port: num("PORT", 3000),

  publicBaseUrl: str("PUBLIC_BASE_URL", "http://localhost:3000").replace(/\/+$/, ""),
  sqlitePath: str("SQLITE_PATH", "./data/links.db"),

  rateLimitWindowMs: num("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMax: num("RATE_LIMIT_MAX", 30),

  maxSubjectChars: num("MAX_SUBJECT_CHARS", 200),
  maxBodyChars: num("MAX_BODY_CHARS", 10_000),
  maxToRecipients: num("MAX_TO_RECIPIENTS", 100),
  maxCcRecipients: num("MAX_CC_RECIPIENTS", 100),

  cleanupIntervalMinutes: num("CLEANUP_INTERVAL_MINUTES", 1440),

  // Only allow these TTLs
  allowedTtlDays: new Set([7, 30, 90]),

  // Optional create protection: if set, require X-API-Key on POST /api/create
  createApiKey: str("CREATE_API_KEY", ""),

  // Hard cap total rows to reduce disk abuse on public deployments
  maxTotalLinks: num("MAX_TOTAL_LINKS", 200000),

  // Per-IP daily cap to reduce spam creation even if rate limit is bypassed slowly
  ipDailyLimit: num("IP_DAILY_LIMIT", 500)
};
