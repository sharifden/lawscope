import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARTICLES_AD_INSERT_AFTER,
  ARTICLES_PAGE_SIZE,
  articlesPageRoute,
  createArticlesPagination
} from './articles-page.mjs';
import { loadCategories, loadPublishedArticles } from './content-graph.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const problems = [];

const [
  sourceTemplate,
  articleCardPartial,
  articlesAdPartial,
  buildSource,
  helperSource,
  componentCss,
  pageOneHtml,
  paginationManifest,
  categories,
  publishedArticles
] = await Promise.all([
  readFile(path.join(projectRoot, 'pages/articles.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/article-card.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/ad-slot-articles-in-feed.html'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/articles-page.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/articles/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/articles-pagination.json'), 'utf8').then(JSON.parse),
  loadCategories(projectRoot),
  loadPublishedArticles(projectRoot, new Date('2026-08-15T23:59:59Z'))
]);

function requireFragments(source, fragments, label) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) problems.push(`${label}: missing ${fragment}`);
  }
}

function countMatches(source, pattern) {
  return source.match(pattern)?.length || 0;
}

function activeResultsMarkup(html, label) {
  const resultsStart = html.indexOf('data-article-results');
  const supplementStart = html.indexOf('<template data-article-filter-supplement>');
  if (resultsStart < 0 || supplementStart < resultsStart) {
    problems.push(`${label}: active result grid boundaries are missing`);
    return '';
  }
  return html.slice(resultsStart, supplementStart);
}

function assertUniqueIds(html, label) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length > 0) {
    problems.push(`${label}: duplicate IDs: ${duplicateIds.join(', ')}`);
  }
}

function parseStructuredData(html, label) {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  if (!match) {
    problems.push(`${label}: missing CollectionPage JSON-LD`);
    return null;
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    problems.push(`${label}: JSON-LD is not valid JSON (${error.message})`);
    return null;
  }
}

requireFragments(sourceTemplate, [
  '<main class="articles-page" id="main-content" tabindex="-1">',
  '<nav class="breadcrumb" aria-label="Breadcrumb">',
  '{{ARTICLES_BREADCRUMB_ITEMS}}',
  '<h1>Law Articles</h1>',
  'Browse Lawscope’s plain-English guides to common U.S. legal topics.',
  'Every article identifies its publication date, sources, and limits.',
  'aria-label="Legal information, not legal advice"',
  'This library provides general educational information and does not replace advice',
  'from a qualified attorney.',
  'data-article-library',
  'data-article-result-count',
  'aria-live="polite"',
  'role="search"',
  'action="/articles/"',
  'method="get"',
  'Search articles by topic or phrase',
  'for="article-filter-keyword"',
  'name="q"',
  'placeholder="Search articles by topic or phrase"',
  'Filter by legal category',
  'for="article-filter-category"',
  'name="category"',
  '{{ARTICLE_CATEGORY_OPTIONS}}',
  'for="article-filter-sort"',
  'name="sort"',
  '<option value="newest">Newest first</option>',
  '<option value="updated">Recently updated</option>',
  'data-article-filter-clear',
  'Clear filters',
  '{{ARTICLE_FEED}}',
  '{{ARTICLE_PAGINATION}}',
  '{{ARTICLES_NEWSLETTER}}',
  '{{SITE_FOOTER}}',
  '<link rel="canonical" href="{{CANONICAL_URL}}">',
  '<script type="application/ld+json">{{ARTICLES_JSON_LD}}</script>'
], 'pages/articles.html');

requireFragments(articleCardPartial, [
  'class="article-card"',
  'loading="lazy"',
  'decoding="async"',
  'width="{{IMAGE_WIDTH}}"',
  'height="{{IMAGE_HEIGHT}}"',
  'alt="{{IMAGE_ALT}}"',
  '<time datetime="{{PUBLISH_DATE_ISO}}">',
  '{{AUTHOR}}',
  '{{READING_TIME}} min read'
], 'shared article-card partial');

