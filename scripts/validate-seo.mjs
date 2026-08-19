import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJpegDimensions } from './content-graph.mjs';
import {
  LEGACY_REDIRECT_POLICY,
  SEO_POLICY,
  absoluteSeoImageUrl,
  canonicalSeoUrl,
  createSeoMetadata,
  resolvePublicRobotsDirective,
  serializeSeoStructuredData
} from './seo.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const configuredOutputDirectory = process.env.LAWSCOPE_OUTPUT_DIR
  ? path.resolve(process.env.LAWSCOPE_OUTPUT_DIR)
  : path.join(projectRoot, 'generated');
const EXPECTED_ROUTE_COUNT = 29;
const INDEX_DIRECTIVE = 'index, follow';
const NOINDEX_DIRECTIVE = 'noindex, nofollow';
const REQUIRED_META_PROPERTIES = [
  'og:type',
  'og:site_name',
  'og:locale',
  'og:title',
  'og:description',
  'og:url',
  'og:image',
  'og:image:secure_url',
  'og:image:type',
  'og:image:width',
  'og:image:height',
  'og:image:alt'
];
const REQUIRED_META_NAMES = [
  'description',
  'robots',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'twitter:image:alt'
];
const URL_PROPERTY_NAMES = new Set([
  '@id',
  'url',
  'item',
  'mainEntityOfPage',
  'contentUrl'
]);

function decodeHtml(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function normalizeText(value) {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAttributes(tag) {
  const attributes = {};
  const expression = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(expression)) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? '');
  }
  return attributes;
}

function findTags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => ({
    source: match[0],
    attributes: parseAttributes(match[0])
  }));
}

function singleMeta(html, attributeName, attributeValue, route) {
  const matches = findTags(html, 'meta').filter(
    ({ attributes }) => attributes[attributeName] === attributeValue
  );
  assert.equal(
    matches.length,
    1,
    `${route} must include exactly one ${attributeName}="${attributeValue}" meta tag.`
  );
  assert.ok(matches[0].attributes.content, `${route} ${attributeValue} must have content.`);
  return matches[0].attributes.content;
}

function singleCanonical(html, route) {
  const matches = findTags(html, 'link').filter(({ attributes }) =>
    String(attributes.rel || '').split(/\s+/).includes('canonical')
  );
  assert.equal(matches.length, 1, `${route} must include exactly one canonical link.`);
  assert.ok(matches[0].attributes.href, `${route} canonical link must have an href.`);
  return matches[0].attributes.href;
}

function singleTitle(html, route) {
  const matches = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  assert.equal(matches.length, 1, `${route} must include exactly one title element.`);
  return normalizeText(matches[0][1]);
}

function outputPathForRoute(outputDirectory, route) {
  return route === '/'
    ? path.join(outputDirectory, 'index.html')
    : path.join(outputDirectory, route.slice(1), 'index.html');
}

function assertCleanCanonical(value, route) {
  const parsed = new URL(value);
  assert.equal(parsed.protocol, 'https:', `${route} canonical must use HTTPS.`);
  assert.equal(parsed.host, 'getlawscope.com', `${route} canonical must use the apex host.`);
  assert.equal(parsed.search, '', `${route} canonical must not include a query.`);
  assert.equal(parsed.hash, '', `${route} canonical must not include a fragment.`);
  assert.equal(parsed.pathname, route, `${route} canonical must be self-referencing.`);
  assert.ok(
    route === '/' || route.endsWith('/'),
    `${route} must follow the trailing-slash route convention.`
  );
}

function assertAbsoluteLawscopeImage(value, route) {
  const parsed = new URL(value);
  assert.equal(parsed.protocol, 'https:', `${route} social image must use HTTPS.`);
  assert.equal(parsed.host, 'getlawscope.com', `${route} social image must use the canonical host.`);
  assert.equal(parsed.search, '', `${route} social image must not include a query.`);
  assert.equal(parsed.hash, '', `${route} social image must not include a fragment.`);
  assert.match(parsed.pathname, /\.(?:jpe?g|png|webp)$/i, `${route} social image must be an image URL.`);
  return parsed;
}

