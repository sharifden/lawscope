import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createPreviewServer } from './preview.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedRoot = process.env.LAWSCOPE_OUTPUT_DIR
  ? path.resolve(process.env.LAWSCOPE_OUTPUT_DIR)
  : path.join(projectRoot, 'generated');
const productionOrigin = 'https://getlawscope.com';
const groups = [];

const budgets = Object.freeze({
  routeHtmlRawBytes: 75 * 1024,
  routeHtmlBrotliBytes: 16 * 1024,
  routeCssRawBytes: 150 * 1024,
  routeCssBrotliBytes: 20 * 1024,
  routeJavaScriptRawBytes: 100 * 1024,
  routeJavaScriptBrotliBytes: 30 * 1024,
  routeDocumentCssJavaScriptBrotliBytes: 64 * 1024,
  individualRasterImageBytes: 150 * 1024
});

function check(condition, message) {
  assert.ok(condition, message);
}

function record(label) {
  groups.push(label);
}

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(entryPath));
    else output.push(entryPath);
  }
  return output;
}

function relativeGenerated(filePath) {
  return path.relative(generatedRoot, filePath).split(path.sep).join('/');
}

function routeFromFile(filePath) {
  const relativePath = relativeGenerated(filePath);
  if (relativePath === 'index.html') return '/';
  return `/${relativePath.replace(/index\.html$/, '')}`;
}

function parseAttributes(tagSource) {
  const attributes = new Map();
  const body = tagSource
    .replace(/^<\/?[a-zA-Z0-9:-]+\s*/, '')
    .replace(/\/?>\s*$/, '');
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of body.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function openingTags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))]
    .map((match) => ({ source: match[0], attributes: parseAttributes(match[0]) }));
}

function pairedElements(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))]
    .map((match) => ({
      source: match[0],
      attributes: parseAttributes(`<${tagName}${match[1]}>`),
      content: match[2]
    }));
}

function plainText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function idSet(html) {
  const ids = openingTags(html, '[a-zA-Z0-9:-]+')
    .map(({ attributes }) => attributes.get('id'))
    .filter(Boolean);
  return { ids, unique: new Set(ids) };
}

function hasAccessibleName(element, ids) {
  const ariaLabel = element.attributes.get('aria-label')?.trim();
  if (ariaLabel) return true;
  const labelledBy = element.attributes.get('aria-labelledby')?.trim();
  if (labelledBy && labelledBy.split(/\s+/).every((id) => ids.has(id))) return true;
  return Boolean(plainText(element.content));
}

function localFileForPathname(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\0')) return null;
  const relativePath = decoded.replace(/^\/+/, '');
  if (!relativePath) return path.join(generatedRoot, 'index.html');
  if (decoded.endsWith('/')) return path.join(generatedRoot, relativePath, 'index.html');
  return path.join(generatedRoot, relativePath);
}

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function firstPartyAssetPaths(html, extension) {
  const values = [];
  const sourcePattern = /<(?:link|script)\b[^>]*(?:href|src)="([^"]+)"[^>]*>/gi;
  for (const match of html.matchAll(sourcePattern)) {
    const value = match[1];
    if (value.startsWith('/') && new URL(value, productionOrigin).pathname.endsWith(extension)) {
      values.push(new URL(value, productionOrigin).pathname);
    }
  }
  return [...new Set(values)];
}

function brotliSize(bytes) {
  return brotliCompressSync(bytes, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 }
  }).byteLength;
}

const assetSizeCache = new Map();
async function totalAssetBytes(pathnames, compressed = false) {
  let total = 0;
  for (const pathname of pathnames) {
    const cacheKey = `${compressed ? 'brotli' : 'raw'}:${pathname}`;
    if (!assetSizeCache.has(cacheKey)) {
      const bytes = await readFile(localFileForPathname(pathname));
      assetSizeCache.set(cacheKey, compressed ? brotliSize(bytes) : bytes.byteLength);
    }
    total += assetSizeCache.get(cacheKey);
  }
  return total;
}

