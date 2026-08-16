# Lawscope

Lawscope is a planned U.S.-focused legal information publication built with semantic HTML, CSS, vanilla JavaScript, Markdown, and a Git-based CMS.

> **Current state:** Modules 01–32 plus the repository-side Module 33 final-QA package provide the deployment shell, design system, shared navigation and footer, generated Home content, privacy and consent controls, accessible theme/search/progressive enhancements, crawlable article/category routes, ten complete static article pages, the About and Editorial Policy trust pages, the ad-free Contact page, the dated `/privacy-policy/`, the ad-free `/legal-disclaimer/`, a branded ad-free `404.html` document that unknown preview routes serve with an actual HTTP 404 status, and the noindex Decap CMS editor/configuration for Articles, controlled Categories, and singleton Site Settings. The exact required legal notice is inserted automatically after every article body, cannot be opted out through article content, and links to the full ten-section disclaimer. The 404 page is permanently `noindex, nofollow`, excludes canonical/social/schema output, offers a native no-JavaScript article search and five controlled category routes, and remains ineligible for sitemap inclusion. Development/Preview output remains `noindex, nofollow`, now with site-wide response headers, crawl-blocking robots guidance, and an empty valid sitemap; the Privacy Policy and Legal Disclaimer also remain production-`noindex` until their documented owner and qualified-counsel prerequisites pass. Production builds emit the approved `/robots.txt` and a validated `/sitemap.xml` containing only currently indexable apex canonicals, with article `lastmod` derived from substantive update/publication fields rather than deployment time. All 29 public routes use centralized unique metadata, clean absolute canonicals, complete 1200×630 Open Graph/Twitter cards, route-aware Schema.org data, one-H1 heading checks, safe fallbacks, and a permanent `www`-to-apex redirect. Advertising, newsletter delivery, social profiles, contact delivery, and GA4 collection are disabled by default. GA4 now has a strict opt-in, production-only, canonical-host-gated adapter with sanitized page views, four limited custom events, withdrawal blocking, an inert Preview/development ID, and a documented DebugView/internal-traffic runbook; no Google request occurs before analytics consent. No real ad provider, delivery webhook credential, Google-certified CMP, or CMS credential is active. Module 32 now supplies strict origin injection, role-gated initialization, an isolated companion shell, hardened hosting controls, deterministic validation, and an owner runbook. The CMS remains safely `.invalid` and unavailable until the owner provisions and accepts the invite-only companion account. Module 33 adds a complete 29-route integration audit, accessibility and performance contracts, served-route verification, a manual/live test matrix, and an explicit owner acceptance register. Launch remains blocked until the pending browser, provider, account, domain, legal, rights, Lighthouse, and owner sign-off evidence is real.

## Requirements

- Node.js 20 LTS
- npm
- Git

## Local setup

1. Clone the repository.
2. Run `npm ci`.
3. Run `npm run check` to validate and build.
4. Run `npm run preview`.
5. Open `http://localhost:4173`.

The preview server binds to `0.0.0.0`, making it compatible with local containers and Arena live previews.

## Commands

