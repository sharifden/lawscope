# Consent management — Module 13

## Scope and current provider

Lawscope uses a conservative **strict opt-in** baseline for every visitor. No geolocation service, fingerprinting, IP-derived region lookup, analytics tag, advertising tag, or external consent platform is loaded by this module.

The build-time settings in `content/settings/site.json` identify the active provider as `local-preference-center`, revision `1`. This first-party interface is not represented as a Google-certified consent management platform (CMP); `google_certified_cmp` is therefore `false`.

A Google-certified CMP is a launch requirement before Google advertising is served where Google requires one, including applicable traffic from the EEA, United Kingdom, and Switzerland. Module 31 now provides the fail-closed AdSense adapter and a separate `advertising.certified_cmp_ready` owner attestation, but it does not misrepresent the local interface as certified. The local preference center remains the safe no-provider fallback and cannot, by itself, satisfy Google’s certified-CMP requirement. As reviewed on August 16, 2026, the production CMP must also meet the current IAB TCF v2.3 requirement before the owner sets that attestation.

## Visitor choices

The banner and native dialog offer equally styled controls for:

- **Accept All** — grants analytics and advertising, except that an active Global Privacy Control signal continues to deny advertising.
- **Reject Non-Essential** — denies analytics and advertising.
- **Manage Choices** — opens the category preference center.

Essential storage is described separately and is always active. It covers privacy choices requested by the visitor, the explicit theme choice implemented in Module 12, and basic operational/security state. It does not authorize analytics or advertising.

The preference center is available after the initial decision through the **Privacy choices** button in the shared footer. The later Privacy Policy page should use the same `data-open-consent-preferences` hook rather than creating a second consent store.

## Storage model and fail-closed behavior

The controller uses one local-storage key:

- key: `lawscope:consent`
- record: `{ "version": 1, "categories": { "essential": true, "analytics": boolean, "advertising": boolean } }`

Validation requires the exact top-level and category keys, the current integer revision, `essential: true`, and boolean optional-category values. No visitor identifier, timestamp, region, IP address, page history, or other PII is stored. Invalid, corrupt, or obsolete records are discarded and return the interface to undecided, deny-by-default state.

If browser storage is blocked or throws, the controller refuses to apply an optional grant, returns both optional categories to the blocked default, keeps the choice interface available, and displays an error explaining that the choice was not saved. It never loosens a category to compensate. Optional categories remain pending and blocked until a decision can be written and validated safely.

Increment `consent.revision` whenever the meaning, purpose, or provider set behind a category changes materially. A record from an earlier revision intentionally fails validation so renewed permission can be requested.

## Runtime consent contract

`js/consent.js` publishes the effective state in two ways:

1. Root attributes:
   - `data-consent-status="pending|decided"`
   - `data-consent-analytics="pending|granted|denied"`
   - `data-consent-advertising="pending|granted|denied"`
   - `data-global-privacy-control="true|false"`
2. The document event `lawscope:consent-change` with detail:

```text
{
  revision,
  status,
  source,
  globalPrivacyControl,
  categories: { essential, analytics, advertising }
}
```

Initial state is published as well as user and cross-tab changes. Downstream integrations must inspect the root attributes during their own initialization and listen for subsequent events. A category grant is only permission to pass the consent gate; it never bypasses a feature flag, environment gate, provider configuration requirement, or regional policy requirement.

The existing `js/ad-slots.js` adapter follows this contract. Pending consent preserves enabled inventory as `awaiting-consent`; explicit denial collapses it; explicit grant emits `lawscope:ad-slot-ready`. Module 31’s `js/adsense.js` consumer then applies production, exact canonical-origin, approved-account, current-policy-review, certified-CMP-readiness, publisher-ID, and complete slot-registry gates before it can load Google’s script once and request a responsive unit. Advertising remains globally disabled in current settings; generated nonproduction output receives only all-zero public placeholders, and no Google advertising request is made.

The Module 30 GA4 adapter follows this contract: it initializes local consent commands as denied but does not request Google or send a cookieless ping until `data-consent-analytics="granted"`; production, valid-ID, explicit feature, and canonical-host gates must also pass. It disables automatic page views, sends only the documented PII-free measurement set, and applies denied consent plus `ga-disable-*` on withdrawal. See `docs/module-30-google-analytics-ga4.md`. AdSense likewise requires `data-consent-advertising="granted"`; where Google requires a certified CMP, Google’s tag must also receive and honor the certified provider’s compliant current consent signal before serving the applicable ad.

## Global Privacy Control

When `navigator.globalPrivacyControl === true`, Lawscope:

- forces effective advertising permission to `false`;
- disables the advertising preference control;
- explains the enforced state in the preference center;
- preserves an independent analytics choice; and
- publishes the effective denied advertising state to downstream integrations.

Accept All means all choices available under the active signal; it cannot override GPC advertising protection.

## Accessibility and layout safety

The banner is a labelled region and does not take focus on first display. The preference center uses the native `<dialog>` modal when available, supports Escape, provides a close control, and includes a contained-keyboard fallback. Controls meet the shared 44-pixel target, retain visible focus, use semantic fields and labels, and use equal button styling to avoid a deceptive visual hierarchy. A polite status region announces saved, session-only, reset, and cross-tab outcomes.

The visible banner reserves its measured block size through `--consent-safe-block-offset` and body padding. Mobile navigation receives a consent-aware maximum height and can scroll rather than disappearing behind the banner. The shared back-to-top control consumes `var(--consent-safe-block-offset)` together with the device safe area, so it moves above the banner without duplicating banner measurements. The banner itself scrolls on short viewports. Reduced-motion rules remove component transitions, and all colors come from the semantic light/dark palette.

Without JavaScript, the banner and footer re-entry button remain hidden and no optional technology is present or executed. This is a safe fail-closed result.

## Ownership map

- `pages/partials/consent-manager.html` — shared banner, dialog, category explanations, and live region.
- `pages/partials/site-footer.html` — persistent re-entry control.
- `js/consent.js` — validation, persistence, GPC enforcement, accessibility behavior, root state, and consent events.
- `js/ad-slots.js` — provider-neutral slot states and consent contract.
- `js/adsense.js`, `js/adsense-config.js`, and `scripts/advertising.mjs` — canonical-production, readiness, identifier, and strict opt-in AdSense consumer.
- `js/analytics.js` and `scripts/analytics.mjs` — production-gated GA4 consumer with strict pre-consent network blocking and withdrawal handling.
- `css/components.css` — mobile-first component and non-overlap behavior.
- `css/main.css` — shared dimensions and safe-offset token.
- `content/settings/site.json` and `scripts/site-settings.mjs` — validated build-time consent mode, provider, revision, and certified-CMP truthfulness.
- `scripts/validate-consent.mjs` — static and executable Module 13 contracts.

Visitor choices are browser-local only. They are never written into `content/`, the generated manifest, Git, form submissions, or build logs.