const allGeneratedFiles = await walk(generatedRoot);
const publicRouteFiles = allGeneratedFiles
  .filter((filePath) => filePath.endsWith('.html'))
  .filter((filePath) => {
    const relativePath = relativeGenerated(filePath);
    return (
      relativePath === 'index.html' ||
      (relativePath.endsWith('/index.html') &&
        !relativePath.startsWith('pages/') &&
        !relativePath.startsWith('admin/'))
    );
  })
  .sort();

assert.equal(publicRouteFiles.length, 29, 'Final integration must assemble exactly 29 public static routes');
const records = [];
for (const filePath of publicRouteFiles) {
  records.push({
    filePath,
    route: routeFromFile(filePath),
    html: await readFile(filePath, 'utf8')
  });
}
const recordByRoute = new Map(records.map((recordItem) => [recordItem.route, recordItem]));
record('Complete 29-route public assembly across fixed, listing, category, and article templates');

const inboundLinks = new Map(records.map(({ route }) => [route, 0]));
for (const recordItem of records) {
  const { html, route } = recordItem;
  const { ids, unique: idsOnPage } = idSet(html);
  assert.equal(ids.length, idsOnPage.size, `${route}: duplicate HTML id detected`);

  for (const attributeName of ['aria-controls', 'aria-describedby', 'aria-labelledby']) {
    for (const { source, attributes } of openingTags(html, '[a-zA-Z0-9:-]+')) {
      const reference = attributes.get(attributeName)?.trim();
      if (!reference) continue;
      for (const id of reference.split(/\s+/)) {
        check(idsOnPage.has(id), `${route}: ${attributeName} references missing #${id} in ${source.slice(0, 100)}`);
      }
    }
  }

  for (const anchor of pairedElements(html, 'a')) {
    const href = anchor.attributes.get('href')?.trim();
    check(Boolean(href), `${route}: anchor is missing href`);
    check(href !== '#' && !/^javascript:/i.test(href), `${route}: unsafe or empty anchor destination ${href}`);
    check(hasAccessibleName(anchor, idsOnPage), `${route}: link has no accessible name: ${href}`);
    if (anchor.attributes.get('target') === '_blank') {
      const rel = new Set((anchor.attributes.get('rel') || '').split(/\s+/));
      check(rel.has('noopener') && rel.has('noreferrer'), `${route}: target=_blank link needs noopener noreferrer`);
    }

    if (/^(?:mailto:|tel:)/i.test(href)) continue;
    if (/^https:/i.test(href)) continue;
    check(!/^http:/i.test(href), `${route}: insecure HTTP link ${href}`);
    const resolved = new URL(href, `${productionOrigin}${route}`);
    if (resolved.origin !== productionOrigin) continue;
    const targetPath = resolved.pathname;
    const targetFile = localFileForPathname(targetPath);
    check(targetFile && await fileExists(targetFile), `${route}: broken internal link ${href}`);
    const normalizedRoute = targetPath.endsWith('/') ? targetPath : null;
    if (normalizedRoute && inboundLinks.has(normalizedRoute) && normalizedRoute !== route) {
      inboundLinks.set(normalizedRoute, inboundLinks.get(normalizedRoute) + 1);
    }
    if (resolved.hash && targetFile.endsWith('.html')) {
      const targetRecord = recordByRoute.get(targetPath);
      const targetHtml = targetRecord?.html || await readFile(targetFile, 'utf8');
      const targetIds = idSet(targetHtml).unique;
      const fragmentId = decodeURIComponent(resolved.hash.slice(1));
      check(targetIds.has(fragmentId), `${route}: broken fragment ${href}`);
    }
  }

  for (const tagName of ['img', 'script', 'link', 'source']) {
    for (const { attributes } of openingTags(html, tagName)) {
      for (const attributeName of tagName === 'link' ? ['href'] : ['src']) {
        const reference = attributes.get(attributeName)?.trim();
        if (!reference || !reference.startsWith('/') || reference.startsWith('//')) continue;
        const assetPath = localFileForPathname(new URL(reference, productionOrigin).pathname);
        check(assetPath && await fileExists(assetPath), `${route}: missing local ${tagName} resource ${reference}`);
      }
      const srcset = attributes.get('srcset');
      if (srcset) {
        for (const candidate of srcset.split(',').map((value) => value.trim().split(/\s+/)[0])) {
          if (!candidate.startsWith('/') || candidate.startsWith('//')) continue;
          const candidatePath = localFileForPathname(new URL(candidate, productionOrigin).pathname);
          check(candidatePath && await fileExists(candidatePath), `${route}: missing srcset resource ${candidate}`);
        }
      }
    }
  }
}
for (const [route, count] of inboundLinks) {
  if (route === '/') continue;
  check(count > 0, `Public route is orphaned from the internal link graph: ${route}`);
}
record('Broken-link, fragment, asset-reference, unique-ID, and orphan-route audit');