function getJsonLd(html, route) {
  const scripts = [...html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];
  assert.equal(scripts.length, 1, `${route} must include exactly one JSON-LD block.`);
  assert.ok(!scripts[0][1].includes('</script'), `${route} JSON-LD must be safely serialized.`);
  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(scripts[0][1]);
  }, `${route} JSON-LD must parse as JSON.`);
  assert.equal(parsed['@context'], 'https://schema.org', `${route} must use Schema.org context.`);
  return parsed;
}

function graphNodes(schema) {
  return Array.isArray(schema['@graph']) ? schema['@graph'] : [schema];
}

function requireSchemaNode(nodes, type, route) {
  const matches = nodes.filter((node) => node?.['@type'] === type);
  assert.equal(matches.length, 1, `${route} must include exactly one ${type} schema node.`);
  return matches[0];
}

function assertAbsoluteSchemaUrls(value, route, parentKey = '') {
  if (Array.isArray(value)) {
    for (const item of value) assertAbsoluteSchemaUrls(item, route, parentKey);
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && URL_PROPERTY_NAMES.has(key)) {
      assert.match(child, /^https:\/\//, `${route} schema ${key} must be an absolute HTTPS URL.`);
    }
    if (typeof child === 'string' && key === 'image') {
      assert.match(child, /^https:\/\//, `${route} schema image must be an absolute HTTPS URL.`);
    }
    if (Array.isArray(child) && (key === 'sameAs' || key === 'image')) {
      for (const item of child) {
        if (typeof item === 'string') {
          assert.match(item, /^https:\/\//, `${route} schema ${key} entries must be absolute HTTPS URLs.`);
        }
      }
    }
    assertAbsoluteSchemaUrls(child, route, key || parentKey);
  }
}

function assertOrganization(organization, route) {
  assert.equal(organization?.['@type'], 'Organization', `${route} publisher must be an Organization.`);
  assert.equal(organization.name, 'Lawscope', `${route} Organization name must be truthful.`);
  assert.equal(organization.url, 'https://getlawscope.com/', `${route} Organization URL must be canonical.`);
  assert.equal(
    organization.logo?.url,
    canonicalSeoUrl(SEO_POLICY.publisherLogo),
    `${route} must use the approved publisher logo.`
  );
  assert.equal(organization.logo?.width, SEO_POLICY.publisherLogoWidth);
  assert.equal(organization.logo?.height, SEO_POLICY.publisherLogoHeight);
}

function assertBreadcrumb(breadcrumb, route) {
  assert.equal(breadcrumb?.['@type'], 'BreadcrumbList', `${route} must expose BreadcrumbList data.`);
  const items = breadcrumb.itemListElement;
  assert.ok(Array.isArray(items) && items.length >= 2, `${route} breadcrumbs must include at least two items.`);
  items.forEach((item, index) => {
    assert.equal(item['@type'], 'ListItem', `${route} breadcrumb entries must be ListItem values.`);
    assert.equal(item.position, index + 1, `${route} breadcrumb positions must be sequential.`);
    assert.ok(String(item.name || '').trim(), `${route} breadcrumb names must not be empty.`);
    assert.match(item.item, /^https:\/\/getlawscope\.com\//, `${route} breadcrumb URLs must be canonical.`);
  });
  assert.equal(items.at(-1).item, canonicalSeoUrl(route), `${route} final breadcrumb must match its canonical.`);
}

function assertCollectionPage(page, route, description) {
  assert.equal(page['@type'], 'CollectionPage');
  assert.equal(page.url, canonicalSeoUrl(route));
  assert.equal(page.description, description);
  assert.equal(page.inLanguage, 'en-US');
  assertOrganization(page.publisher, route);
  assertBreadcrumb(page.breadcrumb, route);
  assert.equal(page.mainEntity?.['@type'], 'ItemList', `${route} must describe its visible list.`);
  assert.ok(Number.isInteger(page.mainEntity.numberOfItems));
  assert.ok(Array.isArray(page.mainEntity.itemListElement));
  assert.equal(page.mainEntity.numberOfItems, page.mainEntity.itemListElement.length);
  const firstPosition = page.mainEntity.itemListElement[0]?.position ?? 1;
  assert.ok(Number.isInteger(firstPosition) && firstPosition > 0);
  page.mainEntity.itemListElement.forEach((item, index) => {
    assert.equal(item['@type'], 'ListItem');
    assert.equal(item.position, firstPosition + index);
    const itemUrl = item.url || item.item?.url || item.item;
    assert.match(itemUrl, /^https:\/\/getlawscope\.com\//, `${route} list items must use absolute canonical URLs.`);
  });
}

function assertPageSchema({ schema, route, description, html, articleManifestByRoute }) {
  const nodes = graphNodes(schema);
  assertAbsoluteSchemaUrls(schema, route);
  assert.ok(!JSON.stringify(schema).includes('SearchAction'), `${route} must not fabricate a SearchAction.`);

  if (route === '/') {
    assert.equal(nodes.length, 2, 'Home schema must contain only WebSite and Organization nodes.');
    const website = requireSchemaNode(nodes, 'WebSite', route);
    const organization = requireSchemaNode(nodes, 'Organization', route);
    assert.equal(website.name, 'Lawscope');
    assert.equal(website.url, canonicalSeoUrl('/'));
    assert.equal(website.description, description);
    assert.equal(website.publisher?.['@id'], organization['@id']);
    assert.equal(website.inLanguage, 'en-US');
    assertOrganization(organization, route);
    return;
  }

  if (/^\/articles\/[^/]+\/$/.test(route)) {
    assert.equal(nodes.length, 3, `${route} must contain Article, Organization, and BreadcrumbList nodes.`);
    const article = requireSchemaNode(nodes, 'Article', route);
    const organization = requireSchemaNode(nodes, 'Organization', route);
    const breadcrumb = requireSchemaNode(nodes, 'BreadcrumbList', route);
    const h1 = normalizeText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
    const manifestRecord = articleManifestByRoute.get(route);

    assert.equal(article.url, canonicalSeoUrl(route));
    assert.equal(article.mainEntityOfPage, canonicalSeoUrl(route));
    assert.equal(article.headline, h1, `${route} schema headline must match the visible H1.`);
    assert.equal(article.description, description);
    assert.equal(article.inLanguage, 'en-US');
    assert.equal(article.isAccessibleForFree, true);
    assert.ok(Number.isInteger(article.wordCount) && article.wordCount > 0);
    assert.equal(article.wordCount, manifestRecord?.wordCount, `${route} schema word count must match rendered content.`);
    assert.ok(String(article.articleSection || '').trim());
    assert.ok(Array.isArray(article.keywords) && article.keywords.length > 0);
    assert.equal(article.author?.['@type'], 'Organization');
    assert.equal(article.author?.name, 'The GetLawscope Team');
    assert.equal(article.author?.description, 'Legal Research & Information Team');
    assert.equal(article.publisher?.['@id'], organization['@id']);
    assert.equal(article.image?.['@type'], 'ImageObject');
    assert.match(article.image?.url, /^https:\/\/getlawscope\.com\//);
    assert.equal(article.image?.width, 1200);
    assert.equal(article.image?.height, 630);
    for (const field of ['datePublished', 'dateModified']) {
      assert.ok(!Number.isNaN(Date.parse(article[field])), `${route} ${field} must be a valid date.`);
      assert.ok(html.includes(article[field].slice(0, 10)), `${route} ${field} must agree with a visible date.`);
    }
    assertOrganization(organization, route);
    assertBreadcrumb(breadcrumb, route);
    return;
  }

  if (route === '/articles/' || /^\/articles\/page\/\d+\/$/.test(route) || route.startsWith('/categories/')) {
    assert.equal(nodes.length, 1, `${route} must expose one CollectionPage blueprint.`);
    assertCollectionPage(requireSchemaNode(nodes, 'CollectionPage', route), route, description);
    return;
  }

  const expectedType = route === '/about/'
    ? 'AboutPage'
    : route === '/contact/'
      ? 'ContactPage'
      : 'WebPage';
  assert.equal(nodes.length, 3, `${route} must include its page, Organization, and BreadcrumbList nodes.`);
  const page = requireSchemaNode(nodes, expectedType, route);
  const organization = requireSchemaNode(nodes, 'Organization', route);
  const breadcrumb = requireSchemaNode(nodes, 'BreadcrumbList', route);
  assert.equal(page.url, canonicalSeoUrl(route));
  assert.equal(page.description, description);
  assert.equal(page.inLanguage, 'en-US');
  assertOrganization(organization, route);
  assertBreadcrumb(breadcrumb, route);
  for (const field of ['datePublished', 'dateModified']) {
    if (!page[field]) continue;
    assert.ok(!Number.isNaN(Date.parse(page[field])), `${route} ${field} must be a valid date.`);
    assert.ok(html.includes(page[field].slice(0, 10)), `${route} ${field} must agree with a visible date.`);
  }
}

function assertHeadings(html, route, { h1MustLead = true } = {}) {
  const activeHtml = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
    .replace(/<template\b[\s\S]*?<\/template>/gi, '');
  const headings = [...activeHtml.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => ({
    level: Number(match[1]),
    text: normalizeText(match[2])
  }));
  assert.equal(headings.filter(({ level }) => level === 1).length, 1, `${route} must have exactly one H1.`);
  if (h1MustLead) {
    assert.equal(headings[0]?.level, 1, `${route} heading outline must begin with H1.`);
  }
  assert.ok(headings[0]?.text, `${route} H1 must have visible text.`);
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(
      headings[index].level <= headings[index - 1].level + 1,
      `${route} heading outline skips from H${headings[index - 1].level} to H${headings[index].level}.`
    );
  }
}

async function collectIndexRoutes(directory, rootDirectory = directory) {
  const routes = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      routes.push(...await collectIndexRoutes(absolutePath, rootDirectory));
    } else if (entry.name === 'index.html') {
      const relativeDirectory = path.relative(rootDirectory, path.dirname(absolutePath)).split(path.sep).join('/');
      routes.push(relativeDirectory ? `/${relativeDirectory}/` : '/');
    }
  }
  return routes;
}

function assertRedirectPolicy(manifest) {
  assert.deepEqual(LEGACY_REDIRECT_POLICY, {
    status: 'empty-no-known-legacy-routes',
    redirects: []
  });
  assert.deepEqual(manifest.legacyRedirectPolicy, LEGACY_REDIRECT_POLICY);
}

async function validateVercelRedirect() {
  const configuration = JSON.parse(await readFile(path.join(projectRoot, 'vercel.json'), 'utf8'));
  assert.equal(configuration.trailingSlash, true);
  const redirect = configuration.redirects?.find((candidate) =>
    candidate.has?.some((condition) =>
      condition.type === 'host' && condition.value === 'www.getlawscope.com'
    )
  );
  assert.ok(redirect, 'vercel.json must include a host-aware www redirect.');
  assert.equal(redirect.source, '/:path*');
  assert.equal(redirect.destination, 'https://getlawscope.com/:path*');
  assert.equal(redirect.permanent, true, 'The www redirect must be a permanent 308 redirect.');
  assert.ok(
    configuration.headers?.some((rule) =>
      rule.source === '/admin/(.*)' &&
      rule.headers?.some((header) =>
        header.key === 'X-Robots-Tag' && header.value.includes('noindex')
      )
    ),
    'The admin route must retain its noindex response header.'
  );
}

function validateSeoHelperPolicy() {
  assert.equal(canonicalSeoUrl('/articles/'), 'https://getlawscope.com/articles/');
  assert.equal(
    absoluteSeoImageUrl('/assets/images/social/lawscope-editorial-standards.jpg'),
    'https://getlawscope.com/assets/images/social/lawscope-editorial-standards.jpg'
  );
  for (const unsafeRoute of [
    'articles/',
    '//example.com/path/',
    '/articles/?q=test',
    '/articles/#section'
  ]) {
    assert.throws(() => canonicalSeoUrl(unsafeRoute));
  }
  for (const unsafeImage of [
    'http://getlawscope.com/image.jpg',
    'https://example.com/image.jpg',
    '/image.jpg?version=2'
  ]) {
    assert.throws(() => absoluteSeoImageUrl(unsafeImage));
  }
  assert.equal(resolvePublicRobotsDirective('production'), INDEX_DIRECTIVE);
  assert.equal(resolvePublicRobotsDirective('preview'), NOINDEX_DIRECTIVE);
  assert.equal(resolvePublicRobotsDirective('development'), NOINDEX_DIRECTIVE);

  const fallback = createSeoMetadata({ route: '/fallback-test/' });
  assert.equal(fallback.title, SEO_POLICY.defaultTitle);
  assert.equal(fallback.description, SEO_POLICY.defaultDescription);
  assert.equal(fallback.socialImageUrl, canonicalSeoUrl(SEO_POLICY.defaultSocialImage));
  assert.equal(fallback.socialImageAlt, SEO_POLICY.defaultSocialImageAlt);
  assert.equal(fallback.robotsDirective, NOINDEX_DIRECTIVE);
  assert.throws(() => createSeoMetadata({
    route: '/invalid/',
    title: 'Missing brand suffix',
    description: 'Description',
    socialImageAlt: 'Alternative'
  }));
  assert.throws(() => createSeoMetadata({
    route: '/invalid/',
    title: `Overlong ${'x'.repeat(SEO_POLICY.maxTitleLength)} | Lawscope`,
    description: 'Description',
    socialImageAlt: 'Alternative'
  }));
  assert.throws(() => createSeoMetadata({
    route: '/invalid/',
    title: 'Valid | Lawscope',
    description: 'x'.repeat(SEO_POLICY.maxDescriptionLength + 1),
    socialImageAlt: 'Alternative'
  }));
  const safelySerialized = serializeSeoStructuredData({ unsafe: '</script><script>' });
  assert.ok(!safelySerialized.includes('<'));
  assert.deepEqual(JSON.parse(safelySerialized), { unsafe: '</script><script>' });
}

async function validateOutput(outputDirectory) {
  const manifest = JSON.parse(
    await readFile(path.join(outputDirectory, 'data/seo-policy.json'), 'utf8')
  );
  const articleManifest = JSON.parse(
    await readFile(path.join(outputDirectory, 'data/article-pages.json'), 'utf8')
  );
  const privacyManifest = JSON.parse(
    await readFile(path.join(outputDirectory, 'data/privacy-policy-manifest.json'), 'utf8')
  );
  const disclaimerManifest = JSON.parse(
    await readFile(path.join(outputDirectory, 'data/legal-disclaimer-manifest.json'), 'utf8')
  );
  const articleManifestByRoute = new Map(
    articleManifest.articles.map((record) => [record.route, record])
  );

  assert.equal(manifest.module, 28);
  assert.ok(['development', 'preview', 'production'].includes(manifest.deploymentEnvironment));
  assert.equal(manifest.canonicalOrigin, SEO_POLICY.siteOrigin);
  assert.equal(manifest.maximumTitleLength, SEO_POLICY.maxTitleLength);
  assert.equal(manifest.maximumDescriptionLength, SEO_POLICY.maxDescriptionLength);
  assert.equal(manifest.routeCount, EXPECTED_ROUTE_COUNT);
  assert.equal(manifest.routes.length, EXPECTED_ROUTE_COUNT);
  assert.equal(
    manifest.publicRobotsDirective,
    resolvePublicRobotsDirective(manifest.deploymentEnvironment)
  );
  assertRedirectPolicy(manifest);
  assert.equal(manifest.defaultSocialImage, canonicalSeoUrl(SEO_POLICY.defaultSocialImage));
  assert.equal(manifest.publisherLogo, canonicalSeoUrl(SEO_POLICY.publisherLogo));
  const publisherLogoPath = path.join(outputDirectory, new URL(manifest.publisherLogo).pathname.slice(1));
  const publisherLogo = await readFile(publisherLogoPath);
  assert.equal(publisherLogo.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(publisherLogo.readUInt32BE(16), SEO_POLICY.publisherLogoWidth);
  assert.equal(publisherLogo.readUInt32BE(20), SEO_POLICY.publisherLogoHeight);

  const routeSet = new Set(manifest.routes.map(({ route }) => route));
  assert.equal(routeSet.size, manifest.routes.length, 'SEO routes must be unique.');
  const generatedIndexRoutes = (await collectIndexRoutes(outputDirectory))
    .filter((route) => route !== '/admin/')
    .sort();
  assert.deepEqual(generatedIndexRoutes, [...routeSet].sort(), 'Every generated public index route must be in the SEO manifest.');

  const titles = new Set();
  const descriptions = new Set();
  const canonicals = new Set();
  const imageDimensionCache = new Map();

  for (const record of manifest.routes) {
    const { route } = record;
    assert.match(route, /^\/(?:[a-z0-9-]+\/)*(?:page\/\d+\/)?$/);
    const html = await readFile(outputPathForRoute(outputDirectory, route), 'utf8');
    assert.ok(!/{{[A-Z0-9_]+}}/.test(html), `${route} contains an unresolved build placeholder.`);
    assertHeadings(html, route);

    const title = singleTitle(html, route);
    const description = singleMeta(html, 'name', 'description', route);
    const robots = singleMeta(html, 'name', 'robots', route);
    const canonical = singleCanonical(html, route);
    for (const property of REQUIRED_META_PROPERTIES) singleMeta(html, 'property', property, route);
    for (const name of REQUIRED_META_NAMES) singleMeta(html, 'name', name, route);

    assert.equal(title, record.title, `${route} title must match its generated SEO record.`);
    assert.equal(description, record.description, `${route} description must match its generated SEO record.`);
    assert.equal(canonical, record.canonicalUrl, `${route} canonical must match its generated SEO record.`);
    assert.ok(title.endsWith(SEO_POLICY.titleSuffix), `${route} title must use the Lawscope suffix.`);
    assert.ok(title.length <= SEO_POLICY.maxTitleLength, `${route} title is over the configured limit.`);
    assert.ok(description.length <= SEO_POLICY.maxDescriptionLength, `${route} description is over the configured limit.`);
    assert.ok(description.length > 0, `${route} description must not be empty.`);
    assertCleanCanonical(canonical, route);

    assert.ok(!titles.has(title), `${route} duplicates another page title: ${title}`);
    assert.ok(!descriptions.has(description), `${route} duplicates another page description.`);
    assert.ok(!canonicals.has(canonical), `${route} duplicates another page canonical.`);
    titles.add(title);
    descriptions.add(description);
    canonicals.add(canonical);

    const expectedRobots = route === privacyManifest.route
      ? privacyManifest.robotsDirective
      : route === disclaimerManifest.route
        ? disclaimerManifest.robotsDirective
        : manifest.publicRobotsDirective;
    assert.equal(robots, expectedRobots, `${route} has the wrong indexing directive for ${manifest.deploymentEnvironment}.`);
    if (manifest.deploymentEnvironment !== 'production') {
      assert.equal(robots, NOINDEX_DIRECTIVE, `${route} preview/development output must be noindex.`);
    }

    const expectedType = /^\/articles\/[^/]+\/$/.test(route) ? 'article' : 'website';
    const ogTitle = singleMeta(html, 'property', 'og:title', route);
    const ogDescription = singleMeta(html, 'property', 'og:description', route);
    const ogUrl = singleMeta(html, 'property', 'og:url', route);
    const ogImage = singleMeta(html, 'property', 'og:image', route);
    const ogImageAlt = singleMeta(html, 'property', 'og:image:alt', route);
    assert.equal(singleMeta(html, 'property', 'og:type', route), expectedType);
    assert.equal(singleMeta(html, 'property', 'og:site_name', route), 'Lawscope');
    assert.equal(singleMeta(html, 'property', 'og:locale', route), 'en_US');
    assert.equal(ogTitle, title);
    assert.equal(ogDescription, description);
    assert.equal(ogUrl, canonical);
    assert.equal(singleMeta(html, 'property', 'og:image:secure_url', route), ogImage);
    assert.equal(singleMeta(html, 'property', 'og:image:type', route), 'image/jpeg');
    assert.equal(singleMeta(html, 'property', 'og:image:width', route), '1200');
    assert.equal(singleMeta(html, 'property', 'og:image:height', route), '630');
    assert.ok(ogImageAlt.trim(), `${route} social image alt text must not be empty.`);

    assert.equal(singleMeta(html, 'name', 'twitter:card', route), 'summary_large_image');
    assert.equal(singleMeta(html, 'name', 'twitter:title', route), ogTitle);
    assert.equal(singleMeta(html, 'name', 'twitter:description', route), ogDescription);
    assert.equal(singleMeta(html, 'name', 'twitter:image', route), ogImage);
    assert.equal(singleMeta(html, 'name', 'twitter:image:alt', route), ogImageAlt);

    const imageUrl = assertAbsoluteLawscopeImage(ogImage, route);
    const imagePath = path.join(outputDirectory, decodeURIComponent(imageUrl.pathname.slice(1)));
    await access(imagePath);
    if (!imageDimensionCache.has(imagePath)) {
      imageDimensionCache.set(imagePath, await readJpegDimensions(imagePath));
    }
    assert.deepEqual(
      imageDimensionCache.get(imagePath),
      { width: 1200, height: 630 },
      `${route} social image must physically be 1200 by 630.`
    );

    if (expectedType === 'article') {
      const published = singleMeta(html, 'property', 'article:published_time', route);
      const modified = singleMeta(html, 'property', 'article:modified_time', route);
      assert.ok(!Number.isNaN(Date.parse(published)));
      assert.ok(!Number.isNaN(Date.parse(modified)));
      assert.ok(singleMeta(html, 'property', 'article:section', route));
      const articleTags = findTags(html, 'meta').filter(
        ({ attributes }) => attributes.property === 'article:tag'
      );
      assert.ok(articleTags.length > 0, `${route} must expose at least one article tag.`);
    }

    const schema = getJsonLd(html, route);
    assertPageSchema({
      schema,
      route,
      description,
      html,
      articleManifestByRoute
    });
    if (route !== '/') {
      assert.match(
        html,
        /<nav\b[^>]*class="[^"]*\bbreadcrumb\b[^"]*"[^>]*aria-label="Breadcrumb"[^>]*>/i,
        `${route} must visibly render breadcrumbs.`
      );
    }
  }

  const notFoundHtml = await readFile(path.join(outputDirectory, '404.html'), 'utf8');
  assertHeadings(notFoundHtml, '/404.html', { h1MustLead: false });
  assert.match(singleMeta(notFoundHtml, 'name', 'robots', '/404.html'), /\bnoindex\b/);
  assert.equal(findTags(notFoundHtml, 'link').filter(({ attributes }) => attributes.rel === 'canonical').length, 0);
  assert.equal([...notFoundHtml.matchAll(/application\/ld\+json/gi)].length, 0);

  const adminHtml = await readFile(path.join(outputDirectory, 'admin/index.html'), 'utf8');
  assert.match(singleMeta(adminHtml, 'name', 'robots', '/admin/'), /\bnoindex\b/);

  return {
    environment: manifest.deploymentEnvironment,
    routeCount: manifest.routeCount,
    titleCount: titles.size,
    descriptionCount: descriptions.size,
    canonicalCount: canonicals.size,
    socialImageCount: imageDimensionCache.size
  };
}

async function buildAndValidateEnvironment(environment) {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'lawscope-seo-'));
  try {
    const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts/build.mjs')], {
      cwd: projectRoot,
      env: {
        ...process.env,
        LAWSCOPE_OUTPUT_DIR: temporaryDirectory,
        VERCEL_ENV: environment
      },
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    if (result.status !== 0) {
      throw new Error(
        `Isolated ${environment} SEO build failed.\n${result.stdout || ''}${result.stderr || ''}`
      );
    }
    return await validateOutput(temporaryDirectory);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

validateSeoHelperPolicy();
await validateVercelRedirect();
const currentResult = await validateOutput(configuredOutputDirectory);
const environmentResults = [currentResult];
for (const environment of ['development', 'preview', 'production']) {
  if (environment === currentResult.environment) continue;
  environmentResults.push(await buildAndValidateEnvironment(environment));
}

console.log(
  `Module 28 SEO validation passed for ${environmentResults.map(({ environment }) => environment).join(', ')}.`
);
console.log(
  `${currentResult.routeCount} public routes: unique titles/descriptions/canonicals, absolute 1200×630 social images, one-H1 heading outlines, and page-type schema verified.`
);
console.log(
  'Preview/development noindex, production indexing gates, admin/404 exclusions, safe fallbacks, and the permanent www-to-apex redirect are valid.'
);
