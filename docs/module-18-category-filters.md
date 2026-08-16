# Module 18 — Category Filters

## Scope

Module 18 uses progressive enhancement to add full-library keyword, category, and sorting controls to the statically generated Law Articles listing. It does not implement Module 19 article-detail behavior or any later module.

## Progressive enhancement and content source

The build still renders nine primary article cards at `/articles/` and the tenth card at `/articles/page/2/`. Those routes keep ordinary crawlable Previous/Next and numbered pagination links, so primary article content is never client-only.

Each route also receives an inert `<template>` containing only the article cards from the other static page. The browser controller combines the active static cards with this supplemental markup in memory, giving either route the same complete ten-article content graph. It does not fetch raw Markdown, the search index, an API, or any third-party service. Card text remains generated from eligible controlled CMS content at build time.

Every shared article card exposes bounded data attributes for its category slug, normalized tag source, publication timestamp, and optional update timestamp. Visible titles, category names, and excerpts are read from the already generated card markup. All ten controlled categories come from the shared category collection rather than a browser-maintained category list.

## Matching and sorting

Keyword matching includes title, category name and slug, tags, and excerpt. Text is normalized with Unicode NFKD decomposition, diacritic removal, lowercase conversion, punctuation-to-space conversion, and whitespace collapsing. Every query token must match the combined searchable fields. A selected category is applied conjunctively.

`newest` is the default deterministic order and sorts by publication date descending. `updated` sorts by the optional update date with publication date as its fallback, then uses publication date, title, and slug tie-breaks. The result status uses singular/plural copy and updates through the existing polite live region.

## URL and browser-history contract

Known state parameters are:

- `q` for a trimmed keyword or phrase;
- `category` for one of the ten controlled category slugs;
- `sort=updated` only for the nondefault sorting mode.

The default `newest` value is omitted. Unknown category and sort values are rejected. Unrelated parameters, including campaign parameters, and URL fragments are preserved.

Form submissions and clear/reset actions use `pushState`. Initial normalization uses `replaceState`. `popstate` reads the URL and restores controls, cards, result copy, empty state, and pagination visibility without creating another history entry. A direct active-state URL opened on `/articles/page/2/` is replaced with the equivalent `/articles/` URL so every active query has one stable listing route.

## Canonical policy

Static canonical links are never rewritten by JavaScript:

- `/articles/` canonicals to `https://getlawscope.com/articles/`;
- `/articles/page/2/` canonicals to `https://getlawscope.com/articles/page/2/`;
- query, category, sorting, campaign, and fragment state is never inserted into a canonical URL.

Filtered states use the base listing route for interaction while the clean static canonical remains authoritative. This prevents filtered, sorted, and query permutations from becoming competing canonical public forms.

## Clear and empty states

Clear filters begins semantically disabled. Once any query, category, or nondefault sort is active, it becomes available. Clearing removes only the known filter parameters, resets all controls, restores the original count and grid label, unhides the original pagination, and puts the original static DOM nodes back in their original order. That exact restoration also preserves the page-one labeled, consent-aware in-feed ad slot.

A zero-result state is cloned from inert build-generated markup. It provides reset and category-browsing actions, but the controller does not move focus unexpectedly. Reset has the same URL, history, control, content, and pagination behavior as Clear filters.

## Files

- `pages/articles.html` — Progressive filter hooks, active-state summary, inert supplement, and empty-state template.
- `pages/partials/article-card.html` — Bounded filter metadata shared by listing cards.
- `scripts/build.mjs` — Full-library supplement and empty-state generation.
- `js/article-filter-model.js` — Pure URL, normalization, matching, sorting, and message model.
- `js/article-filters.js` — DOM, history, reset, pagination, and result-state controller.
- `css/components.css` — Mobile-first filter summary and state styling.
- `scripts/validate-article-filters.mjs` — Static and executable Module 18 contracts.
- `scripts/validate-articles-page.mjs` — Module 17 regression audit scoped to the active static grid.

## Validation boundary

The dedicated validator checks the full ten-article route graph, all ten controlled categories, normalized multi-field matching, deterministic newest/updated ordering, URL parameter cleanup and preservation, clean canonicals, static pagination, exact DOM reset, live result counts, direct page-two handling, and browser Back/Forward behavior. Module 19 remains intentionally unimplemented.
