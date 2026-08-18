# Module 32 — Netlify Identity & Git Gateway Setup

**Status: account activation pending.** The repository-side implementation, fail-closed local/preview controls, callback bridge, security headers, role boundary, documentation, and deterministic validation are complete. Production builds now inject the public origin `https://getlawscope.com` so `https://getlawscope.com/dashboard/` and `/admin/` call Identity and Git Gateway same-origin; a path-limited transparent proxy forwards those requests to the approved companion `https://candid-choux-61d91a.netlify.app` without injecting credentials. Dashboard-dependent tests in this runbook must still be completed before launch acceptance.

## Acceptance boundary

| Area | Repository status | Owner-controlled status |
| --- | --- | --- |
| `/admin/` Decap CMS shell and schema | Complete | Live sign-in pending |
| Exact companion-origin injection | Complete; empty is fail-closed locally; production injects the public same-origin and proxies to the approved companion | Public Netlify origin live at `https://candid-choux-61d91a.netlify.app` |
| Identity callback transfer | Complete for invite, recovery, confirmation, and email-change tokens | Email delivery and one-time-token tests pending |
| Invite-only registration | Required and documented; no signup UI is added by Lawscope | **Invite only** setting pending |
| Editor authorization | Client checks `lawscope-editor`; Git Gateway must enforce the same role | Exactly one named Identity user and role assignment pending |
| Repository access | Git Gateway endpoint and protected `main` target are fixed | Same-repository connection and least-privilege authorization pending |
| Editorial Workflow | Configured and fixture-validated | Live draft/review/publish proof pending |
| GitHub → Vercel production publish | Build chain is ready | Live commit, build, and route proof pending |
| Recovery, expiry, revocation, rollback | Code paths and test procedure documented | Live evidence pending |

A configured endpoint is not proof of account acceptance. `generated/data/cms-auth-manifest.json` therefore keeps `accountAcceptanceComplete: false` even after an origin is supplied. The owner must retain the completed live test record outside the public repository.

## Architecture and trust boundaries

1. `https://getlawscope.com/admin/` and an explicitly approved branch-scoped Vercel preview serve the CMS UI.
2. One small Netlify companion project, connected to the same Lawscope GitHub repository, supplies Identity and Git Gateway only.
3. Production browsers call the same-origin `/api/cms-gateway` endpoint with a path-limited `path` value for `/.netlify/identity` or `/.netlify/git/github`. Calling the function explicitly avoids Vercel’s trailing-slash handling for `/.netlify/*`; the proxy forwards only those approved upstream prefixes. It copies the browser `Authorization` header when present and never injects a GitHub, Netlify, or repository token. Local and Preview stay fail-closed unless `CMS_COMPANION_ORIGIN` is set.
4. Identity authenticates an individually invited user. Git Gateway separately requires the `lawscope-editor` role and limits repository operations to the companion project’s connected repository.
5. Editorial Workflow keeps drafts on workflow branches/pull requests. Only an approved merge to protected `main` triggers the validated Vercel production deployment.
6. No GitHub token, Netlify credential, Identity token, password, editor email address, or recovery code is committed to Git or exposed through a build variable.

`robots.txt` and noindex headers are privacy/crawler controls, not authentication. The public can load the sign-in shell; only the invited and role-authorized user may obtain repository content or write through Git Gateway.

## Repository controls delivered

- `scripts/cms-auth.mjs` validates the build-time origin and renders the admin CSP and non-secret deployment manifest.
- `admin/index.html` contains build tokens rather than a fabricated host.
- `admin/cms-manual-init.js` enables manual Decap initialization without inline script.
- `admin/cms.js` rejects malformed origins, derives both endpoints, and logs out a signed-in account that lacks `lawscope-editor`.
- `admin/config.yml` targets `git-gateway`, protected `main`, and `editorial_workflow`; CMS commit messages receive an auditable `cms:` prefix.
- `netlify-companion/identity-callback.js` transfers only one recognized Identity token fragment to the fixed production admin URL. It makes no network request, logs nothing, removes rejected fragments, and cannot act as an open redirect.
- Netlify and Vercel headers keep the companion and `/admin/` noindex, no-store, unframed, ad-free, and analytics-free.
- `api/cms-gateway.mjs` exposes a same-origin transparent proxy for `/.netlify/identity` and `/.netlify/git` only. The production CMS calls `/api/cms-gateway` explicitly; `vercel.json` retains equivalent `/.netlify/*` rewrites as compatibility routes.
- An empty `CMS_COMPANION_ORIGIN` leaves Identity and Gateway unavailable locally and permits the public site to build safely.

