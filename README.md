# Jardinly Live — static site (Vercel-ready)

Plain static HTML. No build step, no framework, no runtime dependency:
the landing is prerendered markup + ~60 lines of vanilla JS (step reel,
pricing toggle, newsletter form). Nothing is fetched from a third-party CDN
except Google Fonts.

## Contents
    index.html          landing page, English (~95 KB)
    es|de|fr|pt|it|nl|pl|tr|ru|ja|ko|zh|ar|hi|id/index.html
                        15 translated landing pages (pt = pt-BR, zh = zh-Hans, ar is RTL)
    privacy.html        Privacy Policy
    terms.html          Terms of Service
    assets/             story illustrations + logo (cached 1 year)
    og.png              1200x630 social preview
    icon-32/180/512.png favicon + touch icons
    favicon.ico
    site.webmanifest
    robots.txt
    sitemap.xml
    vercel.json         clean URLs, cache + security headers, /app + /pitch redirects

## Deploying
GCP (Firebase Hosting or Cloud Storage): see DEPLOY-GCP.md.

## Deploy to Vercel
    npm i -g vercel
    cd dist
    vercel            # preview
    vercel --prod     # production
Or: Vercel dashboard -> Add New Project -> import this folder as a static site
(Framework preset: Other, Build command: none, Output directory: .).
Then Settings -> Domains -> add jardinly.live and follow the DNS records shown.

## After the first deploy
1. Google Search Console: add the domain, submit https://jardinly.live/sitemap.xml
2. Check the social card at opengraph.xyz or by pasting the URL in Slack/X
3. Run Lighthouse on the live URL

## Languages
16 locales: English at /, the rest at /es, /de, /fr, /pt, /it, /nl, /pl, /tr,
/ru, /ja, /ko, /zh, /ar, /hi, /id. Each page carries its own title, description,
Open Graph text, canonical and a full hreflang set (16 + x-default), and every
page links to all the others in the footer switcher. Arabic renders RTL; Arabic,
Japanese, Korean, Chinese, Hindi and Russian load an extra Google font because
Outfit has no glyphs for those scripts. Vercel sends Content-Language per folder.

To retranslate or add a language: edit the JSON dictionaries in ../i18n/ (key =
the exact English string) and re-run the generator described in "Editing".

## SEO already in place
- Unique title + meta description, canonical, robots meta, lang="en"
- Open Graph + Twitter summary_large_image (og.png)
- JSON-LD: Organization, WebSite, SoftwareApplication with the three price offers
- sitemap.xml with hreflang alternates for every locale + robots.txt
- hreflang + x-default across 16 languages, Content-Language headers
- Real HTML content in the source (no JS rendering required to read the page)
- width/height on images (no layout shift), prefers-reduced-motion support

## Editing
Source of truth is the project root:
    Jardinly Landing Sandbox.dc.html   design
    Jardinly Landing Deploy.dc.html    deploy copy (site links + meta)
index.html is generated from the deploy copy — do not hand-edit it.

## Rollback
The previous (bundled) landing is kept outside dist at archive/index-2026-08-14.html

## Notes
- CTA buttons point to https://app2.jardinly.live
- The beta signup form posts to api/subscribe.js, which stores each address as
  a private object in Vercel Blob
- Privacy and Terms are drafts — have counsel review
- CSP allows inline styles/scripts (the page is inline-styled); tighten with hashes if you need a stricter policy
