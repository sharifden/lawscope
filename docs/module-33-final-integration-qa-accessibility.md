# Module 33 — Final Integration, QA & Accessibility

## Status and decision

**Repository integration is complete. Launch remains blocked pending owner-controlled live acceptance and owner sign-off.** The deterministic build and validation suite reports no critical or high repository defects. This is not a claim that unexecuted browser, screen-reader, provider, account, legal, or production checks passed.

Machine-readable status is held in `qa/module-33-acceptance.json`. Pending items must stay pending until dated evidence exists. Never infer a pass from source inspection, a local preview, or this checklist.

## Automated release gate

Run from a clean Node 20 checkout:

```sh
npm ci
npm run check
npm audit --audit-level=high
```

`npm run check` builds the complete development artifact and runs every validator from Modules 01–33. Its final Module 33 audit covers:

- all 29 public routes and representative templates;
- internal links, cross-page fragments, local assets, IDs, and orphan routes;
- landmarks, language, skip links, headings, accessible names, ARIA references, labels, image alternatives, image dimensions, focus, touch targets, themes, and reduced motion;
- canonical metadata, social cards, JSON-LD parsing, and unresolved-template detection;
- progressive enhancement and disabled analytics/advertising behavior;
- measured page, CSS, JavaScript, and image budgets;
- served HTTP status, MIME, development noindex, and branded 404 behavior;
- dependency restrictions, raw-content exclusion, placeholder-image exclusion, and provider-secret patterns;
- an honest launch blocker register with blank owner sign-off.

A failed check blocks merge and deployment. Do not downgrade an assertion to ship around a defect. Classify failures, fix the source, rebuild, and rerun the entire command.

## Representative route set

Use these routes for all manual, browser, assistive-technology, Lighthouse, visual, and failure-mode checks:

| Template | Route | Primary coverage |
|---|---|---|
| Home | `/` | Hero/LCP image, search, featured/latest cards, categories, ad inventory, newsletter |
| Listing | `/articles/` | Static pagination, filters, search terms, in-feed inventory |
| Category | `/categories/consumer-law/` | Breadcrumbs, feature rules, exact-category cards, related topics |
| Article | `/articles/what-happens-after-an-arrest/` | Metadata, TOC, sources, sharing, disclaimer, article ads, related content |
| Contact | `/contact/` | Disabled/provider-enabled form states, labels, validation, error summary |
| Policy | `/privacy-policy/` | Long content, table of contents, consent reopening, production indexing gate |
| Admin | `/admin/` | Noindex, authentication boundary, keyboard sign-in, role enforcement |
| Error | `/404.html` and an unknown URL | Recovery routes, native search, actual HTTP 404, noindex |

Also spot-check `/articles/page/2/`, an empty controlled category, `/about/`, `/editorial-policy/`, and `/legal-disclaimer/`.

## Defect severity and release rule

| Severity | Examples | Release rule |
|---|---|---|
| Critical | Public secrets/PII, unauthorized CMS/repository access, legal disclaimer omitted, consent bypass, destructive data loss | Stop launch; contain and remediate immediately |
| High | Broken primary route/navigation/form, inaccessible core task, wrong canonical/indexing, invalid publish gate, severe mobile overflow, active tracking before consent | Stop launch until fixed and fully retested |
| Medium | Non-core workflow defect with a safe workaround, isolated metadata/presentation problem | Fix before launch unless owner accepts a dated, bounded exception |
| Low | Cosmetic issue with no material usability, accessibility, privacy, content, or SEO impact | Track with owner-approved due date |

**No critical or high repository defects** are recorded by the current automated gate. Pending live acceptance items are launch blockers, not fabricated defects or fabricated passes.

## Accessibility test protocol

Target WCAG 2.2 AA where applicable. Test at minimum Home, Articles, one category, one article, Contact, Privacy Policy, Admin, and 404 in both themes.

### Keyboard-only matrix

For each route, start at the browser chrome and do not use a pointer:

1. Tab first to **Skip to main content**; activate it and confirm visible focus moves to `main`.
2. Traverse header navigation, mobile menu, search opener, search form/results, theme control, and all links in visual order.
3. Verify Escape closes menu/search/dialog surfaces and focus returns to the opener.
4. Verify search result arrows, Home, End, Enter, and Escape; confirm a no-JavaScript browse path remains.
5. On Articles, change category/keyword filters, reset them, and verify browser Back/Forward state.
6. Open consent preferences; verify Accept, Reject, Manage, Save, and footer re-entry are equally reachable without a trap.
7. On Contact, trigger every validation state; confirm focus reaches the error summary and then each invalid field.
8. On an article, traverse TOC, sources, sharing/copy controls, tags, related content, and back-to-top focus return.
9. Confirm all focus indicators remain visible in light and dark themes and no fixed control obscures focus.
10. Confirm no control requires hover, drag, fine pointer movement, or a timing-only action.