| Command | Purpose |
|---|---|
| `npm run validate` | Check structure, styles, templates, scripts, selection logic, and secret hygiene |
| `npm run validate:featured` | Audit the freshly generated Featured Articles section and source contracts |
| `npm run validate:ad-slot` | Audit ad feature gates, consent/status hooks, layout reservation, and generated disabled state |
| `npm run validate:latest` | Audit Latest Articles eligibility, deterministic selection, fallbacks, images, manifest, and generated grid |
| `npm run validate:categories` | Audit the locked ten-category taxonomy, linked tiles, icons, contrast, manifest, and responsive grid |
| `npm run validate:newsletter` | Audit signup semantics, settings/endpoint gates, privacy, POST adapters, generated markup, and executable form states |
| `npm run validate:footer` | Audit footer copy, sitemap routes, controlled categories, dynamic year, social-profile gates, and 1/2/4-column layout |
| `npm run validate:theme` | Audit pre-paint priority, persistence, accessible state, system/cross-tab behavior, transitions, and light/dark contrast |
| `npm run validate:consent` | Audit strict opt-in markup, equal choices, validated persistence, GPC, cross-tab state, accessibility, non-overlap, and ad-gate integration |
| `npm run validate:back-to-top` | Audit shared markup, one-viewport/overflow visibility, focus return, reduced motion, passive/rAF handling, and consent/navigation/ad clearance |
| `npm run validate:scroll-reveal` | Audit progressive reveal gating, observer fallback, initial visibility, keyboard focus safety, cleanup, and startup/live reduced motion |
| `npm run validate:search` | Audit index eligibility/schema/size, matching states, privacy, fallbacks, announcements, and keyboard behavior |
| `npm run validate:articles-page` | Audit the static Articles routes, pagination, metadata, schema, cards, empty state, and in-feed ad gate |
| `npm run validate:article-filters` | Audit client-side category/keyword filtering, URL state, keyboard behavior, and progressive fallback |
| `npm run validate:categories-page` | Audit the ten-topic Categories directory, controlled order, guidance, metadata, schema, and ad placement |
| `npm run validate:category-pages` | Audit all ten category routes plus exact-category, empty, feature, ad, pagination, relationship, metadata, and schema fixtures |
| `npm run validate:article-pages` | Audit all ten article routes, Markdown sanitation/headings, visible facts, disclaimer, sources/tags, ads, sharing, related cards, social images, metadata, and schema |
| `npm run validate:trust-pages` | Audit About and Editorial Policy content, truthfulness, dates, linked standards, ad omission, production indexing, metadata, images, and schema |
| `npm run validate:contact-page` | Audit Contact copy, fields, accessible states, settings gates, no-PII behavior, server validation/abuse controls, metadata, schema, and ad omission |
| `npm run validate:privacy-policy` | Audit the 20 linked policy areas, actual data/provider/retention state, one consent store, privacy-request and approval gates, no-ad/mobile behavior, metadata, dates, and schema |
| `npm run validate:legal-disclaimer` | Audit the exact notice on every article, permanent build insertion and link, ten full-page boundaries, review/indexing gate, ad-free mobile layout, metadata, dates, and schema |
| `npm run validate:not-found` | Audit exact 404 content, five controlled category exits, native search, Contact route, no active nav/ad/schema, compact footer reuse, and live HTTP 404 behavior |
| `npm run validate:cms` | Audit CMS YAML, collections, required/locked fields, media paths, custom previews, restricted shell, pinned assets, and content-graph compatibility |
| `npm run validate:seo` | Audit all 29 public routes, metadata/canonicals, social images, headings, schema, safe fallbacks, indexing environments, and redirects using current output plus isolated builds for the remaining environments |
| `npm run validate:sitemap-robots` | Audit build-generated sitemap membership/lastmod, exact robots policies, Preview response headers, exclusions, XML limits, and served behavior in all three environments |
| `npm run validate:analytics` | Audit GA4 settings/environment gates, public/admin placement, strict pre-consent blocking, sanitized events, withdrawal, article thresholds, and isolated development/Preview/production artifacts |
| `npm run validate:adsense` | Audit the disabled-by-default ad/CMP integration, controlled units, consent gates, provider isolation, privacy disclosure, and representative generated routes |
| `npm run validate:cms-auth` | Audit Module 32 fail-closed/provisioned origin rendering, CSP, manifests, callback safety, headers, role enforcement, runbook coverage, and secret hygiene |
| `npm run validate:final-qa` | Audit the complete 29-route integration, links/assets/fragments, accessibility contracts, metadata/schema, resilience, measured budgets, served status, and truthful launch blockers |
| `npm run build` | Build the static site into `generated/` |
| `npm run check` | Build, validate, and run the complete generated-site regression pipeline through Module 33 |
| `npm run preview` | Serve the generated output locally |