## Account-level activation steps

### 1. Record ownership privately

Maintain these items in the owner’s password manager or private operations register, never in this repository:

- Netlify team and project owner;
- GitHub organization/repository owner;
- Vercel project owner;
- primary and backup recovery administrators;
- the one editor’s full name, individual email, invitation date, role assignment, and review date;
- companion origin, Netlify project ID, GitHub repository slug, and Vercel project ID;
- provider integration/token creation date and revocation procedure.

The launch user count is **exactly one** active Identity editor. Shared mailboxes, aliases used by multiple people, shared passwords, and additional convenience users are prohibited. Netlify/GitHub/Vercel account administrators must also use individual accounts and MFA.

### 2. Create the Netlify companion project

1. In the owner’s Netlify team, create a project from the exact Lawscope GitHub repository and production branch `main`.
2. Confirm Netlify reads the root `netlify.toml` and publishes only `netlify-companion/`. Do not make Netlify the public `getlawscope.com` host.
3. Keep the generated HTTPS `*.netlify.app` origin or an owner-approved dedicated companion hostname. Record the exact origin without a trailing slash.
4. Disable unnecessary Netlify branch deploys and Deploy Previews. If one must be used for service maintenance, verify its response headers are noindex and remove it afterward.
5. Verify the companion root, `companion.css`, `identity-callback.js`, and `robots.txt` deploy. Confirm there are no public-site pages, analytics requests, ad requests, forms, or repository/provider credentials.

### 3. Enable and harden Identity

1. Open **Project configuration → Identity** and enable Identity.
2. Under **Registration → Registration preferences**, select **Invite only**. The default is open, so this explicit change is mandatory.
3. Leave automatic confirmation disabled. Do not add public signup forms.
4. Disable all external identity providers unless a later owner-approved change has a documented need. Invite-only remains mandatory even if a provider is later approved.
5. Keep the Netlify project/Site URL on the companion HTTPS origin. Default Identity emails return a fragment token there; the fixed callback bridge safely transfers recognized actions to `https://getlawscope.com/admin/`.
6. Review the account’s token-expiry setting or documented service default. Record the effective access-token lifetime and test that actual value; do not claim immediate role revocation while an older role-bearing token remains valid.
7. Confirm Identity-generated emails contain HTTPS links, no unexpected domain, and no third-party tracking added by Lawscope.

### 4. Connect Git Gateway with least necessary access

1. Confirm the companion project is linked to the exact Lawscope repository. Netlify derives the Gateway repository from this connection; it must not point to another repository or fork.
2. Enable **Identity → Services → Git Gateway**.
3. Set the Git Gateway role restriction to exactly `lawscope-editor`. Never leave the role list blank, because a blank list grants Gateway access to every Identity user on the project.
4. Prefer a provider installation limited to the one Lawscope repository. If the current connector requires a token, create it in the owner-controlled account with only the repository operations Git Gateway currently needs for contents, branches, and pull requests. Never place it in Vercel, a browser variable, this repository, a support ticket, or an editor account.
5. Record where the credential is owned, how it is revoked, and its review/rotation date. Do not record the credential value.
6. Verify an unauthenticated request and an authenticated user without `lawscope-editor` cannot read or write through `/api/cms-gateway?path=/.netlify/git/github`.

### 5. Preserve protected `main`

In GitHub, keep a ruleset or branch-protection rule for `main` that, at minimum:

- blocks force pushes and branch deletion;
- requires changes through pull requests/workflow branches;
- preserves commit and pull-request history;
- requires the validated Lawscope build/status checks before merge;
- does not grant routine human direct-push bypasses;
- permits the narrowly scoped Netlify integration to create/update Editorial Workflow branches and pull requests only as needed.

Test the actual Decap publish path with the rule enabled. If the integration cannot publish without weakening protected `main`, stop at the Fallback decision gate. Do not disable protection merely to make the test pass.

### 6. Configure Vercel production and one approved preview

1. Production no longer needs `CMS_COMPANION_ORIGIN` to open the login modal. The build injects `https://getlawscope.com` and the gateway forwards to the approved companion. Set `CMS_COMPANION_ORIGIN` only to override the upstream companion or to provision one approved Preview.
2. Redeploy production and verify the generated admin meta value, CSP `connect-src`, and `data/cms-auth-manifest.json` use `https://getlawscope.com` while `upstreamCompanionOrigin` remains the approved Netlify companion.
3. Do not add separate Identity/Gateway URLs. Do not add `Access-Control-Allow-Origin: *` or a repository token to Vercel. The checked-in transparent proxy is path-limited and must never become token-bearing.
4. For pre-launch proof, add the public companion origin only to one named, owner-approved Preview branch/environment and redeploy that branch. Do not expose the CMS bridge to every untrusted pull-request preview.
5. Keep all `*.vercel.app` responses noindex. Remove the branch-scoped variable and preview deployment after acceptance unless that preview remains an approved operating surface.
6. Verify production browser requests stay on `https://getlawscope.com/api/cms-gateway` with only approved Identity or Git Gateway paths in the `path` parameter, that the gateway forwards them to the companion, and that no token appears in query strings, referrers, logs, analytics, or error reporting.

Same-origin production traffic does not depend on Netlify CORS. Lawscope does not add wildcard repository headers. If the proxy or companion becomes unreliable, use the Fallback decision gate.

### 7. Invite the single editor

1. Under **Identity → Users**, confirm there are zero active/pending users before launch setup.
2. Invite one individually named editor at an address only that person controls.
3. After the user record exists, set `app_metadata.roles` to include exactly `lawscope-editor`. Remove unrelated roles.
4. Confirm the final user list contains exactly one invited/confirmed editor and no duplicate, test, shared, or dormant accounts.
5. Require the editor to use a unique password stored in an approved password manager and MFA wherever the Netlify account flow supports it. The editor must never receive the GitHub provider credential.

## Live acceptance record

Complete the tests in order against a disposable article slug such as `module-32-auth-acceptance`, then remove/revert it with preserved Git history. Store screenshots, request IDs, commit SHAs, pull-request URLs, and deployment URLs in the private operations record. Never store invitation, recovery, access, or refresh tokens.

### A. Unauthorized access and public signup

- In a signed-out browser, open production `/admin/`. Expected: restricted sign-in screen; no repository collection data is available before authentication.
- Attempt registration from the Identity API/UI without an invitation. Expected: rejected because registration is **Invite only**.
- Use an uninvited address. Expected: no sign-in and no Gateway access.
- Use an invited account without `lawscope-editor`. Expected: client logs out/denies it and Git Gateway independently refuses repository access.
- Request the Gateway endpoint with no bearer token. Expected: no repository content and an unauthorized response.

Record: date/time, tester, production URL, approved preview URL, response outcomes, and redacted evidence location.

### B. Invitation acceptance and sign-in

- Send a fresh invitation to the one editor.
- Open it once. Expected: companion page accepts only `invite_token`, transfers the fragment to production `/admin/`, and the Identity flow requests password setup.
- Complete setup and sign in. Expected: the role-authorized editor sees Articles, Categories, and Settings.
- Reuse the invitation link. Expected: one-time/expired token rejection.
- Confirm browser history, request URLs, referrers, analytics, and logs do not contain the token.

Record: invitation sent/accepted times, named account reference in the private register, one-time reuse result, and redacted evidence location.

### C. Logout