for (const { html, route } of records) {
  check(/^<!doctype html>/i.test(html), `${route}: missing HTML5 doctype`);
  check(/<html\b[^>]*lang="en-US"/i.test(html), `${route}: missing en-US language declaration`);
  assert.equal(openingTags(html, 'main').length, 1, `${route}: exactly one main landmark is required`);
  check(/<main\b[^>]*id="main-content"/i.test(html), `${route}: main landmark needs id=main-content`);
  check(/class="[^"]*skip-link[^"]*"[^>]*href="#main-content"|href="#main-content"[^>]*class="[^"]*skip-link/i.test(html), `${route}: skip link is missing`);
  assert.equal(openingTags(html, 'h1').length, 1, `${route}: exactly one H1 is required`);
  check(openingTags(html, 'header').length >= 1, `${route}: header landmark is missing`);
  check(openingTags(html, 'footer').length >= 1, `${route}: footer landmark is missing`);
  check(openingTags(html, 'nav').length >= 2, `${route}: primary and footer navigation landmarks are required`);
  check(!/\btabindex="[1-9][0-9]*"/i.test(html), `${route}: positive tabindex is prohibited`);
  check(!/\baccesskey\s*=/i.test(html), `${route}: accesskey is prohibited`);
  check(!/\son[a-z]+\s*=/i.test(html), `${route}: inline event handlers are prohibited`);
  check(!/<(?:iframe|object|embed)\b/i.test(html), `${route}: embedded browsing/plugin content is not approved`);
}
record('Semantic landmarks, language, skip links, single-H1 outlines, and keyboard-safe markup');

for (const { html, route } of records) {
  const ids = idSet(html).unique;
  const labelFors = new Set(openingTags(html, 'label').map(({ attributes }) => attributes.get('for')).filter(Boolean));

  for (const button of pairedElements(html, 'button')) {
    check(hasAccessibleName(button, ids), `${route}: button has no accessible name`);
  }
  for (const image of openingTags(html, 'img')) {
    check(image.attributes.has('alt'), `${route}: image is missing alt`);
    const width = Number.parseInt(image.attributes.get('width') || '', 10);
    const height = Number.parseInt(image.attributes.get('height') || '', 10);
    check(width > 0 && height > 0, `${route}: image needs intrinsic width and height`);
    const src = image.attributes.get('src') || '';
    check(!/picsum\.photos|^https?:/i.test(src), `${route}: production page contains an unapproved remote image ${src}`);
  }
  for (const tagName of ['input', 'select', 'textarea']) {
    for (const control of openingTags(html, tagName)) {
      if ((control.attributes.get('type') || '').toLowerCase() === 'hidden') continue;
      const id = control.attributes.get('id');
      const labelledBy = control.attributes.get('aria-labelledby');
      const hasLabel = (id && labelFors.has(id)) || control.attributes.get('aria-label')?.trim() || labelledBy?.trim();
      check(Boolean(hasLabel), `${route}: ${tagName} control lacks a programmatic label`);
      const controlType = (control.attributes.get('type') || '').toLowerCase();
      const doesNotSubmit = control.attributes.has('disabled') || ['button', 'checkbox', 'radio', 'reset', 'submit'].includes(controlType);
      check(Boolean(control.attributes.get('name') || control.attributes.get('role') === 'searchbox' || doesNotSubmit), `${route}: submittable ${tagName} control lacks a name`);
    }
  }
  for (const dialog of openingTags(html, 'dialog')) {
    check(Boolean(dialog.attributes.get('aria-labelledby') || dialog.attributes.get('aria-label')), `${route}: dialog lacks a name`);
  }
}
const componentCss = await readFile(path.join(generatedRoot, 'css/components.css'), 'utf8');
const mainCss = await readFile(path.join(generatedRoot, 'css/main.css'), 'utf8');
const darkCss = await readFile(path.join(generatedRoot, 'css/dark-mode.css'), 'utf8');
check(componentCss.includes(':focus-visible'), 'Component styles must expose visible keyboard focus');
check(componentCss.includes('min-block-size: var(--size-touch-target)'), 'Interactive controls must use the logical 44px target token');
check(componentCss.includes('prefers-reduced-motion: reduce'), 'Components must respect reduced motion');
check(mainCss.includes('--size-touch-target: 2.75rem'), 'The touch-target token must remain 44px');
check(darkCss.includes('[data-theme="dark"]'), 'Dark theme styles must remain available');
record('Accessible names, ARIA references, form labels, image alternatives/dimensions, focus, touch, themes, and reduced motion');

