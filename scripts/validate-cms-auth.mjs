import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  CMS_COMPANION_PLACEHOLDER,
  createCmsAdminCsp,
  createCmsAuthManifest,
  renderCmsAdminShell,
  resolveCmsCompanionOrigin
} from './cms-auth.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relative = (filePath) => path.join(projectRoot, filePath);
const groups = [];

function check(condition, message) {
  assert.ok(condition, message);
}

function record(label) {
  groups.push(label);
}

function executeCallback(source, hash) {
  const redirects = [];
  const historyCalls = [];
  const status = { textContent: '', dataset: {} };
  const location = {
    hash,
    pathname: '/',
    replace(destination) {
      redirects.push(destination);
    }
  };
  const window = {
    location,
    history: {
      replaceState(...args) {
        historyCalls.push(args);
      }
    }
  };
  const document = {
    title: 'Lawscope CMS Authentication Service',
    querySelector(selector) {
      return selector === '[data-callback-status]' ? status : null;
    }
  };

  vm.runInNewContext(source, {
    window,
    document,
    URLSearchParams,
    Set
  });
  return { redirects, historyCalls, status };
}

const [
  adminSource,
  adminClient,
  manualInit,
  companionHtml,
  companionCss,
  callbackSource,
  companionRobots,
  netlifySource,
  vercelSource,
  environmentExample,
  runbook,
  feasibility
] = await Promise.all([
  readFile(relative('admin/index.html'), 'utf8'),
  readFile(relative('admin/cms.js'), 'utf8'),
  readFile(relative('admin/cms-manual-init.js'), 'utf8'),
  readFile(relative('netlify-companion/index.html'), 'utf8'),
  readFile(relative('netlify-companion/companion.css'), 'utf8'),
  readFile(relative('netlify-companion/identity-callback.js'), 'utf8'),
  readFile(relative('netlify-companion/robots.txt'), 'utf8'),
  readFile(relative('netlify.toml'), 'utf8'),
  readFile(relative('vercel.json'), 'utf8'),
  readFile(relative('.env.example'), 'utf8'),
  readFile(relative('docs/module-32-netlify-identity-git-gateway.md'), 'utf8'),
  readFile(relative('docs/netlify-identity-git-gateway-feasibility.md'), 'utf8')
]);

assert.equal(resolveCmsCompanionOrigin({}), null);
assert.equal(
  resolveCmsCompanionOrigin({ CMS_COMPANION_ORIGIN: 'https://cms-fixture.example' }),
  'https://cms-fixture.example'
);
for (const invalidOrigin of [
  'http://cms-fixture.example',
  'https://cms-fixture.example/',
  'https://cms-fixture.example/path',
  'https://cms-fixture.example?query=1',
  'https://cms-fixture.example/#hash',
  'https://user:password@cms-fixture.example',
  CMS_COMPANION_PLACEHOLDER,
  'https://localhost'
]) {
  assert.throws(
    () => resolveCmsCompanionOrigin({ CMS_COMPANION_ORIGIN: invalidOrigin }),
    /CMS_COMPANION_ORIGIN/
  );
}
record('Exact HTTPS companion-origin resolver with fail-closed empty and malformed states');

const provisionedOrigin = 'https://cms-fixture.example';
const renderedProvisioned = renderCmsAdminShell(adminSource, provisionedOrigin);
check(!renderedProvisioned.includes('{{CMS_'), 'Provisioned admin output must resolve all CMS tokens');
check(
  renderedProvisioned.includes(`name="cms-companion-origin"\n      content="${provisionedOrigin}"`),
  'Provisioned admin output must expose only the approved public origin'
);
check(
  renderedProvisioned.includes(`connect-src 'self' ${provisionedOrigin}`),
  'Admin CSP must permit only the exact configured companion for authentication requests'
);
check(!renderedProvisioned.includes(CMS_COMPANION_PLACEHOLDER), 'Provisioned output must not retain the placeholder endpoint');

