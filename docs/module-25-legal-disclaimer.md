# Module 25 — Legal Disclaimer Page

## Route and source contract

- Public route: `/legal-disclaimer/`
- Page template: `pages/legal-disclaimer.html`
- Versioned dates/review status: `content/settings/legal-disclaimer.json`
- Model, schema, approval gate, and article-partial validation: `scripts/legal-disclaimer.mjs`
- Renderer and generated manifest: `scripts/render-legal-disclaimer.mjs`
- Mandatory short-notice partial: `pages/partials/article-disclaimer.html`
- Article template insertion point: `pages/article.html`
- Generated page: `generated/legal-disclaimer/index.html`
- Generated audit record: `generated/data/legal-disclaimer-manifest.json`
- Regression validator: `scripts/validate-legal-disclaimer.mjs`

The ad-free page uses the shared header, Home › Legal Disclaimer breadcrumb, one H1, shared footer, consent manager, and back-to-top control. Its 51.25rem/820px legal-document column includes visible effective and last-updated dates, an amber disclaimer box, a native collapsible linked outline, ten full-page sections, an urgent-deadline warning, and a correction-only Contact callout. The page has no advertising inventory, ad script, newsletter form, or professional-service schema.

## Required article notice

The planning document requires this exact text on every article:

> The information on this page is for educational purposes only and does not constitute legal advice. Laws vary by state. Always consult a qualified attorney for advice specific to your situation.

`scripts/article-pages.mjs` is the single JavaScript source of truth for the sentence. The renderer imports that constant for the full-page amber box. `pages/partials/article-disclaimer.html` contains the same exact sentence and links to `/legal-disclaimer/`.

The disclaimer is not an article front-matter or CMS field. `pages/article.html` has an unconditional `{{ARTICLE_DISCLAIMER}}` insertion point after the substantive article prose and before sources. `scripts/build.mjs` loads the build-controlled partial, rejects changed, duplicated, hidden, conditional, or unlinked output through `validateArticleDisclaimerPartial`, and inserts it into every eligible generated article. There is no per-article opt-out setting.

The Module 21 validator continues to verify one exact occurrence on every generated article, and the Module 25 validator audits the entire current article manifest again, including position and the working full-page link.

## Full-page boundaries

The expanded page follows the planning document’s draft directions:

1. general educational information only;
2. no legal advice;
3. no attorney-client or professional relationship;
4. jurisdictional differences and later legal changes;
5. no guarantees of completeness, timeliness, availability, or outcomes;
6. no reliance for emergencies or legal deadlines;
7. external sources and links;
8. seeking licensed or otherwise authorized professional help;
9. corrections through Contact without personal legal analysis; and
10. use-at-own-risk limitations only to the extent permitted by applicable law.

The page avoids claiming that a broad limitation overrides non-waivable rights. It warns visitors not to send confidential legal facts and distinguishes correction reports from requests for advice. The Contact action points to `/contact/#contact-subject`, where “Report a correction” is an approved subject option. Contact delivery remains visibly unavailable until the monitored server-side provider contract is configured.

## Qualified-counsel review and robots gate

The owner selected the recommended review-gated planning draft approach. The exact short article notice is approved by the planning document, but the expanded wording is not represented as counsel-approved final language.

Development and preview output is always `noindex, nofollow`. Production output remains `noindex, nofollow` until both requirements pass:

1. qualified counsel reviews the current full-page wording and `review_status` in `content/settings/legal-disclaimer.json` is changed to `approved`; and
2. the production deployment sets `LEGAL_DISCLAIMER_APPROVED=true`.

The environment toggle alone cannot approve a pending draft. After counsel changes the language, update the effective/last-updated dates and material revision record before changing review status. Only an approved production build emits `index, follow`. The generated manifest records the non-secret review/indexing state.

Review should specifically assess the no-advice and no-relationship boundaries, use-at-own-risk wording, enforceability/severability language, governing terms elsewhere on the site, target jurisdictions, and any non-waivable consumer or other statutory rights. Do not substitute an environment toggle for legal review.

## Metadata and schema

The generated page includes:

- title: `Legal Disclaimer | Lawscope`
- the approved planning-document meta description
- canonical URL: `https://getlawscope.com/legal-disclaimer/`
- absolute Open Graph and Twitter image metadata
- matching visible, meta, and JSON-LD publication/modification dates
- `WebPage`, publisher `Organization`, and `BreadcrumbList` JSON-LD
- approval- and environment-aware robots metadata

No `LegalService`, attorney, professional-service, unsupported legal-advice, email, telephone, or fabricated responsible-person data is emitted.

## Verification

Run:

```sh
npm run build
npm run validate:legal-disclaimer
npm run check
```

Validation covers the exact required sentence, build-controlled partial, no opt-out, all generated article routes, insertion after article prose and before sources, full-page link, ten section anchors, dates, amber/urgent styling, correction route, no-ad/no-newsletter rules, responsive behavior, metadata, schema, robots fixtures, manifest, and source hygiene.