for (const { html, route } of records) {
  const expectedCanonical = `${productionOrigin}${route}`;
  const title = pairedElements(html, 'title');
  assert.equal(title.length, 1, `${route}: exactly one title is required`);
  const descriptions = openingTags(html, 'meta').filter(({ attributes }) => attributes.get('name') === 'description');
  assert.equal(descriptions.length, 1, `${route}: exactly one meta description is required`);
  const canonicals = openingTags(html, 'link').filter(({ attributes }) => attributes.get('rel') === 'canonical');
  assert.equal(canonicals.length, 1, `${route}: exactly one canonical is required`);
  assert.equal(canonicals[0].attributes.get('href'), expectedCanonical, `${route}: canonical mismatch`);
  for (const property of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
    assert.equal(openingTags(html, 'meta').filter(({ attributes }) => attributes.get('property') === property).length, 1, `${route}: missing ${property}`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
    assert.equal(openingTags(html, 'meta').filter(({ attributes }) => attributes.get('name') === name).length, 1, `${route}: missing ${name}`);
  }
  const structuredData = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  check(structuredData.length >= 1, `${route}: structured data is missing`);
  for (const match of structuredData) JSON.parse(match[1]);
  check(!/\{\{[^}]+\}\}|\[object Object\]/.test(html), `${route}: unresolved template output detected`);
}
record('Canonical metadata, social cards, parseable Schema.org JSON-LD, and template-resolution audit');

for (const { html, route } of records) {
  for (const script of openingTags(html, 'script')) {
    const src = script.attributes.get('src');
    if (!src) continue;
    check(src.startsWith('/'), `${route}: public page has an unconditional third-party script ${src}`);
    check(script.attributes.has('defer') || script.attributes.get('type') === 'module', `${route}: public script must be deferred or a module: ${src}`);
  }
  check(!/(googlesyndication\.com\/pagead\/js|googletagmanager\.com\/gtag\/js)/i.test(html), `${route}: consent-gated provider script was emitted directly`);
  check(!/data-analytics-enabled="true"|data-advertising-enabled="true"/i.test(html), `${route}: unavailable provider was enabled`);
}
const homeHtml = recordByRoute.get('/').html;
check(/<a\b[^>]*href="\/articles\/"/i.test(homeHtml), 'Core article navigation must work without JavaScript');
check(/<form\b[^>]*role="search"/i.test(homeHtml), 'Search must retain a native form fallback');
check(/<noscript>/i.test(homeHtml), 'Public shell must explain its no-JavaScript fallback');
record('Progressive enhancement and disabled third-party analytics/advertising resilience');