- Sign out through the CMS/Identity control.
- Reload `/admin/` and request Gateway data again.
- Expected: sign-in is required and no repository response is authorized by the ended session.

Record: logout time, reload result, Gateway result, and redacted evidence location.

### D. Password recovery

- From **Identity → Users**, send a password-recovery email to the one editor.
- Open the link. Expected: only `recovery_token` transfers from the companion to production `/admin/`; a new password can be set.
- Confirm the old password fails, the new password succeeds, and the recovery link cannot be reused.
- Confirm no token is copied into tickets, screenshots, query strings, analytics, or Git.

Record: request/completion times, old/new credential outcome without values, reuse result, and evidence location.

### E. Token expiry

- Record the effective Identity access-token lifetime.
- Authenticate, wait through expiry in a controlled test, then attempt a Gateway read/write without silently issuing a new login.
- Expected: the expired token is rejected or a documented refresh occurs; after refresh expiry/revocation, reauthentication is required. A stale token must not grant indefinite access.

Record: configured/documented lifetime, token issue/expiry times (not token values), observed response, and evidence location.

### F. Access revocation

- Remove `lawscope-editor` from the editor and test after the next token refresh/expiry. Expected: Gateway rejects access and the client-side role boundary denies a new login.
- Reassign the role only if continuing the remaining launch tests.
- Then delete/revoke the Identity user and confirm sign-in, recovery, and Gateway access fail.
- For an urgent incident where an existing token may remain valid until expiry, disable Git Gateway first and revoke/rotate the provider authorization; do not rely on client logout alone.

Record: revocation method/time, effective denial time, token-lifetime caveat, and evidence location.

### G. Editorial Workflow draft isolation

- Re-invite/re-authorize the one launch editor if the revocation test deleted it.
- Create the disposable article with content field `status: draft` and keep the CMS entry in Draft or In review.
- Expected: changes remain on an Editorial Workflow branch/pull request; `main` is unchanged; no Vercel production deployment publishes the article; the production article route is absent.
- If a Vercel branch preview is produced, expected: it remains noindex. The build also excludes `status: draft` from generated public article routes.

Record: workflow branch, pull request, production SHA before/after, absent production route result, preview robots result, and evidence location.

### H. GitHub → Vercel production publish

- Complete every required article field and source, change content `status` to `published`, complete review, and use the protected workflow to publish/merge.
- Expected: an auditable `cms:` commit/pull request reaches `main`; no force push occurs; GitHub triggers Vercel; `npm run check` passes; the resulting production deployment is tied to that SHA; the canonical article route appears only after the successful production deployment.
- Verify the public route has the required metadata, disclaimer, sources, and no leaked CMS token or account data.

Record: pull request, merge SHA, Vercel deployment ID/URL, build result, production route, and evidence location.

### I. Rollback

- Revert the test publication through a new reviewed Git commit/pull request; do not rewrite history.
- Expected: Vercel builds the revert, the test route disappears, and both publication and rollback remain auditable.
- Separately confirm an owner can promote the last known-good Vercel deployment if a build or runtime incident requires immediate service restoration.

Record: revert pull request/SHA, rollback deployment, route result, and evidence location.

### J. Noindex and isolation

Verify response headers and HTML for:

- companion root and `robots.txt`;
- production `/admin/`;
- the approved Vercel preview;
- any temporary companion preview.

Expected: companion and admin are noindex/no-store as configured, Vercel previews are noindex, no surface contains public navigation/ads/analytics, and the companion does not serve the Lawscope public site.

## Quarterly access review

The Netlify/GitHub/Vercel owner performs a **Quarterly access review** at least every 90 days and after any personnel, provider, or repository change:

1. Confirm the Identity user list contains exactly one current individually named editor and no pending/dormant/test users.
2. Confirm that user alone has `lawscope-editor`; review failed sign-ins and unexpected account events available in provider logs.
3. Confirm registration is still Invite only and external providers remain disabled unless explicitly approved.
4. Confirm Git Gateway roles are not blank, the project still points to the one Lawscope repository, and the integration/token has no broader access.
5. Review GitHub collaborators, app installations, deploy keys, fine-grained/classic tokens, rulesets, workflow branches, pull requests, and force-push settings.
6. Review Vercel team access, Git integration, Production/Preview environment scopes, deployment protection, and branch-scoped `CMS_COMPANION_ORIGIN` values.
7. Verify companion/admin/preview noindex headers, run `npm run validate:cms-auth`, and sample one authenticated read plus one logout.
8. Record reviewer, date, findings, removals/rotations, evidence, and next due date privately.

## Recovery ownership

- The primary owner controls the Netlify team/project, GitHub repository integration, Vercel project, and DNS.
- A separately named backup administrator must be able to recover those owner accounts without knowing the editor’s password.
- The editor can request Identity password recovery but cannot change Gateway repository authorization, weaken `main`, or add another editor.
- Recovery codes, MFA seeds, provider tokens, and password-manager emergency access remain encrypted outside Git.
- Loss of the sole editor account is resolved by owner revocation and a fresh individual invitation, not by sharing or resurrecting credentials.

## Incident response

1. **Contain:** disable Git Gateway; if necessary, unset `CMS_COMPANION_ORIGIN` in Vercel and redeploy so `/admin/` fails closed. Disable Identity only if recovery/sign-in must also stop.
2. **Revoke:** remove/delete the affected Identity user, revoke active sessions where supported, and revoke/rotate the GitHub provider authorization. Remove unapproved preview environment variables.
3. **Preserve evidence:** retain Netlify events, GitHub commits/pull requests/audit logs, Vercel deployments/build logs, timestamps, and affected SHAs. Never copy bearer tokens into the incident record.
4. **Assess:** identify unauthorized content/media/settings changes, workflow branches, repository permission changes, deployments, and public exposure.
5. **Restore:** revert malicious changes through reviewed commits, restore protected `main`, and promote or rebuild the last known-good Vercel deployment.
6. **Recover access:** verify Invite only and role restrictions, then issue a new invitation/credential to the authorized individual.
7. **Validate and close:** rerun every relevant live acceptance test, rotate credentials, document root cause and corrective action, notify affected parties if required, and schedule an early access review.

Client-side logout is defense in depth, not incident containment. Git Gateway disablement and provider revocation are the authoritative emergency controls.

## Rollback

- **Authentication rollback:** remove `CMS_COMPANION_ORIGIN` from Production/Preview and redeploy. The generated admin returns to empty-origin, `.invalid` fail-closed behavior while the public site remains available.
- **Gateway rollback:** disable Git Gateway and revoke its GitHub authorization. Preserve logs before reconnecting.
- **Content rollback:** revert the specific commit through a protected pull request. Never delete audit history or force-push `main`.
- **Deployment rollback:** promote the last known-good Vercel production deployment, then fix/revert Git so the next build matches the restored state.
- **Companion rollback:** publish a known-good companion commit or disable the Netlify project. Do not redirect token fragments to an unapproved host.

## Fallback decision gate

Netlify’s live documentation reviewed on 2026-08-16 documents Identity as available and Git Gateway as Beta, so this module retains the approved architecture. If Netlify removes the capability, exact-origin cross-origin behavior fails, protected `main` cannot be preserved, or the service becomes unreliable, stop rather than weakening controls.

A replacement requires owner approval and must remain GitHub-backed, keep `/admin/`, keep content/media in Git, preserve Editorial Workflow or an equivalent draft/review boundary, support exactly one individually authorized editor, avoid browser-exposed provider tokens, and retain audit/recovery/revocation/noindex controls. That approval is an architecture decision, not an automatic implementation change.

## Local validation

```sh
npm run validate:cms-auth
npm run validate:cms
npm run check
```

Local and VM-based tests prove parsing, injection, role-boundary behavior, token transfer rules, headers, noindex controls, and static draft exclusion. They cannot prove account dashboard settings, real email delivery, provider token scope, live expiry, GitHub writes, Vercel triggering, or revocation. Those remain the owner’s live acceptance record above.
