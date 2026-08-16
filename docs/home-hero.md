# Home Hero Contract

Module 05 renders the home-page featured article hero from Markdown front matter at build time. The browser receives complete semantic HTML; no client-side content fetching or hero-selection JavaScript is required.

## Source fields

The selector reads published entries from `/content/articles/`. Hero eligibility requires:

- `title`
- stable `slug`
- valid `publish_date`
- approved `category` slug
- `excerpt` of no more than 160 characters
- local `featured_image` under `/assets/images/`
- meaningful `featured_image_alt`
- `status: published`
- non-empty Markdown body

`readingTime` is derived during every build from the Markdown body at 225 words per minute, rounded up to at least one minute. It is never read from an editor-authored field.

## Deterministic selection

1. Exclude drafts and future-dated entries.
2. Sort published entries by publication date descending.
3. Break date ties by title, then stable slug, in ascending `en-US` order.
4. If one or more eligible entries have `featured: true`, choose the first after deterministic sorting.
5. If none is explicitly featured, choose the newest eligible published article.
6. Fail the build clearly when no eligible article exists.

The build writes `/generated/data/home-selection.json` with the hero slug, selection reason, explicit exclusion list, remaining featured-grid candidate slugs, and displayed grid slugs. Module 06 consumes this shared selection so the hero article cannot be repeated in the Featured Articles grid.

## Rendered component

- One page H1, supplied by the selected article title
- Linked category badge
- CMS excerpt
- Derived reading time
- Human-readable publication date in a semantic `time` element
- Primary “Read the guide” action
- Linked 16:9 image with intrinsic width and height
- Meaningful CMS alt text
- `fetchpriority="high"` and no lazy loading because the hero image is expected to be the LCP image

## Responsive order

The DOM order is content first and image second. Mobile therefore shows the category, H1, excerpt, metadata, and action before the image. At the large breakpoint the same source order becomes a two-column layout, with copy left and media right.

## Development media

The current preview image is a locally stored, original development asset with no people, logos, or readable text. It is 1,600 × 900 pixels and approximately 136 KB. Editors will later replace or retain imagery through the CMS media field according to the publication’s licensing and editorial policy.
