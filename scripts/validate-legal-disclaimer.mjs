import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARTICLE_DISCLAIMER,
  LEGAL_DISCLAIMER_PAGE,
  canonicalLegalDisclaimerUrl,
  createLegalDisclaimerStructuredData,
  formatLegalDisclaimerDate,
  resolveLegalDisclaimerState,
  validateArticleDisclaimerPartial,
  validateLegalDisclaimerSettings
} from './legal-disclaimer.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sectionIds = [
  'general-information',
  'no-legal-advice',
  'no-attorney-client',
  'jurisdiction-changes',
  'no-guarantees',
  'deadlines-emergencies',
  'external-sources',
  'professional-help',
  'contact-boundary',
  'use-limitations'
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
  assert.equal(blocks.length, 1, 'Legal Disclaimer must have exactly one JSON-LD graph.');
  return JSON.parse(blocks[0][1]);
}

function graphNode(schema, type) {
  return schema['@graph']?.find((node) => node['@type'] === type);
}

function routeToGeneratedPath(route) {
  return path.join(projectRoot, 'generated', route.replace(/^\//, ''), 'index.html');
}

const requiredFiles = [
  'content/settings/legal-disclaimer.json',
  'pages/legal-disclaimer.html',
  'pages/partials/article-disclaimer.html',
  'scripts/legal-disclaimer.mjs',
  'scripts/render-legal-disclaimer.mjs',
  'scripts/validate-legal-disclaimer.mjs',
  'docs/module-25-legal-disclaimer.md',
  'generated/legal-disclaimer/index.html',
  'generated/data/legal-disclaimer-manifest.json',
  'generated/data/article-pages.json'
];
await Promise.all(requiredFiles.map((file) => access(path.join(projectRoot, file))));

const [
  html,
  template,
  partial,
  settingsText,
  siteSettingsText,
  manifestText,
  articleManifestText,
  componentCss,
  mainCss,
  articleTemplate,
  buildSource,
  footerPartial,
  contactHtml,
  envExample,
  documentation,
  packageText
] = await Promise.all([
  readFile(path.join(projectRoot, 'generated/legal-disclaimer/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/legal-disclaimer.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/article-disclaimer.html'), 'utf8'),
  readFile(path.join(projectRoot, 'content/settings/legal-disclaimer.json'), 'utf8'),
  readFile(path.join(projectRoot, 'content/settings/site.json'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/legal-disclaimer-manifest.json'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/article-pages.json'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'css/main.css'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/article.html'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/site-footer.html'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/contact/index.html'), 'utf8'),
  readFile(path.join(projectRoot, '.env.example'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/module-25-legal-disclaimer.md'), 'utf8'),
  readFile(path.join(projectRoot, 'package.json'), 'utf8')
]);
const settings = JSON.parse(settingsText);
const siteSettings = JSON.parse(siteSettingsText);
const manifest = JSON.parse(manifestText);
const articleManifest = JSON.parse(articleManifestText);
const packageData = JSON.parse(packageText);
const visibleText = textContent(html);

// Strict, dated settings and a review gate the environment toggle cannot bypass.
validateLegalDisclaimerSettings(settings);
assert.deepEqual(Object.keys(settings).sort(), ['effective_date', 'last_updated', 'review_status']);
assert.equal(settings.review_status, 'pending');
assert.equal(settings.effective_date, '2026-08-16');
assert.equal(settings.last_updated, '2026-08-16');
assert.doesNotMatch(settingsText, /@|mailto:|api[_-]?key|bearer|webhook|token|secret/i);
assert.throws(
  () => validateLegalDisclaimerSettings({ ...settings, effective_date: '2026-02-30' }),
  /real ISO dates/
);
assert.throws(
  () => validateLegalDisclaimerSettings({ ...settings, unsupported: true }),
  /unsupported field/
);
const pendingProductionState = resolveLegalDisclaimerState({
  settings,
  environment: 'production',
  environmentVariables: { LEGAL_DISCLAIMER_APPROVED: 'true' }
});
assert.equal(pendingProductionState.approved, false, 'The toggle alone must not approve a pending draft.');
assert.equal(pendingProductionState.indexable, false);
assert.equal(pendingProductionState.robotsDirective, 'noindex, nofollow');
assert.ok(pendingProductionState.blockers.includes('qualified legal review'));
const approvedFixture = { ...settings, review_status: 'approved' };
const approvedProductionState = resolveLegalDisclaimerState({
  settings: approvedFixture,
  environment: 'production',
  environmentVariables: { LEGAL_DISCLAIMER_APPROVED: 'true' }
});
assert.equal(approvedProductionState.approved, true);
assert.equal(approvedProductionState.indexable, true);
assert.equal(approvedProductionState.robotsDirective, 'index, follow');
const approvedPreviewState = resolveLegalDisclaimerState({
  settings: approvedFixture,
  environment: 'preview',
  environmentVariables: { LEGAL_DISCLAIMER_APPROVED: 'true' }
});
assert.equal(approvedPreviewState.approved, true);
assert.equal(approvedPreviewState.indexable, false);
assert.equal(approvedPreviewState.robotsDirective, 'noindex, nofollow');
assert.throws(
  () => resolveLegalDisclaimerState({
    settings,
    environment: 'production',
    environmentVariables: { LEGAL_DISCLAIMER_APPROVED: 'yes' }
  }),
  /must be true or false/
);
assert.equal(formatLegalDisclaimerDate('2026-08-16'), 'August 16, 2026');
assert.equal(canonicalLegalDisclaimerUrl(), 'https://getlawscope.com/legal-disclaimer/');

// Exact short notice, permanent build-controlled insertion, and every generated article.
assert.equal(ARTICLE_DISCLAIMER, 'The information on this page is for educational purposes only and does not constitute legal advice. Laws vary by state. Always consult a qualified attorney for advice specific to your situation.');
assert.equal(validateArticleDisclaimerPartial(partial), true);
assert.equal(countMatches(partial, new RegExp(ARTICLE_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')), 1);
assert.ok(partial.includes(`<p>${ARTICLE_DISCLAIMER}</p>`));
assert.ok(partial.includes('class="article-disclaimer"'));
assert.ok(partial.includes('href="/legal-disclaimer/"'));
assert.throws(() => validateArticleDisclaimerPartial(partial.replace(ARTICLE_DISCLAIMER, 'Changed text.')), /missing or has been changed/);
assert.throws(
  () => validateArticleDisclaimerPartial(
    partial.replace(`<p>${ARTICLE_DISCLAIMER}</p>`, `<p>${ARTICLE_DISCLAIMER}</p><p>${ARTICLE_DISCLAIMER}</p>`)
  ),
  /exactly once/
);
assert.throws(() => validateArticleDisclaimerPartial(partial.replace('href="/legal-disclaimer/"', 'href="/about/"')), /full Legal Disclaimer/);
assert.throws(() => validateArticleDisclaimerPartial(partial.replace('<aside ', '<aside hidden ')), /cannot be conditional or hidden/);
assert.equal(countMatches(articleTemplate, /{{ARTICLE_DISCLAIMER}}/g), 1);
assert.ok(articleTemplate.indexOf('{{ARTICLE_BODY}}') < articleTemplate.indexOf('{{ARTICLE_DISCLAIMER}}'));
assert.ok(articleTemplate.indexOf('{{ARTICLE_DISCLAIMER}}') < articleTemplate.indexOf('{{ARTICLE_SOURCES}}'));
assert.doesNotMatch(articleTemplate, /ARTICLE_DISCLAIMER_(?:ENABLED|DISABLED|HIDDEN|OPT_OUT)/);
assert.equal(articleManifest.disclaimerSource, 'build-controlled-partial');
assert.equal(articleManifest.disclaimerText, ARTICLE_DISCLAIMER);
assert.equal(articleManifest.articles.length, articleManifest.totalGeneratedRoutes);
assert.ok(articleManifest.articles.length > 0);
for (const article of articleManifest.articles) {
  const articleHtml = await readFile(routeToGeneratedPath(article.route), 'utf8');
  assert.equal(countMatches(articleHtml, new RegExp(ARTICLE_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')), 1, `${article.route} must contain the exact notice once.`);
  const proseEnd = articleHtml.indexOf('</div>', articleHtml.indexOf('<div class="article-prose">'));
  const disclaimerStart = articleHtml.indexOf('<aside class="article-disclaimer"');
  const sourcesStart = articleHtml.indexOf('<section class="article-sources"');
  assert.ok(proseEnd >= 0 && proseEnd < disclaimerStart, `${article.route} must put the notice after article prose.`);
  assert.ok(disclaimerStart < sourcesStart, `${article.route} must put the notice before sources.`);
  assert.ok(articleHtml.slice(disclaimerStart, sourcesStart).includes('href="/legal-disclaimer/"'), `${article.route} must link to the full page.`);
}

// Semantic, linked, mobile-readable full page with the required amber box and no advertising.
assert.equal(countMatches(html, /<h1\b/g), 1);
assert.ok(html.includes('<h1 id="legal-disclaimer-title">Legal Disclaimer</h1>'));
assert.ok(html.includes('<header class="site-header" data-site-header>'));
assert.ok(html.includes('<footer class="site-footer" data-site-footer>'));
assert.ok(html.includes('<nav class="breadcrumb" aria-label="Breadcrumb">'));
assert.ok(html.includes('<li class="breadcrumb__item"><a href="/">Home</a></li>'));
assert.ok(html.includes('<li class="breadcrumb__item" aria-current="page">Legal Disclaimer</li>'));
assert.ok(html.includes('<a class="skip-link" href="#main-content">Skip to main content</a>'));
assert.ok(html.includes('id="main-content" tabindex="-1"'));
assert.match(html, /<details class="policy-toc" open>[\s\S]*?<summary>/);
assert.equal(countMatches(html, /<section id="(?:general-information|no-legal-advice|no-attorney-client|jurisdiction-changes|no-guarantees|deadlines-emergencies|external-sources|professional-help|contact-boundary|use-limitations)"/g), 10);
for (const [index, id] of sectionIds.entries()) {
  assert.ok(html.includes(`href="#${id}"`), `Contents list is missing #${id}.`);
  assert.ok(html.includes(`<section id="${id}"`), `Disclaimer is missing #${id}.`);
  assert.match(html, new RegExp(`<h2 id="${id}-title">${index + 1}\\.`));
}
assert.ok(html.includes(`<aside class="legal-disclaimer-highlight"`));
assert.ok(html.includes(`<p>${ARTICLE_DISCLAIMER}</p>`));
assert.ok(html.includes('added automatically to every Lawscope article and cannot be removed through article content fields'));
assert.ok(html.includes('class="legal-disclaimer-urgent"'));
assert.ok(html.includes('Do not rely on Lawscope for a deadline or emergency'));
assert.ok(html.includes('href="/contact/#contact-subject"'));
assert.ok(contactHtml.includes('id="contact-subject"'));
assert.ok(contactHtml.includes('<option value="correction">Report a correction</option>'));
assert.ok(html.includes('personal facts submitted through Contact will not receive legal analysis') || visibleText.includes('Submitting personal facts does not create a duty to respond'));
assert.doesNotMatch(html, /data-ad-|>Advertisement<|\/js\/ad-slots\.js/i);
assert.doesNotMatch(html, /<form\b[^>]*(?:newsletter|subscribe)|\/js\/newsletter\.js/i);
assert.doesNotMatch(html, /{{[A-Z0-9_]+}}/);
assert.doesNotMatch(html, /<table\b/i);
assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
assert.ok(html.includes('Pre-launch legal review status'));
assert.ok(html.includes('not represented as qualified-counsel-approved final wording'));
assert.match(mainCss, /--size-legal-reading:\s*51\.25rem/);
assert.match(componentCss, /\.policy-document\s*\{[\s\S]*?max-inline-size:\s*var\(--size-legal-reading\)/);
assert.match(componentCss, /\.legal-disclaimer-highlight\s*\{[\s\S]*?background-color:\s*var\(--color-disclaimer-surface\)/);
assert.match(componentCss, /\.legal-disclaimer-toc summary\s*\{[\s\S]*?min-block-size:\s*var\(--size-touch-target\)/);
assert.match(componentCss, /\.legal-disclaimer-document a,[\s\S]*?overflow-wrap:\s*anywhere/);
assert.match(componentCss, /@media \(min-width: 48rem\)[\s\S]*?\.legal-disclaimer-contact/);

// The ten conservative full-page boundaries required by the planning document.
for (const requiredText of [
  'plain-English information about U.S. legal topics for general educational purposes',
  'does not advise any person to take or avoid a particular action',
  'does not create an attorney-client',
  'Federal, state, local, tribal, and territorial law can differ',
  'does not promise that content is complete, error-free, current for every jurisdiction',
  'does not calculate statutes of limitation',
  'A link does not mean that Lawscope controls, sponsors, recommends, or guarantees the destination',
  'consult an attorney who is licensed and qualified in the relevant jurisdiction',
  'The Contact channel does not provide legal analysis',
  'Nothing in this disclaimer excludes a right, remedy, duty, or responsibility that cannot lawfully be excluded or limited'
]) {
  assert.ok(visibleText.includes(requiredText), `Legal Disclaimer is missing: ${requiredText}`);
}
assert.ok(visibleText.includes('No communication through the public website should be treated as confidential or privileged legal communication.'));
assert.ok(visibleText.includes('Missing a deadline can permanently affect rights.'));
assert.ok(visibleText.includes('Report a content correction'));
assert.ok(visibleText.includes('Material revision record'));

// Unique metadata, absolute social URLs, visible dates, and restrained legal-page schema.
assert.ok(html.includes(`<title>${LEGAL_DISCLAIMER_PAGE.title}</title>`));
assert.ok(html.includes(`<meta name="description" content="${LEGAL_DISCLAIMER_PAGE.description}">`));
assert.ok(LEGAL_DISCLAIMER_PAGE.description.length <= 155);
assert.ok(html.includes('<link rel="canonical" href="https://getlawscope.com/legal-disclaimer/">'));
assert.ok(html.includes('<meta property="og:url" content="https://getlawscope.com/legal-disclaimer/">'));
assert.match(html, /<meta property="og:image" content="https:\/\/getlawscope\.com\/assets\/images\//);
assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
assert.ok(html.includes(`<time datetime="${settings.effective_date}">${formatLegalDisclaimerDate(settings.effective_date)}</time>`));
assert.ok(html.includes(`<time datetime="${settings.last_updated}">${formatLegalDisclaimerDate(settings.last_updated)}</time>`));
const schema = extractJsonLd(html);
const webPageNode = graphNode(schema, 'WebPage');
const organizationNode = graphNode(schema, 'Organization');
const breadcrumbNode = graphNode(schema, 'BreadcrumbList');
assert.ok(webPageNode);
assert.ok(organizationNode);
assert.ok(breadcrumbNode);
assert.equal(webPageNode.url, 'https://getlawscope.com/legal-disclaimer/');
assert.equal(webPageNode.datePublished, settings.effective_date);
assert.equal(webPageNode.dateModified, settings.last_updated);
assert.equal(webPageNode.publisher['@id'], 'https://getlawscope.com/#organization');
assert.equal(organizationNode.name, 'Lawscope');
assert.equal(breadcrumbNode.itemListElement.length, 2);
assert.equal(breadcrumbNode.itemListElement.at(-1).item, 'https://getlawscope.com/legal-disclaimer/');
assert.doesNotMatch(JSON.stringify(schema), /LegalService|Attorney|email|telephone|PostalAddress|ContactPoint/);
assert.deepEqual(createLegalDisclaimerStructuredData(siteSettings, settings), schema);

// Manifest, footer/build integration, environment handoff, and source hygiene.
assert.equal(manifest.module, 25);
assert.equal(manifest.route, '/legal-disclaimer/');
assert.equal(manifest.sourceTemplate, 'pages/legal-disclaimer.html');
assert.equal(manifest.articlePartial, 'pages/partials/article-disclaimer.html');
assert.equal(manifest.effectiveDate, settings.effective_date);
assert.equal(manifest.lastUpdated, settings.last_updated);
assert.equal(manifest.reviewStatus, 'pending');
assert.equal(manifest.productionApproved, false);
assert.equal(manifest.indexable, false);
assert.equal(manifest.robotsDirective, 'noindex, nofollow');
assert.equal(manifest.fullPageSections, 10);
assert.equal(manifest.articleDisclaimer, ARTICLE_DISCLAIMER);
assert.equal(manifest.articleDisclaimerRequired, true);
assert.equal(manifest.articleOptOutSupported, false);
assert.equal(manifest.fullPageLink, '/legal-disclaimer/');
assert.ok(manifest.blockers.includes('qualified legal review'));
assert.ok(footerPartial.includes('href="/legal-disclaimer/"'));
assert.ok(buildSource.includes("import { renderLegalDisclaimerPage } from './render-legal-disclaimer.mjs';"));
assert.ok(buildSource.includes("import { validateArticleDisclaimerPartial } from './legal-disclaimer.mjs';"));
assert.ok(buildSource.includes('const renderedLegalDisclaimerPage = await renderLegalDisclaimerPage'));
assert.ok(buildSource.includes('validateArticleDisclaimerPartial(articleDisclaimerHtml);'));
assert.ok(envExample.includes('LEGAL_DISCLAIMER_APPROVED=false'));
assert.equal(packageData.scripts['validate:legal-disclaimer'], 'node scripts/validate-legal-disclaimer.mjs');
for (const phrase of [
  'qualified counsel',
  'LEGAL_DISCLAIMER_APPROVED=true',
  'noindex, nofollow',
  'no per-article opt-out',
  'build-controlled partial',
  'ad-free'
]) {
  assert.ok(documentation.toLowerCase().includes(phrase.toLowerCase()), `Module 25 documentation is missing: ${phrase}`);
}
assert.doesNotMatch(template, /support@|legal@|mailto:|api[_-]?key|bearer\s+[a-z0-9]|webhook|access[_-]?token/i);
assert.doesNotMatch(html, /support@|legal@|mailto:|CONTACT_DELIVERY_WEBHOOK_TOKEN|server-only-test-token/i);

console.log(`Legal Disclaimer validation passed: ${articleManifest.articles.length} articles carry the exact non-optional notice and full-page link; 10 ad-free sections, review gate, metadata, schema, and mobile contracts verified.`);
