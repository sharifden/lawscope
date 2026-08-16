# Module 10 — Newsletter Signup Section

## Purpose

The homepage newsletter section appears after Popular Categories and before the footer. It presents Lawscope's approved newsletter promise, requests an email address, explains consent and privacy, and describes double opt in before submission.

## Source and generated files

- `pages/partials/home-newsletter.html` — semantic section, explicit label, POST form, privacy link, double-opt-in explanation, and live status region.
- `js/newsletter.js` — deferred vanilla JavaScript validation, loading state, provider adapters, and accessible result announcements.
- `content/settings/site.json` — CMS-compatible newsletter feature flag, public endpoint fallback, provider adapter, and locked double-opt-in policy.
- `scripts/site-settings.mjs` — approved-provider and HTTPS/same-origin endpoint validation.
- `scripts/build.mjs` — resolves public configuration, renders the partial, and records non-sensitive feature state in the homepage manifest.
- `css/components.css` — mobile-first BEM component styling with semantic tokens, 44px controls, dark-mode compatibility, and reduced-motion behavior.
- `scripts/validate-newsletter.mjs` — source, generated markup, settings, privacy, request, and executable browser-state contracts.
- `generated/index.html` — built homepage output.

## Safe baseline

Newsletter delivery is intentionally disabled in the committed baseline. The section remains visible, but its email and submit controls are disabled and its status explains that no address will be transmitted or stored. This avoids a form that appears to work while silently discarding subscriber data.

To enable delivery:

1. Configure a public HTTPS endpoint in the deployment environment as `NEWSLETTER_FORM_ENDPOINT`. A root-relative same-origin endpoint is also accepted through settings.
2. Set `NEWSLETTER_PROVIDER` to `generic-form` or `generic-json` when the endpoint does not use the default form-encoded adapter.
3. Set `newsletter.enabled` to `true` in `content/settings/site.json`.
4. Run `npm run check`. The build fails if delivery is requested without a valid endpoint, if an external endpoint uses plain HTTP, or if the provider has no approved adapter.

Only a public submission endpoint belongs in environment/settings. API keys, provider secrets, subscriber exports, and email addresses must never be committed. If a provider requires a secret, put it behind a same-origin serverless endpoint and store the secret only in deployment settings.

## Submission and privacy contract

- The enhanced form sends one `POST` request; the address is placed in the request body and never in a query string.
- Cross-origin requests use `credentials: "omit"`, `referrerPolicy: "no-referrer"`, `cache: "no-store"`, and `redirect: "error"`.
- The client does not write addresses to local/session storage, analytics, the console, generated manifests, or URLs.
- The client clears the input after confirmation is requested or an address is reported as already subscribed.
- Provider errors are reduced to the approved generic public message; raw provider details are not shown or logged.
- A successful provider request means only that confirmation was requested. It never claims the person is subscribed before double-opt-in confirmation.

Provider responses may identify an existing subscription with HTTP `409` or a JSON `status` value of `already_subscribed`, `already-subscribed`, or `existing`. Other successful responses produce the confirmation-requested message.

## Accessible states

The enhancement implements these distinct states:

- `idle` — enabled and ready for an address.
- `invalid` — represented by `aria-invalid`, an inline field error, and focus returned to the email field.
- `loading` — `aria-busy="true"`, disabled controls, “Subscribing…” text, and a progress icon.
- `success` — “Please check your inbox to confirm your subscription.”
- `existing` — the approved already-subscribed message.
- `error` — the approved generic error announced with an alert role.
- `unavailable` — endpoint not configured; controls remain inert.

The form has an explicit label, browser-compatible `type="email"` behavior, autocomplete metadata, visible focus, semantic status announcements, and tokenized 44px minimum targets. Native POST behavior remains the no-JavaScript fallback when the feature is configured.

## Verification

```bash
npm run validate:newsletter
npm run check
```

The validator exercises invalid input, an in-flight request, confirmation requested, existing subscriber, generic error, both provider adapters, and the unconfigured safety gate without transmitting real subscriber data.
