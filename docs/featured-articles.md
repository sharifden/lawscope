# Featured Articles Grid Contract

Module 06 renders the home-page **Featured Legal Guides** section from published Markdown during the static build. The browser receives complete semantic cards; JavaScript is not required to select or display this content.

## Selection and hero exclusion

The grid consumes the same deterministic content graph as the Module 05 hero:

1. Draft and future-dated articles are ineligible.
2. Published articles are ordered by publication date descending, then title and slug ascending for stable ties.
3. Explicitly featured entries are preferred for the hero and for the featured candidate list.
4. The selected hero slug is removed before grid selection.
5. The build renders the first three remaining candidates.
6. One or two candidates render as one or two cards without placeholders. If none exists, the section shows a short editorial empty-state message.

`/generated/data/home-selection.json` records both the complete non-hero candidate order and `displayedFeaturedSlugs`. This makes the selection auditable and preserves the Module 05 exclusion contract.

## Reusable card

`/pages/partials/article-card.html` is shared, content-agnostic markup. Every card includes:

- A separately linked 16:9 editorial image
- Intrinsic image width and height to prevent layout shift
- `loading="lazy"` and asynchronous decoding for below-the-fold media
- Meaningful CMS-authored image alt text
- Linked category badge
- Linked full article title in an H3
- CMS-authored excerpt
- Truthful author, semantic publication date, and build-derived reading time
- A contextual “Read more” link with visually hidden article-title text

Image, title, category, and read-more links remain individually actionable. The article container is deliberately not converted into a single oversized link.

## Responsive and interaction behavior

The grid is mobile-first: one column by default, two columns from 48rem, and three columns from 64rem. Cards use flex layout inside equal-height grid tracks, while full titles and excerpts remain available rather than being removed for visual uniformity.

Keyboard users receive the global focus-visible treatment on every link plus a restrained `focus-within` card border and shadow. Fine-pointer hover adds only a small vertical shift, soft shadow, and subtle image scale. The reduced-motion query removes those transitions and transforms.

## Content and media

The three Module 06 development entries live in `/content/articles/` and use local 800 × 450 progressive JPEGs in `/assets/images/`. Their reading times are calculated from article body text at build time, not entered manually. These Markdown fields map directly to the future Decap CMS Articles collection.

Run `npm run check` after content or template changes. The Module 06 validator checks source contracts, one/two/three-card selection fixtures, hero exclusion, image dimensions and size, generated heading structure, metadata, lazy loading, intrinsic dimensions, link independence, and rendered manifest order.