requireFragments(articlesAdPartial, [
  'class="ad-slot ad-slot--horizontal article-library__ad"',
  'aria-label="Advertisement"',
  'data-ad-slot="articles-in-feed"',
  'data-ad-feature-enabled="{{AD_FEATURE_ENABLED}}"',
  'data-ad-consent="unknown"',
  'data-ad-provider="{{AD_PROVIDER}}"',
  'data-ad-unit-key="articles_in_feed"',
  '<p class="ad-slot__label" aria-hidden="true">Advertisement</p>',
  '{{AD_HIDDEN_ATTRIBUTE}}'
], 'articles in-feed ad partial');

requireFragments(helperSource, [
  'export const ARTICLES_PAGE_SIZE = 9',
  'export const ARTICLES_AD_INSERT_AFTER = 6',
  "return pageNumber === 1 ? '/articles/' : `/articles/page/${pageNumber}/`",
  'const orderedArticles = [...articles].sort(compareArticles)',
  'Math.max(1, Math.ceil(totalItems / pageSize))'
], 'articles-page.mjs');

requireFragments(buildSource, [
  "path.join(projectRoot, 'pages/articles.html')",
  "path.join(projectRoot, 'pages/partials/article-card.html')",
  "path.join(projectRoot, 'pages/partials/ad-slot-articles-in-feed.html')",
  'createArticlesPagination(publishedArticles, {',
  'pageSize: ARTICLES_PAGE_SIZE',
  'cardHtml.splice(ARTICLES_AD_INSERT_AFTER, 0, articlesAdSlotHtml)',
  "path.join(outputDirectory, 'data/articles-pagination.json')",
  'renderArticlesEmptyState(categories)',
  'We could not find an article matching those filters.',
  'Reset and show all articles',
  'Browse category overviews',
  'renderArticlesPagination(page)',
  'return canonicalSeoUrl(route)'
], 'build.mjs');

requireFragments(componentCss, [
  '/* Module 17: statically generated Law Articles library and crawlable pagination. */',
  '.breadcrumb__list',
  '.articles-page__boundary',
  '.article-filter',
  '.article-filter__control',
  'min-block-size: var(--size-touch-target)',
  '.article-library__grid',
  'grid-template-columns: minmax(var(--space-0), 1fr)',
  'grid-template-columns: repeat(2, minmax(var(--space-0), 1fr))',
  'grid-template-columns: repeat(3, minmax(var(--space-0), 1fr))',
  '.article-library__ad',
  'grid-column: 1 / -1',
  '.article-library__empty',
  '.article-pagination',
  '.article-pagination__control--disabled',
  '@media (prefers-reduced-motion: reduce)'
], 'components.css');

if (ARTICLES_PAGE_SIZE !== 9 || ARTICLES_AD_INSERT_AFTER !== 6) {
  problems.push('pagination constants: expected a nine-card page with ad insertion after six');
}
if (articlesPageRoute(1) !== '/articles/' || articlesPageRoute(2) !== '/articles/page/2/') {
  problems.push('route helper: clean first and paginated routes were not returned');
}
for (const invalidPageNumber of [0, -1, 1.5]) {
  try {
    articlesPageRoute(invalidPageNumber);
    problems.push(`route helper: invalid page number ${invalidPageNumber} did not throw`);
  } catch {
    // Expected.
  }
}

const deterministicFixtures = [
  { slug: 'later', title: 'Later', publish_date: '2026-08-02T00:00:00Z' },
  { slug: 'z-slug', title: 'Alpha', publish_date: '2026-08-01T00:00:00Z' },
  { slug: 'a-slug', title: 'Alpha', publish_date: '2026-08-01T00:00:00Z' },
  { slug: 'beta', title: 'Beta', publish_date: '2026-08-01T00:00:00Z' }
];
const deterministicPages = createArticlesPagination(deterministicFixtures, { pageSize: 2 });
const deterministicOrder = deterministicPages.flatMap((page) => page.items.map(({ slug }) => slug));
if (deterministicOrder.join('|') !== 'later|a-slug|z-slug|beta') {
  problems.push(`deterministic sort: unexpected order ${deterministicOrder.join(', ')}`);
}
if (
  deterministicPages.length !== 2 ||
  deterministicPages[0].nextRoute !== '/articles/page/2/' ||
  deterministicPages[1].previousRoute !== '/articles/'
) {
  problems.push('pagination model: Previous/Next route graph is incorrect');
}
const emptyPagination = createArticlesPagination([]);
if (
  emptyPagination.length !== 1 ||
  emptyPagination[0].route !== '/articles/' ||
  emptyPagination[0].items.length !== 0 ||
  emptyPagination[0].firstItemNumber !== 0
) {
  problems.push('pagination model: empty library must retain a renderable first page');
}

