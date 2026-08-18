# Google Analytics 4 integration and measurement plan — Module 30

## Purpose and privacy baseline

Lawscope has a deliberately narrow GA4 integration for aggregate audience measurement. Activation is now requested in `content/settings/site.json` with the owner-approved public web-stream measurement ID `G-XRQT4RL4G5`, and it takes effect **only in production builds**. Every other environment still resolves to the inert `G-XXXXXXXXXX` value, and no environment can collect anything before a visitor opts in.

Lawscope uses strict opt-in/basic consent behavior:

- before analytics permission, the browser does not request `googletagmanager.com`, set a GA4 cookie, or send a consent-mode/cookieless ping;
- analytics activation requires a production build, an explicit enabled flag, a valid non-placeholder measurement ID, the canonical `https://getlawscope.com` runtime host, and an affirmative analytics choice;
- development and Vercel Preview builds always emit `enabled: false` and `G-XXXXXXXXXX`, even if production values are accidentally present in their environment;
- automatic page views are disabled and one explicit sanitized page view is sent after permission;
- `ad_storage`, `ad_user_data`, and `ad_personalization` remain denied; Google Signals and advertising-personalization signals are disabled; and
- withdrawal publishes denied consent and sets Google’s measurement-specific `ga-disable-*` flag so future collection stops.

Interactions that occur while analytics permission is pending or denied are not queued for later transmission. Article foreground time and depth measurement starts fresh only after permission.

## Activation matrix

| Build/runtime condition | Generated ID | Google request | Event collection |
|---|---|---|---|
| Development | `G-XXXXXXXXXX` | Never | Never |
| Vercel Preview | `G-XXXXXXXXXX` | Never | Never |
| Production, feature off | `G-XXXXXXXXXX` | Never | Never |
| Production, placeholder/missing ID | Build fails if activation is requested | Never | Never |
| Production, real ID, before consent | Real public ID | Never | Never |
| Production, real ID, consent granted, wrong host | Real public ID | Never | Never |
| Production, real ID, canonical host, consent granted | Real public ID | Requested once | Approved events only |
| Same page after withdrawal | Real public ID already in local config | No new tag request | Future events blocked |

Build-time configuration:

```text
GA4_ENABLED=true
GA4_MEASUREMENT_ID=G-1234567890
GA4_DEBUG_MODE=false
VERCEL_ENV=production
```

`GA4_DEBUG_MODE` is for a short, controlled validation only. Do not leave it enabled for ordinary traffic. The measurement ID is public by design, but no secret, API credential, visitor identifier, submitted form value, or consent record belongs in the repository or generated manifest.

## Activation record

| Item | Value |
|---|---|
| Status | Active for production builds |
| Activated on | 2026-08-18 |
| Requested by | `content/settings/site.json` → `analytics.enabled: true` |
| Public measurement ID | `G-XRQT4RL4G5` |
| Web stream | `https://getlawscope.com` |
| Debug mode | Off (`GA4_DEBUG_MODE` unset in production) |

Because the flag and ID are versioned settings, a routine production deploy needs **no** GA4 environment variable in Vercel. The environment overrides remain available for two purposes:

- `GA4_ENABLED=false` in Vercel production is the emergency kill switch — it disables collection on the next build without editing settings; and
- `GA4_MEASUREMENT_ID` / `GA4_DEBUG_MODE` support a controlled release-candidate DebugView test.

Owner items that remain outside the repository and must be confirmed in the GA4 property (see the setup and runbook sections below): two-month event-data retention, Google Signals off, ads personalization off, Enhanced Measurement off, data redaction on, and tested developer/internal-traffic filters. Their completion is tracked as `analytics-production` in `qa/module-33-acceptance.json`, and `content/settings/privacy-policy.json` keeps `details_confirmed: false` for the analytics service until the owner signs that evidence off.


## Measurement plan

Every event uses the `analytics` consent category. The implementation does not set a user ID and does not send form values or raw search data.

| Event | Trigger | Parameters | Explicit exclusions | Test procedure |
|---|---|---|---|---|
| `page_view` | Once per eligible document after analytics permission | `page_title`, canonical-origin `page_location` without query/fragment, optional `page_referrer` reduced to an internal path or external origin; `send_to`; temporary `debug_mode` only during controlled tests | URL query, fragment, search phrase, user ID | Open a URL containing `?q=private#fragment`; grant analytics; verify exactly one DebugView event and confirm neither value appears in parameters. Withdraw/regrant and confirm no duplicate page view. |
| `newsletter_signup` | A provider response confirms a new signup request | No custom parameters | Email address, provider response body, existing-subscriber state | Use an approved non-production provider test address on a controlled production test. Confirm one event after a new accepted response, none for validation/error/already-subscribed responses, and no email in DebugView. |
| `contact_form_submit` | The same-origin Contact API confirms delivery | No custom parameters | Name, email, subject, message, article URL, reference, honeypot, timing values | Submit approved synthetic test data to a monitored test destination. Confirm one event only after API success and inspect all parameters for absence of form values/reference. |
| `category_click` | Primary activation of an internal `/categories/{slug}/` link | `category_slug` from the controlled route | Link text, query, referrer text, arbitrary URL | Grant consent, activate category links with pointer and keyboard, and confirm only normalized controlled slugs appear. External and malformed routes must produce no event. |
| `article_read` | Once on an article after at least 30 foreground seconds **after consent** and at least 75% article-prose depth **after consent** | `article_slug`, `category_slug` from build-generated normalized metadata | Article title/body, heading text, search/form text, author, URL query | Grant on an article, keep the tab visible for 30 seconds and cross 75% prose depth. Confirm one event. Repeat with hidden-tab time, withdrawal, and regrant to verify hidden/pre-consent time is not counted and no duplicate is sent. |

