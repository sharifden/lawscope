# Module 29 — XML Sitemap and Robots.txt

## Purpose

Module 29 generates crawler-discovery artifacts from the same validated route and CMS content models that render the public site. It does not scan arbitrary files, publish Preview hostnames, treat robots guidance as security, or invent freshness dates.

The prospective production origin is `https://getlawscope.com`. The domain must still be purchased, attached, and verified before search-engine submission.

## Generated artifacts

Every build writes:

- `/sitemap.xml` — a UTF-8 Sitemap protocol `urlset`.
- `/robots.txt` — environment-aware crawler guidance.
- `/data/sitemap-robots.json` — the auditable Module 29 policy, candidate set, included entries, exclusions, limits, and response-header contract.

`scripts/sitemap-robots.mjs` is the centralized policy and serializer. `scripts/build.mjs` supplies its candidates from the existing SEO route records, article models, category models, and pagination models. `scripts/validate-sitemap-robots.mjs` audits isolated development, Preview, and production builds as files and through the local HTTP server.

## Sitemap membership

A route is included only when its generated page is currently `index, follow` in that environment. Consequently:

| Environment | Sitemap behavior |
|---|---|
| Development | Valid, empty `urlset`; all public pages are intentionally noindex. |
| Preview | Valid, empty `urlset`; all public pages are intentionally noindex. |
| Production | Includes every currently indexable canonical public route. |

Production candidates are:

- Home and the seven primary public pages.
- Editorial Policy.
- Every controlled category route.
- Every eligible published article route.
- Generated article/category pagination routes when they are canonical and contain useful results.

The Privacy Policy and Legal Disclaimer keep their existing launch-readiness gates. They enter the production sitemap automatically only when the same approval gates change their generated robots directive to `index, follow`. In the current baseline, both remain noindex and are therefore excluded.

Permanent exclusions include drafts, future-dated posts, filtered or search-query states, Preview hostnames, `/admin/`, `404.html`, `/api/` and other private endpoints, and every current noindex route. Drafts and future posts never enter the eligible article graph, while the sitemap policy independently rejects stateful or private routes if they are mistakenly supplied as candidates.

All `<loc>` values are XML-escaped, absolute HTTPS URLs on `https://getlawscope.com`, query-free, fragment-free, unique, and consistent with the trailing-slash canonical policy. The generator enforces the current single-file limits of 50,000 URLs and 50 MiB uncompressed. A sitemap index must be introduced before either limit is reached.

## `lastmod` policy

Article `lastmod` comes only from substantive CMS content fields:

1. `updated_date`, when present.
2. Otherwise `publish_date`.

The build/deployment timestamp is never an article `lastmod`, so a deployment by itself does not fabricate freshness. The Editorial Policy uses its visible substantive modification date. Readiness-gated legal pages may use their visible `last_updated` date after they become indexable. Pages without a reliable substantive modification date omit `lastmod`; the build does not guess.

A material article revision must update `updated_date` in front matter. Do not change that date solely for SEO freshness.

## Robots policy

The committed production source is exactly:

```text
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://getlawscope.com/sitemap.xml
```

Production builds emit that text. Development and Preview builds instead emit defense-in-depth crawl blocking:

```text
User-agent: *
Disallow: /
```

The nonproduction file does not advertise the production sitemap. More importantly, Preview protection does not rely on robots.txt: public responses receive `X-Robots-Tag: noindex, nofollow`.

Robots rules are voluntary crawler guidance, not authentication or authorization. `/admin/` still requires the invite-only authentication bridge planned for Module 32 and retains its explicit noindex meta/header policy. Private API behavior must be enforced server-side.

## Response-header protection

`vercel.json` applies `X-Robots-Tag: noindex, nofollow` site-wide to `*.vercel.app` hosts without applying that header to `getlawscope.com`. Vercel also supplies Preview noindex protection at its platform layer; the project rule explicitly adds `nofollow` and makes the expected policy testable. The local preview server mirrors the same nonproduction response header.

Production public routes on the canonical host do not receive a site-wide noindex response header. `/admin/` and HTTP 404 responses remain permanently protected with `noindex, nofollow, noarchive`.

Do not attach an unlisted custom domain to a Preview branch. If a custom Preview hostname is approved later, add that exact host as another site-wide noindex/nofollow condition and verify it with `curl -I` before use. Noindex is not privacy; use Vercel Deployment Protection for confidential Preview material.

## Validation and operations

Run:

```bash
npm run validate:sitemap-robots
```

The validator checks:

- isolated development, Preview, and production builds;
- exact sitemap membership against each generated route’s robots directive;
- article update-date fallback and deployment-time independence;
- absolute canonical host, XML structure/escaping, uniqueness, exclusions, and limits;
- exact production and nonproduction robots output;
- Vercel host scoping so production is not accidentally noindexed;
- local served status, MIME type, and `X-Robots-Tag` behavior;
- preserved admin and 404 noindex response policy.

After a real deployment, verify at minimum:

```bash
curl -fsS https://getlawscope.com/robots.txt
curl -fsS https://getlawscope.com/sitemap.xml
curl -I https://getlawscope.com/
curl -I https://getlawscope.com/admin/
curl -I https://YOUR-PREVIEW-HOST.vercel.app/
```

The canonical production home response must not contain a site-wide `X-Robots-Tag: noindex`. The Preview response must contain `noindex, nofollow`. Admin remains noindex in both environments.

## Manual search-engine submission

Submission is intentionally a post-domain-verification manual step, not a build side effect:

1. Purchase and attach `getlawscope.com`; complete DNS and HTTPS verification.
2. Confirm the production pages intended for indexing are live and that legal readiness gates have the approved state.
3. Verify a Google Search Console property for the domain, then submit `https://getlawscope.com/sitemap.xml` in the Sitemaps area.
4. Verify the site in Bing Webmaster Tools, then submit the same production sitemap.
5. Recheck reported fetch/indexing issues after processing. Do not submit a localhost, Vercel Preview, branch, or custom staging URL.

Search Console and Bing submission do not guarantee indexing. Their dashboards and verification methods may change; follow the current provider instructions at launch.
