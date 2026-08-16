# Module 24 — Privacy Policy Page

## Route and source contract

- Public route: `/privacy-policy/`
- Source template: `pages/privacy-policy.html`
- Versioned facts: `content/settings/privacy-policy.json`
- Model and approval gate: `scripts/privacy-policy.mjs`
- Renderer and generated manifest: `scripts/render-privacy-policy.mjs`
- Generated page: `generated/privacy-policy/index.html`
- Generated audit record: `generated/data/privacy-policy-manifest.json`
- Regression validator: `scripts/validate-privacy-policy.mjs`

The page is a complete static `WebPage` with the shared header, Home › Privacy Policy breadcrumb, one H1, shared footer, shared consent manager, and shared back-to-top control. It uses the existing 51.25rem/820px legal-reading measure and contains no advertising slot, ad script, newsletter form, or policy table.

## Policy structure and progressive behavior

The native `<details>` table of contents links to all 20 areas required by the planning document. It is open initially for immediate no-JavaScript access, can be collapsed with pointer or keyboard input, and requires no custom disclosure-state JavaScript. Every destination has a stable section ID and header offset.

Long provider URLs, addresses, and code-style storage keys wrap. Collection categories and providers use responsive lists/cards instead of a layout table. The page remains a single readable column on small screens; supporting fact and provider cards become two columns only when space permits.

The inline “Privacy choices” button and the footer button both use `data-open-consent-preferences`. They open the single shared native preference dialog controlled by `js/consent.js`; Module 24 creates no second cookie banner, storage key, visitor identifier, or consent record. With JavaScript unavailable, the policy remains readable and the inline `<noscript>` message explains that the optional integrations are not activated by the preference controller.

## Actual-state disclosures

The committed policy describes the implemented configuration rather than claiming unavailable legal or provider facts:

- `lawscope-theme` stores an explicit light/dark choice in browser local storage.
- `lawscope:consent` stores only the consent revision and essential/analytics/advertising booleans. It stores no name, email, visitor ID, timestamp, IP address, page history, or search phrase.
- Public search uses a static browser-fetched index and performs matching locally.
- Vercel hosting, Google Fonts, and Cloudflare cdnjs are listed as configured public dependencies, with their public privacy notices.
- Advertising is inactive. Module 30 adds a disabled-by-default Google Analytics 4 adapter: placeholder IDs do not activate Google, and a real production ID still requires explicit activation plus affirmative analytics consent. The policy now identifies GA4, its limited event set, two-month retention prerequisite, parameter exclusions, and withdrawal behavior.
- Newsletter collection is inactive and has no selected delivery provider.
- Contact delivery is unavailable until the public feature toggle and a valid server-only HTTPS webhook destination/token are present. The app endpoint validates and forwards accepted messages in memory and does not write them to Git or an application database.
- The server abuse-control key is a pseudonymous HMAC-derived key kept in memory for a ten-minute rate-limit window.
- No sale or cross-context advertising sharing is active in the committed configuration.

The page explains purposes, possible legal bases without overstating applicability, disclosures, U.S. state rights, a California notice at collection, EEA/UK/Swiss rights, security limitations, children’s privacy, Global Privacy Control and Do Not Track handling, international processing, external links, revisions, and identity verification for requests.

## Privacy requests

The policy links to `/contact/#contact-subject`, which lands at the Contact form’s subject field. The approved subject list contains “Privacy request.” The page renders one of two truthful states:

1. **Channel ready:** a “Start a privacy request” action appears when the Contact delivery feature is fully configured and the versioned policy record confirms that it is monitored.
2. **Channel pending:** the committed pre-launch output explains that Lawscope will not invite personal information into an unmonitored inbox and links visitors to the Contact page’s availability state.

A monitored privacy-request channel is therefore a launch requirement, not an invented email address. Contact messages, privacy-request PII, provider credentials, and secrets must never be added to Git.

## Production approval and indexing gate

The committed source is a configuration-accurate pre-launch draft because no counsel-approved text, responsible legal entity/address, final monitored request channel, or owner-approved provider and retention record has been supplied. Development and preview builds are always `noindex, nofollow`. A production build is also `noindex, nofollow` until every gate passes.

Before launch:

1. Have qualified privacy counsel review and approve the final language for Lawscope’s actual jurisdictions and practices.
2. Enter the responsible legal entity and postal address in `content/settings/privacy-policy.json`; set `legal_identity_confirmed` only after the owner verifies them.
3. Confirm each active provider and retention choice. Replace pending criteria with owner-approved wording, add the selected provider notice URL, and set `details_confirmed` only for verified entries.
4. Configure and test the monitored privacy-request channel through the existing Contact serverless contract. Update the `contact-delivery` inventory entry and set `monitored_channel_confirmed` only after delivery and operational ownership are verified.
5. Update the effective/last-updated dates and material revision record when the final notice changes.
6. Set `review_status` to `approved` only after qualified privacy counsel signs off.
7. Set the deployment environment variable `PRIVACY_POLICY_APPROVED=true` only after the preceding checks pass.

`PRIVACY_POLICY_APPROVED=true` alone cannot make the page indexable. `scripts/privacy-policy.mjs` also requires the versioned counsel status, confirmed responsible legal entity/address, confirmed active-provider and retention details, and a live monitored Contact channel. Only an approved production build emits `index, follow`. The generated manifest records the state and non-secret blockers for deployment review.

Changing data flows later—especially expanding the documented GA4 measurement plan, enabling advertising or newsletter delivery, selecting another form provider, or adding a CDN—requires updating this policy and its service inventory before that feature is activated.

## Metadata and schema

The renderer emits:

- title: `Privacy Policy | Lawscope`
- the approved planning-document meta description
- absolute canonical: `https://getlawscope.com/privacy-policy/`
- absolute Open Graph and Twitter image metadata
- visible and machine-readable effective/last-updated dates
- one JSON-LD graph containing `WebPage`, publisher `Organization`, and `BreadcrumbList`
- environment- and approval-aware robots metadata

The responsible operator is not fabricated in structured data. Until it is confirmed, the public `Organization` node identifies the Lawscope publication only.

## Verification

Run:

```sh
npm run build
npm run validate:privacy-policy
npm run check
```

The validator covers the 20 linked sections, native collapsibility, actual-state claims, service inventory, retention disclosures, one consent store/dialog, Contact subject/route integration, approval and indexing fixtures, no-ad/no-newsletter rules, responsive CSS, metadata, visible/schema dates, JSON-LD, source hygiene, and the generated manifest.