Record browser/OS, route, viewport, theme, result, defect ID, and evidence location.

### Screen-reader matrix

Use at least one desktop combination such as NVDA with Firefox/Chrome and one platform combination such as VoiceOver with Safari. Record the exact versions.

1. Navigate by landmarks and confirm one main region, named navigation regions, header/banner, and footer/content information.
2. List headings and confirm the page H1, section structure, article H2–H4 hierarchy, and no misleading empty headings.
3. List links and controls; confirm names describe purpose without depending on Font Awesome icons.
4. Verify meaningful image alternatives and confirm decorative icons/images do not create noise.
5. Operate search and listen for loading, result count, empty, error, and selection announcements.
6. Operate consent and confirm dialog name, descriptions, checkbox state, save result, and focus restoration.
7. Operate Contact and newsletter fields; confirm labels, required state, instructions, inline errors, summary, busy state, and success/failure announcements.
8. Verify article publication/update/category/reading-time facts, legal notice, sources, and share methods are understandable.
9. Verify unavailable CMS/form/provider states are announced without exposing implementation details or tokens.
10. Confirm theme and reduced-motion choices do not alter document meaning.

Automation supplements this matrix but cannot replace it.

## Responsive, zoom, and visual protocol

### Cross-browser and responsive matrix

Test the latest stable and previous major Chrome, Firefox, Safari, and Edge, current iOS Safari, and current Android Chrome. Required CSS viewport widths are 320, 375, 768, 1024, 1440, and 1920 pixels, in portrait and landscape where applicable.

At every representative route and width, verify:

- no two-dimensional page scrolling, clipped text, overlap, or unreachable control;
- header/menu/search/consent/back-to-top safe-area behavior;
- readable line lengths, cards, grids, breadcrumbs, TOCs, source URLs, and form errors;
- 44×44 CSS-pixel primary targets and adequate target separation;
- article sidebar removal/reflow and ad-unit density rules;
- no ad, consent surface, or fixed control obscures content;
- local images retain aspect ratio and no severe layout shift occurs;
- light and dark palettes, hover/focus/disabled/error states, and system color preferences remain legible.

Repeat at 200% browser zoom and with enlarged default text. At 320 CSS pixels, content must reflow without loss of information or functionality. Enable reduced motion before page load and during a session; decorative transitions must stop while content remains visible.

## Lighthouse and Core Web Vitals

No Lighthouse score is recorded in the repository because this environment has no supported Chrome/Chromium runtime and there is no approved production deployment. Do not invent a score.

After deployment, run a clean, logged-out, incognito Lighthouse navigation for Home, Articles, one category, one article, and Contact:

1. Test the canonical production host on mobile and desktop, three times per route.
2. Keep analytics, ads, newsletter, and Contact integrations in their truthful approved state.
3. Save all reports privately with date, browser/Lighthouse versions, route, build commit, network/device settings, and median scores.
4. Target at least 90 for Performance, Accessibility, Best Practices, and SEO. A score under 90 requires remediation or a dated owner-approved exception identifying third-party impact and a review date.
5. Repeat before and after enabling each third-party provider. Never use synthetic results to claim field Core Web Vitals.
6. After sufficient real traffic exists, record Search Console/CrUX 75th-percentile LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.1.

The deterministic repository budgets are stricter early-warning controls, not Lighthouse or field-CWV substitutes:

| Resource | Per-route budget |
|---|---:|
| Raw HTML | 75 KiB |
| Brotli HTML | 16 KiB |
| Raw first-party CSS referenced | 150 KiB |
| Brotli first-party CSS referenced | 20 KiB |
| Raw first-party JavaScript referenced | 100 KiB |
| Brotli first-party JavaScript referenced | 30 KiB |
| Brotli document + CSS + JavaScript | 64 KiB |
| Any generated raster image | 150 KiB |

The audit also requires intrinsic media dimensions, a non-lazy high-priority Home LCP candidate, native lazy loading below the fold, and no unconditional analytics/ad provider script.

## Functional and content matrix

For each tested route, record pass/fail and evidence for:

- fixed and generated routes, clean trailing slashes, pagination, breadcrumbs, filters, search, theme, menu, consent, sharing, and back-to-top;
- no-JavaScript reading/navigation and native fallback actions;
- unique truthful title/description/canonical, Open Graph/Twitter preview, one H1, and correct JSON-LD type;
- current author/date/category/reading time/tags/sources and exact legal notice on every article;
- no draft/future entry, filler, unresolved template token, broken citation, orphan article, `picsum.photos`, or unapproved production ID;
- production robots/sitemap, permanent `www` redirect, legal-page indexing gates, Preview noindex, admin noindex, and branded HTTP 404;
- social preview cards using the canonical 1200×630 local image and accurate alternative text.

