# Module 28 — SEO Implementation

## Scope

Module 28 centralizes Lawscope’s page metadata, canonical URLs, social cards, heading audits, Schema.org blueprints, indexing directives, and host redirects. It covers all 29 generated public routes. XML sitemap generation and the final production/preview `robots.txt` and response-header policy remain Module 29 work.

## Central policy and build output

- `scripts/seo.mjs` is the canonical SEO policy. It owns the production origin, title suffix and limits, description limits, image/canonical validation, environment-aware public robots directive, safe fallbacks, Organization/WebSite helpers, JSON-LD escaping, and the explicit legacy-redirect policy.
- `scripts/build.mjs` applies that policy to every generated public page and writes `generated/data/seo-policy.json`.
- Canonicals always use clean, self-referencing `https://getlawscope.com` URLs with the approved trailing-slash convention. Preview and development pages retain production canonicals only for equivalent generated routes while remaining `noindex, nofollow`.
- The default social image is `/assets/images/social/lawscope-editorial-standards.jpg` at 1200×630.
- The publisher logo is `/assets/images/lawscope-publisher-logo.png` at 512×512.
- Missing optional page metadata resolves to approved non-empty defaults. Invalid external/insecure images, dirty canonicals, over-limit descriptions/titles, unsupported Open Graph types, and unbranded titles fail validation rather than publishing unsafe metadata.

## Metadata contract

Each generated public route has:

- one unique `<title>` ending in ` | Lawscope`;
- one unique meta description no longer than 155 characters;
- one absolute, self-referencing canonical;
- `og:type`, `og:site_name`, `og:locale`, title, description, URL, secure 1200×630 image, image MIME type, dimensions, and image alternative;
- matching `summary_large_image` Twitter/X title, description, image, and image alternative;
- exactly one H1 and a non-skipping visible heading hierarchy.

Article pages additionally expose publication/modification times, section, and tags in Open Graph article metadata. Article titles may exceed the practical 50–60-character target when shortening would remove material meaning, but the configured 100-character hard safety limit still applies.

## Structured-data blueprints

All JSON-LD is generated from the same validated page/content models as visible HTML and is serialized so an embedded `<` cannot terminate its script block.

- Home: `WebSite` + `Organization` (no fabricated `SearchAction`).
- Article: `Article` + `Organization` + `BreadcrumbList`, including canonical URL, matching headline/description, image, visible dates, category, tags, actual Markdown word count, truthful organizational author, publisher, and 512×512 logo.
- Articles library, Categories overview, and category routes: `CollectionPage` with publisher, breadcrumbs, and an `ItemList` matching the visible current-page items.
- About: `AboutPage` + `Organization` + `BreadcrumbList`.
- Contact: `ContactPage` + `Organization` + `BreadcrumbList`.
- Editorial Policy, Privacy Policy, and Legal Disclaimer: `WebPage` + `Organization` + `BreadcrumbList`, with visible dates where applicable.

## Indexing matrix

| Output environment/page | Robots directive |
|---|---|
| Development or Vercel Preview — every generated public route | `noindex, nofollow` |
| Production — ordinary public routes | `index, follow` |
| Production — Privacy Policy while its approval/readiness gate is incomplete | `noindex, nofollow` |
| Production — Legal Disclaimer while qualified-review/approval gates are incomplete | `noindex, nofollow` |
| `/admin/` | noindex meta plus Vercel `X-Robots-Tag: noindex, nofollow, noarchive` |
| `404.html` | `noindex, nofollow`; no canonical, social optimization, or JSON-LD |

The Privacy Policy and Legal Disclaimer must not be made indexable merely to satisfy a launch date. Their existing readiness controls remain authoritative.

## Redirect policy

`vercel.json` contains one host-aware permanent redirect:

- `www.getlawscope.com/:path*` → `https://getlawscope.com/:path*`
- `permanent: true` instructs Vercel to use its permanent redirect behavior (308).
- The path wildcard preserves nested public paths and avoids an apex-host redirect loop.
- Vercel automatically upgrades HTTP requests to HTTPS at the platform/domain layer; no competing protocol rule is committed.

There are no known legacy Lawscope URLs at this prelaunch stage. `LEGACY_REDIRECT_POLICY` therefore records `empty-no-known-legacy-routes` with an intentionally empty mapping. Before changing any published article, category, pagination, or fixed-page path, add and validate a permanent old-to-new mapping; never silently reuse an unrelated destination.

## Validation

Run:

```bash
npm run validate:seo
```

The validator audits the current `generated/` output and builds any missing development, Preview, and production environments in isolated temporary directories. Every run therefore proves all three indexing modes without replacing the managed development preview. It verifies:

- complete 29-route inventory and unresolved-placeholder absence;
- unique titles, descriptions, and canonicals;
- canonical URL format and self-reference;
- Open Graph/Twitter completeness and parity;
- local HTTPS social images and physical 1200×630 dimensions;
- one H1, heading order, visible breadcrumbs, and valid JSON-LD on every public route;
- page-type schemas, absolute schema URLs, truthful dates/headlines/word counts, publisher identity, and logo dimensions;
- development/preview noindex behavior and production indexing gates;
- admin and 404 exclusions;
- fallback and unsafe-input behavior in the centralized helper;
- permanent `www` → apex redirect and intentional empty legacy mapping.

The command is included at the end of `npm run check`, so deployment fails atomically when the SEO contract fails.

## Deployment verification

After connecting the real domain, test both the root and one nested path on the deployed Vercel project:

```text
http://www.getlawscope.com/articles/       -> HTTPS apex, permanent redirect
https://www.getlawscope.com/articles/      -> https://getlawscope.com/articles/, permanent redirect
https://getlawscope.com/articles/          -> 200, no redirect loop
```

Also inspect one Preview deployment and one Production deployment to confirm their rendered robots meta values match the matrix above. Module 29 will add the final sitemap, production robots content, and preview-wide noindex response-header verification.