let largestRasterImage = { path: '', bytes: 0 };
for (const filePath of allGeneratedFiles.filter((value) => /\.(?:jpe?g|png|webp)$/i.test(value))) {
  const bytes = (await stat(filePath)).size;
  if (bytes > largestRasterImage.bytes) largestRasterImage = { path: relativeGenerated(filePath), bytes };
  check(bytes <= budgets.individualRasterImageBytes, `Raster image exceeds ${budgets.individualRasterImageBytes} bytes: ${relativeGenerated(filePath)} (${bytes})`);
}
let maximumRoutePayload = null;
for (const { html, route } of records) {
  const htmlBytes = Buffer.byteLength(html);
  const htmlBrotliBytes = brotliSize(Buffer.from(html));
  const cssPaths = firstPartyAssetPaths(html, '.css');
  const javaScriptPaths = firstPartyAssetPaths(html, '.js');
  const cssBytes = await totalAssetBytes(cssPaths);
  const cssBrotliBytes = await totalAssetBytes(cssPaths, true);
  const javaScriptBytes = await totalAssetBytes(javaScriptPaths);
  const javaScriptBrotliBytes = await totalAssetBytes(javaScriptPaths, true);
  const compressedTotal = htmlBrotliBytes + cssBrotliBytes + javaScriptBrotliBytes;
  check(htmlBytes <= budgets.routeHtmlRawBytes, `${route}: raw HTML budget exceeded (${htmlBytes})`);
  check(htmlBrotliBytes <= budgets.routeHtmlBrotliBytes, `${route}: compressed HTML budget exceeded (${htmlBrotliBytes})`);
  check(cssBytes <= budgets.routeCssRawBytes, `${route}: raw CSS budget exceeded (${cssBytes})`);
  check(cssBrotliBytes <= budgets.routeCssBrotliBytes, `${route}: compressed CSS budget exceeded (${cssBrotliBytes})`);
  check(javaScriptBytes <= budgets.routeJavaScriptRawBytes, `${route}: raw JavaScript budget exceeded (${javaScriptBytes})`);
  check(javaScriptBrotliBytes <= budgets.routeJavaScriptBrotliBytes, `${route}: compressed JavaScript budget exceeded (${javaScriptBrotliBytes})`);
  check(compressedTotal <= budgets.routeDocumentCssJavaScriptBrotliBytes, `${route}: document/CSS/JS compressed budget exceeded (${compressedTotal})`);
  if (!maximumRoutePayload || compressedTotal > maximumRoutePayload.bytes) maximumRoutePayload = { route, bytes: compressedTotal };
}
const homeImages = openingTags(homeHtml, 'img');
check(homeImages.length > 0, 'Home must have a measurable primary image');
check(homeImages[0].attributes.get('fetchpriority') === 'high', 'Home LCP candidate must use high fetch priority');
check(homeImages[0].attributes.get('loading') !== 'lazy', 'Home LCP candidate must not be lazy-loaded');
check(homeImages.slice(1).some(({ attributes }) => attributes.get('loading') === 'lazy'), 'Below-fold home images must use native lazy loading');
record('Measured HTML/CSS/JavaScript/image budgets, intrinsic media, lazy loading, and LCP priority');

