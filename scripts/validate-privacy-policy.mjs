import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRIVACY_POLICY_PAGE,
  canonicalPrivacyPolicyUrl,
  createPrivacyPolicyStructuredData,
  formatPrivacyPolicyDate,
  resolvePrivacyPolicyState,
  validatePrivacyPolicySettings
} from './privacy-policy.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sectionIds = [
  'scope-responsible-entity',
  'information-provided',
  'information-automatic',
  'purposes-legal-bases',
  'cookies-storage',
  'advertising',
  'analytics',
  'newsletter-contact-providers',
  'disclosure',
  'state-rights',
  'california-notice',
  'international-rights',
  'retention',
  'security',
  'children',
  'browser-signals',
  'international-transfers',
  'external-links',
  'policy-changes',
  'contact-rights'
];

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function textContent(value) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&rsquo;', '’')
    .replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'Privacy Policy must have exactly one JSON-LD graph.');
  return JSON.parse(blocks[0][1]);
}

function graphNode(schema, type) {
  return schema['@graph']?.find((node) => node['@type'] === type);
}

const requiredFiles = [
  'content/settings/privacy-policy.json',
  'pages/privacy-policy.html',
  'scripts/privacy-policy.mjs',
  'scripts/render-privacy-policy.mjs',
  'scripts/validate-privacy-policy.mjs',
  'docs/module-24-privacy-policy.md',
  'generated/privacy-policy/index.html',
  'generated/data/privacy-policy-manifest.json'
];
await Promise.all(requiredFiles.map((file) => access(path.join(projectRoot, file))));

