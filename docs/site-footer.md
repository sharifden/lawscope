# Module 11 — Shared Site Footer

## Purpose

The shared footer closes the homepage with Lawscope identity, educational boundaries, approved primary navigation, all ten controlled legal-topic routes, policy/trust links, optional active social profiles, a persistent privacy-preference re-entry control, and a build-generated copyright year.

The footer is full width while its content remains aligned to the shared page container. Its main layout is one column on mobile, two columns from the tablet breakpoint, and four columns on large screens. The ten category links divide into two nested columns only on wide layouts.

## Source and generated files

- `pages/partials/site-footer.html` — semantic footer landmark, brand copy, navigation groups, policy links, and build tokens.
- `content/settings/site.json` — site title/tagline and optional X, Facebook, and LinkedIn profile URLs.
- `scripts/site-settings.mjs` — strict social-profile key, provider-domain, HTTPS, and clean-URL validation.
- `scripts/build.mjs` — category-link rendering, active-social rendering, dynamic UTC year, footer insertion, and manifest metadata.
- `css/components.css` — mobile-first BEM layout, text links, social controls, responsive columns, dark-mode token compatibility, and reduced-motion handling.
- `scripts/validate-footer.mjs` — executable copy, sitemap-route, social-setting, accessibility, manifest, and responsive-style contracts.
- `generated/index.html` — built homepage output.

## Content contract

The footer renders:

- **Brand:** Lawscope.
- **Tagline:** “U.S. law, explained with clarity and care.”
- **Boundary statement:** “Lawscope publishes general legal information for educational purposes. It is not a law firm and does not provide legal advice.”
- **Explore:** Home, Articles, Categories, About, and Contact.
- **Legal topics:** all ten category records in their controlled CMS order.
- **Policies:** Privacy Policy, Privacy choices, Legal Disclaimer, Editorial Policy, and Contact.
- **Copyright:** the current build year and “Lawscope. All rights reserved.”

Policy links are visible text. The **Privacy choices** button opens Module 13's shared preference center after the consent controller initializes; it remains hidden without JavaScript so it can never expose an inert control. Social icons, when present, include both an accessible label and visually hidden descriptive text.

## Social-profile safety

Only X, Facebook, and LinkedIn are approved. Their settings remain empty in the committed baseline because no active, maintained official accounts have been approved.

A configured profile must:

- use HTTPS;
- use the matching approved service domain;
- include a non-root profile path;
- contain no credentials, query parameters, or fragments; and
- use its designated settings key.

The build omits the entire “Follow Lawscope” navigation when every setting is empty. It never renders inactive placeholders or links such as `#`. Active profile links use `rel="me noreferrer"`; no social widget or tracking script is loaded.

Example settings shape:

```json
{
  "social_profiles": {
    "x": "https://x.com/lawscope",
    "facebook": "https://www.facebook.com/lawscope",
    "linkedin": "https://www.linkedin.com/company/lawscope"
  }
}
```

These examples document the accepted format only. They are not asserted as owned or active accounts and are not present in the committed public build.

## Link and accessibility contract

- The footer is outside `<main>` and uses one `<footer>` landmark.
- Each navigation group has a visible heading connected through `aria-labelledby`.
- Every internal URL is a clean, trailing-slash route from the approved sitemap.
- Category names and all policy links remain visible text.
- Links inherit the global visible focus ring.
- Text and social targets use the shared 44px minimum-target token.
- Colors use semantic tokens and therefore follow light, dark, and system color modes.
- Policy information does not require hover, animation, or JavaScript; the enhanced Privacy choices button is exposed only when its accessible dialog behavior is available.

Some linked pages are intentionally scheduled for their later approved modules. The footer routes are validated now against the canonical sitemap so those later pages can occupy stable URLs without changing the shared footer.

## Verification

```bash
npm run build
npm run validate:footer
npm run check
```

The validator checks all baseline links, controlled category order, active/inactive social fixtures, invalid URL fixtures, current-year output, unique IDs, four/two/one-column CSS, 44px targets, and generated manifest state.
