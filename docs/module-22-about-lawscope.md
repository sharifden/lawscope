# Module 22 — About Lawscope and Editorial Policy

## Routes

- `/about/` — institutional mission and process page
- `/editorial-policy/` — dated editorial standards document

Both routes are generated from semantic source templates into complete static HTML. They use the shared Lawscope header, footer, consent manager, back-to-top enhancement, design tokens, theme behavior, and local assets.

## About page contract

The About page includes:

- Home › About breadcrumb and one `About Lawscope` H1;
- the approved mission and educational boundary;
- a local, text-free abstract editorial image instead of a courthouse cliché;
- “Why Lawscope Exists” with Clarity, Accuracy, and Boundaries principles;
- the four-step Research, Plain-English Editing, Source Review, and Updates & Corrections process;
- an explicit educational-publication/not-a-law-firm panel;
- an Editorial Policy preview and link;
- the truthful launch publication identity `Lawscope Editorial`;
- an explicit promise not to display unverified contributor credentials;
- a corrections callout to the `/contact/` route contract; and
- the existing settings-gated, double-opt-in newsletter component.

The About page never claims a founder, named person, biography, credential, attorney review, or legal-professional status that has not been verified.

## Editorial Policy contract

The Editorial Policy is effective and last updated on August 16, 2026. Its visible dates and `WebPage` structured data use the same build constants.

The policy provides a linked table of contents and standards for:

1. mission, audience, and scope;
2. public-interest article selection;
3. primary-source preference and citations;
4. plain-English writing and jurisdiction qualification;
5. authorship, contributor credentials, and reviewer identification;
6. legal-review disclosure;
7. fact-checking, publication dates, review dates, and material updates;
8. correction reporting, investigation, correction, and annotation;
9. legal-news distinctions and developing coverage;
10. conflicts, gifts, affiliates, sponsored material, and advertising independence;
11. human-accountable AI-assisted work;
12. user submissions and privacy;
13. accessibility and inclusive language; and
14. contact and material-policy revision records.

The AI standard permits approved back-office assistance only. A responsible human editor must verify sources and claims; fabricated or unverified citations are prohibited; AI output is not legal advice; and confidential user material is not entered into public AI tools.

The launch policy explicitly says Lawscope does not represent launch articles as attorney-reviewed. Future contributor or reviewer details may appear only after identity, role, scope, credentials, jurisdiction, and date facts are verified as applicable.

## Advertising and privacy

Neither route contains advertising markup or loads the ad-slot controller. The Editorial Policy also omits newsletter markup and its controller. The About newsletter remains disabled unless the validated settings and environment provide an approved endpoint; in the default state, no email address is sent or stored.

Contact and Privacy Policy links establish the approved route contracts for their later sequential modules. No submitted message, subscriber data, credential, or secret is stored in these templates or the Git content tree.

## Metadata and indexing

The build derives page metadata from `scripts/trust-pages.mjs`:

- unique approved title and description;
- absolute self-canonical URL;
- complete Open Graph and Twitter large-image metadata;
- a local 1,200 × 630 social image;
- `AboutPage`, `Organization`, and `BreadcrumbList` data for About; and
- dated `WebPage`, `Organization`, and `BreadcrumbList` data for Editorial Policy.

Robots metadata is environment-aware. Production emits `index, follow`; preview and development builds emit `noindex, nofollow`. This keeps the Editorial Policy indexable on the public production deployment without allowing preview artifacts into search results.

## Responsive and accessibility behavior

Both pages are single-column by default. About’s hero, purpose, boundaries, publication identity, and process sections progressively form columns at wider viewports. The Editorial Policy remains in one bounded reading column at every width; its table of contents uses touch-sized links and becomes a two-column list only when space permits.

Landmarks, breadcrumbs, one-H1 hierarchy, native lists, visible dates, descriptive image alternative text, keyboard-operable links, visible focus styles, reduced-motion-safe shared enhancements, semantic color tokens, and persistent light/dark theming carry forward from the shared system.

## Build and validation

Run:

```bash
npm run build
npm run validate:trust-pages
```

The Module 22 validator checks both generated routes, approved metadata lengths and canonicals, exact social-image dimensions, headings and content sections, truthfulness guardrails, linked policy anchors, visible/schema date agreement, footer linkage, ad omission, responsive CSS contracts, JSON-LD types, environment-aware indexing, and the generated trust-page manifest.