const server = createPreviewServer({ rootDirectory: generatedRoot, deploymentEnvironment: 'development' });
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
try {
  const address = server.address();
  const localOrigin = `http://127.0.0.1:${address.port}`;
  for (const { route } of records) {
    const response = await fetch(`${localOrigin}${route}`, { headers: { connection: 'close' } });
    assert.equal(response.status, 200, `${route}: served status must be 200`);
    check(response.headers.get('content-type')?.startsWith('text/html'), `${route}: served MIME must be HTML`);
    check(response.headers.get('x-robots-tag')?.includes('noindex'), `${route}: development response must be noindex`);
    await response.arrayBuffer();
  }
  const missingResponse = await fetch(`${localOrigin}/module-33-deliberately-missing/`, { headers: { connection: 'close' } });
  assert.equal(missingResponse.status, 404, 'Unknown route must serve HTTP 404');
  check(missingResponse.headers.get('cache-control')?.includes('no-store'), '404 must not be cached');
  check(missingResponse.headers.get('x-robots-tag')?.includes('noindex'), '404 must be noindex');
  const missingHtml = await missingResponse.text();
  check(missingHtml.includes('Page Not Found'), 'Unknown route must serve the branded recovery page');
} finally {
  server.closeIdleConnections?.();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
record('Served-route status, MIME, development noindex, and branded HTTP 404 verification');

const [acceptanceSource, runbook, packageSource, packageLockSource, readme] = await Promise.all([
  readFile(path.join(projectRoot, 'qa/module-33-acceptance.json'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/module-33-final-integration-qa-accessibility.md'), 'utf8'),
  readFile(path.join(projectRoot, 'package.json'), 'utf8'),
  readFile(path.join(projectRoot, 'package-lock.json'), 'utf8'),
  readFile(path.join(projectRoot, 'README.md'), 'utf8')
]);
const acceptance = JSON.parse(acceptanceSource);
assert.equal(acceptance.module, 33);
assert.equal(acceptance.launchDecision, 'blocked-pending-owner-live-acceptance');
assert.equal(acceptance.repositoryAutomation.status, 'passed');
assert.equal(acceptance.repositoryAutomation.criticalDefects, 0);
assert.equal(acceptance.repositoryAutomation.highDefects, 0);
assert.equal(acceptance.ownerSignOff.status, 'pending');
assert.equal(acceptance.ownerSignOff.ownerName, null);
assert.equal(acceptance.ownerSignOff.decision, null);
check(acceptance.liveAcceptance.length >= 11, 'Live acceptance register must preserve every owner/provider/browser gate');
check(acceptance.liveAcceptance.every(({ status }) => status.startsWith('pending-')), 'No unexecuted live acceptance item may be marked passed');
for (const requiredText of [
  'No critical or high repository defects',
  'Lighthouse and Core Web Vitals',
  'Keyboard-only matrix',
  'Screen-reader matrix',
  'Cross-browser and responsive matrix',
  'Failure and resilience matrix',
  'Owner launch sign-off',
  'Launch remains blocked'
]) {
  check(runbook.includes(requiredText), `Module 33 runbook is missing: ${requiredText}`);
}
const packageJson = JSON.parse(packageSource);
check(packageJson.scripts['validate:final-qa'] === 'node scripts/validate-final-qa.mjs', 'Final QA command must remain connected');
check(packageJson.scripts.check.endsWith('npm run validate:final-qa'), 'Complete check chain must end with final QA');
check(!/(bootstrap|tailwind|jquery|react|vue|angular)/i.test(`${packageSource}\n${packageLockSource}`), 'Prohibited framework dependency detected');
for (const match of readme.matchAll(/\]\((\.\/[^)#]+)(?:#[^)]+)?\)/g)) {
  const linkedPath = path.resolve(projectRoot, decodeURIComponent(match[1]));
  check(await fileExists(linkedPath), `README references a missing workspace file: ${match[1]}`);
}
check(!allGeneratedFiles.some((filePath) => relativeGenerated(filePath).startsWith('content/')), 'Raw CMS content must not be published');
const generatedTextFiles = allGeneratedFiles.filter((filePath) => /\.(?:html|js|css|json|xml|txt|yml)$/i.test(filePath));
for (const filePath of generatedTextFiles) {
  const source = await readFile(filePath, 'utf8');
  check(!/picsum\.photos/i.test(source), `Development placeholder image leaked into generated output: ${relativeGenerated(filePath)}`);
  check(!/(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|NETLIFY_AUTH_TOKEN\s*=\s*\S+)/.test(source), `Provider credential pattern detected: ${relativeGenerated(filePath)}`);
}
record('Truthful launch-blocker register, zero critical/high repository defects, dependency controls, and secret/placeholder hygiene');

console.log(`Final integration, QA, and accessibility validation passed (${groups.length} groups):`);
for (const group of groups) console.log(`- ${group}`);
console.log(`Largest raster image: ${largestRasterImage.path} (${largestRasterImage.bytes} bytes).`);
console.log(`Largest compressed document + CSS + JavaScript route: ${maximumRoutePayload.route} (${maximumRoutePayload.bytes} bytes).`);
console.log('Launch remains blocked pending the owner-controlled items in qa/module-33-acceptance.json.');