External URL syntax and internal links are automated. The external-link live check must be repeated from the production network near launch because legal sources and CDNs can change independently of Git.

## Form, CMS, consent, analytics, and advertising workflows

These checks require approved live providers/accounts. Use synthetic non-sensitive test data and private evidence; never place names, email addresses, messages, tokens, screenshots containing tokens, or subscriber records in Git.

1. **Contact:** success, field/server validation, honeypot, rate limit, origin, timeout, provider error, accessible messages, monitored delivery, retention/deletion, and no-PII analytics.
2. **Newsletter:** invalid/valid/duplicate addresses, provider rejection, double opt-in, unsubscribe, retention, unavailable fallback, and successful-event timing without email parameters.
3. **CMS:** execute every Module 32 invitation, sign-in, logout, recovery, expiry, revocation, draft, review, publish, delete recovery, rollback, and incident procedure with the one named editor.
4. **Consent:** fresh visit, Accept, Reject, granular Save, footer re-entry, withdrawal, GPC, corrupt/blocked storage, cross-tab change, policy revision, and keyboard/screen-reader behavior.
5. **GA4:** no request before consent, rejection/withdrawal blocking, sanitized events in DebugView, no PII, internal-traffic filter, data retention/Signals settings, canonical-only collection, and Preview separation.
6. **Ads/CMP:** no request before consent, rejection/GPC, certified CMP regional behavior, one loader only, labels, no-fill/error collapse, mobile density, excluded routes, layout stability, invalid-traffic precautions, and before/after performance.

## Failure and resilience matrix

Use browser developer tools or controlled staging—not production visitors—to block one dependency at a time:

| Failure | Required safe behavior |
|---|---|
| JavaScript disabled | Core content, links, pagination, categories, policy pages, and native forms remain understandable |
| Google Fonts blocked | System fallbacks remain legible; no missing content |
| Font Awesome blocked | Text labels/names preserve every control and destination |
| Local image blocked | Alternative text and reserved dimensions preserve meaning/layout |
| Search index blocked | Error announcement and Articles/Categories browse fallback remain |
| localStorage blocked/corrupt | Theme works for the session; optional consent remains denied and preferences stay available |
| Clipboard/Web Share/IntersectionObserver unavailable | Copy/share fallback and visible content remain; no hidden content |
| Analytics/ads blocked | No core failure, blank obstruction, retry loop, or consent weakening |
| Contact/newsletter provider unavailable | Non-sensitive accessible failure state; no false success or data leakage |
| Identity/Git Gateway unavailable | CMS fails closed; public site remains available; owner uses Module 32 recovery/fallback gate |
| Build validation fails | Prior atomic production deployment remains live; failed content is not published |

## Security and privacy checks

- Run dependency audit from the clean lockfile and resolve all high/critical advisories.
- Confirm Vercel and Netlify headers with live response captures, including CSP, noindex where required, MIME protection, no-referrer, anti-framing, and permissions policy.
- Confirm no GitHub, Netlify, Vercel, Contact, newsletter, GA4 administrative, AdSense, or recovery credential appears in Git, browser bundles, source maps, logs, URLs, referrers, analytics, or screenshots.
- Confirm raw `/content/`, contact messages, subscriber data, editor identity records, and private evidence are not deployed.
- Confirm the final Privacy Policy matches actual vendors, cookies/storage, retention, state-law choices, request channels, advertising, analytics, and international processing.
- Confirm backup, rollback, credential rotation, privacy-request, incident, and recovery contacts are monitored and tested.

## Owner launch sign-off

The owner completes sign-off only after every pending item in `qa/module-33-acceptance.json` has private dated evidence or a bounded written exception. Required confirmations are:

- domain purchase/control, DNS, HTTPS, apex/`www`, Search Console, and production branch;
- truthful organization and monitored contact identities;
- qualified legal/privacy review of policies and launch content;
- original content quantity and source/image rights approval;
- keyboard, screen-reader, responsive, zoom/reflow, cross-browser, Lighthouse, and production-header evidence;
- Module 32 CMS account/publish/recovery acceptance;
- provider-specific Contact/newsletter/GA4/AdSense/CMP acceptance or continued disabled state;
- backup, rollback, incident, privacy-request, and recovery ownership.

Update only these fields after acceptance:

```json
{
  "launchDecision": "approved-by-owner",
  "ownerSignOff": {
    "status": "approved",
    "ownerName": "individually named owner",
    "decision": "launch",
    "signedAt": "ISO-8601 timestamp",
    "notes": "private evidence register reference; no secrets or PII"
  }
}
```

Do not commit private evidence, credentials, personal test data, or recovery tokens. Until that approval is real, the canonical launch decision remains **blocked-pending-owner-live-acceptance**.
