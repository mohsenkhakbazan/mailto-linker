const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
// More robust: extract emails from any messy pasted text
const EMAIL_EXTRACT_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Split tokens for "invalid" reporting (include common unicode comma/semicolon too)
const TOKEN_SPLIT_RE = /[\s,;/]+|[，、；]+/g;

function uniqCaseInsensitive(list) {
  const seen = new Set();
  const out = [];
  for (const s of list) {
    const t = (s || "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function parseRecipients(raw) {
  const text = String(raw || "");

  // 1) Extract all emails (works even if separators are missing)
  const matches = text.match(EMAIL_EXTRACT_RE) || [];
  const emails = uniqCaseInsensitive(matches);

  // 2) Build invalid list:
  // We want to warn only about things that look like emails (contain '@')
  // but are not valid emails. Also: if a token contains multiple emails stuck
  // together, we *don't* want to show it as invalid, since we extracted the
  // valid emails already.
  const tokens = text
    .replace(/\r/g, "\n")
    .split(TOKEN_SPLIT_RE)
    .map(t => t.trim())
    .filter(Boolean);

  const extractedSet = new Set(emails.map(e => e.toLowerCase()));
  const invalid = [];

  for (const tok of tokens) {
    if (!tok.includes("@")) continue;

    // If token is exactly a valid email, OK
    if (EMAIL_RE.test(tok)) continue;

    // If token contains 2+ emails stuck together, we extracted them already → OK
    const embedded = (tok.match(EMAIL_EXTRACT_RE) || []).map(x => x.toLowerCase());
    if (embedded.length >= 1) {
      // If all embedded emails are part of extracted set, and token has no other '@' junk,
      // treat it as fine (common paste issue).
      const allKnown = embedded.every(e => extractedSet.has(e));
      const leftover = tok.replace(EMAIL_EXTRACT_RE, "").replace(/[<>()\[\]"'`.,;:|/\\\s]+/g, "");
      if (allKnown && !leftover) continue;
    }

    // Otherwise it's truly invalid
    invalid.push(tok);
  }

  return { emails, invalid: uniqCaseInsensitive(invalid) };
}

function groupByDomain(emails) {
  const map = new Map();
  for (const e of emails) {
    const parts = e.split("@");
    const domain = (parts[1] || "").toLowerCase();
    map.set(domain, (map.get(domain) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
}

function renderPreview(container, emails) {
  container.innerHTML = "";
  if (emails.length === 0) return;

  const groups = groupByDomain(emails);
  for (const [domain, count] of groups) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = `${domain || "(unknown)"} (${count})`;
    container.appendChild(chip);
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

const toEl = document.getElementById("to");
const ccEl = document.getElementById("cc");
const toPreview = document.getElementById("toPreview");
const ccPreview = document.getElementById("ccPreview");
const errorBox = document.getElementById("errorBox");
const resultBox = document.getElementById("result");
const shortUrlEl = document.getElementById("shortUrl");
const statusEl = document.getElementById("status");
const openBtn = document.getElementById("openBtn");

let lastParsed = {
  to: { emails: [], invalid: [] },
  cc: { emails: [], invalid: [] }
};

function refresh() {
  lastParsed.to = parseRecipients(toEl?.value || "");
  lastParsed.cc = parseRecipients(ccEl?.value || "");

  setText("toCount", String(lastParsed.to.emails.length));
  setText("ccCount", String(lastParsed.cc.emails.length));

  renderPreview(toPreview, lastParsed.to.emails);
  renderPreview(ccPreview, lastParsed.cc.emails);

  const warn = [];

  if (lastParsed.to.emails.length > 100) warn.push("To has more than 100 recipients (limit is 100).");
  if (lastParsed.cc.emails.length > 100) warn.push("CC has more than 100 recipients (limit is 100).");

  // Show invalid tokens (only those that look like emails)
  if (lastParsed.to.invalid.length) {
    warn.push(`Invalid To: ${lastParsed.to.invalid.slice(0, 8).join(", ")}${lastParsed.to.invalid.length > 8 ? "…" : ""}`);
  }
  if (lastParsed.cc.invalid.length) {
    warn.push(`Invalid CC: ${lastParsed.cc.invalid.slice(0, 8).join(", ")}${lastParsed.cc.invalid.length > 8 ? "…" : ""}`);
  }

  // Make the red error box truly dynamic
  if (warn.length) {
    errorBox.textContent = warn.join("\n");
    show(errorBox);
  } else {
    errorBox.textContent = "";
    hide(errorBox);
  }
}

toEl?.addEventListener("input", refresh);
ccEl?.addEventListener("input", refresh);
refresh();

document.getElementById("form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Always clear status/errors initially
  statusEl.textContent = "Generating…";
  hide(resultBox);

  // If there are parser warnings (invalid tokens or too many recipients), block submit
  if (!errorBox.classList.contains("hidden")) {
    statusEl.textContent = "";
    return;
  }

  if (lastParsed.to.emails.length === 0) {
    errorBox.textContent = "Recipient is required";
    show(errorBox);
    statusEl.textContent = "";
    return;
  }

  const subject = document.getElementById("subject")?.value || "";
  const body = document.getElementById("body")?.value || "";
  const ttlDays = Number(document.getElementById("ttl")?.value);

  try {
    const resp = await fetch("/api/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: lastParsed.to.emails,
        cc: lastParsed.cc.emails,
        subject,
        body,
        ttlDays
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg = data?.details?.length
        ? data.details.join("\n")
        : (data?.error || "Request failed");

      errorBox.textContent = msg;
      show(errorBox);
      statusEl.textContent = "";
      return;
    }

    // Success
    shortUrlEl.value = data.url;
    if (openBtn) openBtn.href = data.url;

    hide(errorBox);
    show(resultBox);
    statusEl.textContent = "Done.";
  } catch (_err) {
    errorBox.textContent = "Network error. Please try again.";
    show(errorBox);
    statusEl.textContent = "";
  }
});

async function showCopiedBadge() {
  if (!copiedBadge) return;
  copiedBadge.classList.remove("hidden");
  // small animation class
  copiedBadge.classList.add("show");
  // hide after 1 second
  setTimeout(() => {
    if (!copiedBadge) return;
    copiedBadge.classList.remove("show");
    // leave a short time for transition, then hide completely
    setTimeout(() => copiedBadge.classList.add("hidden"), 160);
  }, 1000);
}

copyBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shortUrlEl.value);
  } catch {
    shortUrlEl.select();
    document.execCommand("copy");
  } finally {
    // show a badge above the copy button
    showCopiedBadge();
  }
});
