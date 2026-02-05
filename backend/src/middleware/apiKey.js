import { config } from "../config.js";

export function requireCreateKey(req, res, next) {
  // Disabled unless CREATE_API_KEY is set
  if (!config.createApiKey) return next();

  const key = req.header("X-API-Key");
  if (key && key === config.createApiKey) return next();

  return res.status(401).json({ error: "Unauthorized" });
}