const expectedPages = createArticlesPagination(publishedArticles);
const expectedSlugs = expectedPages.flatMap((page) => page.items.map((article) => article.slug));
const manifestSlugs = paginationManifest.pages.flatMap((page) => page.articleSlugs);
if (paginationManifest.pageSize !== 9 || paginationManifest.adInsertAfter !== 6) {
  problems.push('pagination manifest: sizing constants are incorrect');
}
if (
  paginationManifest.totalArticles !== publishedArticles.length ||
  paginationManifest.totalPages !== expectedPages.length ||
  paginationManifest.canonicalStrategy !== 'clean-page-routes'
) {
  problems.push('pagination manifest: totals or canonical strategy are incorrect');
}
if (manifestSlugs.join('|') !== expectedSlugs.join('|')) {
  problems.push('pagination manifest: article order differs from deterministic CMS order');
}
if (new Set(manifestSlugs).size !== manifestSlugs.length) {
  problems.push('pagination manifest: an article appears on more than one listing page');
}
if (
  paginationManifest.pages.length !== expectedPages.length ||
  paginationManifest.pages.some((page, index) => {
    const expected = expectedPages[index];
    return (
      page.route !== expected.route ||
      page.previousRoute !== expected.previousRoute ||
      page.nextRoute !== expected.nextRoute
    );
  })
) {
  problems.push('pagination manifest: page routes or Previous/Next graph are incorrect');
}

const generatedPageHtmlByRoute = new Map([[expectedPages[0].route, pageOneHtml]]);
for (const expectedPage of expectedPages.slice(1)) {
  generatedPageHtmlByRoute.set(
    expectedPage.route,
    await readFile(
      path.join(projectRoot, `generated/articles/page/${expectedPage.pageNumber}/index.html`),
      'utf8'
    )
  );
}
const generatedPages = expectedPages.map((expectedPage) => ({
  html: generatedPageHtmlByRoute.get(expectedPage.route),
  label: `generated ${expectedPage.route}`,
  pageNumber: expectedPage.pageNumber,
  expectedCardCount: expectedPage.items.length
}));
for (const { html, label, pageNumber, expectedCardCount } of generatedPages) {
  const staticResults = activeResultsMarkup(html, label);
  if (/{{[A-Z0-9_]+}}/.test(html)) problems.push(`${label}: unresolved build token`);
  if (countMatches(html, /<h1\b/g) !== 1 || !html.includes('<h1>Law Articles</h1>')) {
    problems.push(`${label}: expected exactly one Law Articles H1`);
  }
  if (countMatches(staticResults, /data-article-slug=/g) !== expectedCardCount) {
    problems.push(`${label}: expected ${expectedCardCount} cards in the active static result grid`);
  }
  if (!html.includes(`data-current-page="${pageNumber}"`)) {
    problems.push(`${label}: missing current page data contract`);
  }
  if (!html.includes(`Showing ${publishedArticles.length} articles.`)) {
    problems.push(`${label}: missing visible total result count`);
  }
  if (!html.includes('aria-label="Articles pagination"')) {
    problems.push(`${label}: missing labeled pagination landmark`);
  }
  if (!html.includes('Previous page') || !html.includes('Next page')) {
    problems.push(`${label}: missing approved Previous/Next page labels`);
  }
  if (!html.includes('data-newsletter-section') || !html.includes('data-site-footer')) {
    problems.push(`${label}: shared newsletter or footer is absent`);
  }
  const paginationIndex = html.lastIndexOf('class="article-pagination"');
  const newsletterIndex = html.indexOf('class="newsletter-signup"');
  const footerIndex = html.indexOf('class="site-footer"');
  if (!(paginationIndex < newsletterIndex && newsletterIndex < footerIndex)) {
    problems.push(`${label}: newsletter must follow pagination and precede the footer`);
  }
  if (!html.includes('<meta property="og:type" content="website">')) {
    problems.push(`${label}: missing listing Open Graph metadata`);
  }
  if (!html.includes('<meta name="twitter:card" content="summary_large_image">')) {
    problems.push(`${label}: missing Twitter card metadata`);
  }
  if (!html.includes('href="/articles/" aria-current="page">Articles</a>')) {
    problems.push(`${label}: shared navigation does not mark Articles as current`);
  }
  assertUniqueIds(html, label);
}

