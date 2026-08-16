# Module 27 — Netlify CMS Configuration

## Purpose

Lawscope’s restricted `/admin/` route now contains a Decap CMS (formerly Netlify CMS) editor shell for the repository’s existing Articles, Categories, and singleton Site Settings content models. It is deliberately noindex, ad-free, analytics-free, and separate from the public page chrome.

The schema and previews are ready. Module 32 now supplies the fail-closed endpoint-injection and companion callback package, but the owner selected an unprovisioned account state: invite-only Netlify Identity, Git Gateway authorization, the single editor, and authenticated publish testing still require owner-controlled dashboard activation.

## Files

- `admin/index.html` — restricted CMS shell, noindex metadata, build-controlled origin/CSP tokens, and pinned CDN scripts.
- `admin/cms-manual-init.js` — external manual-initialization guard permitted by the admin CSP.
- `admin/config.yml` — Git Gateway, Editorial Workflow, media destinations, and the three approved collections.
- `admin/cms.js` — counted and locked field controls, custom preview templates, guarded endpoint override, and `lawscope-editor` defense-in-depth boundary.
- `admin/cms-shell.css` — loading, authentication-boundary, control, focus, and reduced-motion styles.
- `admin/cms-preview.css` — isolated article, category, and settings preview styles.
- `scripts/validate-cms.mjs` — strict YAML, schema, shell, extension, and content-graph compatibility validation.

The existing `scripts/build.mjs` public-path copy publishes the complete source `admin/` directory to `generated/admin/`.

## Maintained, pinned browser assets

The shell pins exact versions rather than floating ranges:

- `decap-cms@3.15.1`
- `netlify-identity-widget@2.0.3`

Both scripts use SHA-384 Subresource Integrity, anonymous CORS, no-referrer requests, and deferred execution. `window.CMS_MANUAL_INIT` is set before the Decap bundle so Lawscope can register controls/previews and safely merge a later companion origin before initialization.

## Collections

### Articles

Articles are written only to `content/articles/{slug}.md` with front matter plus Markdown body.

The editor preserves the existing build fields: title, slug, publication/update dates, truthful author, controlled category slug, tags, featured eligibility, content status, local featured/social JPEGs, alternative text, excerpt, optional SEO title, meta description, structured sources, and body.

Important guards:

- filenames derive from the validated lowercase ASCII slug;
- post-publication slug changes warn editors that a permanent redirect is also required;
- category selection is a relation to the controlled category collection;
- image URL entry is disabled and values are constrained to approved `/assets/images/` paths;
- the social image field targets `/assets/images/social/` and the build still verifies 1200 × 630 dimensions;
- excerpt and meta description use single-line counted controls capped at 160 and 155 characters;
- structured citation URLs require HTTPS;
- the rich-text toolbar starts at H2 and does not expose H1;
- reading time and the exact legal-information disclaimer remain build-controlled and are not editable fields.

Draft entries may be saved without citations so research can remain incomplete. Changing the article `status` field to `published` invokes the existing build’s stricter requirements, including at least one structured source, all required metadata, valid dates, nonempty body, and no body H1.

### Categories

The collection points only to `content/categories/` and is neither creatable nor deletable.

The approved category name, slug, Font Awesome icon class, and unique order are read-only controls. Editors may update the bounded description and select exactly three distinct approved related-category slugs. The build remains authoritative for the ten-item taxonomy, filename/slug parity, self-relation rejection, uniqueness, and exact locked values.

### Settings

The file collection exposes exactly one file: `content/settings/site.json`.

It covers:

- site title and tagline;
- approved X, Facebook, and LinkedIn profile URLs;
- newsletter request state, endpoint, approved adapter, and locked double opt-in;
- contact request state, same-origin `/api/` endpoint, and locked serverless adapter;
- locked strict consent mode/provider/certification state plus the positive integer revision;
- the guarded advertising request switch.

`content/settings/privacy-policy.json` and `content/settings/legal-disclaimer.json` are intentionally excluded. Their owner, review, and qualified-counsel gates remain outside ordinary CMS settings.

A CMS toggle requests a feature; it does not bypass environment variables, credentials, production checks, consent, policy, or provider gates in the existing build.

## Editorial Workflow

Decap’s `editorial_workflow` publish mode separates draft, review, and publish actions in Git. Article `status` is a separate build eligibility field:

1. Create or edit an Article.
2. Keep `status: draft` while content or sources are incomplete.
3. Use the preview to review title hierarchy, metadata, body, exact legal notice, sources, and tags.
4. Move the CMS workflow entry to review.
5. Complete citations, dates, image requirements, and all publication fields.
6. Change the content field to `status: published` only when the article is intended for public output.
7. Publish through Editorial Workflow. Git Gateway writes the approved change to the repository, then the deployment build validates and renders it.

A failed build is a publication block, not a reason to weaken the schema or bypass validation.

## Media rules

- Repository media folder: `assets/images`
- Stored public values: `/assets/images/...`
- Social-image upload target: `assets/images/social`
- CMS image URL entry: disabled
- Accepted article values: local `.jpg` paths only

Editors must confirm image rights, avoid sensitive personal data, write meaningful alt text, and prepare the exact social dimensions before publication. Media approval and build checks remain authoritative even when the CMS accepts an upload.

## Authentication boundary and Module 32 handoff

Committed `admin/config.yml` still uses explicit HTTPS endpoints on the reserved `.invalid` top-level domain. This avoids fabricating a live companion host and makes sign-in/publishing safely unavailable by default.

Module 32 replaced the manually edited meta value with build-controlled tokens. `CMS_COMPANION_ORIGIN` accepts only an exact, non-local HTTPS origin with no path, query, fragment, credentials, or trailing slash. When empty, generated `/admin/` receives an empty meta value and a `.invalid` CSP connection source. When valid, the build injects that public origin and an exact `connect-src`; `admin/cms.js` derives both service URLs before manual initialization.

The owner must now follow `docs/module-32-netlify-identity-git-gateway.md` to:

1. enable Invite only Identity with no public signup;
2. connect Git Gateway to the exact Lawscope repository and require `lawscope-editor`;
3. keep protected `main` and least-privilege provider access;
4. invite exactly one individually named editor;
5. scope the origin to Production and one approved Preview branch;
6. test invite, sign-in, logout, recovery, expiry, draft isolation, publish, rollback, revocation, and noindex behavior.

The local role check is defense in depth. Identity and Git Gateway dashboard settings remain the authoritative access boundary.

## Validation

Run:

```sh
npm run validate:cms
```

The validator checks:

- strict, unique-key YAML parsing;
- Git Gateway, protected branch, Editorial Workflow, and safe unprovisioned URLs;
- media/public paths and ASCII slug handling;
- exact Article, Category, and singleton Settings schemas;
- locked taxonomy/provider/consent fields and legal-file exclusions;
- required custom widgets and preview registrations;
- noindex, no advertising, no analytics, and no public navigation in the admin shell;
- exact pinned asset versions and SRI presence;
- focus and reduced-motion treatment;
- compatibility of existing content and a generated CMS-shaped published article/incomplete draft with the current content parser and validator.

`npm run check` includes this validator after the full static build and all prior module checks.
