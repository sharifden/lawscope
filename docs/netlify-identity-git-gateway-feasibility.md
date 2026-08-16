# Netlify Identity + Git Gateway Feasibility

## Status

**The Module 32 implementation package is complete in the repository; owner-controlled account activation and live acceptance remain pending.** The owner selected the unprovisioned path on 2026-08-16. No Netlify origin, GitHub authorization, editor identity, or credential has been invented or committed.

The current default is deliberately fail-closed:

- `CMS_COMPANION_ORIGIN` is empty;
- generated `/admin/` receives an empty runtime origin and a `.invalid` CSP connection source;
- static `admin/config.yml` retains non-routable `.invalid` Identity/Gateway endpoints;
- no user can authenticate or publish until the owner provisions the account and redeploys with one approved public origin.

## Current product check

Netlify’s live documentation reviewed on 2026-08-16 describes Identity as available and Git Gateway as a Beta service that requires Identity. It documents invite-only registration, role-restricted Gateway access, and a GitHub.com/GitLab.com repository connection. The original approved architecture therefore remains applicable today.

The planning document’s fallback gate still applies if availability changes, exact-origin cross-origin behavior is unreliable, or protected `main` cannot be retained. A fallback requires owner approval and must preserve `/admin/`, Git-backed content, individual authorization, draft isolation, and audit history.

## Implemented architecture

- `getlawscope.com` remains the Vercel production origin for the public site and `/admin/`.
- One owner-created Netlify companion project will publish only `netlify-companion/` and supply Identity/Git Gateway.
- A single validated `CMS_COMPANION_ORIGIN` build variable controls both endpoints; no browser secret is needed.
- `admin/cms.js` derives the Identity and Git Gateway URLs and enforces `lawscope-editor` as client-side defense in depth.
- Account-level Invite only registration plus the same Git Gateway role remain authoritative.
- Identity email fragments land on the noindex companion and transfer only recognized one-time actions to the fixed production admin URL.
- Editorial Workflow writes drafts to workflow branches/pull requests. Protected `main` remains the production branch; merges trigger Vercel through GitHub.

## Repository proof provided

- `netlify.toml` publishes only `netlify-companion/` and applies noindex, no-store, no-referrer, anti-framing, nosniff, permissions, and restrictive CSP headers.
- `netlify-companion/index.html`, `companion.css`, `identity-callback.js`, and `robots.txt` provide a harmless, accessible, ad-free, analytics-free callback surface.
- `scripts/cms-auth.mjs` validates exact HTTPS origin syntax, renders the admin CSP, and emits a non-secret state manifest.
- `scripts/validate-cms-auth.mjs` tests safe origin handling, callback allowlisting, rejected-fragment scrubbing, no token transmission/logging, headers, noindex controls, environment controls, role enforcement, documentation, and committed-secret absence.
- `vercel.json` applies permanent `/admin/` noindex/no-store/no-referrer/anti-framing controls and noindex to Vercel preview hosts.
- `.env.example` documents the one public origin variable without provider endpoint duplication.

## Live account acceptance required

The complete execution sequence and private evidence fields are in `docs/module-32-netlify-identity-git-gateway.md`. Before launch, the owner must prove:

1. The Netlify companion is connected to the exact Lawscope repository and publishes only the companion directory.
2. Identity registration is Invite only, external providers are not unintentionally enabled, and exactly one individually named editor exists.
3. That editor alone has `lawscope-editor`; the Git Gateway role list is never blank.
4. The GitHub integration/token is owner-controlled, limited to the Lawscope repository and necessary operations, and absent from Git/browser/Vercel variables.
5. Protected `main` blocks force pushes/deletion and retains reviewed workflow/audit history.
6. Production plus one explicitly approved branch-scoped Vercel preview can authenticate against the exact companion without wildcard CORS or token-bearing proxies.
7. Invitation acceptance, sign-in, logout, password recovery, token expiry, role/user revocation, and emergency Gateway disablement behave as documented.
8. An Editorial Workflow draft stays off `main` and out of Vercel production.
9. A reviewed publish creates an auditable GitHub change, triggers a successful Vercel production build, and becomes live only after that build.
10. A revert and last-known-good deployment rollback preserve history and remove the test publication.
11. `/admin/`, Vercel previews, and every companion surface remain noindex, ad-free, and analytics-free.

## Security boundaries

- `robots.txt` and noindex are not access controls.
- Public registration and shared credentials are prohibited.
- A client-side role check does not replace server-side Git Gateway role enforcement.
- Role removal may not invalidate an already issued role-bearing token until refresh/expiry; urgent response disables Gateway and revokes the provider authorization.
- GitHub, Netlify, Vercel, form-provider, and newsletter secrets never belong in Git or browser code.
- Subscriber/contact-message personal data and editor identity records never belong in this repository.