## Architecture

- **Public production:** Vercel
- **Source and content history:** GitHub
- **CMS UI:** pinned Decap CMS at `/admin/` with Module 27 Articles/Categories/Settings configuration
- **Authentication/Git bridge:** fail-closed Module 32 Netlify companion package; owner account provisioning and live acceptance pending
- **Content:** Markdown in `/content/`
- **Rendering:** static build-time generation, enhanced with vanilla JavaScript

Read:

- [Approved planning document](./Lawscope_Planning_and_Requirements.md)
- [Deployment plan](./docs/deployment-plan.md)
- [Environments and branches](./docs/environments-and-branches.md)
- [Identity/Git Gateway feasibility](./docs/netlify-identity-git-gateway-feasibility.md)
- [Home hero rendering contract](./docs/home-hero.md)
- [Featured Articles grid contract](./docs/featured-articles.md)
- [AdSense Slot 1 safety and integration contract](./docs/ad-slot-1.md)
- [Latest Articles grid contract](./docs/latest-articles.md)
- [Popular Categories grid contract](./docs/popular-categories.md)
- [Newsletter Signup privacy and provider contract](./docs/newsletter-signup.md)
- [Shared Footer content and social-profile contract](./docs/site-footer.md)
- [Dark Mode preference, persistence, accessibility, and contrast contract](./docs/dark-mode.md)
- [Consent management, GPC, persistence, and provider-gate contract](./docs/consent-management.md)
- [Back-to-top threshold, focus, motion, and fixed-control safety contract](./docs/back-to-top.md)
- [Scroll fade-in progressive enhancement and reduced-motion contract](./docs/scroll-reveal.md)
- [Search index, matching, keyboard, fallback, and privacy contract](./docs/search.md)
- [Law Articles listing and pagination contract](./docs/module-17-law-articles-page.md)
- [Article category/keyword filter contract](./docs/module-18-category-filters.md)
- [Categories overview page contract](./docs/categories-overview-page.md)
- [Individual category page generation contract](./docs/module-20-individual-category-page.md)
- [Individual article page generation contract](./docs/module-21-individual-article-page.md)
- [About Lawscope and Editorial Policy trust-page contract](./docs/module-22-about-lawscope.md)
- [Contact page, validation, privacy, and serverless delivery contract](./docs/module-23-contact-page.md)
- [Privacy Policy disclosure, retention, contact, and launch-approval contract](./docs/module-24-privacy-policy.md)
- [Legal Disclaimer, mandatory article notice, and qualified-counsel approval contract](./docs/module-25-legal-disclaimer.md)
- [404 error document, useful exits, indexing, and HTTP status contract](./docs/module-26-404-error-page.md)
- [Decap CMS collections, previews, workflow, media, and Module 32 handoff](./docs/module-27-netlify-cms-configuration.md)
- [SEO metadata, canonicals, social cards, schema, indexing, fallbacks, and redirects](./docs/module-28-seo-implementation.md)
- [XML sitemap, robots guidance, Preview response headers, and submission runbook](./docs/module-29-sitemap-robots.md)
- [GA4 consent gates, measurement plan, PII rules, DebugView, and traffic-filter runbook](./docs/module-30-google-analytics-ga4.md)
- [AdSense and certified-CMP integration, activation, acceptance, and rollback runbook](./docs/module-31-google-adsense.md)
- [Netlify Identity and Git Gateway activation, lifecycle, publishing, recovery, and rollback runbook](./docs/module-32-netlify-identity-git-gateway.md)
- [Final integration, accessibility, performance, browser, resilience, and owner-sign-off runbook](./docs/module-33-final-integration-qa-accessibility.md)

## Source layout

