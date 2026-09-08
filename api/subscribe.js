/**
 * Beta waitlist signup.
 *
 * Until 6 Sep 2026 the form on the landing page did this and only this:
 *
 *     function subscribe(){ if(!input.value.trim())return;
 *       form.style.display="none"; done.style.display=""; }
 *
 * It hid itself, printed "You're on the list." and threw the address away.
 * Nothing was ever sent anywhere. Every address typed since launch is gone.
 * This endpoint is what that message was always claiming existed.
 *
 * Same origin on purpose. The site's CSP is `connect-src 'self'`, so a POST
 * straight to a provider from the page would be blocked by the browser; going
 * through here also keeps the API key server-side, where a key belongs.
 *
 * Storage is whichever is configured, tried in this order:
 *
 *   BLOB_READ_WRITE_TOKEN   -> Vercel Blob. Default, and the reason it is
 *                              first: it needs no account anywhere else. The
 *                              store lives in this same Vercel team, was
 *                              created with --access private, and the token is
 *                              injected by Vercel itself.
 *   LOOPS_API_KEY           -> Loops, if you later want sending and
 *                              unsubscribe handled for you.
 *   RESEND_API_KEY + RESEND_AUDIENCE_ID
 *                           -> Resend. Its contacts accept only
 *                              email/first/last, so the language rides in
 *                              firstName.
 *
 * With none set it answers 503 and stores nothing. It never pretends.
 *
 * One blob per signup, never one growing file. Two people submitting at the
 * same moment would otherwise read the same list and write it back over each
 * other; separate objects cannot collide, and deleting one person on request
 * is deleting one object.
 *
 * Vercel Blob is reached over its HTTP API rather than @vercel/blob, because
 * a dependency means a package.json in dist/, and dist/ is a static folder
 * that must not acquire an install step.
 *
 * CommonJS on purpose. dist/ has no package.json and must not grow one - the
 * project's install command would start matching and a static folder would
 * gain a build step. Without "type": "module" Node reads .js as CommonJS, so
 * `export default` here would fail at runtime. `fetch` is global from Node 18.
 */

const LOCALES = new Set([
  "en", "es", "de", "fr", "pt", "it", "nl", "pl", "tr", "ru", "ja", "ko",
  "zh", "ar", "hi", "id", "bn", "sw", "vi", "tl", "th", "ha", "am",
  "te", "ta", "kn",
]);

// Deliberately not RFC 5322. That grammar accepts things no mail server will,
// and the only thing worth rejecting here is obvious junk: everything else is
// the provider's problem, and it dedupes anyway.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

async function toBlob(email, lang, token) {
  // Path sorts chronologically, and carries enough randomness that two
  // signups in the same millisecond still land as separate objects.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 10);
  const pathname = `signups/${stamp}-${rand}.json`;

  const r = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-version": "7",
      "x-content-type": "application/json",
      // Must be x-vercel-blob-access. Plain "x-access" is ignored, the request
      // then defaults to public, and a private store rejects it with
      // "Cannot use public access on a private store" - which is at least a
      // loud failure rather than a quiet one that publishes addresses.
      "x-vercel-blob-access": "private",
      "x-add-random-suffix": "0",
      "cache-control": "no-store",
    },
    body: JSON.stringify({ email, lang, ts: new Date().toISOString() }),
  });
  if (r.ok) return { ok: true };
  return { ok: false, status: r.status, detail: await r.text() };
}

async function toLoops(email, lang, key) {
  const r = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, source: "jardinly.live", language: lang, userGroup: "beta-waitlist" }),
  });
  // Loops answers 409 for a contact that already exists. Signing up twice is
  // not an error the visitor should be shown.
  if (r.ok || r.status === 409) return { ok: true };
  return { ok: false, status: r.status, detail: await r.text() };
}

async function toResend(email, lang, key, audience) {
  const r = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, first_name: lang, unsubscribed: false }),
  });
  if (r.ok || r.status === 409) return { ok: true };
  return { ok: false, status: r.status, detail: await r.text() };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const body = readBody(req);
  if (!body) return res.status(400).json({ error: "bad_request" });

  // Honeypot. The field is hidden from people and invisible to screen readers;
  // anything that fills it is automated. Answer 200 so the bot has nothing to
  // learn from the difference, and store nothing.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return res.status(200).json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length < 6 || email.length > 254 || !EMAIL.test(email)) {
    return res.status(400).json({ error: "invalid_email" });
  }

  const lang = LOCALES.has(body.lang) ? body.lang : "en";

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const loopsKey = process.env.LOOPS_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;

  let result;
  if (blobToken) {
    result = await toBlob(email, lang, blobToken);
  } else if (loopsKey) {
    result = await toLoops(email, lang, loopsKey);
  } else if (resendKey && audience) {
    result = await toResend(email, lang, resendKey, audience);
  } else {
    // No storage configured. Say so rather than dropping the address the way
    // the old front-end did - a visitor told "you're on the list" when nothing
    // was saved is the bug this file exists to end.
    console.error("subscribe: no provider configured; refusing to accept signups");
    return res.status(503).json({ error: "not_configured" });
  }

  if (!result.ok) {
    // The address is never logged: these logs are not the place for it, and it
    // is not needed to diagnose a provider fault.
    console.error(`subscribe: provider rejected signup, status ${result.status}`,
      String(result.detail).slice(0, 300));
    return res.status(502).json({ error: "upstream" });
  }

  return res.status(200).json({ ok: true });
};
