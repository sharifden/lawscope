# Module 21 — Individual Article Page Template

## Purpose and routes

Module 21 generates a complete static detail route for every eligible published record in `content/articles/`. The canonical route pattern is `/articles/{slug}/`, with the launch corpus producing ten pages. `scripts/content-graph.mjs` remains the content gate: it validates controlled categories, publication facts, local featured and social media, structured sources, tags, body content, filename/slug parity, and the absence of a Markdown H1. `scripts/article-pages.mjs` then creates each page model, renders sanitized Markdown, prepares the optional table of contents, guards mid-article advertising, and deterministically selects related reading.

The build renders every page into complete HTML. Browser JavaScript is not required to read the guide, use its table of contents, follow sources and tags, share through ordinary links, or navigate to related articles.

## Page structure and visible facts

`pages/article.html` supplies the semantic article shell. Every generated route contains:

- the shared header and a `Home / {Category} / {Article Title}` breadcrumb;
- one page H1, category link, author, visible publication date, optional visible update date, and calculated reading time;
- a high-priority local featured image with descriptive alternative text and an optional caption;
- a responsive article layout with an HTML `details` table of contents and a compact legal/editorial reminder;
- sanitized semantic long-form content rendered from Markdown;
- the exact build-controlled legal disclaimer with a link to the full Legal Disclaimer;
- structured sources and further reading, each labeled and linked to its HTTPS destination;
- tags linked to the existing Articles-library keyword filter;
- privacy-respecting X, Facebook, and LinkedIn share URLs, a copy-link control, and an optional Web Share API control;
- a consent-ready end advertisement, exactly three non-current related article cards, and the shared back-to-top control.

The visible reading-time value comes from the same `article.readingTime` field used by cards and metadata. It is calculated from body Markdown at 225 words per minute and excludes front matter. Machine-readable `<time datetime>` values and structured-data dates are derived from the same publication/update fields shown to readers.

## Markdown rendering and heading contract

`marked` 16.4.2 is a pinned production build dependency. `scripts/article-pages.mjs` uses a complete custom `Renderer` rather than inserting unsanitized browser HTML. Article bodies must start their heading structure at H2, may use H2 through H4 without skipped levels, and may never introduce a second H1. Duplicate heading labels receive stable unique IDs for reliable table-of-contents links.

The renderer:

- escapes raw Markdown HTML rather than executing it;
- rejects body H1 and H5/H6 output;
- rejects unsafe schemes and restricts local Markdown images to `/assets/images/`;
- adds a visible/screen-reader external-link indication without a third-party widget;
- lazy-loads below-the-fold Markdown images;
- wraps tables in labeled, keyboard-focusable horizontal-scroll regions;
- validates the final prose fragment against scripts, embeds, forms, event-handler attributes, and executable URLs.

Markdown source stays in `content/articles/`; the generated HTML is an output artifact and must not be manually edited.

## Disclaimer and advertising safety

`pages/partials/article-disclaimer.html` is a build-controlled partial, not an editorial Markdown field. The build stops if its required text differs from `ARTICLE_DISCLAIMER`, making the approved notice unremovable through article content edits. It appears after the prose and before sources on every route.

`pages/partials/ad-slot-article.html` defines provider-neutral sidebar, mid-body, and end positions. Every emitted slot is labeled “Advertisement,” begins in the shared disabled/unknown-consent state, and remains `hidden` while advertising is unapproved. The sidebar position is not displayed below the desktop breakpoint. The mid-body position is emitted only when at least three complete top-level H2 sections and 150 words of editorial lead precede the fourth H2; otherwise it is omitted rather than forced into short content. All slots remain governed by the shared consent and feature flags.

## Related reading

Related selection always excludes the current article and returns at most three cards. Candidates from the same controlled category rank first, followed by the current category’s three editorially selected related categories. Tag overlap, publication order, title, and slug provide deterministic tie-breakers. The shared `pages/partials/article-card.html` keeps detail-page recommendations consistent with prior listing modules.

## Metadata, social media, and schema

Every generated article route receives a unique title and bounded meta description, an absolute clean canonical URL, article-specific Open Graph fields, Twitter large-image fields, and one or more `article:tag` entries. Each record owns a dedicated local 1200×630 JPEG under `assets/images/social/`; the build reads the JPEG dimensions and fails if they differ.

A consolidated JSON-LD graph contains:

- an `Article` node with headline, description, URL, social image dimensions, publication/modification dates, author, publisher, category, tags, accessibility status, and language; and
- a `BreadcrumbList` node matching the visible three-level breadcrumb.

Article metadata and schema use the same title, canonical route, category, author, tags, dates, and image facts rendered on the page.

## Progressive sharing and responsive presentation

`js/article-page.js` progressively enhances the static share region. It uses the Clipboard API when available, falls back to a temporary text control and `execCommand('copy')`, announces results through a polite live region, and reveals the native Web Share button only when `navigator.share` exists. Canceling the native share sheet does not produce a false error. The page remains usable without this script.

The Module 21 section of `css/components.css` is mobile-first and BEM-styled. It constrains line length, provides readable article flow, large keyboard/touch targets, responsive table overflow, compact mobile tools, a desktop article/sidebar grid, a two/three-column related-card progression, visible focus behavior through the shared system, semantic dark-mode colors, and reduced-motion handling.

## Generated manifest and validation

`generated/data/article-pages.json` records route and canonical facts, source/tag counts, calculated reading time, heading IDs, guarded mid-ad status, related slugs, and social media path for every generated article. It is diagnostic output; generated route HTML remains the public source.

Run:

```bash
npm run validate:article-pages
```

The targeted validator checks all generated routes, exact disclaimer enforcement, one-H1 and heading rules, sanitized Markdown fixtures, guarded ad placement, sources, linked tags, static and enhanced sharing controls, current-article exclusion, exact related-card count, social image dimensions, visible/machine-readable fact parity, canonical and article social metadata, `Article`/`BreadcrumbList` JSON-LD, responsive/dark/reduced-motion styling, launch-disabled ads, back-to-top integration, and unresolved placeholders. `npm run check` includes this validator after rebuilding all static output.
