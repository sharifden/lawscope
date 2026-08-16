# Module 17 — Law Articles Page

## Public routes

The build emits the article library as complete static HTML at stable trailing-slash routes:

- `/articles/`
- `/articles/page/2/` and additional `/articles/page/{n}/` routes when content volume requires them

The current page size is nine cards. This keeps the full-row advertising insertion point after card six and creates a real second crawlable page from the ten published CMS fixtures. Page 1 is the only canonical form of the first listing page; `/articles/page/1/` is not generated. Filter, sort, and tracking query strings must never become canonical listing routes.

## Deterministic content model

`scripts/articles-page.mjs` copies and sorts eligible published articles by:

1. publication date descending;
2. title ascending;
3. slug ascending.

It then creates immutable page models with stable route, Previous/Next route, item range, total count, and card set. The build renders each model with `pages/articles.html` and the shared `pages/partials/article-card.html`. Primary card content does not depend on browser JavaScript.

`generated/data/articles-pagination.json` records the generated page routes and article slugs for auditing. It is build evidence, not a browser content source.

## Page structure

Each listing route includes:

- shared header and footer;
- wrapping breadcrumb;
- approved H1, intro, and legal-information boundary note;
- labeled keyword, controlled-category, and sort controls;
- visible result and page-range summary;
- responsive one-, two-, and three-column card library;
- helpful empty-state markup with reset and category-navigation actions;
- crawlable page-number and Previous/Next controls;
- existing settings-driven newsletter panel after pagination;
- page-specific canonical metadata, social metadata, and `CollectionPage` JSON-LD.

Module 17 establishes the semantic filter form and GET-compatible control names. Module 18 owns complete all-category filtering, query/history state, dynamic result updates, and reset behavior.

## Advertising boundary

`pages/partials/ad-slot-articles-in-feed.html` is inserted only when a listing page contains more than six cards. It follows exactly six card components, spans the full grid, and is labeled “Advertisement.” It uses the existing global advertising feature flag and consent gate. Advertising remains disabled in current settings, so the slot is present as an audited insertion point but hidden and makes no provider request. Empty and short pages receive no insertion.

## Progressive enhancement and accessibility

All article cards, pagination links, category links, dates, metadata, and explanatory content are in generated HTML and remain available without JavaScript. Native labels and controls, visible focus styles, 44px minimum targets, responsive stacked controls, reduced-motion handling, polite result status, and descriptive card image attributes are retained. Existing deferred scripts enhance the shared header, search, theme, consent, newsletter, reveal, and back-to-top components without owning the primary listing content.