const pageOneRange = expectedPages[0].firstItemNumber === expectedPages[0].lastItemNumber
  ? `Page 1 displays article ${expectedPages[0].firstItemNumber}.`
  : `Page 1 displays articles ${expectedPages[0].firstItemNumber}–${expectedPages[0].lastItemNumber}.`;
requireFragments(pageOneHtml, [
  '<title>U.S. Law Articles &amp; Legal Guides | Lawscope</title>',
  '<link rel="canonical" href="https://getlawscope.com/articles/">',
  pageOneRange,
  'aria-label="Page 1, current page"',
  'data-ad-slot="articles-in-feed"',
  'data-ad-feature-enabled="false"',
  'data-ad-state="disabled"',
  'aria-label="Advertisement"'
], 'generated /articles/');
if (expectedPages.length > 1) {
  requireFragments(pageOneHtml, [
    '<link rel="next" href="https://getlawscope.com/articles/page/2/">',
    'href="/articles/page/2/" rel="next"',
    'aria-label="Go to page 2"'
  ], 'generated /articles/');
}
for (const expectedPage of expectedPages.slice(1)) {
  const pageRange = expectedPage.firstItemNumber === expectedPage.lastItemNumber
    ? `Page ${expectedPage.pageNumber} displays article ${expectedPage.firstItemNumber}.`
    : `Page ${expectedPage.pageNumber} displays articles ${expectedPage.firstItemNumber}–${expectedPage.lastItemNumber}.`;
  requireFragments(generatedPageHtmlByRoute.get(expectedPage.route), [
    `U.S. Law Articles &amp; Legal Guides – Page ${expectedPage.pageNumber} | Lawscope`,
    `<link rel="canonical" href="https://getlawscope.com${expectedPage.route}">`,
    `<link rel="prev" href="https://getlawscope.com${expectedPage.previousRoute}">`,
    pageRange,
    '<li class="breadcrumb__item"><a href="/articles/">Articles</a></li>',
    `<li class="breadcrumb__item" aria-current="page">Page ${expectedPage.pageNumber}</li>`,
    `href="${expectedPage.previousRoute}" rel="prev"`,
    `aria-label="Page ${expectedPage.pageNumber}, current page"`
  ], `generated ${expectedPage.route}`);
}

if (pageOneHtml.includes('<link rel="prev"')) {
  problems.push('generated /articles/: first page must not declare rel=prev');
}
for (const expectedPage of expectedPages.slice(1)) {
  if (generatedPageHtmlByRoute.get(expectedPage.route).includes('<link rel="next"')) {
    problems.push(`generated ${expectedPage.route}: last page must not declare rel=next`);
  }
}
for (const { html, label } of generatedPages) {
  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)">/);
  if (!canonicalMatch || canonicalMatch[1].includes('?')) {
    problems.push(`${label}: canonical must be a clean URL without query state`);
  }
}

