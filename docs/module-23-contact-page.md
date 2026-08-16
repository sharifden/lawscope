# Module 23 — Contact Page & Form

## Route and page contract

`/contact/` is generated from `pages/contact.html` into complete static HTML. It uses the shared header, Home › Contact breadcrumb, one `Contact Lawscope` H1, shared footer, consent manager, back-to-top enhancement, persistent theme behavior, and existing design tokens.

The page contains the approved introduction and distinguishes corrections and website inquiries from legal help. Its mobile-first order is:

1. contact form;
2. “Before You Send a Message” guidance;
3. the three-step correction-reporting workflow; and
4. the prominent emergency, deadline, arrest, immigration, and confidential-facts warning.

At wider viewports the form and guidance form two columns, while source order remains unchanged. Advertising markup and the ad-slot controller are omitted.

## Fields and accessible states

The form collects only:

- name;
- email;
- one approved coarse subject category;
- message;
- optional Lawscope article URL;
- required privacy consent;
- an inaccessible-to-users honeypot; and
- a client-set form-start timing signal.

Each visible control has a programmatic label, documented limits, an adjacent error element, and a matching error-summary link. The summary receives focus after an invalid submission. Processing disables repeated submission and is announced politely. Recoverable delivery failure preserves the entered values and announces the approved alternative-contact wording. Success hides the submitted fields, shows an opaque reference and next steps, receives focus, and offers a reset action.

The form uses native HTML controls and constraints. JavaScript is an ES module enhancement; the page’s guidance, correction workflow, boundary, privacy link, and unavailable notice remain meaningful without JavaScript. When an enabled form is submitted natively, the endpoint accepts URL-encoded fields without requiring the JavaScript-only timing signal and returns a minimal noindex HTML success/failure page; origin checks, honeypot, rate limit, strict field validation, and delivery confirmation still apply. Controls are full-width at the 320-pixel layout, keyboard targets meet the shared 44-pixel minimum, focus remains visible, semantic light/dark colors are reused, and spinner motion is stopped when reduced motion is requested.

## Public configuration and safe default

Public contact settings live in `content/settings/site.json`:

```json
{
  "contact": {
    "enabled": false,
    "endpoint": "/api/contact/",
    "provider": "lawscope-serverless"
  }
}
```

The committed state is deliberately disabled. The generated page shows an honest unavailable notice and disables every submit control. The endpoint remains a same-origin public route; absolute, protocol-relative, non-API, query-bearing, and fragment-bearing endpoint values fail validation.

To activate a deployment, configure and monitor the delivery destination first, then set `CONTACT_FORM_ENABLED=true` in that deployment. The static build enables the controls only when the toggle, an HTTPS delivery webhook, and a nonempty delivery token are all present; none of those server values are rendered. The serverless endpoint independently enforces the same delivery prerequisites. Preview and local static servers should normally leave the toggle false.

## Server-only delivery configuration

`api/contact.mjs` is a Vercel-compatible same-origin serverless function. Configure these only in encrypted deployment environment settings, never in public CMS content or browser JavaScript:

- `CONTACT_DELIVERY_WEBHOOK_URL` — HTTPS endpoint for the monitored support workflow;
- `CONTACT_DELIVERY_WEBHOOK_TOKEN` — bearer credential used only from the function;
- `CONTACT_RATE_LIMIT_SECRET` — high-entropy key used to HMAC the client address before in-memory rate limiting;
- `CONTACT_ALLOWED_ORIGINS` — optional comma-separated HTTPS origins in addition to Lawscope and the active Vercel deployment host; and
- `CONTACT_FORM_ENABLED=true` — explicit server activation.

The function returns `503 unavailable` unless the activation toggle, HTTPS webhook, and token are all present. This prevents accepted messages from being silently discarded. Rotate the webhook token and rate-limit secret according to the deployment incident-response process.

## Server validation and abuse controls

The endpoint:

- accepts only `POST`;
- requires an approved same-origin `Origin`;
- accepts JSON and native URL-encoded form media types only;
- rejects declared or observed bodies over 32 KiB;
- allows only the documented fields;
- reuses the strict field normalization and validation contract server-side;
- validates subject allowlists, consent, message and identity lengths, email shape, and Lawscope article URLs;
- rejects a filled honeypot and implausible JavaScript timing signals;
- rate-limits a keyed HMAC of the apparent client address rather than storing or logging the raw address;
- sends the message only to the environment-configured HTTPS webhook with a server-only bearer token and idempotency key; and
- returns only a status and opaque `LS-YYYYMMDD-XXXXXXXX` reference after confirmed delivery.

The in-memory serverless rate bucket is a privacy-safe baseline, not a globally durable edge control. Production operations should also enable Vercel/provider abuse monitoring and rate controls without forwarding contact PII to analytics.

The endpoint intentionally contains no logging calls. Submitted names, email addresses, message text, article URLs, and confidential facts are not written to Git or echoed in browser responses.

## Analytics and privacy

The client emits `lawscope:contact-success` only after a confirmed successful response. Its detail contains only the approved normalized subject value. It never contains name, email, message, article URL, consent text, timing data, honeypot data, reference, or other PII. A later consent-aware analytics module may map this event to `contact_form_submit` with only that coarse subject category.

The page links to `/privacy-policy/` but does not implement or invent the separate Privacy Policy module. Visitors are explicitly told not to submit confidential legal facts.

## Metadata and indexing

The build emits:

- title `Contact | Lawscope`;
- the approved description under 155 characters;
- absolute canonical, Open Graph, and Twitter metadata;
- `ContactPage`, `Organization`, and `BreadcrumbList` JSON-LD; and
- no `ContactPoint`, email, telephone, attorney, or legal-service schema until a real monitored method is published.

Production emits `index, follow`; preview and development emit `noindex, nofollow`.

## Build and validation

Run:

```bash
npm run build
npm run validate:contact-page
```

The Module 23 validator checks exact approved copy, subjects and correction flow, semantic structure, controls and accessibility states, disabled-by-default settings, no-ad/no-secret/no-PII contracts, responsive CSS, metadata/schema, the pure validation/state model, and server method, configuration, origin, media-type, size, field, honeypot, timing, rate-limit, delivery, reference, and privacy-safe response behavior.