const [
  html,
  template,
  policySettingsText,
  siteSettingsText,
  manifestText,
  componentCss,
  mainCss,
  consentSource,
  consentPartial,
  footerPartial,
  contactHtml,
  buildSource,
  envExample,
  documentation
] = await Promise.all([
  readFile(path.join(projectRoot, 'generated/privacy-policy/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/privacy-policy.html'), 'utf8'),
  readFile(path.join(projectRoot, 'content/settings/privacy-policy.json'), 'utf8'),
  readFile(path.join(projectRoot, 'content/settings/site.json'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/privacy-policy-manifest.json'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'css/main.css'), 'utf8'),
  readFile(path.join(projectRoot, 'js/consent.js'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/consent-manager.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/site-footer.html'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/contact/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, '.env.example'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/module-24-privacy-policy.md'), 'utf8')
]);
const policySettings = JSON.parse(policySettingsText);
const siteSettings = JSON.parse(siteSettingsText);
const manifest = JSON.parse(manifestText);
const visibleText = textContent(html);

// Versioned facts, strict review gate, and a complete launch-ready fixture.
validatePrivacyPolicySettings(policySettings);
assert.equal(policySettings.review_status, 'pending');
assert.equal(policySettings.operator.public_name, 'Lawscope');
assert.equal(policySettings.operator.legal_identity_confirmed, false);
assert.equal(policySettings.operator.legal_name, '');
assert.equal(policySettings.operator.postal_address, '');
assert.equal(policySettings.privacy_request.route, '/contact/#contact-subject');
assert.equal(policySettings.privacy_request.monitored_channel_confirmed, false);
assert.deepEqual(
  policySettings.service_inventory.map(({ key }) => key),
  ['hosting', 'fonts', 'icons', 'contact-delivery', 'analytics', 'advertising', 'newsletter']
);
assert.equal(policySettings.service_inventory.find(({ key }) => key === 'analytics').status, 'inactive');
assert.equal(policySettings.service_inventory.find(({ key }) => key === 'advertising').status, 'inactive');
assert.equal(policySettings.service_inventory.find(({ key }) => key === 'newsletter').status, 'inactive');
assert.doesNotMatch(policySettingsText, /support@|privacy@|mailto:|api[_-]?key|bearer|webhook|token|secret/i);

const disabledContact = { enabled: false };
const pendingState = resolvePrivacyPolicyState({
  settings: policySettings,
  siteSettings,
  environment: 'production',
  contactFeature: disabledContact,
  environmentVariables: { PRIVACY_POLICY_APPROVED: 'true' }
});
assert.equal(pendingState.approved, false, 'An environment toggle alone must not approve the policy.');
assert.equal(pendingState.indexable, false);
assert.equal(pendingState.robotsDirective, 'noindex, nofollow');
assert.ok(pendingState.blockers.includes('qualified legal review'));
assert.ok(pendingState.blockers.includes('confirmed legal operator and postal address'));
assert.ok(pendingState.blockers.includes('monitored privacy-request delivery channel'));

const approvedFixture = structuredClone(policySettings);
approvedFixture.review_status = 'approved';
approvedFixture.operator.legal_name = 'Lawscope Publishing Example LLC';
approvedFixture.operator.legal_identity_confirmed = true;
approvedFixture.operator.postal_address = '100 Example Street, Example City, NY 10001, United States';
approvedFixture.privacy_request.monitored_channel_confirmed = true;
for (const service of approvedFixture.service_inventory) service.details_confirmed = true;
Object.assign(
  approvedFixture.service_inventory.find(({ key }) => key === 'contact-delivery'),
  {
    name: 'Example monitored delivery provider',
    status: 'configured',
    privacy_url: 'https://support.example.test/privacy',
    retention: 'Owner-approved test retention criterion.',
    details_confirmed: true
  }
);
validatePrivacyPolicySettings(approvedFixture);
const approvedProductionState = resolvePrivacyPolicyState({
  settings: approvedFixture,
  siteSettings,
  environment: 'production',
  contactFeature: { enabled: true },
  environmentVariables: { PRIVACY_POLICY_APPROVED: 'true' }
});
assert.equal(approvedProductionState.approved, true);
assert.equal(approvedProductionState.indexable, true);
assert.equal(approvedProductionState.robotsDirective, 'index, follow');
const approvedPreviewState = resolvePrivacyPolicyState({
  settings: approvedFixture,
  siteSettings,
  environment: 'preview',
  contactFeature: { enabled: true },
  environmentVariables: { PRIVACY_POLICY_APPROVED: 'true' }
});
assert.equal(approvedPreviewState.approved, true);
assert.equal(approvedPreviewState.indexable, false);
assert.equal(approvedPreviewState.robotsDirective, 'noindex, nofollow');
assert.throws(
  () => resolvePrivacyPolicyState({
    settings: policySettings,
    siteSettings,
    environment: 'production',
    contactFeature: disabledContact,
    environmentVariables: { PRIVACY_POLICY_APPROVED: 'yes' }
  }),
  /must be true or false/
);
assert.equal(formatPrivacyPolicyDate('2026-08-16'), 'August 16, 2026');
assert.equal(canonicalPrivacyPolicyUrl(), 'https://getlawscope.com/privacy-policy/');

// Semantic shell, 20-area linked outline, native collapse, readable policy, and no-ad contract.
assert.equal(countMatches(html, /<h1\b/g), 1);
assert.ok(html.includes('<h1 id="privacy-policy-title">Privacy Policy</h1>'));
assert.ok(html.includes('<header class="site-header" data-site-header>'));
assert.ok(html.includes('<footer class="site-footer" data-site-footer>'));
assert.ok(html.includes('<nav class="breadcrumb" aria-label="Breadcrumb">'));
assert.ok(html.includes('<li class="breadcrumb__item"><a href="/">Home</a></li>'));
assert.ok(html.includes('<li class="breadcrumb__item" aria-current="page">Privacy Policy</li>'));
assert.ok(html.includes('<a class="skip-link" href="#main-content">Skip to main content</a>'));
assert.ok(html.includes('id="main-content" tabindex="-1"'));
assert.match(html, /<details class="policy-toc" open>[\s\S]*?<summary>/);
assert.equal(countMatches(html, /<section id="(?:scope-responsible-entity|information-provided|information-automatic|purposes-legal-bases|cookies-storage|advertising|analytics|newsletter-contact-providers|disclosure|state-rights|california-notice|international-rights|retention|security|children|browser-signals|international-transfers|external-links|policy-changes|contact-rights)"/g), 20);
for (const [index, id] of sectionIds.entries()) {
  assert.ok(html.includes(`href="#${id}"`), `TOC is missing #${id}.`);
  assert.ok(html.includes(`<section id="${id}"`), `Policy is missing #${id}.`);
  assert.match(html, new RegExp(`<h2 id="${id}-title">${index + 1}\\.`));
}
assert.doesNotMatch(html, /<table\b/i);
assert.doesNotMatch(html, /data-ad-|>Advertisement</i);
assert.doesNotMatch(html, /<form\b[^>]*(?:newsletter|subscribe)|\/js\/(?:newsletter|ad-slots)\.js/i);
assert.doesNotMatch(html, /{{[A-Z0-9_]+}}/);
assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
assert.ok(html.includes('Pre-launch review status'));
assert.ok(html.includes('not represented as counsel-approved final language'));
assert.ok(html.includes('word-break: break-word') || componentCss.includes('word-break: break-word'));
assert.match(mainCss, /--size-legal-reading:\s*51\.25rem/);
assert.match(componentCss, /\.policy-document\s*\{[\s\S]*?max-inline-size:\s*var\(--size-legal-reading\)/);
assert.match(componentCss, /\.privacy-toc summary\s*\{[\s\S]*?min-block-size:\s*var\(--size-touch-target\)/);
assert.match(componentCss, /@media \(min-width: 48rem\)[\s\S]*?\.privacy-facts/);

// Required collection, purpose, provider, retention, rights, and safety disclosures.
for (const requiredText of [
  'This policy explains what Lawscope collects, why it is collected, how advertising and analytics may use data, and the choices available to visitors.',
  'lawscope-theme',
  'lawscope:consent',
  'It contains no name, email, visitor ID, timestamp, IP address, page history, or search phrase.',
  'Search matching runs locally',
  'Lawscope includes a local consent-aware GA4 integration, but this build will not request Google’s tag or send analytics data',
  'Lawscope does not sell personal information.',
  'U.S. state privacy rights',
  'California notice at collection',
  'EEA, UK, and Swiss rights',
  'a pseudonymous HMAC-derived rate-limit key held only in server memory for a ten-minute window',
  'No internet transmission, storage system, or security control is guaranteed to be completely secure.',
  'not directed to children under 13',
  'Global Privacy Control is treated as a direction to keep advertising permission off',
  'Privacy request channel is not active yet'
]) {
  assert.ok(visibleText.includes(requiredText), `Privacy Policy is missing: ${requiredText}`);
}
for (const provider of ['Vercel', 'Google Fonts', 'Cloudflare cdnjs']) {
  assert.ok(visibleText.includes(provider), `Configured public dependency ${provider} is missing.`);
}
assert.equal(countMatches(html, /class="privacy-service"/g), 7);
assert.ok(html.includes('data-service-status="configured"'));
assert.ok(html.includes('data-service-status="inactive"'));
assert.ok(html.includes('href="https://vercel.com/legal/privacy-policy"'));
assert.ok(html.includes('href="https://policies.google.com/privacy"'));
assert.ok(html.includes('href="https://www.cloudflare.com/privacypolicy/"'));

// One existing consent store/controller and a persistent, keyboard-native preference opener.
assert.equal(countMatches(html, /data-consent-dialog(?:\s|>)/g), 1);
assert.equal(countMatches(html, /data-consent-banner(?:\s|>)/g), 1);
assert.ok(html.includes('data-open-consent-preferences hidden'));
assert.ok(footerPartial.includes('data-open-consent-preferences'));
assert.ok(consentSource.includes("const storageKey = 'lawscope:consent';"));
assert.equal(countMatches(consentSource, /localStorage\.setItem\(/g), 1);
assert.ok(consentSource.includes("navigator.globalPrivacyControl === true"));
assert.ok(consentPartial.includes('<dialog'));
assert.ok(html.includes('<noscript><p>JavaScript is off'));

// Contact route and subject exist, while the unmonitored default remains safely unavailable.
assert.ok(html.includes('href="/contact/#contact-subject"'));
assert.ok(contactHtml.includes('id="contact-subject"'));
assert.ok(contactHtml.includes('<option value="privacy">Privacy request</option>'));
assert.ok(contactHtml.includes('Message sending is not available yet'));
assert.ok(contactHtml.includes('data-contact-enabled="false"'));
assert.ok(visibleText.includes('choose Privacy request'));

// Dates, unique metadata, absolute URLs, and matching WebPage/publisher/breadcrumb data.
assert.ok(html.includes(`<title>${PRIVACY_POLICY_PAGE.title}</title>`));
assert.ok(html.includes(`<meta name="description" content="${PRIVACY_POLICY_PAGE.description}">`));
assert.ok(PRIVACY_POLICY_PAGE.description.length <= 160);
assert.ok(html.includes('<link rel="canonical" href="https://getlawscope.com/privacy-policy/">'));
assert.ok(html.includes('<meta property="og:url" content="https://getlawscope.com/privacy-policy/">'));
assert.match(html, /<meta property="og:image" content="https:\/\/getlawscope\.com\/assets\/images\//);
assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
assert.ok(html.includes(`<time datetime="${policySettings.effective_date}">${formatPrivacyPolicyDate(policySettings.effective_date)}</time>`));
assert.ok(html.includes(`<time datetime="${policySettings.last_updated}">${formatPrivacyPolicyDate(policySettings.last_updated)}</time>`));
const schema = extractJsonLd(html);
const webPageNode = graphNode(schema, 'WebPage');
const organizationNode = graphNode(schema, 'Organization');
const breadcrumbNode = graphNode(schema, 'BreadcrumbList');
assert.ok(webPageNode);
assert.ok(organizationNode);
assert.ok(breadcrumbNode);
assert.equal(webPageNode.url, 'https://getlawscope.com/privacy-policy/');
assert.equal(webPageNode.datePublished, policySettings.effective_date);
assert.equal(webPageNode.dateModified, policySettings.last_updated);
assert.equal(webPageNode.publisher['@id'], 'https://getlawscope.com/#organization');
assert.equal(organizationNode.name, 'Lawscope');
assert.equal(breadcrumbNode.itemListElement.length, 2);
assert.equal(breadcrumbNode.itemListElement.at(-1).item, 'https://getlawscope.com/privacy-policy/');
assert.doesNotMatch(JSON.stringify(schema), /email|telephone|PostalAddress|ContactPoint/);
const directSchema = createPrivacyPolicyStructuredData(siteSettings, policySettings);
assert.deepEqual(directSchema, schema);

// Manifest, integration, source hygiene, and owner/counsel handoff documentation.
assert.equal(manifest.module, 24);
assert.equal(manifest.route, '/privacy-policy/');
assert.equal(manifest.effectiveDate, policySettings.effective_date);
assert.equal(manifest.lastUpdated, policySettings.last_updated);
assert.equal(manifest.reviewStatus, 'pending');
assert.equal(manifest.productionApproved, false);
assert.equal(manifest.indexable, false);
assert.equal(manifest.robotsDirective, 'noindex, nofollow');
assert.equal(manifest.tocSections, 20);
assert.equal(manifest.contactChannelReady, false);
assert.equal(manifest.serviceInventory.length, 7);
assert.ok(manifest.blockers.includes('qualified legal review'));
assert.ok(buildSource.includes("import { renderPrivacyPolicyPage } from './render-privacy-policy.mjs';"));
assert.ok(buildSource.includes('const renderedPrivacyPolicyPage = await renderPrivacyPolicyPage'));
assert.ok(envExample.includes('PRIVACY_POLICY_APPROVED=false'));
for (const phrase of [
  'qualified privacy counsel',
  'responsible legal entity',
  'monitored privacy-request channel',
  'provider and retention',
  'PRIVACY_POLICY_APPROVED=true',
  'noindex'
]) {
  assert.ok(documentation.includes(phrase), `Module 24 documentation is missing: ${phrase}`);
}
assert.doesNotMatch(template, /support@|privacy@|mailto:|api[_-]?key|bearer\s+[a-z0-9]|CONTACT_DELIVERY_WEBHOOK_TOKEN/i);
assert.doesNotMatch(html, /support@|privacy@|mailto:|CONTACT_DELIVERY_WEBHOOK_TOKEN|server-only-test-token/i);

console.log('Privacy Policy validation passed: 20 linked areas, actual-state disclosures, one consent store, guarded contact/approval state, metadata, schema, and mobile/ad-free contracts verified.');