- `/admin/` — CMS shell and configuration
- `/api/` — same-origin Vercel serverless handlers; secrets are environment-only
- `/assets/` — images and icons
- `/content/` — article/category Markdown
- `/css/` — base, dark-mode, and component styles
- `/docs/` — architecture and operating notes
- `/js/` — public vanilla JavaScript
- `/pages/` — static page and content templates
- `/qa/` — machine-readable launch acceptance status without private evidence or secrets
- `/scripts/` — validation, generation, and local preview
- `/netlify-companion/` — noindex Identity/Git Gateway service shell
- `/generated/` — disposable Vercel output; never hand-edited or committed

## Security

Copy `.env.example` to `.env` only when local environment values are needed. `.env` is ignored. Never commit API keys, GitHub/Netlify tokens, contact messages, or newsletter subscribers.

## Module sequence

Work proceeds one approved module at a time. Module 05 adds the deterministic CMS article selector and responsive home hero. Module 06 consumes its exclusion contract to render up to three reusable non-hero Article Cards. Module 07 adds a labeled home advertising-inventory region with responsive space reservation, settings/environment gates, consent-ready signaling, and no-fill collapse. Module 08 renders the six newest eligible guides through the shared Article Card, preferring to exclude the displayed hero/featured set while filling from those entries only when content is insufficient. Its mobile-first grid grows from one to two to three columns, handles fewer or no eligible entries, and ends with a secondary link to `/articles/`. Module 09 adds exactly ten build-validated category entries and renders them as visible-name, decorative-icon linked tiles in a mobile-first one/two/three/five-column grid. Module 10 adds the approved newsletter offer, explicit privacy/double-opt-in copy, accessible validation and status states, body-only POST adapters, and an environment/settings-gated endpoint. The committed form remains safely unavailable until its public HTTPS endpoint is configured. Module 11 replaces the temporary footer with the settings-driven Lawscope identity, educational boundary, primary/policy navigation, all ten controlled category links, optional validated social profiles, and a dynamic build year in a one/two/four-column layout. Module 12 resolves the explicit `lawscope-theme` choice before paint, falls back to operating-system preference and then light mode, persists only deliberate light/dark choices, synchronizes accessible toggle state and cross-tab changes, and applies reduced-motion-safe palette transitions. Module 13 adds a globally conservative strict opt-in banner and native preference dialog, equal accept/reject/manage access, separately explained essential storage, exact-schema revisioned persistence, safe storage failure behavior, GPC advertising enforcement, footer re-entry, and root/event consent contracts consumed by the disabled ad inventory. Module 14 adds a shared hidden-by-default back-to-top button that appears after one viewport only on overflowing pages, returns focus to the Lawscope home link, disables smooth scrolling for reduced motion, consumes the consent safe offset, and suppresses itself around expanded header surfaces and visible advertising. Module 15 adds one-time intersection-observed fade/translate reveals to five deliberate lower-page regions, leaves the hero and critical controls outside decorative motion, reveals initial-viewport and keyboard-focused content immediately, and leaves everything visible when JavaScript, observer support, configuration, or motion preference prevents enhancement. Module 16 generates a compact deterministic JSON index from the eligible published-content graph and adds normalized title/category/tag/excerpt matching, bounded linked results, polite state/count announcements, arrows/Home/End/Enter/Escape operation, progressive browse fallbacks, stale-request protection, and no query storage or transmission to the index request. Module 17 adds the fully rendered Law Articles library with newest-first static pagination, metadata/schema, a reusable card grid, credible empty output, and gated in-feed inventory. Module 18 progressively enhances that library with combinable category and keyword filters while preserving static content and URLs when JavaScript is absent. Module 19 adds the controlled ten-topic Categories overview, jurisdiction guidance, post-grid gated inventory, and `CollectionPage` data. Module 20 generates every controlled category route with exact-category feeds, optional non-duplicated features, nine-item crawlable pagination, editorially validated related topics, category-aware newsletter copy, and route-specific metadata/schema. Module 21 generates every eligible article route with sanitized semantic Markdown, stable heading anchors and table of contents, visible publication facts and reading time, a build-controlled exact disclaimer, structured sources and tags, guarded article advertising, progressive sharing, deterministic related cards, dedicated social images, and matching Article/Breadcrumb metadata. Module 22 adds the ad-free About mission/process page and the footer-linked, visibly dated Editorial Policy with a linked standards outline, truthful organizational publication identity, production-only indexing, exact social imagery, and AboutPage/WebPage/Organization/Breadcrumb schema. Module 23 adds the ad-free Contact page with exact inquiry/legal-help boundaries, accessible client validation and form states, a correction workflow, a disabled-by-default same-origin endpoint, server revalidation and abuse controls, PII-safe analytics signaling, and ContactPage/Organization/Breadcrumb schema. Module 24 adds the dated, ad-free Privacy Policy with a native collapsible 20-area table of contents, configuration-derived service and retention disclosures, the existing consent-preference controller, a guarded Privacy request route, WebPage/publisher/breadcrumb data, and a strict production-indexing gate that requires owner, provider, monitored-channel, and qualified-counsel confirmations. Module 25 adds the dated, ad-free Legal Disclaimer with the exact planning-document notice in a prominent amber box, a linked ten-section legal-boundary outline, deadline/emergency and correction guidance, WebPage/publisher/breadcrumb data, and a qualified-counsel production-indexing gate. Its build-controlled partial is unconditionally inserted after every article body and before sources, links to `/legal-disclaimer/`, and has no article opt-out. Module 26 adds the branded, permanently noindex and ad-free host-level `404.html` error document, exact recovery copy, no false active navigation state, native GET article search, five deterministic controlled-category exits, the broken-link Contact route, compact shared footer treatment, and a local preview contract that serves arbitrary unresolved routes as branded HTML with an actual HTTP 404 status. Module 27 adds the restricted noindex `/admin/` shell; pinned Decap CMS and Identity assets; exact Articles, non-creatable controlled Categories, and singleton Site Settings collections; approved media destinations; counted and locked controls; custom previews; Editorial Workflow; and a build-validated runtime handoff that keeps Identity/Git Gateway safely unprovisioned until Module 32. Module 28 centralizes the HTTPS-apex SEO policy across 29 public routes, enforces unique bounded metadata and complete large-image social cards, emits route-aware canonical Schema.org blueprints with actual article word counts, audits one-H1 heading outlines, keeps nonproduction output noindex, preserves legal-page production gates, and adds a permanent host-aware `www` redirect plus an explicit empty prelaunch legacy map. Module 29 generates a canonical XML sitemap directly from that validated route/content graph, uses substantive article update/publication fields for stable `lastmod`, excludes every current noindex/private/stateful route, emits exact environment-aware robots guidance, and enforces site-wide Preview `noindex, nofollow` response headers without noindexing the canonical production host. Module 30 adds a disabled-by-default GA4 resolver and generated public configuration, strict no-request-before-consent behavior, manually sanitized page views, PII-free newsletter/Contact/category/article-read events, 30-second foreground plus 75%-prose engagement logic, withdrawal blocking, Preview/development isolation, an updated Privacy Policy, and property/DebugView/internal-traffic operating guidance. Module 31 adds disabled-by-default AdSense and certified-CMP adapters, controlled inventory, regional/legal activation gates, no-fill/error collapse, representative-route auditing, and an owner acceptance/rollback runbook without activating a provider. Module 32 adds a strict single-origin CMS authentication contract, role-gated manual initialization, auditable CMS commit templates, an isolated noindex Identity/Git Gateway companion and callback bridge, hardened Vercel/Netlify controls, deterministic validation, and a complete owner activation/lifecycle/publishing/recovery runbook; all account-dependent proof remains pending until the owner provisions the companion. Module 33 adds final 29-route integration, internal-link/fragment/asset and accessibility-contract audits, measured compressed performance budgets, live local HTTP verification, complete manual browser/assistive-technology/provider/resilience matrices, and a machine-readable launch decision that remains blocked pending real owner-controlled evidence and sign-off.