No optional search, share, outbound-click, download, form-interaction, or raw-scroll events are enabled. GA4 Enhanced Measurement must remain off unless each generated event and parameter is separately reviewed and added to this plan.

## PII prohibition and URL safety

Never send names, email addresses, phone numbers, postal addresses, contact subjects/messages, article-correction text, newsletter addresses, search phrases, legal facts, case numbers, submission references, full form payloads, or other direct identifiers to GA4. Do not add event parameters from `input`, `textarea`, `FormData`, query strings, hashes, free text, local storage, or API response bodies.

The client constructs `page_location` from the fixed production origin plus `location.pathname`; it does not use `location.href`. Internal referrers retain only the path, and external referrers retain only the origin. GA4 web-stream data redaction should be enabled for email addresses and any future sensitive query keys as defense in depth, not as a substitute for source-level exclusion.

Before adding any event:

1. document its business question and owner;
2. prove that no less detailed event answers the question;
3. define a controlled-value parameter schema;
4. add consent-denied, withdrawal, PII, DebugView, and Preview tests;
5. register only the required custom dimensions in GA4; and
6. update this measurement plan and Privacy Policy before release.

## GA4 property and web-stream setup

The measurement request is now active in production, so the owner must confirm (and keep confirming) in the production GA4 property:

1. the web stream URL is `https://getlawscope.com`;
2. event-data retention is set to **2 months**;
3. Google Signals is off;
4. ads personalization is off and the property is not linked for advertising use;
5. Enhanced Measurement is off for page changes, scrolls, outbound clicks, site search, video, downloads, and form interactions unless later approved;
6. data redaction is enabled for email addresses and reviewed query parameters;
7. unwanted referrals and cross-domain measurement are not configured without review;
8. the production data stream contains no Preview hostname; and
9. access follows least privilege and change history is reviewed.

## DebugView test runbook

1. Use a controlled release candidate with `VERCEL_ENV=production`, the approved test/production measurement ID, `GA4_ENABLED=true`, and `GA4_DEBUG_MODE=true`.
2. Test only on the canonical host. Development and Preview artifacts remain hard-disabled by design.
3. In GA4, open **Admin → DebugView** before granting analytics permission.
4. Confirm the browser makes no Google Analytics request before consent.
5. Grant analytics and verify one sanitized `page_view`, then execute each measurement-plan procedure above.
6. Inspect event parameter values—not only event names—for PII and query/fragment leakage.
7. Withdraw permission and verify no later interaction creates an event or network request.
8. Reset the local consent record only as part of a documented test; never ask real visitors to do this.
9. Return `GA4_DEBUG_MODE=false`, deploy, and verify the generated analytics manifest before routine release.

Debug activity should be covered by a GA4 **developer traffic** data filter. Test a filter before activating it because an active exclusion permanently removes matching data from processing.

## Internal traffic and filters

Define office/VPN egress addresses under the GA4 web stream’s internal-traffic rule, then create an internal-traffic data filter. Keep both developer and internal filters in **Testing** while verifying the corresponding dimensions and reports. Activate only after the owner signs off. Document rule names, IP ownership, test dates, and reviewers outside the public repository. Re-test whenever office/VPN addresses change.

Filters are property-side safeguards, not a reason to send Preview traffic. Preview output remains technically incapable of production analytics. Do not work around that gate by labeling Preview activity as internal traffic.

## Validation and release evidence

- `npm run validate:analytics` validates settings, public/admin script placement, consent order, sanitized commands, event schemas, withdrawal, article thresholds, and isolated development/Preview/production builds.
- `generated/js/analytics-config.js` is the browser runtime configuration for that artifact.
- `generated/data/analytics-manifest.json` records the non-secret resolved feature state and approved event schema.
- Save screenshots or an internal ticket for DebugView results, property retention, Enhanced Measurement, redaction, developer/internal filter testing, and final `GA4_DEBUG_MODE=false` confirmation.

## Ownership map

- `content/settings/site.json` and `admin/config.yml` — versioned request flag and public measurement ID (`G-XRQT4RL4G5`).
- `.env.example` — environment override contract.
- `scripts/analytics.mjs` — validation, production-only resolver, generated runtime configuration, and manifest schema.
- `js/analytics-config.js` — committed inert fallback overwritten safely by the build.
- `js/analytics.js` — consent gate, Google loader, sanitized page view, custom events, read threshold, and withdrawal handling.
- `js/newsletter.js` and `js/contact-form.js` — PII-free confirmed-success signals.
- `pages/article.html` — normalized article/category metadata and prose-depth boundary.
- `pages/privacy-policy.html` and `content/settings/privacy-policy.json` — visitor-facing provider, event, consent, retention, and choice disclosures.
- `scripts/validate-analytics.mjs` — Module 30 regression contract.
