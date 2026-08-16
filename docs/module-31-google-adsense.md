# Module 31 — Google AdSense integration and activation runbook

**Policy review date:** August 16, 2026  
**Canonical production origin:** `https://getlawscope.com`  
**Current repository state:** disabled, all-zero public placeholders, no Google advertising request

## Safety model

Lawscope uses manually placed responsive display units only. Auto ads are not enabled by this integration. A Google advertising request is impossible unless every one of these gates passes:

1. `advertising.enabled` or `ADSENSE_ENABLED` explicitly requests activation.
2. The build environment resolves to `production`.
3. The AdSense account and `getlawscope.com` site have been approved and the owner attests that with `account_approved` or `ADSENSE_ACCOUNT_APPROVED`.
4. The owner has completed the current content, placement, mobile-density, invalid-traffic, and consent-policy review and attests that with `policy_reviewed` or `ADSENSE_POLICY_REVIEWED`.
5. A Google-certified CMP is correctly configured where required, including a current IAB TCF implementation, and the owner attests that with `certified_cmp_ready` or `ADSENSE_CERTIFIED_CMP_READY`.
6. A real `ca-pub-` publisher ID and all seven real 10-digit ad-unit IDs are configured.
7. At runtime, the page origin is exactly `https://getlawscope.com`.
8. The visitor has affirmatively granted Lawscope’s `advertising` consent category. An active Global Privacy Control signal keeps that category denied.

A requested production build fails rather than silently deploying if a readiness attestation or identifier is missing. Development and Preview output is forced to `provider: none` and all-zero identifiers even if real environment variables exist. Trust, legal, Contact, 404, and Admin templates do not reference the slot controller, AdSense configuration, or AdSense adapter.

Consent withdrawal collapses Lawscope’s units and prevents additional adapter-initiated requests. A third-party script already loaded in the current document cannot be “unloaded”; visitors should reload after withdrawing if they want an immediate fresh document with no prior provider execution. No script is loaded before the initial grant.

## Controlled inventory

Every enabled unit retains the visible label **Advertisement**, a distinct bordered surface, responsive width constraints, and reserved space while pending/loading. No label or neighboring control encourages interaction.

| Registry key | Surface and boundary | Mobile | Desktop |
| --- | --- | ---: | ---: |
| `home_below_featured` | Home, after the complete Featured Articles section | 1 | 1 |
| `articles_in_feed` | Articles library, after six cards and only when more than six results exist | 1 | 1 |
| `categories_overview` | Categories overview, below the complete grid | 1 | 1 |
| `category_in_feed` | Category page, after six cards and only when more than six feed items exist | 1 | 1 |
| `article_mid` | Article, at the configured third top-level H2 boundary after at least 150 preceding words | 1 | 1 |
| `article_sidebar` | Article sidebar, after trust/editorial notices; never sticky | 0 | 1 |
| `article_end` | Article, after sources and disclaimer and before related articles | 1 | 1 |

The desktop-only sidebar makes article density lower on mobile. Listing/category feed units are omitted when content volume is insufficient. Mid-article insertion is build-time only and cannot split a sentence, paragraph, list, table, warning, or quotation. About, Contact, Privacy Policy, Legal Disclaimer, Editorial Policy, 404, and Admin have no launch inventory.

## Responsive and no-fill behavior

`js/adsense.js` creates the standard responsive `ins.adsbygoogle` attributes only after all runtime gates pass, loads `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` once per document, and queues each eligible unit once. The parent has an explicit width, maximum width, overflow containment, and mobile/desktop minimum block sizes to reduce reflow and horizontal overflow.

The provider’s `data-ad-status` attribute is observed. `filled` marks the reserved unit filled; `unfilled` and `unfill-optimized` collapse the Lawscope wrapper. Loader failure, request failure, invalid runtime configuration, and the existing status timeout also collapse the unit. Google notes that it may retain an unfilled unit when collapsing would cause reflow; Lawscope intentionally removes its own large blank wrapper once an explicit no-fill status is observed, in line with the product requirement. Review this behavior again if Google changes the supported status contract or the account enables “Fill empty in-page ads.”

## Configuration

The CMS exposes the same public fields under **Settings → Site settings → Google AdSense**. Publisher and slot IDs are public identifiers, not secrets. Environment variables may override CMS values without committing production IDs:

```text
ADSENSE_ENABLED=true|false
ADSENSE_ACCOUNT_APPROVED=true|false
ADSENSE_POLICY_REVIEWED=true|false
ADSENSE_CERTIFIED_CMP_READY=true|false
ADSENSE_PUBLISHER_ID=ca-pub-1234567890123456
ADSENSE_SLOT_HOME_BELOW_FEATURED=1234567890
ADSENSE_SLOT_ARTICLES_IN_FEED=1234567890
ADSENSE_SLOT_CATEGORIES_OVERVIEW=1234567890
ADSENSE_SLOT_CATEGORY_IN_FEED=1234567890
ADSENSE_SLOT_ARTICLE_MID=1234567890
ADSENSE_SLOT_ARTICLE_SIDEBAR=1234567890
ADSENSE_SLOT_ARTICLE_END=1234567890
```

