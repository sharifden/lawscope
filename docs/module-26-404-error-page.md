# Module 26 — 404 Error Page

## Purpose

Module 26 provides a branded, useful error document for missing Lawscope routes. The page preserves trust by clearly identifying the error, offering reliable exits, supporting a no-JavaScript search path, and returning the correct HTTP status instead of a soft 404.

## Source and build contract

- Model: `scripts/not-found-page.mjs`
- Source template: `pages/404.html`
- Renderer: `scripts/render-not-found-page.mjs`
- Generated host error document: `generated/404.html`
- Generated build manifest: `generated/data/not-found-page.json`
- Validator: `scripts/validate-not-found-page.mjs`
- Local static server: `scripts/preview.mjs`

The main build obtains categories from the existing validated content graph, selects exactly the first five in its deterministic controlled order, and writes their names and routes into the error document. No parallel unmanaged category list is maintained.

## HTTP behavior

`generated/404.html` is placed at the output root for host-level error handling on Vercel. The local preview server streams the same document for any unresolved route with `Content-Type: text/html; charset=utf-8` and an actual HTTP `404` status. Existing files retain their normal `200` status. This prevents a soft-404 response while keeping the branded body available on arbitrary broken URLs.

A direct development request for `/404.html` is an ordinary static-file request and can return `200`; unresolved routes are the status contract that matters.

## Content and navigation

The generated page includes the planning document’s exact eyebrow, H1, explanatory copy, action labels, search placeholder, popular-category heading, and broken-link report note. The primary action returns home, the secondary action opens the Articles library, and the broken-link route points to `/contact/#contact-subject`.

The inline search is a native GET form that submits `q` to `/articles/`. It remains useful when JavaScript is disabled because the Articles library reads its filter state from the query string. The shared header remains available but intentionally has no `aria-current="page"` state because a missing URL is not a site section.

## Accessibility and responsive behavior

- A skip link targets the focusable main landmark.
- The page has exactly one H1 and uses a labelled navigation region for popular links.
- Search uses a native search landmark, an associated label, a search input, and a native submit button.
- Decorative icons and the subtle visual `404` are hidden from assistive technology where they do not add meaning.
- All buttons and links retain the shared 44px minimum target and visible focus treatment.
- Actions and the search submit control stack on narrow screens, then move inline at wider breakpoints.
- Reduced-motion behavior is inherited from the shared tokenized system.

## Trust, indexing, and monetization

The error document is permanently `noindex, nofollow`. It has no canonical URL, Open Graph/Twitter metadata, or JSON-LD because an arbitrary missing URL must not be represented as a valid entity or social destination. The manifest marks it ineligible for sitemap inclusion; Module 29 must continue to exclude `404.html` when the XML sitemap is generated.

The page is ad-free. It contains no ad slot, advertisement label, ad loader, newsletter form, article content, or article schema. The rendered shared footer receives the `site-footer--compact` modifier without changing the shared source partial’s legacy opening-tag contract. Its large category group is hidden because the error panel already provides five useful controlled-category exits.

## Validation

Run:

```bash
npm run validate:not-found
```

The validator checks exact visible content; page semantics; the native search contract; exactly five unique controlled category links; the Contact fragment route; no active navigation state; no ads, canonical/social metadata, or structured data; no unresolved tokens; compact shared footer reuse; build and package integration; Vercel output assumptions; and a live ephemeral preview request that proves an unknown route returns branded HTML with HTTP 404 while `/` still returns 200.