const renderedUnprovisioned = renderCmsAdminShell(adminSource, null);
check(!renderedUnprovisioned.includes('{{CMS_'), 'Unprovisioned admin output must still resolve build tokens');
check(
  /name="cms-companion-origin"\s+content=""/.test(renderedUnprovisioned),
  'Unprovisioned output must leave the runtime origin empty'
);
check(
  renderedUnprovisioned.includes(`connect-src 'self' ${CMS_COMPANION_PLACEHOLDER}`),
  'Unprovisioned output CSP must use only the non-routable companion placeholder'
);
const adminCsp = createCmsAdminCsp(provisionedOrigin);
check(adminCsp.includes("default-src 'none'"), 'Admin CSP must deny unspecified resource types');
check(adminCsp.includes("frame-src 'none'"), 'Admin CSP must prohibit child frames');
record('Build-time endpoint injection, exact-origin CSP, and safely non-routable default output');

const unprovisionedManifest = createCmsAuthManifest({
  deploymentEnvironment: 'development',
  companionOrigin: null
});
assert.equal(unprovisionedManifest.state, 'fail-closed-unprovisioned');
assert.equal(unprovisionedManifest.companionOrigin, null);
assert.equal(unprovisionedManifest.accountAcceptanceComplete, false);
const configuredManifest = createCmsAuthManifest({
  deploymentEnvironment: 'preview',
  companionOrigin: provisionedOrigin
});
assert.equal(configuredManifest.state, 'endpoint-configured-account-tests-required');
assert.equal(configuredManifest.identityEndpoint, `${provisionedOrigin}/.netlify/identity`);
assert.equal(configuredManifest.gatewayEndpoint, `${provisionedOrigin}/.netlify/git/github`);
assert.equal(configuredManifest.requiredRole, 'lawscope-editor');
assert.equal(configuredManifest.publicSignupAllowed, false);
assert.equal(configuredManifest.sharedCredentialsAllowed, false);
record('Public non-secret CMS deployment manifest with explicit account-acceptance boundary');

