export function buildMailtoUrl(payload) {
  const to = (payload.to || []).join(",");
  const cc = (payload.cc || []).join(",");

  const parts = [];

  if (payload.subject) {
    parts.push("subject=" + encodeURIComponent(payload.subject));
  }

  if (payload.body) {
    // Normalize line breaks first
    const normalizedBody = payload.body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Mail clients expect CRLF (%0D%0A)
    const bodyForMailto = normalizedBody.replace(/\n/g, "\r\n");

    parts.push("body=" + encodeURIComponent(bodyForMailto));
  }

  if (cc) {
    parts.push("cc=" + encodeURIComponent(cc));
  }

  const query = parts.length ? "?" + parts.join("&") : "";

  // IMPORTANT:
  // - Do NOT encode the entire mailto string
  // - Only encode individual components
  return `mailto:${to}${query}`;
}

export function inAppBrowserBlocksRedirect(userAgent = "") {
  const ua = userAgent.toLowerCase();
  const suspects = [
    "whatsapp",
    "telegram",
    "instagram",
    "fbav",
    "fban",
    "fb_iab",
    "messenger",
    "line",
    "snapchat",
    "tiktok"
  ];
  return suspects.some((s) => ua.includes(s));
}

export function renderLandingHtml({ mailto, shortUrl }) {
  const escapedMailto = mailto.replace(/"/g, "&quot;");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Open Email</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0b0c10;color:#eaeaea}
    .card{max-width:560px;width:92%;background:#111318;border:1px solid #22262f;border-radius:16px;padding:22px;box-shadow:0 10px 25px rgba(0,0,0,.35)}
    h1{font-size:18px;margin:0 0 10px}
    p{margin:0 0 14px;opacity:.9;line-height:1.4}
    a.btn{display:inline-block;text-decoration:none;padding:12px 14px;border-radius:12px;background:#2b6ef7;color:white;font-weight:600}
    .muted{font-size:12px;opacity:.75;margin-top:14px}
    code{background:#0b0c10;padding:2px 6px;border-radius:8px}
  </style>
</head>
<body>
  <div class="card">
    <h1>Opening your email app…</h1>
    <p>If nothing happens, click the button below.</p>
    <p><a class="btn" href="${escapedMailto}">Open email</a></p>
    <p class="muted">Link: <code>${shortUrl}</code></p>
  </div>

  <script>
    try { window.location.href = "${escapedMailto}"; } catch(e){}
  </script>
</body>
</html>`;
}

export function renderErrorHtml({ title, message, shortUrl }) {
  const safeTitle = String(title || "Error").replace(/</g, "&lt;");
  const safeMessage = String(message || "").replace(/</g, "&lt;");
  const safeShortUrl = shortUrl ? String(shortUrl).replace(/</g, "&lt;") : "";
  
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${safeTitle}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0b0c10;color:#eaeaea}
    .card{max-width:560px;width:92%;background:#111318;border:1px solid #22262f;border-radius:16px;padding:22px;box-shadow:0 10px 25px rgba(0,0,0,.35)}
    h1{font-size:18px;margin:0 0 10px}
    p{margin:0 0 14px;opacity:.9;line-height:1.4}
    .muted{font-size:12px;opacity:.75;margin-top:14px}
    code{background:#0b0c10;padding:2px 6px;border-radius:8px}
  </style>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    ${safeShortUrl ? `<p class="muted">Link: <code>${safeShortUrl}</code></p>` : ""}
  </div>
</body>
</html>`;
}
