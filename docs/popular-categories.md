# Popular Categories Grid Contract

Module 09 renders the home-page **Explore Popular Legal Topics** section from the controlled category collection during the static build. The complete section is available without browser JavaScript.

## Controlled collection

The launch taxonomy consists of exactly ten Markdown entries in `/content/categories/`. Every entry supplies:

- Locked category name
- Stable lowercase slug
- Approved Font Awesome icon class
- Approximately 140–240 characters of editorial description
- Locked display order

`loadCategories()` validates file count, required fields, file-name/slug agreement, unique names, unique slugs, unique order values, description length, and the approved name/icon/order for every slug. Missing, additional, renamed, reordered, or unapproved entries fail the build rather than silently changing public taxonomy.

The approved order is:

1. Criminal Law
2. Family Law
3. Business Law
4. Employment Law
5. Personal Injury
6. Real Estate & Property Law
7. Immigration Law
8. Consumer Law
9. Civil Rights
10. Legal News & Updates

Routes are derived as `/categories/{locked-slug}/`. The category overview and individual category pages will be generated only in their later authorized modules; Module 09 establishes stable links and reusable data without implementing those pages early.

## Rendering and accessibility

`/pages/partials/category-tile.html` provides one list item and one linked surface per category. Each tile includes:

- Decorative icon inside an `aria-hidden="true"` wrapper
- Visible category name in an H3
- Visible category description
- Canonical category route
- Decorative action cue

The visible name and description provide the link’s accessible name; no replacement `aria-label` hides or changes that text. The entire tile is one coherent keyboard target with a visible focus indicator and a target area larger than 44 pixels. The icon is supportive rather than the only category cue, so the collection remains usable if Font Awesome does not load.

All authored values are escaped by the common build template renderer. Icons are additionally limited to the approved class assigned to each locked slug.

## Layout and contrast

The mobile-first grid uses:

- One column below 30rem
- Two columns from 30rem
- Three columns from 48rem
- Five columns from 64rem, producing the specified five-by-two desktop layout

Tiles use semantic surface, text, link, border, focus, shadow, timing, and spacing tokens. Fine-pointer hover effects are restrained, keyboard focus does not depend on hover, and transforms are removed for reduced-motion users.

Validation checks the light and dark token pairs used by tiles at a 4.5:1 WCAG AA threshold. Category icons and color accents remain decorative; visible text always identifies the category.

## Build output

The generated selection manifest records `homeCategorySlugs` and `homeCategoryCount`, allowing tests and future templates to verify that the rendered home grid matches the controlled collection.

Run `npm run check` after changing a category file, category partial, build rule, route, icon, or responsive style. The Module 09 validator also tests rejection of missing categories and unapproved icons.