check(/name="robots" content="noindex, nofollow, noarchive, nosnippet"/.test(companionHtml), 'Companion page must be noindex in HTML');
check(/name="referrer" content="no-referrer"/.test(companionHtml), 'Companion page must suppress referrers');
check(companionHtml.includes('data-callback-status'), 'Companion page must expose an accessible callback status');
check(companionHtml.includes('https://getlawscope.com/admin/'), 'Companion page must link only to the approved production admin');
check(!/(data-ad-slot|adsbygoogle|googletag|google-analytics|gtag\s*\()/i.test(companionHtml), 'Companion page must be ad-free and analytics-free');
check(!/<script[^>]+src="https?:/i.test(companionHtml), 'Companion page scripts must be same-origin');
check(companionCss.includes(':root'), 'Companion CSS must define reusable properties');
check(companionCss.includes(':focus-visible'), 'Companion CSS must preserve visible focus');
check(companionCss.includes('min-height: 2.75rem'), 'Companion action must meet the 44px target minimum');
check(companionCss.includes('prefers-reduced-motion: reduce'), 'Companion CSS must respect reduced motion');
assert.equal(companionRobots, 'User-agent: *\nDisallow: /\n');
record('Accessible, noindex, ad-free, analytics-free companion callback shell');

for (const tokenKey of [
  'invite_token',
  'recovery_token',
  'confirmation_token',
  'email_change_token'
]) {
  const hash = `#${tokenKey}=one-time-token`;
  const result = executeCallback(callbackSource, hash);
  assert.deepEqual(result.redirects, [`https://getlawscope.com/admin/${hash}`]);
  assert.equal(result.historyCalls.length, 0);
  assert.equal(result.status.dataset.state, 'transferring');
}
const noAction = executeCallback(callbackSource, '');
assert.equal(noAction.redirects.length, 0);
assert.equal(noAction.historyCalls.length, 0);
for (const rejectedHash of [
  '#access_token=not-accepted',
  '#invite_token=',
  '#invite_token=one&recovery_token=two',
  '#unknown=value'
]) {
  const result = executeCallback(callbackSource, rejectedHash);
  assert.equal(result.redirects.length, 0);
  assert.equal(result.historyCalls.length, 1, 'Rejected fragments must be removed from browser history');
  assert.equal(result.status.dataset.state, 'rejected');
}
check(!/(fetch\s*\(|XMLHttpRequest|sendBeacon|console\.)/.test(callbackSource), 'Callback bridge must not transmit or log token fragments');
record('Strict one-time Identity callback transfer with fixed destination and rejected-fragment scrubbing');

check(netlifySource.includes('publish = "netlify-companion"'), 'Netlify must publish only the companion directory');
for (const expectedHeader of [
  'X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet"',
  'Cache-Control = "no-store, max-age=0"',
  'Referrer-Policy = "no-referrer"',
  'X-Frame-Options = "DENY"',
  "frame-ancestors 'none'"
]) {
  check(netlifySource.includes(expectedHeader), `Missing companion response control: ${expectedHeader}`);
}
check(!/Access-Control-Allow-Origin/i.test(netlifySource), 'Repository config must not add permissive cross-origin response headers');
const vercel = JSON.parse(vercelSource);
const adminHeaders = new Map(
  vercel.headers
    .find((rule) => rule.source === '/admin/(.*)')
    .headers.map(({ key, value }) => [key, value])
);
assert.equal(adminHeaders.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
assert.equal(adminHeaders.get('Cache-Control'), 'private, no-store');
assert.equal(adminHeaders.get('Referrer-Policy'), 'no-referrer');
assert.equal(adminHeaders.get('X-Frame-Options'), 'DENY');
check(adminHeaders.get('Content-Security-Policy').includes("frame-ancestors 'none'"), 'Vercel must prevent framing /admin/');
record('Defense-in-depth Netlify companion and Vercel admin response policies without wildcard CORS');

check(environmentExample.includes('CMS_COMPANION_ORIGIN='), 'Environment template must expose the single public origin control');
check(!environmentExample.includes('NETLIFY_IDENTITY_URL='), 'Identity endpoint must be derived, not independently configurable');
check(!environmentExample.includes('NETLIFY_GATEWAY_URL='), 'Gateway endpoint must be derived, not independently configurable');
check(/window\.CMS_MANUAL_INIT\s*=\s*true/.test(manualInit), 'Manual initialization guard must remain active');
check(adminClient.includes("const REQUIRED_EDITOR_ROLE = 'lawscope-editor'"), 'Admin client must enforce the required editor role in depth');
check(adminClient.includes("identity.on('login', denyUnauthorizedUser)"), 'Admin client must check each login event');
record('Single-source environment configuration and client-side editor-role defense in depth');

for (const requiredRunbookText of [
  'Status: account activation pending',
  'Invite only',
  'exactly one',
  'lawscope-editor',
  'Quarterly access review',
  'Invitation acceptance',
  'Password recovery',
  'Token expiry',
  'Access revocation',
  'Editorial Workflow draft isolation',
  'GitHub → Vercel production publish',
  'Incident response',
  'Rollback',
  'Fallback decision gate'
]) {
  check(runbook.includes(requiredRunbookText), `Module 32 runbook is missing: ${requiredRunbookText}`);
}
check(feasibility.includes('Module 32 implementation package'), 'Feasibility handoff must reflect the Module 32 implementation state');
record('Owner activation, recovery, quarterly review, incident, rollback, and live acceptance runbook');

const secretAuditSource = [
  adminSource,
  adminClient,
  manualInit,
  companionHtml,
  companionCss,
  callbackSource,
  netlifySource,
  environmentExample
].join('\n');
check(!/(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|NETLIFY_AUTH_TOKEN\s*=\s*\S+)/.test(secretAuditSource), 'CMS authentication files must not contain provider secrets');
record('No GitHub or Netlify provider credential committed to browser or deployment configuration');

console.log(`CMS authentication validation passed (${groups.length} groups):`);
for (const group of groups) console.log(`- ${group}`);
