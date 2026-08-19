import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NOT_FOUND_PAGE,
  resolveNotFoundPopularCategoryCount,
  selectNotFoundPopularCategories
} from './not-found-page.mjs';
import { loadCategories } from './content-graph.mjs';
import { createPreviewServer } from './preview.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

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
    .replace(/\s+([.,?!:;])/g, '$1')
    .trim();
}

function extractPopularCategoryLinks(html) {
  const listMatch = html.match(/<ul class="not-found__category-list"[^>]*>([\s\S]*?)<\/ul>/);
  assert.ok(listMatch, '404 must include its popular category list.');
  return [...listMatch[1].matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(
    ([, route, name]) => ({ route, name })
  );
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const requiredFiles = [
  'pages/404.html',
  'scripts/not-found-page.mjs',
  'scripts/render-not-found-page.mjs',
  'scripts/validate-not-found-page.mjs',
  'docs/module-26-404-error-page.md',
  'generated/404.html',
  'generated/data/not-found-page.json'
];
await Promise.all(requiredFiles.map((file) => access(path.join(projectRoot, file))));

const [
  html,
  template,
  manifestText,
  componentCss,
  buildSource,
  previewSource,
  footerPartial,
  packageText,
  vercelText,
  documentation,
  categories
] = await Promise.all([
  readFile(path.join(projectRoot, 'generated/404.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/404.html'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/not-found-page.json'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/preview.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/site-footer.html'), 'utf8'),
  readFile(path.join(projectRoot, 'package.json'), 'utf8'),
  readFile(path.join(projectRoot, 'vercel.json'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/module-26-404-error-page.md'), 'utf8'),
  loadCategories(projectRoot)
]);
const manifest = JSON.parse(manifestText);
const packageData = JSON.parse(packageText);
const vercelConfig = JSON.parse(vercelText);
const visibleText = textContent(html);
const selectedCategories = selectNotFoundPopularCategories(categories);

// Exact approved content and native exits.
for (const requiredText of [
  NOT_FOUND_PAGE.eyebrow,
  NOT_FOUND_PAGE.heading,
  NOT_FOUND_PAGE.copy,
  NOT_FOUND_PAGE.primaryAction.label,
  NOT_FOUND_PAGE.secondaryAction.label,
  NOT_FOUND_PAGE.search.placeholder,
  NOT_FOUND_PAGE.popularHeading,
  NOT_FOUND_PAGE.brokenLinkNote
]) {
  assert.ok(visibleText.includes(requiredText), `404 must include exact visible text: ${requiredText}`);
}
assert.match(html, /<a class="button button--primary" href="\/">[\s\S]*?Return to Home[\s\S]*?<\/a>/);
assert.match(html, /<a class="button button--secondary" href="\/articles\/">[\s\S]*?Browse Articles[\s\S]*?<\/a>/);
assert.match(html, /<form[\s\S]*?class="not-found__search"[\s\S]*?action="\/articles\/"[\s\S]*?method="get"[\s\S]*?<\/form>/);
assert.match(html, /<input[\s\S]*?id="not-found-search"[\s\S]*?type="search"[\s\S]*?name="q"[\s\S]*?placeholder="Search legal topics"/);
assert.match(html, /<button class="button button--primary" type="submit">Search<\/button>/);
assert.ok(html.includes('href="/contact/#contact-subject">Contact page</a>'));

// Controlled popular categories: exactly five, unique, and deterministic.
const categoryLinks = extractPopularCategoryLinks(html);
const expectedPopularCategoryCount = resolveNotFoundPopularCategoryCount(categories);
assert.equal(categoryLinks.length, expectedPopularCategoryCount);
assert.equal(new Set(categoryLinks.map(({ route }) => route)).size, expectedPopularCategoryCount);
assert.deepEqual(
  categoryLinks,
  selectedCategories.map(({ route, name }) => ({ route, name }))
);
assert.throws(() => selectNotFoundPopularCategories([]), /at least one controlled category/);
assert.throws(
  () => selectNotFoundPopularCategories([categories[0], categories[0]]),
  /unique/
);

// Semantics, shared chrome, and no false active navigation state.
assert.equal(countMatches(html, /<main\b/g), 1);
assert.equal(countMatches(html, /<h1\b/g), 1);
assert.equal(countMatches(html, /<header class="site-header"/g), 1);
assert.equal(countMatches(html, /<footer class="site-footer/g), 1);
assert.ok(html.includes('id="main-content" tabindex="-1" data-page-top-focus'));
assert.ok(html.includes('<section class="not-found" aria-labelledby="not-found-title">'));
assert.ok(html.includes('role="search"'));
assert.ok(html.includes('aria-labelledby="not-found-popular-title"'));
assert.ok(html.includes('class="site-header" data-site-header'));
assert.ok(html.includes('class="site-footer site-footer--compact" data-site-footer'));
assert.ok(!html.includes('aria-current="page"'), '404 navigation must not mark any valid route as current.');
assert.equal(countMatches(html, /data-back-to-top/g), 1);
assert.equal(countMatches(html, /data-consent-banner(?=[\s>])/g), 1);
assert.equal(countMatches(html, /data-consent-dialog(?=[\s>])/g), 1);
assert.ok(html.includes('<script src="/js/header.js" defer></script>'));
assert.ok(html.includes('<script src="/js/theme.js" defer></script>'));
assert.ok(html.includes('<script src="/js/search.js" defer></script>'));
assert.ok(html.includes('<script src="/js/consent.js" defer></script>'));
assert.ok(html.includes('<script src="/js/back-to-top.js" defer></script>'));

// A missing route is not a valid indexable/social entity and is always ad-free.
assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
assert.doesNotMatch(html, /<link rel="canonical"/i);
assert.doesNotMatch(html, /property="og:/i);
assert.doesNotMatch(html, /name="twitter:/i);
assert.doesNotMatch(html, /application\/ld\+json/i);
assert.doesNotMatch(html, /\bAdvertisement\b|data-ad-slot|ad-slot__|\/js\/ad-slots\.js/i);
assert.doesNotMatch(html, /{{[A-Z0-9_]+}}/);
assert.ok(template.includes('{{POPULAR_CATEGORY_LINKS}}'));
assert.ok(template.includes('{{SITE_FOOTER}}'));
assert.ok(template.includes('{{CONSENT_MANAGER}}'));
assert.ok(template.includes('{{BACK_TO_TOP}}'));
assert.ok(footerPartial.startsWith('<footer class="site-footer" data-site-footer>'));

// Mobile-first BEM styling and compact shared footer modifier.
for (const fragment of [
  '.not-found-page {',
  '.not-found__panel {',
  '.not-found__actions {',
  '.not-found__search {',
  '.not-found__search-input {',
  '.not-found__category-list {',
  '.site-footer--compact .site-footer__group--categories {',
  '@media (min-width: 30rem)',
  '@media (min-width: 48rem)'
]) {
  assert.ok(componentCss.includes(fragment), `404 component styles must include ${fragment}`);
}

// Build/deployment integration and manifest truthfulness.
for (const fragment of [
  "import { renderNotFoundPage } from './render-not-found-page.mjs';",
  'const renderedNotFoundPage = await renderNotFoundPage({',
  'categories,',
  'siteFooterHtml: footerHtml,',
  'consentManagerHtml: consentHtml,',
  'backToTopHtml'
]) {
  assert.ok(buildSource.includes(fragment), `Build must include: ${fragment}`);
}
assert.equal(vercelConfig.outputDirectory, 'generated');
assert.equal(vercelConfig.trailingSlash, true);
assert.ok(
  previewSource.includes("path.join(rootDirectory, '404.html')"),
  'Preview server must resolve the branded 404 from its configured output root.'
);
assert.ok(previewSource.includes("response.writeHead(404"));
assert.equal(manifest.module, 26);
assert.equal(manifest.outputFile, '404.html');
assert.equal(manifest.httpStatusForUnknownRoutes, 404);
assert.equal(manifest.robotsDirective, 'noindex, nofollow');
assert.equal(manifest.sitemapEligible, false);
assert.equal(manifest.advertisingPolicy, 'omitted');
assert.equal(manifest.popularCategoryCount, expectedPopularCategoryCount);
assert.equal(manifest.activeNavigationItem, null);
assert.deepEqual(manifest.popularCategories, selectedCategories.map((category) => ({ ...category })));
assert.equal(packageData.scripts['validate:not-found'], 'node scripts/validate-not-found-page.mjs');
assert.ok(packageData.scripts.check.includes('npm run validate:not-found'));
for (const phrase of ['HTTP `404` status', 'no-JavaScript search', 'ad-free', 'sitemap']) {
  assert.ok(documentation.includes(phrase), `Module 26 documentation must include ${phrase}`);
}

// Exercise actual local HTTP behavior with an ephemeral server instance.
const server = createPreviewServer();
try {
  const origin = await listen(server);
  const missingResponse = await fetch(`${origin}/definitely-missing/module-26/?source=validator`, {
    redirect: 'manual'
  });
  const missingBody = await missingResponse.text();
  assert.equal(missingResponse.status, 404, 'Unknown routes must return a real HTTP 404.');
  assert.equal(missingResponse.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.ok(missingBody.includes(NOT_FOUND_PAGE.heading));
  assert.ok(missingBody.includes('class="not-found__panel"'));
  assert.doesNotMatch(missingBody, /404 — Page not found/);

  const homeResponse = await fetch(`${origin}/`, { redirect: 'manual' });
  assert.equal(homeResponse.status, 200, 'Existing routes must retain HTTP 200.');
  assert.equal(homeResponse.headers.get('content-type'), 'text/html; charset=utf-8');

  const documentResponse = await fetch(`${origin}/404.html`, { redirect: 'manual' });
  assert.equal(documentResponse.status, 200, 'Direct static error-document requests may remain HTTP 200.');
} finally {
  await close(server);
}

console.log('Module 26 404 Error Page validation passed.');
console.log(`Verified ${categoryLinks.length} controlled category exits, ad-free noindex metadata, and live HTTP 404 behavior.`);
