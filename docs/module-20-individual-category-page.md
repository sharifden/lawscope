# Module 20 — Individual Category Page Template

## Purpose and routes

Module 20 generates one static landing page for every controlled Lawscope category. The canonical first-page pattern is `/categories/{slug}/`; additional result pages use the crawlable pattern `/categories/{slug}/page/{number}/`. The launch content produces ten category routes because each category currently has one published guide. Pagination remains deterministic as the corpus grows.

The source of truth remains `content/categories/` and `content/articles/`. `scripts/content-graph.mjs` validates exactly three unique related-category slugs per controlled category and rejects unknown or self-referential relationships. `scripts/category-pages.mjs` performs exact category matching, newest-first sorting, featured selection, no-duplication handling, nine-visible-item pagination, and in-feed advertisement sequencing.

## Page structure

`pages/category.html` supplies the semantic shared shell. Each generated category page contains:

- the shared header and `Home / Categories / {Category Name}` breadcrumb;
- one category H1 with the approved Font Awesome icon, controlled description, published-guide count, and U.S. state-law jurisdiction reminder;
- an optional responsive horizontal featured guide when at least two matching published entries exist;
- a category-only article-card grid using the approved “Latest {Category Name} Articles” heading;
- crawlable previous, numbered, and next pagination controls when more than one page exists;
- exactly three editorially controlled related-topic links;
- category-aware newsletter wording followed by the shared footer, consent manager, and back-to-top control.

No browser JavaScript is required to read or navigate the category pages. Theme, header search, newsletter submission, consent, advertising activation, back-to-top behavior, and scroll reveals remain progressive enhancements.

## Empty, few-entry, and featured states

An empty category still generates its canonical first route and uses the approved copy: “No articles are published in this category yet. Browse all articles or subscribe for new Lawscope guides.” The state links to the Articles library and newsletter area.

A one-entry category displays a singular “1 published guide” count and a normal reusable article card. A single article is never promoted into a featured region, preventing a duplicated or visually inflated few-entry state. Featured selection begins only when at least two matching articles exist; the selected feature is removed from the regular feed but remains part of the visible nine-item page capacity.

## Sorting, pagination, and category isolation

Only published entries with a category slug exactly equal to the page’s controlled slug are eligible. Entries sort by publication date descending, then by deterministic title and slug tie-breakers. The category page size is nine visible articles. First-page feature promotion uses one of those nine positions; subsequent pages retain nine regular cards. Clean canonical, previous, and next URLs are emitted at build time, and no client-side filtering is needed.

## Advertising safety

`pages/partials/ad-slot-category-in-feed.html` defines the only category in-feed inventory. `createCategoryFeedSequence()` inserts it after six regular cards only when a page contains at least seven regular cards. It is labeled “Advertisement,” consent-ready, provider-neutral, and governed by the shared advertising settings. The launch advertising flag is disabled, so eligible inventory remains hidden at launch with the disabled state and `hidden`; short launch pages omit the slot entirely and reserve no empty space.

## Metadata and structured data

Every route receives a category-specific title, bounded unique meta description, absolute clean canonical URL, Open Graph fields, Twitter summary fields, and optional `prev`/`next` head links. JSON-LD identifies each route as a `CollectionPage` with Lawscope publisher and website references, the controlled topic, a page-aware `BreadcrumbList`, and an `ItemList` representing the articles visible on that generated page.

## Generated manifest

`generated/data/category-pages.json` records the page size, ad insertion point, clean-route strategy, category relationships, route totals, previous/next routes, optional featured article, regular-feed slugs, complete visible slugs, and whether a page qualifies for an in-feed advertisement. The manifest is diagnostic output; generated HTML remains the public, fully rendered source.

## Validation

Run:

```bash
npm run validate:category-pages
```

The validator checks all ten generated pages, exact-category isolation, publication-date order, singular and empty-state credibility, optional feature removal, ad insertion after six, multi-page clean routes, metadata, canonical and social tags, breadcrumb and `CollectionPage` data, exactly three related-topic links, category-aware newsletter wording, shared footer integration, mobile-first one/two/three-column styling, launch-disabled advertising, and unresolved placeholders.
