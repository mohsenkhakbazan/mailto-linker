# Mailto Link Generator (Short Shareable Links)

This app generates short links like:

`https://yourdomain.com/Ab3kZ9Qx`

Clicking the link opens the user's email client with **To/CC/Subject/Body** pre-filled using `mailto:`.

## Important behavior notes

### Direct-open vs landing page
- `GET /<ID>` **tries a direct `302` redirect** to `mailto:...` (fast path).
- Some in-app browsers (WhatsApp/Telegram/Instagram/Facebook, etc.) block automatic `mailto:` redirects.
- For those, the app serves a minimal landing page that:
  - tries `window.location = "mailto:..."`, and
  - shows a big “Open email” button as a guaranteed fallback.
- You can force the landing page by appending `?landing=1` to a link.

### Deleted / expired links
If a link was deleted or expired, the user sees a friendly page:
- **Link not found** (404)
- **Link expired** (410)

## Features
- Non-technical UI to generate short links
- Recipient parsing: `,` `/` `;` whitespace/newlines
- Live recipient counters + domain grouping preview
- Dedup case-insensitively
- Hard limits:
  - To max 100
  - CC max 100
- Expiration: **7 / 30 / 90 days only**
- Server-side storage (SQLite), payload stored as JSON
- Rate limiting + size limits
- Optional API key protection for public deployments
- Expired link cleanup job

---

# Quick start (local)

## Requirements
- Docker + Docker Compose plugin

## Run
```bash
cp .env.example .env
# Set PUBLIC_BASE_URL to http://localhost:3000 for local testing
# Optional: set CREATE_API_KEY if you want the protected creation

docker compose up --build
