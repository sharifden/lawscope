# Deployment Connection Plan

## Vercel

1. Import the `lawscope` GitHub repository as a new Vercel project.
2. Select **Other** as the framework preset.
3. Use `npm run check` as the build command.
4. Use `generated` as the output directory.
5. Keep production deployments on the protected `main` branch.
6. Keep the centralized canonical origin at `https://getlawscope.com`; Preview output intentionally remains noindex while pointing equivalent generated routes to that production canonical.
7. GA4 is active for production builds through `content/settings/site.json` (`analytics.enabled: true`, `G-XRQT4RL4G5`); no GA4 variable is required in Vercel for a routine release. Use `GA4_ENABLED=false` in Vercel production as the kill switch, and set `GA4_MEASUREMENT_ID`/temporary `GA4_DEBUG_MODE` only for a controlled test in the intended environment; never add provider secrets to Git.
8. AdSense remains off unless the Module 31 activation checklist passes. Configure its three owner attestations, public publisher ID, and seven public unit IDs only for Production; keep `ADSENSE_ENABLED=false` in Preview and development. Newsletter, contact, and CMS credentials remain separately gated.
9. Keep `npm run validate:seo`, `npm run validate:sitemap-robots`, `npm run validate:analytics`, `npm run validate:adsense`, `npm run validate:cms-auth`, and `npm run validate:final-qa` in the deployment check so indexing, providers, authentication, accessibility contracts, measured budgets, and launch blockers remain audited.
10. Do not assign an unlisted custom domain to a Preview branch; approved custom Preview hosts require their own verified site-wide `noindex, nofollow` host rule.

## GitHub

- Repository name: `lawscope`.
- Default branch: `main`.
- Enable the branch protections documented in `docs/environments-and-branches.md`.
- Vercel requires read/deploy access; the Netlify companion requires the minimum access needed by Git Gateway.

## CMS admin

- Vercel serves the built `generated/admin/` directory at `/admin/`.
- The shell and schema use pinned Decap CMS/Identity browser assets and remain noindex, ad-free, and analytics-free.
- Committed Identity and Gateway URLs use reserved `.invalid` placeholders; no fabricated companion hostname or browser credential is permitted.
- Module 32 now renders the origin meta value and exact CSP from `CMS_COMPANION_ORIGIN`; the unset default remains fail-closed until invite-only Identity, Git Gateway, origin restrictions, repository permissions, and live acceptance are approved.

## Netlify companion

1. Create a second site from the same repository.
2. Netlify reads `netlify.toml` and publishes `netlify-companion/`.
3. Do not point the public Lawscope domain to this site.
4. Follow `docs/module-32-netlify-identity-git-gateway.md`; account provisioning and every live Identity/Git Gateway acceptance item remain pending until the owner executes them.

## Clean URL strategy

- Public routes use trailing slashes and directory `index.html` output.
- Articles: `/articles/{slug}/`.
- Categories: `/categories/{slug}/`.
- Vercel applies the repository `trailingSlash` setting.
- `vercel.json` permanently redirects `www.getlawscope.com/:path*` to `https://getlawscope.com/:path*` without matching the apex host.
- Vercel performs the HTTP-to-HTTPS upgrade at its platform/domain layer.
- There are no known prelaunch legacy paths; `scripts/seo.mjs` records an explicit empty legacy mapping policy.
- Any future slug change requires a reviewed permanent old-to-new redirect before deployment.

## SEO environment verification

