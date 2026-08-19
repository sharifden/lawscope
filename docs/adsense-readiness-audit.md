# AdSense Readiness Audit — getlawscope.com

Date: 19 August 2026
Build audited: production (`VERCEL_ENV=production npm run build`)
Validation suite: `npm run check` — exit code 0, 111 passing contract groups

```
=============================================
ADSENSE READINESS AUDIT — getlawscope.com
=============================================

TECHNICAL (Agent Scope)
-----------------------
[x] HTTPS — no mixed content            22 pages scanned, 0 http:// assets
[x] robots.txt — allows Googlebot       Allow: / · Disallow: /admin/ · Sitemap declared
[x] sitemap.xml — exists, complete      20 URLs, every one with lastmod + changefreq
[x] No noindex tags on public pages     only /legal-disclaimer/ (owner's decision)
[x] Canonical tags on every page        21/21
[~] google-site-verification tag        plumbing built and tested; awaiting owner's code
[x] favicon present                     favicon.ico (16/32/48px) + favicon.svg
[x] apple-touch-icon present            180x180 PNG
[x] No broken internal links            21 routes cross-checked, 0 broken
[x] Custom 404 page exists              branded, noindex, links both hubs
[x] Every page has exactly 1 H1         22 pages, 0 violations
[x] All images have alt, width, height  81 images, 0 missing
[x] All JS deferred or at bottom        276 script tags, 0 render-blocking

SEO (Agent Scope)
-----------------
[x] Unique title tag on every page      21/21 unique, longest 58 chars
[x] Unique meta description             21/21 unique, longest 154 chars
[x] Open Graph tags on every page       12 OG tags per page
[x] Twitter Card tags on every page     5 Twitter tags per page
[x] Article JSON-LD on all articles     10/10
[x] Organization JSON-LD on homepage    contactPoint slot ready
[x] BreadcrumbList JSON-LD on articles  10/10
[x] Sitemap matches actual pages        20 sitemap URLs == 20 indexable canonicals

PERFORMANCE (Agent Scope)
-------------------------
[x] Images converted to WebP            11 WebP via <picture>, JPG fallback intact
[x] Images lazy loaded (below fold)     68 lazy, 12 fetchpriority="high" above fold
[x] CSS minified                        136,598 -> 117,114 bytes
[x] JS minified and deferred            100,769 -> 88,362 bytes
[x] Preconnect hints added              3 (fonts x2 + cdnjs); GA omitted by design

NAVIGATION (Agent Scope)
------------------------
[x] Header nav consistent on all pages  6 links, identical across 21 pages
[x] Footer consistent on all pages      4 columns, identical across 21 pages
[x] Categories in nav                   both hubs in header and footer
[x] Breadcrumbs on articles             10/10 visible + JSON-LD
[x] Related articles on articles        3 cards each
[x] All pages within 3 clicks           max depth 2, 21/21 reachable
[x] No orphan pages                     every page has inbound links

CONTENT ARCHITECTURE (Agent Scope)
----------------------------------
[x] Category hub pages created          Personal Injury + Legal Basics
[x] Internal links added (2+/article)   20 in-body links across 10 articles
[x] Content silo documented             docs/content-silo.md (238 lines)
[x] Article outlines delivered          docs/article-audit-and-outlines.md (549 lines)

=============================================
VERDICT: GO (technical foundation complete)
=============================================
```

## The one incomplete item

**`google-site-verification` tag — blocked on the owner, not on the code.**

- Exact file: `content/settings/site.json`, key `search_console.google_site_verification`
- Exact fix: paste the token (or the whole `<meta>` tag) between the quotes and commit
- Estimated time: **1 minute** once you have a Search Console account
- Current behaviour: the field is empty, so no tag renders anywhere — verified. When filled, the build injects it into all 21 public pages and skips `/admin/`. Tested end-to-end with a dummy token.

## Deliberate deviations from the original brief

Three places where I did not follow the spec literally, and why:

1. **No Google Analytics preconnect.** A preconnect opens a TLS connection to Google before the visitor consents, which would contradict the site's strict opt-in consent model and its published privacy policy. Say the word and it takes 30 seconds to add.
2. **Copyright year stays dynamic (2026), not hardcoded "© 2025".** The bottom bar renders `© {year} Lawscope. All rights reserved. For informational purposes only.`
3. **CSS/JS minified into the build output rather than committed `.min.css` files.** Same bytes delivered, no duplicate files to maintain, no stale links possible.

## Known state the owner chose

- `/legal-disclaimer/` remains `noindex`. One word flips it: set `"search_indexing": "allow"` in `content/settings/legal-disclaimer.json` (the same switch already used for the privacy policy).
- The privacy policy is indexable while owner confirmations stay pending; the on-page "Pre-launch review status" notice is still displayed.

## What this audit does NOT claim

This audit covers the technical foundation only. **The site is not ready to apply to AdSense yet**, for reasons outside agent scope:

- 10 articles, median 589 words — thin for a YMYL legal site
- Zero traffic, not yet in Search Console, nothing indexed
- Contact form cannot receive messages; no branded email
- Trust pages are AI-drafted and awaiting the owner's rewrite

Apply once the owner TODO below is done.

---

```
=============================================
OWNER'S REMAINING TODO LIST
=============================================
1. Set up contact@getlawscope.com branded email
   -> then paste it into content/settings/site.json
      at contact.public_email so it appears in the
      Organization schema on every page

2. Register Google Search Console
   -> search.google.com/search-console
   -> Add property -> verify -> submit sitemap.xml
   -> paste the verification token into
      content/settings/site.json at
      search_console.google_site_verification

3. Rewrite About page (human, honest, use
   "The GetLawscope Team" as author identity)

4. Rewrite Contact page (add branded email + working form)

5. Rewrite Privacy Policy (reference getlawscope.com)

6. Write a Terms of Service page — none exists today

7. Rewrite Disclaimer page (strong legal disclaimer,
   honest about not being lawyers), then set
   "search_indexing": "allow" in
   content/settings/legal-disclaimer.json

8. Build disclaimer system (top + bottom of every article)

9. Build author bio section ("The GetLawscope Team",
   "Legal Research & Information Team")

10. Rewrite all 10 articles using the outlines in
    docs/article-audit-and-outlines.md
    -> start with Preserving Evidence After an Injury

11. Write 15+ more original articles (1,200+ words each),
    personal-injury first, targeting the practical
    long-tail questions listed in the outlines

12. Create social media profiles (Pinterest + 1 other),
    then add them to social_profiles in
    content/settings/site.json

13. Start sharing content on social media for traffic

14. Wait for indexing (check Search Console daily)

15. Once 25+ articles indexed + some traffic
    -> Apply to AdSense
=============================================
```

## Reference: rules the build now enforces for you

These fail the build rather than shipping quietly, so future content cannot regress the work:

| Rule | Where |
|---|---|
| Title tag must be <= 60 characters | `scripts/seo.mjs` |
| Meta description <= 155, excerpt <= 160 | `scripts/content-graph.mjs` |
| Article Markdown must not contain an H1 | `scripts/article-pages.mjs` |
| Category count, footer links, 404 links, route totals derive from `APPROVED_CATEGORIES` | `scripts/content-graph.mjs` |
| Sitemap `lastmod` must come from real content dates, never build time | `scripts/sitemap-robots.mjs` |
| No inline event handlers anywhere | `scripts/validate-final-qa.mjs` |
| Minified JS must still parse, or the original is kept | `scripts/build.mjs` |

Run `npm run check` before every push.
