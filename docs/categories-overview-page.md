# Module 19 — Categories Overview Page

## Purpose and route

Module 19 adds the statically generated legal-topic directory at `/categories/`. The page helps readers choose among Lawscope’s ten controlled areas of U.S. law without implying that a topic selection is personal legal advice. Module 20 individual category pages remain outside this module.

## Content source and generation

The build reads the controlled category collection in `content/categories/` through `loadCategories()`. That loader continues to enforce the approved names, slugs, icons, order, description length, and canonical `/categories/{slug}/` routes. Each controlled description is unique and contains two sentences for the overview tile.

`pages/categories.html` supplies the semantic page shell. `pages/partials/category-overview-tile.html` renders the page-specific “Browse articles” action without changing the established Home tile’s “Explore topic” contract. `scripts/build.mjs` renders the source into `generated/categories/index.html`; the visible directory and its structured data come from the same validated category records.

The page remains complete without browser JavaScript. Theme, header search, consent, newsletter, and scroll reveal are progressive enhancement only.

## Page structure

The generated page contains:

- the shared header, active Categories navigation state, and `Home / Categories` breadcrumb;
- the approved `Explore Legal Topics` H1, introduction, and jurisdiction reminder;
- all ten category tiles in controlled order with approved icons, names, two-sentence descriptions, routes, and “Browse articles” actions;
- optional horizontal advertising inventory after the complete grid;
- the approved `Not sure where to start?` guidance copy, links to Articles and Contact, and an explicit boundary against case evaluation or legal-strategy recommendations;
- the shared newsletter panel, footer, consent manager, and back-to-top control.

## Responsive behavior

The directory is mobile first: one column by default, two columns from the medium breakpoint, and three columns from the large breakpoint. The tenth tile is centered in the final desktop row. All tile links and buttons retain the shared keyboard focus treatment and touch-target sizing.

## Advertising launch state

`pages/partials/ad-slot-categories-overview.html` provides one labeled `categories-overview-below-grid` inventory position. It is outside and after the category list, never between tiles. The global advertising feature flag remains disabled, so the slot is hidden at launch and does not leave a blank reserved area. The shared consent-aware adapter can activate approved inventory later only when production advertising and consent requirements are satisfied.

## Metadata and structured data

The route uses the approved `Legal Topics & Categories | Lawscope` title, unique meta description, absolute canonical URL, Open Graph fields, and Twitter summary fields. JSON-LD identifies the page as a `CollectionPage` with a two-item `BreadcrumbList`, Lawscope publisher reference, and a ten-entry `ItemList` generated from the visible controlled categories.

## Validation

Run:

```bash
npm run validate:categories-page
```

The validator checks source and generated markup, all ten records and routes, unique two-sentence descriptions, controlled order and icons, responsive CSS, centered final desktop row, launch-disabled post-grid advertising, guidance links and boundaries, shared newsletter/footer integration, metadata, JSON-LD, and unresolved build tokens.