When all production gates pass, the build emits:

- `/js/adsense-config.js` with the approved public runtime identifiers;
- `/data/advertising-manifest.json` with the resolved gates and controlled inventory; and
- `/ads.txt` with `google.com, pub-…, DIRECT, f08c47fec0942fa0`.

When inactive, no `ads.txt` authorization is emitted and the generated runtime configuration contains only inert all-zero placeholders.

## Required owner activation sequence

1. **Approval and content:** Confirm the AdSense account and canonical site are approved. Re-audit the live site for sufficient original editorial content, current source quality, no thin/empty/dead-end monetized screens, and no prohibited content.
2. **Units:** Create seven responsive display units in AdSense with unambiguous names matching the registry. Copy the publisher ID and each unit ID from the AdSense account; do not infer or reuse IDs accidentally.
3. **CMP:** Configure a Google-certified CMP for every geography where Google requires one. As of this review, AdSense requires a certified CMP integrated with IAB TCF for applicable EEA, UK, and Swiss traffic, and TCF v2.3 is mandatory for new consent strings after February 28, 2026. Confirm Google Advertising Products/vendor selections, required purposes, first-layer disclosures, consent records, and a working revocation route. The local Lawscope preference center is not itself certified.
4. **Privacy:** Confirm the Privacy Policy names Google AdSense, describes personalized/non-personalized or limited modes as applicable, links provider notices and controls, identifies relevant partners, and matches the actual account/CMP settings. Obtain legal/privacy review where needed.
5. **Placement and density:** Inspect all seven placements at narrow mobile, tablet, and desktop widths. Confirm no unit overlaps content, navigation, buttons, menus, dialogs, pagination, or consent controls; no unit looks editorial; there are never more ads/promotional materials than publisher content; and mobile remains less dense than desktop.
6. **Invalid traffic:** Document expected acquisition sources. Do not buy low-quality traffic, encourage ad interaction, click live ads, ask staff or contributors to click, or test by interacting with live creatives. Monitor suspicious traffic, accidental-click signals, confirmed-click treatment, and AdSense Policy Center notices.
7. **Configure:** Add real IDs and set the three readiness attestations. Set `ADSENSE_ENABLED=true` last. Keep all Preview deployments disabled; the build and canonical-origin gate provide defense in depth.
8. **Preflight:** Run `npm run validate:adsense`, then `npm run check`. Inspect `/data/advertising-manifest.json` and `/ads.txt`. Verify excluded pages contain no advertising scripts or inventory.
9. **Canonical smoke test:** Deploy only after approval. On `https://getlawscope.com`, verify no request occurs before opt-in; rejection/GPC leaves units absent; opt-in loads exactly one Google loader; responsive units do not overflow; desktop-only inventory is not requested on mobile; and unfilled/error units collapse. Use browser network/dev tools and AdSense reporting—never click a live ad.
10. **Monitor:** Check coverage, Policy Center, traffic quality/source changes, layout/CLS, accidental-click risk, consent/CMP diagnostics, and complaints. Repeat the policy review after layout, traffic-source, consent-provider, partner, or Google-policy changes.

## Immediate rollback

Set `ADSENSE_ENABLED=false` (or `advertising.enabled: false`) and redeploy. Confirm the manifest reports `enabled: false`, all-zero IDs, no `/ads.txt`, no Google advertising request, and collapsed/omitted units. A policy, CMP, traffic-quality, account, or placement concern is sufficient reason to roll back; revenue is not a reason to leave a questionable implementation active.

## Official references reviewed

- AdSense code and ad-unit code: <https://support.google.com/adsense/answer/9274019>
- Responsive ad-unit troubleshooting: <https://support.google.com/adsense/answer/10734935>
- Unfilled units and `data-ad-status`: <https://support.google.com/adsense/answer/10762946>
- Google Publisher Policies, including interference, low-value inventory, and more ads than content: <https://support.google.com/adsense/answer/10502938>
- Invalid traffic definition: <https://support.google.com/adsense/answer/16737>
- Accidental-click/Confirmed Click placement guidance: <https://support.google.com/adsense/answer/10025624>
- EU user-consent requirements: <https://support.google.com/adsense/answer/7670013>
- Certified CMP and IAB TCF integration: <https://support.google.com/adsense/answer/9804260>
- March 2026 TCF v2.3 transition notice: <https://support.google.com/adsense/answer/16942036>

Google policies and legal requirements can change. This review is a dated engineering control, not continuing legal advice or a substitute for checking the live AdSense account and current official policies immediately before activation.
