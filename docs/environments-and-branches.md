# Environments and Branch Strategy

## Environments

| Environment | Source | Public indexing | Tracking and ads | Purpose |
|---|---|---|---|---|
| Local | Developer working tree | Disabled | Disabled | Module development and validation |
| Preview | Pull request or non-main Vercel branch | Disabled | Disabled | Owner review and QA |
| Production | Protected `main` branch | Enabled for index-ready public routes; legal readiness gates remain authoritative | GA4 only when explicitly enabled, correctly configured, on the canonical host, and consented; ads remain disabled | Public Vercel deployment |
| CMS companion | Netlify companion site | Always disabled | Disabled | Identity and Git Gateway only |

Module 29 generates environment-aware discovery controls. Local and Preview pages use `noindex, nofollow` metadata and response headers, emit a crawl-blocking `robots.txt`, and produce an empty valid sitemap while noindex. Production emits the approved crawler guidance and a sitemap containing only currently indexable canonical routes. The Privacy Policy and Legal Disclaimer stay out until their existing approval gates pass.

Module 30 separately hard-blocks GA4 in Local and Preview output: those artifacts always contain the inert `G-XXXXXXXXXX` identifier and `enabled: false`, regardless of injected production values. Production still needs explicit activation, a real ID, the canonical host, and affirmative analytics consent. Use the controlled DebugView and internal/developer-filter runbook in `docs/module-30-google-analytics-ga4.md`; never send Preview traffic to the production stream.

## Branches

- `main`: protected production source. No force pushes.
- `feature/module-XX-short-name`: one module or focused change; Vercel creates a preview deployment.
- CMS editorial-workflow branches: generated and managed by the CMS for drafts/review; never treated as production.
- Hotfix branches: urgent, narrow corrections reviewed before merge.

## Required GitHub protections

1. Require a pull request before merging to `main` once more than one maintainer exists.
2. Require the **Validate Lawscope** status check.
3. Block force pushes and branch deletion.
4. Require conversation resolution.
5. Give Git Gateway only the repository access required for content operations.
6. Keep editor accounts named and individual; never share credentials.

## Release flow

1. Work occurs in a feature branch.
2. GitHub Actions validates structure and creates the static build.
3. Vercel creates a noindex preview.
4. The module is reviewed and approved.
5. The branch merges to `main`.
6. Vercel performs an atomic production deployment.
7. A failed build leaves the previous production deployment active.
8. After deployment, verify `/robots.txt`, `/sitemap.xml`, canonical-host public headers, Preview `X-Robots-Tag`, the admin noindex header, and the generated analytics manifest. If GA4 is deliberately active, also verify no pre-consent request, DebugView parameters, withdrawal, and `GA4_DEBUG_MODE=false`.

## Indexing controls

- `scripts/sitemap-robots.mjs` is the centralized sitemap, robots, and response-header policy.
- `*.vercel.app` responses are explicitly `noindex, nofollow`; the canonical production host is not matched.
- Do not assign a custom domain to a Preview branch unless that host receives and passes an equivalent site-wide response-header check.
- Robots guidance is not access control. Use Deployment Protection for confidential previews and authentication for `/admin/`.
- Submit the production sitemap to Google Search Console and Bing Webmaster Tools only after `getlawscope.com` is purchased, attached, and verified.

See `docs/module-29-sitemap-robots.md` for the complete environment matrix and launch runbook.
