import { config } from "../config.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeEmailList(list) {
  // list expected array of strings (already parsed on frontend)
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    if (typeof raw !== "string") continue;
    const e = raw.trim();
    if (!e) continue;
    const key = e.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export function validateCreatePayload(body) {
  const errors = [];

  const to = normalizeEmailList(body?.to);
  const cc = normalizeEmailList(body?.cc);

  if (to.length === 0) errors.push("Recipient is required.");
  if (to.length > config.maxToRecipients) errors.push(`Max ${config.maxToRecipients} recipients in To.`);
  if (cc.length > config.maxCcRecipients) errors.push(`Max ${config.maxCcRecipients} recipients in CC.`);

  for (const e of to) if (!EMAIL_RE.test(e)) errors.push(`Invalid Recipient address in "To": ${e}`);
  for (const e of cc) if (!EMAIL_RE.test(e)) errors.push(`Invalid Recipient address in "CC": ${e}`);

  const subject = typeof body?.subject === "string" ? body.subject : "";
  const emailBody = typeof body?.body === "string" ? body.body : "";

  if (subject.length > config.maxSubjectChars) errors.push(`Subject too long (max ${config.maxSubjectChars} chars).`);
  if (emailBody.length > config.maxBodyChars) errors.push(`Body too long (max ${config.maxBodyChars} chars).`);

  const ttlDays = Number(body?.ttlDays);
  if (!config.allowedTtlDays.has(ttlDays)) errors.push("Invalid expiration. Allowed: 7, 30, 90 days.");

  return {
    ok: errors.length === 0,
    errors,
    value: {
      to,
      cc,
      subject,
      body: emailBody,
      ttlDays
    }
  };
}

export function isExpired(expiresAtMs, nowMs) {
  return expiresAtMs < nowMs;
}
