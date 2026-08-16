# Latest Articles Grid Contract

Module 08 renders the home-page **Latest Legal Guides** section from eligible Markdown articles during the static build. It reuses the Module 06 Article Card partial, so the browser receives complete semantic HTML without client-side content fetching or sorting.

## Eligibility and deterministic order

`loadPublishedArticles()` provides only valid entries with `status: published` whose publication date is not later than the build date. Draft and future-dated entries are excluded before latest selection.

`selectLatestArticles()` sorts every eligible entry using the shared content-graph rule:

1. Publication date descending
2. Title ascending with the `en-US` locale when dates tie
3. Stable slug ascending when both date and title tie

The selector requires a non-negative integer limit and returns at most six entries for the home section. Fewer eligible entries render naturally, while no entries produce a credible static empty state.

## Duplicate-avoidance policy

The home hero and the three Article Cards actually displayed in Featured Legal Guides form the preferred exclusion set. The latest selector first takes the newest articles outside that set.

If fewer than six non-excluded articles exist, it appends the newest excluded entries until the section reaches six or runs out of published content. This keeps the home page useful on a small publication while avoiding repeated hero/featured content whenever alternatives exist.

The current content set has six non-excluded entries, so no repeated slugs are required. `/generated/data/home-selection.json` records:

- `latestArticleSlugs`
- `latestPreferredExclusionSlugs`
- `latestRepeatedSlugs`

## Reused Article Cards

Every latest entry is rendered through `/pages/partials/article-card.html` with:

- A separately linked 16:9 local image
- Intrinsic image dimensions and lazy loading
- Linked controlled-category badge
- Full linked H3 title
- CMS-authored excerpt
- Truthful author and semantic publication date
- Reading time calculated from Markdown body text at build time
- Contextual read-more link

The image, title, category, and read-more controls remain independent keyboard targets; the whole card is not converted into one oversized link.

## Layout and action

`/pages/partials/home-latest.html` contains the section heading, explanatory introduction, grid, empty-state insertion point, and a secondary **View all law articles** link to `/articles/`.

The grid is mobile-first:

- One column by default
- Two columns from 48rem
- Three columns from 64rem, producing two rows for six entries

Cards retain the shared restrained hover, visible focus-within state, reduced-motion behavior, and semantic light/dark surface tokens. The View All action follows the complete grid and inherits the 44-pixel shared button target.

## Module 08 development content

Six published, non-featured sample articles and six local 800 × 450 progressive JPEGs provide the current latest set. Their dates descend from August 8 through August 3, 2026. They cover Family Law, Personal Injury, Immigration Law, Consumer Law, Civil Rights, and Legal News & Updates without changing the Module 05 hero or Module 06 Featured Articles selection.

Run `npm run check` after changing content, dates, templates, or selection rules. Validation covers source contracts, deterministic ties, draft/future exclusion, preferred duplicate exclusion, fallback filling, fewer-entry and empty behavior, image dimensions, generated metadata, card order, manifest order, and responsive grid declarations.
