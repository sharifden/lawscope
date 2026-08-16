import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  rm
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviewServer } from './preview.mjs';
import { SEO_POLICY, canonicalSeoUrl } from './seo.mjs';
import {
  NONPRODUCTION_ROBOTS_TXT,
  PERMANENT_NOINDEX_ROBOTS_HEADER,
  PREVIEW_ROBOTS_HEADER,
  PRODUCTION_ROBOTS_TXT,
  SITEMAP_POLICY,
  createSitemapDocument,
  escapeXml,
  isSitemapRoutePermanentlyExcluded,
  normalizeSitemapLastmod,
  renderRobotsTxt,
  resolveArticleSitemapLastmod,
  resolveRobotsResponseHeaders,
  robotsDirectiveIsIndexable
} from './sitemap-robots.mjs';
import { TRUST_PAGE_MODIFICATION_DATE } from './trust-pages.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const configuredOutputDirectory = process.env.LAWSCOPE_OUTPUT_DIR
  ? path.resolve(process.env.LAWSCOPE_OUTPUT_DIR)
  : path.join(projectRoot, 'generated');
const REQUIRED_PRODUCTION_ROUTES = [
  '/',
  '/articles/',
  '/categories/',
  '/about/',
  '/contact/',
  '/editorial-policy/'
];
const READINESS_GATED_ROUTES = ['/privacy-policy/', '/legal-disclaimer/'];
const ALLOWED_NONARTICLE_LASTMOD_ROUTES = new Set([
  '/editorial-policy/',
  ...READINESS_GATED_ROUTES
]);

function decodeXml(value) {
  return String(value)
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function parseAttributes(tag) {
  const attributes = {};
  const expression = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(expression)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return attributes;
}

function pageRobotsDirective(html, route) {
  const matches = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => parseAttributes(match[0]))
    .filter((attributes) => String(attributes.name || '').toLowerCase() === 'robots');
  assert.equal(matches.length, 1, `${route} must have exactly one robots meta directive.`);
  assert.ok(matches[0].content, `${route} robots meta directive must not be empty.`);
  return matches[0].content;
}

function outputPathForRoute(outputDirectory, route) {
  return route === '/'
    ? path.join(outputDirectory, 'index.html')
    : path.join(outputDirectory, route.slice(1), 'index.html');
}

function parseSitemapXml(xml) {
  assert.ok(
    xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'),
    'sitemap.xml must begin with a UTF-8 XML declaration.'
  );
  assert.ok(
    xml.includes(`<urlset xmlns="${SITEMAP_POLICY.namespace}">`),
    'sitemap.xml must use the Sitemap protocol namespace.'
  );
  assert.ok(!/<sitemapindex\b/i.test(xml), 'A sitemap index is unnecessary below protocol limits.');
  assert.ok(!/<(?:changefreq|priority)>/i.test(xml), 'Sitemap must not publish guessed changefreq or priority values.');

  const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  const entries = urlBlocks.map((block, index) => {
    const locationMatches = [...block.matchAll(/<loc>([\s\S]*?)<\/loc>/g)];
    const lastmodMatches = [...block.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/g)];
    assert.equal(locationMatches.length, 1, `Sitemap URL entry ${index + 1} needs one loc.`);
    assert.ok(lastmodMatches.length <= 1, `Sitemap URL entry ${index + 1} has duplicate lastmod.`);
    const recognizedContent = block
      .replace(/<loc>[\s\S]*?<\/loc>/g, '')
      .replace(/<lastmod>[\s\S]*?<\/lastmod>/g, '')
      .trim();
    assert.equal(recognizedContent, '', `Sitemap URL entry ${index + 1} has unsupported elements.`);
    return {
      canonicalUrl: decodeXml(locationMatches[0][1].trim()),
      lastmod: lastmodMatches[0]
        ? decodeXml(lastmodMatches[0][1].trim())
        : null
    };
  });

  const urlsetBody = xml
    .replace(/^<\?xml[^>]+>\s*/, '')
    .replace(new RegExp(`^<urlset xmlns="${SITEMAP_POLICY.namespace.replaceAll('/', '\\/')}">`), '')
    .replace(/<url>[\s\S]*?<\/url>/g, '')
    .replace(/<\/urlset>\s*$/, '')
    .trim();
  assert.equal(urlsetBody, '', 'sitemap.xml contains content outside recognized URL entries.');
  return entries;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function collectExpectedIndexableRoutes(outputDirectory, seoManifest) {
  const records = [];
  for (const record of seoManifest.routes) {
    const html = await readFile(outputPathForRoute(outputDirectory, record.route), 'utf8');
    const robotsDirective = pageRobotsDirective(html, record.route);
    records.push({
      ...record,
      robotsDirective,
      indexable: robotsDirectiveIsIndexable(robotsDirective)
    });
  }
  return records;
}

