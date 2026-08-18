import { SEO_POLICY, canonicalSeoUrl } from './seo.mjs';

export const SITEMAP_POLICY = Object.freeze({
  module: 29,
  publicPath: '/sitemap.xml',
  canonicalUrl: `${SEO_POLICY.siteOrigin}/sitemap.xml`,
  namespace: 'http://www.sitemaps.org/schemas/sitemap/0.9',
  maximumUrlsPerFile: 50_000,
  maximumUncompressedBytes: 50 * 1024 * 1024,
  canonicalOrigin: SEO_POLICY.siteOrigin,
  articleLastmodSource: 'updated_date-or-publish_date',
  deploymentTimestampAllowedAsLastmod: false
});

export const PRODUCTION_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${SITEMAP_POLICY.canonicalUrl}
`;

export const NONPRODUCTION_ROBOTS_TXT = `User-agent: *
Disallow: /
`;

export const PREVIEW_ROBOTS_HEADER = 'noindex, nofollow';
export const PERMANENT_NOINDEX_ROBOTS_HEADER = 'noindex, nofollow, noarchive';

const ALLOWED_SITEMAP_TYPES = new Set([
  'primary',
  'editorial-policy',
  'article-listing-pagination',
  'category',
  'category-pagination',
  'article'
]);

const PERMANENTLY_EXCLUDED_ROUTE_PATTERNS = Object.freeze([
  /^\/admin(?:\/|$)/,
  /^\/api(?:\/|$)/,
  /^\/\.netlify(?:\/|$)/,
  /^\/private(?:\/|$)/,
  /^\/404(?:\.html|\/|$)/
]);

export function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function normalizeSitemapLastmod(value) {
  const lastmod = String(value || '').trim();
  if (!lastmod) throw new Error('Sitemap lastmod values must not be empty.');
  if (/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
    const parsedDate = new Date(`${lastmod}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== lastmod) {
      throw new Error(`Invalid sitemap lastmod date: ${lastmod}`);
    }
    return lastmod;
  }

  const parsedDate = new Date(lastmod);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid sitemap lastmod date: ${lastmod}`);
  }
  return parsedDate.toISOString().replace('.000Z', 'Z');
}

export function resolveArticleSitemapLastmod(article) {
  if (!article || typeof article !== 'object') {
    throw new Error('Article sitemap lastmod resolution requires an article record.');
  }
  return normalizeSitemapLastmod(article.updated_date || article.publish_date);
}

export function isSitemapRoutePermanentlyExcluded(route) {
  const normalizedRoute = String(route || '');
  return (
    normalizedRoute.includes('?') ||
    normalizedRoute.includes('#') ||
    PERMANENTLY_EXCLUDED_ROUTE_PATTERNS.some((pattern) => pattern.test(normalizedRoute))
  );
}

export function robotsDirectiveIsIndexable(directive) {
  const tokens = String(directive || '')
    .toLowerCase()
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.includes('index') && tokens.includes('follow') && !tokens.includes('noindex');
}

function validateSitemapCandidate(candidate, index) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error(`Sitemap candidate ${index + 1} must be an object.`);
  }
  const { route, canonicalUrl, type, robotsDirective } = candidate;
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) {
    throw new Error(`Sitemap candidate ${index + 1} has an invalid route: ${route}`);
  }
  if (route !== '/' && !route.endsWith('/')) {
    throw new Error(`Sitemap route must follow the trailing-slash convention: ${route}`);
  }
  if (isSitemapRoutePermanentlyExcluded(route)) {
    throw new Error(`Permanently excluded route entered the sitemap candidate graph: ${route}`);
  }
  if (!ALLOWED_SITEMAP_TYPES.has(type)) {
    throw new Error(`Sitemap route ${route} has an unsupported type: ${type}`);
  }
  const expectedCanonicalUrl = canonicalSeoUrl(route);
  if (canonicalUrl !== expectedCanonicalUrl) {
    throw new Error(
      `Sitemap route ${route} must use its validated canonical URL ${expectedCanonicalUrl}.`
    );
  }
  if (typeof robotsDirective !== 'string' || !robotsDirective.trim()) {
    throw new Error(`Sitemap route ${route} is missing its current robots directive.`);
  }
  if (type === 'article' && !candidate.lastmod) {
    throw new Error(`Article sitemap route ${route} requires a substantive lastmod value.`);
  }
  return {
    route,
    canonicalUrl,
    type,
    robotsDirective,
    lastmod: candidate.lastmod
      ? normalizeSitemapLastmod(candidate.lastmod)
      : null
  };
}

function renderSitemapEntry(entry) {
  const lastmod = entry.lastmod
    ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
    : '';
  return `  <url>\n    <loc>${escapeXml(entry.canonicalUrl)}</loc>${lastmod}\n  </url>`;
}

export function createSitemapDocument(candidates) {
  if (!Array.isArray(candidates)) {
    throw new Error('Sitemap generation requires the validated public-route candidate array.');
  }
  const validatedCandidates = candidates.map(validateSitemapCandidate);
  const routeSet = new Set();
  const canonicalSet = new Set();
  for (const candidate of validatedCandidates) {
    if (routeSet.has(candidate.route)) {
      throw new Error(`Duplicate sitemap route candidate: ${candidate.route}`);
    }
    if (canonicalSet.has(candidate.canonicalUrl)) {
      throw new Error(`Duplicate sitemap canonical candidate: ${candidate.canonicalUrl}`);
    }
    routeSet.add(candidate.route);
    canonicalSet.add(candidate.canonicalUrl);
  }

  const entries = validatedCandidates.filter(({ robotsDirective }) =>
    robotsDirectiveIsIndexable(robotsDirective)
  );
  const excluded = validatedCandidates
    .filter(({ robotsDirective }) => !robotsDirectiveIsIndexable(robotsDirective))
    .map(({ route, canonicalUrl, type, robotsDirective }) => ({
      route,
      canonicalUrl,
      type,
      robotsDirective,
      reason: 'current-route-noindex'
    }));

  if (entries.length > SITEMAP_POLICY.maximumUrlsPerFile) {
    throw new Error(
      `Sitemap contains ${entries.length} URLs; generate a sitemap index before exceeding ${SITEMAP_POLICY.maximumUrlsPerFile}.`
    );
  }

  const body = entries.map(renderSitemapEntry).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${SITEMAP_POLICY.namespace}">${body ? `\n${body}\n` : '\n'}</urlset>\n`;
  if (Buffer.byteLength(xml, 'utf8') > SITEMAP_POLICY.maximumUncompressedBytes) {
    throw new Error('Sitemap exceeds the 50 MiB uncompressed sitemap limit.');
  }

  return Object.freeze({
    xml,
    entries: Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))),
    excluded: Object.freeze(excluded.map((entry) => Object.freeze({ ...entry })))
  });
}

export function renderRobotsTxt(deploymentEnvironment = 'development') {
  return deploymentEnvironment === 'production'
    ? PRODUCTION_ROBOTS_TXT
    : NONPRODUCTION_ROBOTS_TXT;
}

export function resolveRobotsResponseHeaders(
  deploymentEnvironment = 'development',
  { route = '/', statusCode = 200 } = {}
) {
  if (deploymentEnvironment !== 'production') {
    return Object.freeze({ 'X-Robots-Tag': PREVIEW_ROBOTS_HEADER });
  }
  if (
    statusCode === 404 ||
    /^\/admin(?:\/|$)/.test(String(route))
  ) {
    return Object.freeze({ 'X-Robots-Tag': PERMANENT_NOINDEX_ROBOTS_HEADER });
  }
  return Object.freeze({});
}