const pageOneActiveResults = activeResultsMarkup(pageOneHtml, 'generated /articles/');
const adIndex = pageOneActiveResults.indexOf('data-ad-slot="articles-in-feed"');
const cardsBeforeAd = countMatches(pageOneActiveResults.slice(0, adIndex), /data-article-slug=/g);
const seventhCardIndex = [...pageOneActiveResults.matchAll(/data-article-slug=/g)][6]?.index ?? -1;
if (adIndex < 0 || cardsBeforeAd !== 6 || seventhCardIndex < adIndex) {
  problems.push('generated /articles/: in-feed ad must occupy the position after six cards');
}
if (countMatches(pageOneHtml, /data-ad-slot="articles-in-feed"/g) !== 1) {
  problems.push('generated /articles/: expected exactly one in-feed ad insertion point');
}
for (const expectedPage of expectedPages.slice(1)) {
  if (
    expectedPage.items.length <= ARTICLES_AD_INSERT_AFTER &&
    generatedPageHtmlByRoute.get(expectedPage.route).includes('data-ad-slot="articles-in-feed"')
  ) {
    problems.push(`generated ${expectedPage.route}: short pages must not receive an in-feed ad`);
  }
}

const generatedCategoryOptionValues = [
  ...pageOneHtml.matchAll(/<option value="([a-z0-9-]+)">/g)
].map((match) => match[1]).filter((value) => value !== 'newest' && value !== 'updated');
const expectedCategorySlugs = categories.map((category) => category.slug);
if (
  generatedCategoryOptionValues.length !== expectedCategorySlugs.length ||
  generatedCategoryOptionValues.join('|') !== expectedCategorySlugs.join('|')
) {
  problems.push('generated /articles/: category options must derive from the controlled categories');
}

for (const expectedPage of expectedPages) {
  const html = generatedPageHtmlByRoute.get(expectedPage.route);
  const activeResults = activeResultsMarkup(html, `generated ${expectedPage.route}`);
  const renderedSlugs = [...activeResults.matchAll(/data-article-slug="([^"]+)"/g)].map(
    (match) => match[1]
  );
  if (renderedSlugs.join('|') !== expectedPage.items.map(({ slug }) => slug).join('|')) {
    problems.push(
      `generated cards: ${expectedPage.route} static content differs from the deterministic page model`
    );
  }
}

for (const articleMatch of pageOneActiveResults.matchAll(/<article[\s\S]*?class="article-card"[\s\S]*?<\/article>/g)) {
  const card = articleMatch[0];
  if (!/<img[\s\S]*?width="\d+"[\s\S]*?height="\d+"[\s\S]*?alt="[^"]+"[\s\S]*?loading="lazy"/.test(card)) {
    problems.push('generated /articles/: card image is missing intrinsic size, alt text, or lazy loading');
    break;
  }
  if (!/<time datetime="[^"]+">[^<]+<\/time>/.test(card)) {
    problems.push('generated /articles/: card is missing a static publication date');
    break;
  }
}

for (const expectedPage of expectedPages) {
  const html = generatedPageHtmlByRoute.get(expectedPage.route);
  const label = `generated ${expectedPage.route}`;
  const route = `https://getlawscope.com${expectedPage.route}`;
  const itemCount = expectedPage.items.length;
  const schema = parseStructuredData(html, label);
  if (!schema) continue;
  if (schema['@type'] !== 'CollectionPage' || schema.url !== route) {
    problems.push(`${label}: schema type or canonical URL is incorrect`);
  }
  if (schema.mainEntity?.numberOfItems !== itemCount) {
    problems.push(`${label}: schema visible item count is incorrect`);
  }
  if (schema.mainEntity?.itemListElement?.length !== itemCount) {
    problems.push(`${label}: schema visible page items are incorrect`);
  }
  if (schema.breadcrumb?.['@type'] !== 'BreadcrumbList') {
    problems.push(`${label}: schema breadcrumb is absent`);
  }
}

if (problems.length > 0) {
  console.error('Law Articles page validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log(
    `Law Articles page validation passed (${publishedArticles.length} CMS articles, ${expectedPages.length} static routes, ${categories.length} controlled filters).`
  );
  console.log('Static cards, ad insertion, empty-state contract, metadata, and crawlable pagination verified.');
}