function assertCanonicalSitemapUrl(canonicalUrl) {
  const parsed = new URL(canonicalUrl);
  assert.equal(parsed.origin, SEO_POLICY.siteOrigin, `${canonicalUrl} must use the canonical origin.`);
  assert.equal(parsed.protocol, 'https:', `${canonicalUrl} must use HTTPS.`);
  assert.equal(parsed.search, '', `${canonicalUrl} must not contain filtered/search state.`);
  assert.equal(parsed.hash, '', `${canonicalUrl} must not contain a fragment.`);
  assert.ok(
    parsed.pathname === '/' || parsed.pathname.endsWith('/'),
    `${canonicalUrl} must follow the trailing-slash convention.`
  );
  assert.equal(canonicalUrl, canonicalSeoUrl(parsed.pathname));
  assert.equal(isSitemapRoutePermanentlyExcluded(parsed.pathname), false);
}

async function assertServedOutput(outputDirectory, deploymentEnvironment) {
  const server = createPreviewServer({
    rootDirectory: outputDirectory,
    deploymentEnvironment
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const [home, sitemap, robots, admin, missing] = await Promise.all([
      fetch(`${origin}/`, { method: 'HEAD' }),
      fetch(`${origin}/sitemap.xml`, { method: 'HEAD' }),
      fetch(`${origin}/robots.txt`, { method: 'HEAD' }),
      fetch(`${origin}/admin/`, { method: 'HEAD' }),
      fetch(`${origin}/module-29-missing-route/`, { method: 'HEAD' })
    ]);
    assert.equal(home.status, 200);
    assert.equal(sitemap.status, 200);
    assert.equal(robots.status, 200);
    assert.equal(admin.status, 200);
    assert.equal(missing.status, 404);
    assert.match(sitemap.headers.get('content-type') || '', /^application\/xml\b/);
    assert.match(robots.headers.get('content-type') || '', /^text\/plain\b/);

    if (deploymentEnvironment === 'production') {
      assert.equal(home.headers.get('x-robots-tag'), null, 'Production public routes must not receive site-wide noindex.');
      assert.equal(sitemap.headers.get('x-robots-tag'), null);
      assert.equal(robots.headers.get('x-robots-tag'), null);
      assert.equal(admin.headers.get('x-robots-tag'), PERMANENT_NOINDEX_ROBOTS_HEADER);
      assert.equal(missing.headers.get('x-robots-tag'), PERMANENT_NOINDEX_ROBOTS_HEADER);
    } else {
      for (const response of [home, sitemap, robots, admin, missing]) {
        assert.equal(
          response.headers.get('x-robots-tag'),
          PREVIEW_ROBOTS_HEADER,
          `${deploymentEnvironment} served output must be site-wide noindex, nofollow.`
        );
      }
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function validateOutput(outputDirectory) {
  const [
    moduleManifest,
    seoManifest,
    articleManifest,
    articlesPaginationManifest,
    categoryManifest,
    sitemapXml,
    robotsTxt
  ] = await Promise.all([
    readJson(path.join(outputDirectory, 'data/sitemap-robots.json')),
    readJson(path.join(outputDirectory, 'data/seo-policy.json')),
    readJson(path.join(outputDirectory, 'data/article-pages.json')),
    readJson(path.join(outputDirectory, 'data/articles-pagination.json')),
    readJson(path.join(outputDirectory, 'data/category-pages.json')),
    readFile(path.join(outputDirectory, 'sitemap.xml'), 'utf8'),
    readFile(path.join(outputDirectory, 'robots.txt'), 'utf8')
  ]);
  const environment = moduleManifest.deploymentEnvironment;
  assert.ok(['development', 'preview', 'production'].includes(environment));
  assert.equal(moduleManifest.module, 29);
  assert.equal(moduleManifest.canonicalOrigin, SEO_POLICY.siteOrigin);
  assert.equal(moduleManifest.sitemap.publicPath, SITEMAP_POLICY.publicPath);
  assert.equal(moduleManifest.sitemap.canonicalUrl, SITEMAP_POLICY.canonicalUrl);
  assert.equal(moduleManifest.sitemap.namespace, SITEMAP_POLICY.namespace);
  assert.equal(moduleManifest.sitemap.candidateCount, seoManifest.routeCount);
  assert.equal(moduleManifest.sitemap.maximumUrlsPerFile, 50_000);
  assert.equal(moduleManifest.sitemap.maximumUncompressedBytes, 50 * 1024 * 1024);
  assert.equal(moduleManifest.sitemap.articleLastmodSource, 'updated_date-or-publish_date');
  assert.equal(moduleManifest.sitemap.deploymentTimestampAllowedAsLastmod, false);
  assert.equal(moduleManifest.responseHeaders.nonproductionSitewide, PREVIEW_ROBOTS_HEADER);
  assert.equal(
    moduleManifest.responseHeaders.permanentAdminAndNotFound,
    PERMANENT_NOINDEX_ROBOTS_HEADER
  );
  assert.equal(moduleManifest.responseHeaders.productionPublicSitewide, null);

  const expectedRobotsTxt = renderRobotsTxt(environment);
  assert.equal(robotsTxt, expectedRobotsTxt, `${environment} robots.txt has the wrong policy.`);
  assert.equal(
    moduleManifest.robots.policy,
    environment === 'production'
      ? 'approved-production-guidance'
      : 'nonproduction-block-all-defense-in-depth'
  );
  assert.equal(moduleManifest.robots.sitemapDeclared, environment === 'production');
  assert.equal(moduleManifest.robots.accessControl, false);

  const parsedEntries = parseSitemapXml(sitemapXml);
  assert.ok(
    Buffer.byteLength(sitemapXml, 'utf8') <= SITEMAP_POLICY.maximumUncompressedBytes
  );
  assert.ok(parsedEntries.length <= SITEMAP_POLICY.maximumUrlsPerFile);
  assert.equal(moduleManifest.sitemap.entryCount, parsedEntries.length);
  assert.equal(
    moduleManifest.sitemap.exclusionCount,
    seoManifest.routeCount - parsedEntries.length
  );
  assert.equal(
    moduleManifest.sitemap.entries.length,
    moduleManifest.sitemap.entryCount
  );
  assert.equal(
    moduleManifest.sitemap.exclusions.length,
    moduleManifest.sitemap.exclusionCount
  );
  assert.ok(
    moduleManifest.sitemap.exclusions.every(({ reason }) => reason === 'current-route-noindex')
  );

  const expectedRouteRecords = await collectExpectedIndexableRoutes(outputDirectory, seoManifest);
  const expectedIndexableRecords = expectedRouteRecords.filter(({ indexable }) => indexable);
  const expectedCanonicalUrls = expectedIndexableRecords
    .map(({ canonicalUrl }) => canonicalUrl)
    .sort();
  const parsedCanonicalUrls = parsedEntries.map(({ canonicalUrl }) => canonicalUrl);
  assert.equal(new Set(parsedCanonicalUrls).size, parsedCanonicalUrls.length, 'Sitemap URLs must be unique.');
  assert.deepEqual(
    [...parsedCanonicalUrls].sort(),
    expectedCanonicalUrls,
    `${environment} sitemap must contain every and only currently indexable canonical route.`
  );
  assert.deepEqual(
    moduleManifest.sitemap.entries.map(({ canonicalUrl }) => canonicalUrl),
    parsedCanonicalUrls,
    'Sitemap XML order must match the Module 29 manifest.'
  );
  for (const canonicalUrl of parsedCanonicalUrls) assertCanonicalSitemapUrl(canonicalUrl);
  assert.ok(!sitemapXml.includes('localhost'));
  assert.ok(!sitemapXml.includes('127.0.0.1'));
  assert.ok(!sitemapXml.includes('.vercel.app'));
  assert.ok(!sitemapXml.includes(moduleManifest.generatedAt), 'Build timestamps must never become sitemap lastmod values.');

  if (environment !== 'production') {
    assert.equal(parsedEntries.length, 0, `${environment} sitemap must be empty while every route is noindex.`);
    assert.equal(robotsTxt, NONPRODUCTION_ROBOTS_TXT);
  } else {
    assert.equal(robotsTxt, PRODUCTION_ROBOTS_TXT);
    for (const route of REQUIRED_PRODUCTION_ROUTES) {
      assert.ok(
        parsedCanonicalUrls.includes(canonicalSeoUrl(route)),
        `Production sitemap is missing required public route ${route}.`
      );
    }
    for (const route of READINESS_GATED_ROUTES) {
      const routeRecord = expectedRouteRecords.find((record) => record.route === route);
      assert.equal(
        parsedCanonicalUrls.includes(canonicalSeoUrl(route)),
        routeRecord.indexable,
        `${route} sitemap membership must follow its existing production readiness gate.`
      );
    }

    for (const category of categoryManifest.categories) {
      for (const page of category.pages) {
        assert.ok(
          parsedCanonicalUrls.includes(page.canonicalUrl),
          `Published category route ${page.route} must be in the production sitemap.`
        );
        if (page.pageNumber > 1) {
          assert.ok(page.visibleArticleSlugs.length > 0, `${page.route} must be a useful pagination target.`);
        }
      }
    }
    for (const page of articlesPaginationManifest.pages) {
      assert.ok(
        parsedCanonicalUrls.includes(page.canonicalUrl),
        `Canonical article-listing route ${page.route} must be in the production sitemap.`
      );
      if (page.pageNumber > 1) {
        assert.ok(page.articleSlugs.length > 0, `${page.route} must be a useful pagination target.`);
      }
    }
  }

  const parsedByUrl = new Map(parsedEntries.map((entry) => [entry.canonicalUrl, entry]));
  const manifestByUrl = new Map(
    moduleManifest.sitemap.entries.map((entry) => [entry.canonicalUrl, entry])
  );
  for (const article of articleManifest.articles) {
    const expectedLastmod = normalizeSitemapLastmod(article.updatedDate || article.publishDate);
    const sitemapEntry = parsedByUrl.get(article.canonicalUrl);
    if (environment === 'production') {
      assert.ok(sitemapEntry, `${article.route} must be present in the production sitemap.`);
      assert.equal(
        sitemapEntry.lastmod,
        expectedLastmod,
        `${article.route} lastmod must use substantive update/publication content data.`
      );
      assert.equal(manifestByUrl.get(article.canonicalUrl)?.type, 'article');
    } else {
      assert.equal(sitemapEntry, undefined);
    }
  }

  for (const entry of parsedEntries) {
    const manifestEntry = manifestByUrl.get(entry.canonicalUrl);
    assert.ok(manifestEntry);
    assert.equal(entry.lastmod, manifestEntry.lastmod);
    if (manifestEntry.type === 'article') {
      assert.ok(entry.lastmod, `${entry.canonicalUrl} article entry requires lastmod.`);
    } else if (entry.lastmod) {
      const route = new URL(entry.canonicalUrl).pathname;
      assert.ok(
        ALLOWED_NONARTICLE_LASTMOD_ROUTES.has(route),
        `${route} must omit lastmod unless a substantive visible policy date exists.`
      );
    }
  }
  const editorialEntry = parsedByUrl.get(canonicalSeoUrl('/editorial-policy/'));
  if (environment === 'production') {
    assert.equal(editorialEntry?.lastmod, TRUST_PAGE_MODIFICATION_DATE);
  }

  await assertServedOutput(outputDirectory, environment);
  return {
    environment,
    entryCount: parsedEntries.length,
    exclusionCount: moduleManifest.sitemap.exclusionCount,
    articleCount: articleManifest.articles.length,
    sitemapXml
  };
}

async function buildEnvironment(environment) {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'lawscope-sitemap-'));
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
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw new Error(
      `Isolated ${environment} sitemap/robots build failed.\n${result.stdout || ''}${result.stderr || ''}`
    );
  }
  return temporaryDirectory;
}

async function validateVercelHeaders() {
  const configuration = await readJson(path.join(projectRoot, 'vercel.json'));
  const xRobotsRules = (configuration.headers || []).filter((rule) =>
    rule.headers?.some(({ key }) => key.toLowerCase() === 'x-robots-tag')
  );
  const previewRule = xRobotsRules.find((rule) =>
    rule.has?.some(({ type, value }) =>
      type === 'host' && value.includes('vercel')
    )
  );
  assert.ok(previewRule, 'vercel.json must include a host-scoped Preview noindex rule.');
  assert.equal(previewRule.source, '/(.*)', 'Preview response protection must be site-wide.');
  assert.ok(
    previewRule.headers.some(({ key, value }) =>
      key.toLowerCase() === 'x-robots-tag' && value === PREVIEW_ROBOTS_HEADER
    ),
    'Preview response protection must be exactly noindex, nofollow.'
  );
  const hostPattern = previewRule.has.find(({ type }) => type === 'host').value;
  const hostMatcher = new RegExp(`^(?:${hostPattern})$`);
  assert.ok(hostMatcher.test('lawscope-git-module-29-team.vercel.app'));
  assert.ok(hostMatcher.test('lawscope.vercel.app'));
  assert.equal(hostMatcher.test('getlawscope.com'), false);
  assert.equal(hostMatcher.test('www.getlawscope.com'), false);

  const adminRule = xRobotsRules.find((rule) => rule.source === '/admin/(.*)');
  assert.ok(adminRule, 'Admin must retain its dedicated response-header policy.');
  assert.ok(
    adminRule.headers.some(({ key, value }) =>
      key.toLowerCase() === 'x-robots-tag' && value === PERMANENT_NOINDEX_ROBOTS_HEADER
    )
  );
  for (const rule of xRobotsRules) {
    assert.ok(
      rule === previewRule || rule === adminRule,
      'No unscoped X-Robots-Tag rule may accidentally noindex the production public site.'
    );
  }
}

function validatePolicyHelpers() {
  assert.equal(
    escapeXml(`A&B <C> "D" 'E'`),
    'A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;'
  );
  assert.equal(normalizeSitemapLastmod('2026-08-16'), '2026-08-16');
  assert.equal(normalizeSitemapLastmod('2026-08-16T09:00:00Z'), '2026-08-16T09:00:00Z');
  assert.throws(() => normalizeSitemapLastmod('2026-02-30'));
  assert.throws(() => normalizeSitemapLastmod('deployment-time'));
  assert.equal(
    resolveArticleSitemapLastmod({
      publish_date: '2026-08-01T09:00:00Z',
      updated_date: '2026-08-15T12:30:00Z'
    }),
    '2026-08-15T12:30:00Z'
  );
  assert.equal(
    resolveArticleSitemapLastmod({ publish_date: '2026-08-01T09:00:00Z' }),
    '2026-08-01T09:00:00Z'
  );
  assert.equal(renderRobotsTxt('production'), PRODUCTION_ROBOTS_TXT);
  assert.equal(renderRobotsTxt('preview'), NONPRODUCTION_ROBOTS_TXT);
  assert.equal(renderRobotsTxt('development'), NONPRODUCTION_ROBOTS_TXT);
  assert.equal(robotsDirectiveIsIndexable('index, follow'), true);
  assert.equal(robotsDirectiveIsIndexable('noindex, follow'), false);
  for (const route of [
    '/admin/',
    '/api/contact/',
    '/private/report/',
    '/404.html',
    '/articles/?q=arrest',
    '/articles/#results'
  ]) {
    assert.equal(isSitemapRoutePermanentlyExcluded(route), true);
  }

  const fixture = createSitemapDocument([
    {
      route: '/',
      canonicalUrl: canonicalSeoUrl('/'),
      robotsDirective: 'index, follow',
      type: 'primary'
    },
    {
      route: '/articles/fixture/',
      canonicalUrl: canonicalSeoUrl('/articles/fixture/'),
      robotsDirective: 'noindex, nofollow',
      type: 'article',
      lastmod: '2026-08-01'
    }
  ]);
  assert.equal(fixture.entries.length, 1);
  assert.equal(fixture.excluded.length, 1);
  assert.ok(fixture.xml.includes('<loc>https://getlawscope.com/</loc>'));
  assert.throws(() => createSitemapDocument([
    {
      route: '/admin/',
      canonicalUrl: canonicalSeoUrl('/admin/'),
      robotsDirective: 'noindex, nofollow',
      type: 'primary'
    }
  ]));
  assert.throws(() => createSitemapDocument([
    {
      route: '/articles/missing-date/',
      canonicalUrl: canonicalSeoUrl('/articles/missing-date/'),
      robotsDirective: 'noindex, nofollow',
      type: 'article'
    }
  ]));
  assert.throws(() => createSitemapDocument([
    {
      route: '/',
      canonicalUrl: canonicalSeoUrl('/'),
      robotsDirective: 'index, follow',
      type: 'primary'
    },
    {
      route: '/',
      canonicalUrl: canonicalSeoUrl('/'),
      robotsDirective: 'index, follow',
      type: 'primary'
    }
  ]));

  assert.deepEqual(
    resolveRobotsResponseHeaders('preview'),
    { 'X-Robots-Tag': PREVIEW_ROBOTS_HEADER }
  );
  assert.deepEqual(resolveRobotsResponseHeaders('production'), {});
  assert.deepEqual(
    resolveRobotsResponseHeaders('production', { route: '/admin/', statusCode: 200 }),
    { 'X-Robots-Tag': PERMANENT_NOINDEX_ROBOTS_HEADER }
  );
  assert.deepEqual(
    resolveRobotsResponseHeaders('production', { route: '/missing/', statusCode: 404 }),
    { 'X-Robots-Tag': PERMANENT_NOINDEX_ROBOTS_HEADER }
  );
}

validatePolicyHelpers();
await validateVercelHeaders();
const sourceRobotsTxt = await readFile(path.join(projectRoot, 'robots.txt'), 'utf8');
assert.equal(sourceRobotsTxt, PRODUCTION_ROBOTS_TXT, 'The source robots.txt must be the approved production guidance.');
const buildSource = await readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8');
assert.ok(buildSource.includes('createSitemapDocument'));
assert.ok(buildSource.includes('renderRobotsTxt(deploymentEnvironment)'));
assert.ok(!/cp\([\s\S]{0,120}robots\.txt/.test(buildSource), 'Build must generate, not blindly copy, environment-aware robots output.');

const currentResult = await validateOutput(configuredOutputDirectory);
const environmentResults = [currentResult];
const temporaryDirectories = [];
try {
  for (const environment of ['development', 'preview', 'production']) {
    if (environment === currentResult.environment) continue;
    const temporaryDirectory = await buildEnvironment(environment);
    temporaryDirectories.push(temporaryDirectory);
    environmentResults.push(await validateOutput(temporaryDirectory));
  }
} finally {
  await Promise.all(
    temporaryDirectories.map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
}

const developmentResult = environmentResults.find(({ environment }) => environment === 'development');
const previewResult = environmentResults.find(({ environment }) => environment === 'preview');
const productionResult = environmentResults.find(({ environment }) => environment === 'production');
assert.ok(developmentResult && previewResult && productionResult);
assert.equal(developmentResult.entryCount, 0);
assert.equal(previewResult.entryCount, 0);
assert.ok(productionResult.entryCount > 0);
assert.equal(
  developmentResult.sitemapXml,
  previewResult.sitemapXml,
  'Development and Preview sitemap output should be the same empty noindex URL set.'
);

console.log(
  `Module 29 sitemap/robots validation passed for ${environmentResults.map(({ environment }) => environment).join(', ')}.`
);
console.log(
  `Production sitemap: ${productionResult.entryCount} indexable canonical URLs with ${productionResult.articleCount} article lastmod values; development and Preview sitemaps are empty while noindex.`
);
console.log(
  'Approved production robots guidance, nonproduction crawl blocking, Vercel/local Preview noindex response headers, admin/404 protection, XML limits, and served MIME/status behavior are valid.'
);
