#!/usr/bin/env bash
# Deploy the static site to a Google Cloud Storage bucket fronted by an HTTPS load balancer.
# Usage:  BUCKET=gs://jardinly.live ./deploy-gcp.sh
set -euo pipefail
BUCKET="${BUCKET:-gs://jardinly.live}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

echo "==> Syncing to $BUCKET"
gsutil -m rsync -r -d \
  -x '^(README\.md|DEPLOY-GCP\.md|deploy-gcp\.sh|vercel\.json|firebase\.json|middleware\.js)$' \
  . "$BUCKET"

echo "==> Cache headers"
gsutil -m setmeta -h "Cache-Control:public, max-age=0, must-revalidate" "$BUCKET/**.html" || true
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "$BUCKET/assets/**" || true
gsutil -m setmeta -h "Cache-Control:public, max-age=604800" "$BUCKET/og.png" "$BUCKET/icon-32.png" "$BUCKET/icon-180.png" "$BUCKET/icon-512.png" || true

echo "==> Content-Language per locale"
gsutil -m setmeta -h "Content-Language:es" "$BUCKET/es/index.html" || true
gsutil -m setmeta -h "Content-Language:de" "$BUCKET/de/index.html" || true
gsutil -m setmeta -h "Content-Language:fr" "$BUCKET/fr/index.html" || true
gsutil -m setmeta -h "Content-Language:pt-BR" "$BUCKET/pt/index.html" || true
gsutil -m setmeta -h "Content-Language:it" "$BUCKET/it/index.html" || true
gsutil -m setmeta -h "Content-Language:nl" "$BUCKET/nl/index.html" || true
gsutil -m setmeta -h "Content-Language:pl" "$BUCKET/pl/index.html" || true
gsutil -m setmeta -h "Content-Language:tr" "$BUCKET/tr/index.html" || true
gsutil -m setmeta -h "Content-Language:ru" "$BUCKET/ru/index.html" || true
gsutil -m setmeta -h "Content-Language:ja" "$BUCKET/ja/index.html" || true
gsutil -m setmeta -h "Content-Language:ko" "$BUCKET/ko/index.html" || true
gsutil -m setmeta -h "Content-Language:zh-Hans" "$BUCKET/zh/index.html" || true
gsutil -m setmeta -h "Content-Language:ar" "$BUCKET/ar/index.html" || true
gsutil -m setmeta -h "Content-Language:hi" "$BUCKET/hi/index.html" || true
gsutil -m setmeta -h "Content-Language:id" "$BUCKET/id/index.html" || true

echo "==> Website config"
gcloud storage buckets update "$BUCKET" --web-main-page-suffix=index.html --web-error-page=404.html

echo "==> Public read"
gsutil iam ch allUsers:objectViewer "$BUCKET"

echo "Done. Invalidate the CDN cache if one is in front:"
echo "  gcloud compute url-maps invalidate-cdn-cache YOUR_URL_MAP --path '/*'"
