import express from "express";
import { config } from "../config.js";
import { deleteById, getLink, touchLink } from "../storage/repo.js";
import {
  buildMailtoUrl,
  inAppBrowserBlocksRedirect,
  renderLandingHtml,
  renderErrorHtml
} from "../utils/mailto.js";
import { isExpired } from "../utils/validate.js";

export const resolveRouter = express.Router();

resolveRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Resolve route: GET /:id
resolveRouter.get("/:id", (req, res) => {
  const id = (req.params.id || "").trim();
  const shortUrl = `${config.publicBaseUrl}/${id}`;

  if (!/^[0-9A-Za-z]{6,12}$/.test(id)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(404).send(
      renderErrorHtml({
        title: "Link not found",
        message: "This link is invalid or was removed.",
        shortUrl
      })
    );
  }

  const row = getLink(id);
  if (!row) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(404).send(
      renderErrorHtml({
        title: "Link not found",
        message: "This link doesn’t exist or has already been deleted.",
        shortUrl
      })
    );
  }

  const now = Date.now();
  if (isExpired(row.expiresAt, now)) {
    deleteById(id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(410).send(
      renderErrorHtml({
        title: "Link expired",
        message: "This link has expired and can no longer open an email draft.",
        shortUrl
      })
    );
  }

  touchLink(id, now);

  const mailto = buildMailtoUrl(row.payload);
  const ua = req.headers["user-agent"] || "";

  // In-app browsers: show landing HTML (more reliable)
  if (inAppBrowserBlocksRedirect(ua) || req.query.landing === "1") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(renderLandingHtml({ mailto, shortUrl }));
  }

  // Prefer direct redirect (fast path)
  res.setHeader("Location", mailto);
  return res.status(302).send("");
});