- Development and Preview builds emit `noindex, nofollow` on every generated public route.
- Production builds emit `index, follow` on ordinary public routes.
- Privacy Policy and Legal Disclaimer remain production-noindex until their existing approval/readiness gates pass.
- `/admin/` retains both a noindex meta tag and an `X-Robots-Tag` noindex header; `404.html` remains noindex and has no canonical/schema/social optimization.
- Canonicals and social/schema URLs use the HTTPS apex origin in every environment.
- `npm run validate:seo` audits the current output and isolated builds for any missing development, Preview, and production environments across all 29 public routes.
- After domain attachment, test HTTP and HTTPS requests on both `www` and apex hosts for the root and a nested route; confirm one permanent hop to the HTTPS apex and no loop.
- Module 29 generates `/sitemap.xml` on every build from the validated route/content graph. Development and Preview produce an empty valid URL set while every route is noindex; production includes only currently indexable canonical routes.
- Article sitemap `lastmod` uses `updated_date` and falls back to `publish_date`; deployment time is never substituted.
- Production `/robots.txt` allows public crawling, disallows `/admin/`, and declares `https://getlawscope.com/sitemap.xml`. Nonproduction builds block crawling as defense in depth.
- Vercel `*.vercel.app` responses and the local nonproduction server send site-wide `X-Robots-Tag: noindex, nofollow`. Canonical-host production public responses must not receive that site-wide header.
- Robots guidance is not access control; `/admin/` keeps authentication requirements and its dedicated noindex response policy.
- Google Search Console and Bing Webmaster Tools submission remains manual until `getlawscope.com` is purchased, deployed, and domain-verified.

See `docs/module-28-seo-implementation.md` for metadata/schema policy and `docs/module-29-sitemap-robots.md` for crawler discovery, header controls, validation, and submission.

## GA4 deployment verification

- Development and Preview outputs must show `enabled: false` and `G-XXXXXXXXXX` in `/js/analytics-config.js`, even when real GA4 values exist elsewhere in Vercel.
- Production collection requires the versioned enabled flag (or `GA4_ENABLED=true`), a valid non-placeholder ID, the canonical runtime host, and visitor analytics consent. No Google request is permitted before consent.
- After each production deploy, confirm `/js/analytics-config.js` shows `"enabled":true` with `G-XRQT4RL4G5`, and that a first visit makes no `googletagmanager.com` request until analytics permission is granted in the consent banner or preference dialog.
- Confirm two-month GA4 event-data retention, disabled Enhanced Measurement/Google Signals/ads personalization, data redaction, and tested developer/internal traffic filters in the property.
- Run the controlled DebugView procedures and parameter-level PII audit in `docs/module-30-google-analytics-ga4.md`; restore `GA4_DEBUG_MODE=false` before routine traffic.
- Inspect `/data/analytics-manifest.json` on the release artifact and confirm `/admin/` contains no analytics integration.

## AdSense deployment verification

- Development and Preview outputs must show `enabled: false`, `provider: none`, and all-zero publisher/unit IDs in `/js/adsense-config.js`, even when real AdSense values exist elsewhere in Vercel.
- Production activation requires `ADSENSE_ENABLED=true`, the three explicit readiness attestations, a real publisher ID, all seven real unit IDs, the exact canonical runtime origin, and visitor advertising consent.
- Confirm the Google-certified CMP and current IAB TCF requirement in the live AdSense account, then complete the content, placement, mobile-density, and invalid-traffic review in `docs/module-31-google-adsense.md`.
- Inspect `/data/advertising-manifest.json` and generated `/ads.txt`; verify the AdSense loader appears only once after consent on the canonical origin.
- Confirm About, Contact, Privacy Policy, Legal Disclaimer, Editorial Policy, 404, and Admin contain neither advertising inventory nor references to the local AdSense adapter.
- Never click live units during smoke testing. Use browser network/dev tools, AdSense reporting, and no-fill/error observations.

## Final release acceptance

- `npm run check` must pass from a clean Node 20 lockfile install and end with `validate:final-qa`.
- Use `docs/module-33-final-integration-qa-accessibility.md` for keyboard, screen-reader, responsive, cross-browser, zoom/reflow, failure, Lighthouse, Core Web Vitals, provider, and security evidence.
- `qa/module-33-acceptance.json` is the canonical non-secret status register. Its launch decision remains `blocked-pending-owner-live-acceptance` and owner sign-off remains blank until every required check has real dated evidence or a bounded written exception.
- Private evidence, credentials, recovery tokens, editor identity records, and personal test data must never be committed.

## Rollback

Vercel retains immutable deployments. If a production release fails after deployment, promote the last known-good deployment and revert the corresponding Git commit so repository state and production remain aligned.
