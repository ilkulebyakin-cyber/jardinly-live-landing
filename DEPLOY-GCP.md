# Deploying to GCP

Two supported paths. Firebase Hosting is the least work and keeps every header
this site expects; a Cloud Storage bucket + load balancer is what the previous
version used.

## Option A — Firebase Hosting (recommended)
```bash
npm i -g firebase-tools
firebase login
cd dist
firebase use --add            # pick the existing GCP project
firebase deploy --only hosting
```
`firebase.json` in this folder already sets clean URLs, cache lifetimes,
security headers, Content-Language per locale and the /app + /pitch redirects.
Custom domain: Firebase console -> Hosting -> Add custom domain -> jardinly.live.

## Option B — Cloud Storage bucket (replaces the current site)
```bash
cd dist
BUCKET=gs://jardinly.live ./deploy-gcp.sh
```
The script rsyncs the folder (deleting removed files), applies cache and
Content-Language metadata, points the bucket at index.html / 404.html and makes
objects public. HTTPS and the custom domain come from the external HTTPS load
balancer already in front of the bucket — after deploying, invalidate its CDN
cache.

Security headers (CSP, HSTS, X-Frame-Options) cannot be set on GCS objects.
Add them on the load balancer: Backend bucket -> Custom response headers.

## Language detection
- `middleware.js` is **Vercel only**. It is ignored by Firebase and excluded by
  the GCS script.
- On GCP the detection runs client-side: every page checks `navigator.languages`
  on first visit to `/` and forwards to the matching locale. The choice a visitor
  makes in the header switcher is stored (`jl_lang` cookie + localStorage) and
  always wins afterwards.
- If you want IP/country detection on GCP, the load balancer can route by
  `X-Client-Geo-Region` via a Cloud Run or Cloud Functions rewrite; not required
  for the site to work.

## After deploying
1. Verify: `curl -I https://jardinly.live/ru/` shows `content-language: ru`
2. Google Search Console: submit `https://jardinly.live/sitemap.xml`
3. Check a social preview (og.png) and run Lighthouse on the live URL
