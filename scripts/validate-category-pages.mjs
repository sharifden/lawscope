import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareArticles,
  loadCategories,
  loadPublishedArticles
} from './content-graph.mjs';
import {
  CATEGORY_AD_INSERT_AFTER,
  CATEGORY_PAGE_SIZE,
  categoryPageRoute,
  createAllCategoryPages,
  createCategoryFeedSequence,
  createCategoryPageModel,
  createCategoryPagination,
  selectCategoryFeaturedArticle
} from './category-pages.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const problems = [];
let contractCount = 0;

function contract(condition, message) {
  if (!condition) problems.push(message);
  contractCount += 1;
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    contract(source.includes(fragment), `${label}: missing ${fragment}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function unescapeHtml(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function fixtureArticle(index, {
  category = 'employment-law',
  featured = false,
  day = index + 1
} = {}) {
  return Object.freeze({
    slug: `${category}-fixture-${String(index).padStart(2, '0')}`,
    title: `Fixture Guide ${String(index).padStart(2, '0')}`,
    category,
    featured,
    publish_date: `2026-07-${String(day).padStart(2, '0')}T09:00:00Z`
  });
}

const [
  sourceTemplate,
  featuredPartial,
  adPartial,
  relatedPartial,
  emptyPartial,
  componentsCss,
  buildScript,
  helperScript,
  graphScript,
  documentation,
  manifestText,
  categories,
  publishedArticles
] = await Promise.all([
  readFile(path.join(projectRoot, 'pages/category.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/category-featured-article.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/ad-slot-category-in-feed.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/category-related.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/category-empty-state.html'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/category-pages.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/content-graph.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/module-20-individual-category-page.md'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/category-pages.json'), 'utf8'),
  loadCategories(projectRoot),
  loadPublishedArticles(projectRoot, new Date('2026-08-16T23:59:59Z'))
]);
const manifest = JSON.parse(manifestText);
const generatedPages = new Map(
  await Promise.all(
    categories.map(async (category) => [
      category.slug,
      await readFile(
        path.join(projectRoot, 'generated/categories', category.slug, 'index.html'),
        'utf8'
      )
    ])
  )
);

// Source-template semantics and static rendering contract.
requireFragments('pages/category.html', sourceTemplate, [
  '<main class="category-page" id="main-content" tabindex="-1">',
  '<nav class="breadcrumb" aria-label="Breadcrumb">',
  '<li class="breadcrumb__item"><a href="/">Home</a></li>',
  '<li class="breadcrumb__item"><a href="/categories/">Categories</a></li>',
  '{{CATEGORY_BREADCRUMB_ITEMS}}',
  '<h1>{{CATEGORY_NAME}}</h1>',
  'class="fa-solid {{CATEGORY_ICON}}"',
  '{{CATEGORY_DESCRIPTION}}',
  '{{CATEGORY_ARTICLE_COUNT}}',
  'aria-label="Jurisdiction reminder"',
  'Rules in this area may vary substantially by state and by the facts of a situation.',
  '{{CATEGORY_FEATURED}}',
  '<h2 id="category-library-title">Latest {{CATEGORY_NAME}} Articles</h2>',
  '{{CATEGORY_ARTICLE_FEED}}',
  '{{CATEGORY_PAGINATION}}',
  '{{RELATED_CATEGORIES}}',
  '{{CATEGORY_NEWSLETTER}}',
  '{{CATEGORY_JSON_LD}}',
  '{{PAGINATION_HEAD_LINKS}}',
  '{{SITE_FOOTER}}',
  '{{CONSENT_MANAGER}}',
  '{{BACK_TO_TOP}}',
  '<script src="/js/theme.js" defer></script>',
  '<script src="/js/newsletter.js" defer></script>',
  '<script src="/js/ad-slots.js" defer></script>'
]);
contract((sourceTemplate.match(/<main\b/g) || []).length === 1, 'category template: expected one main landmark');
contract((sourceTemplate.match(/<h1\b/g) || []).length === 1, 'category template: expected one H1');
contract(!sourceTemplate.includes('/js/article-filters.js'), 'category template: must not require client-side article filtering');

requireFragments('featured category partial', featuredPartial, [
  'class="category-featured"',
  'Featured guide',
  '<h2 id="category-featured-title">Start with this guide</h2>',
  'href="/articles/{{ARTICLE_SLUG}}/"',
  'width="{{IMAGE_WIDTH}}"',
  'height="{{IMAGE_HEIGHT}}"',
  'alt="{{IMAGE_ALT}}"',
  '{{ARTICLE_EXCERPT}}',
  '{{PUBLISH_DATE_DISPLAY}}',
  'Read this guide'
]);
requireFragments('category ad partial', adPartial, [
  'aria-label="Advertisement"',
  'data-ad-slot="category-{{CATEGORY_SLUG}}-in-feed"',
  'data-ad-feature-enabled="{{AD_FEATURE_ENABLED}}"',
  'data-ad-consent="unknown"',
  'data-ad-provider="{{AD_PROVIDER}}"',
  'data-ad-unit-key="category_in_feed"',
  'data-ad-state="{{AD_INITIAL_STATE}}"',
  '{{AD_HIDDEN_ATTRIBUTE}}',
  '>Advertisement</p>',
  'data-ad-container'
]);
requireFragments('related category partial', relatedPartial, [
  'aria-labelledby="category-related-title"',
  '<h2 id="category-related-title">Related Legal Topics</h2>',
  '{{RELATED_CATEGORY_LINKS}}'
]);
requireFragments('category empty state', emptyPartial, [
  'No published guides yet',
  'No articles are published in this category yet. Browse all articles or subscribe for new Lawscope guides.',
  'href="/articles/"',
  'href="#newsletter-signup-title"'
]);

// Deterministic empty, one-entry, feature, ad, category-isolation, and pagination fixtures.
const fixtureCategory = categories.find((category) => category.slug === 'employment-law');
contract(Boolean(fixtureCategory), 'fixtures: Employment Law controlled category must exist');
const emptyModel = createCategoryPageModel(fixtureCategory, []);
contract(emptyModel.totalArticles === 0, 'empty fixture: total must be zero');
contract(emptyModel.pages.length === 1, 'empty fixture: canonical first page must still exist');
contract(emptyModel.pages[0].route === '/categories/employment-law/', 'empty fixture: canonical route mismatch');
contract(emptyModel.pages[0].visibleArticles.length === 0, 'empty fixture: no articles may be visible');

const singleFeaturedArticle = fixtureArticle(1, { featured: true });
const oneEntryModel = createCategoryPageModel(fixtureCategory, [singleFeaturedArticle]);
contract(oneEntryModel.featuredArticle === null, 'one-entry fixture: a lone article must not become a feature');
contract(oneEntryModel.pages[0].items.length === 1, 'one-entry fixture: one regular card must remain');
contract(selectCategoryFeaturedArticle([singleFeaturedArticle]) === null, 'featured selector: fewer than two entries must return null');

const featureArticles = [
  fixtureArticle(1, { day: 1 }),
  fixtureArticle(2, { day: 2, featured: true }),
  fixtureArticle(3, { day: 3 })
];
const featuredModel = createCategoryPageModel(fixtureCategory, featureArticles);
const featurePage = featuredModel.pages[0];
contract(featurePage.featuredArticle?.slug === featureArticles[1].slug, 'featured fixture: marked matching article must be selected');
contract(featurePage.items.length === 2 && featurePage.visibleArticles.length === 3, 'featured fixture: page capacity must include feature plus regular cards');
contract(!featurePage.items.some((article) => article.slug === featurePage.featuredArticle.slug), 'featured fixture: selected feature must be removed from regular feed');
contract(new Set(featurePage.visibleArticles.map((article) => article.slug)).size === 3, 'featured fixture: visible entries must not duplicate');

const sixItemSequence = createCategoryFeedSequence(
  Array.from({ length: CATEGORY_AD_INSERT_AFTER }, (_, index) => fixtureArticle(index + 1))
);
const sevenItemSequence = createCategoryFeedSequence(
  Array.from({ length: CATEGORY_AD_INSERT_AFTER + 1 }, (_, index) => fixtureArticle(index + 1))
);
contract(!sixItemSequence.some((entry) => entry.type === 'advertisement'), 'ad fixture: six cards must not trigger inventory');
contract(sevenItemSequence.filter((entry) => entry.type === 'advertisement').length === 1, 'ad fixture: seven cards must trigger exactly one slot');
contract(sevenItemSequence[CATEGORY_AD_INSERT_AFTER].type === 'advertisement', 'ad fixture: inventory must follow six cards');

const matchingFixtureArticles = Array.from({ length: 7 }, (_, index) => fixtureArticle(index + 1));
const foreignFixtureArticles = Array.from({ length: 4 }, (_, index) => fixtureArticle(index + 1, {
  category: 'criminal-law'
}));
const isolatedModel = createCategoryPageModel(
  fixtureCategory,
  [...foreignFixtureArticles, ...matchingFixtureArticles]
);
contract(isolatedModel.totalArticles === matchingFixtureArticles.length, 'isolation fixture: cross-category entries must be excluded');
contract(isolatedModel.pages.every((page) => page.visibleArticles.every((article) => article.category === fixtureCategory.slug)), 'isolation fixture: every visible article must exactly match the controlled slug');
assert.throws(
  () => createCategoryPagination('employment-law', [foreignFixtureArticles[0]]),
  /outside employment-law/,
  'category pagination must reject mixed-category input'
);
contractCount += 1;

const multiPageArticles = Array.from({ length: 20 }, (_, index) => fixtureArticle(index + 1, {
  featured: index === 14,
  day: index + 1
}));
const multiPageModel = createCategoryPageModel(fixtureCategory, multiPageArticles);
contract(CATEGORY_PAGE_SIZE === 9, 'pagination fixture: category page size must remain nine');
contract(multiPageModel.pages.length === 3, 'pagination fixture: 20 entries must produce three routes');
contract(multiPageModel.pages.map((page) => page.visibleArticles.length).join(',') === '9,9,2', 'pagination fixture: visible page capacities must be 9, 9, and 2');
contract(multiPageModel.pages.map((page) => page.items.length).join(',') === '8,9,2', 'pagination fixture: first-page feature must occupy one of nine positions');
contract(multiPageModel.pages[1].route === '/categories/employment-law/page/2/', 'pagination fixture: page-two clean route mismatch');
contract(multiPageModel.pages[2].previousRoute === '/categories/employment-law/page/2/', 'pagination fixture: page-three previous route mismatch');
contract(multiPageModel.pages[0].nextRoute === '/categories/employment-law/page/2/', 'pagination fixture: page-one next route mismatch');
const allVisibleFixtureSlugs = multiPageModel.pages.flatMap((page) => page.visibleArticles.map((article) => article.slug));
contract(allVisibleFixtureSlugs.length === 20 && new Set(allVisibleFixtureSlugs).size === 20, 'pagination fixture: all articles must appear exactly once');
for (const page of multiPageModel.pages) {
  const expectedOrder = [...page.items].sort(compareArticles).map((article) => article.slug);
  contract(page.items.map((article) => article.slug).join(',') === expectedOrder.join(','), `pagination fixture: regular feed page ${page.pageNumber} must remain newest first`);
}
contract(categoryPageRoute('employment-law', 1) === '/categories/employment-law/', 'route fixture: first-page route mismatch');
contract(categoryPageRoute('employment-law', 4) === '/categories/employment-law/page/4/', 'route fixture: paginated route mismatch');
assert.throws(() => categoryPageRoute('../employment-law'), /valid controlled slug/);
contractCount += 1;

const allCategoryFixturePages = createAllCategoryPages(categories, matchingFixtureArticles);
contract(allCategoryFixturePages.length === categories.length, 'all-category fixture: every controlled empty/few-entry route must be created');
contract(allCategoryFixturePages.every((page) => page.relatedCategories.length === 3), 'all-category fixture: every page must resolve three relationships');

// Controlled relationships and production manifest.
contract(categories.length === 10, `controlled categories: expected ten, received ${categories.length}`);
for (const category of categories) {
  contract(Array.isArray(category.related_categories) && category.related_categories.length === 3, `${category.slug}: expected exactly three relationships`);
  contract(new Set(category.related_categories).size === 3, `${category.slug}: relationships must be unique`);
  contract(!category.related_categories.includes(category.slug), `${category.slug}: self relationship is not allowed`);
  contract(category.related_categories.every((slug) => categories.some((candidate) => candidate.slug === slug)), `${category.slug}: related slugs must all be controlled`);
}
requireFragments('content relationship validation', graphScript, [
  'related_categories',
  'exactly three editorially related categories are required',
  'cannot relate to itself',
  'unknown related category'
]);
contract(manifest.categoryCount === 10, 'category manifest: category count must be ten');
contract(manifest.pageSize === 9, 'category manifest: page size must be nine');
contract(manifest.adInsertAfter === 6, 'category manifest: ad position must be six');
contract(manifest.canonicalStrategy === 'clean-category-page-routes', 'category manifest: canonical strategy mismatch');
contract(manifest.totalGeneratedRoutes === 10, 'category manifest: launch corpus must generate ten category routes');
contract(manifest.categories.length === 10, 'category manifest: ten category records required');

const metadataTitles = new Set();
const metadataDescriptions = new Set();
for (const category of categories) {
  const html = generatedPages.get(category.slug);
  const matchingArticles = publishedArticles
    .filter((article) => article.category === category.slug)
    .sort(compareArticles);
  const expectedSlugs = matchingArticles.map((article) => article.slug);
  const escapedName = escapeHtml(category.name);
  const escapedDescription = escapeHtml(category.description);
  const canonical = `https://getlawscope.com${category.route}`;
  const manifestCategory = manifest.categories.find((entry) => entry.slug === category.slug);

  contract(Boolean(html), `${category.slug}: generated page missing`);
  requireFragments(`generated ${category.slug}`, html, [
    `<title>${escapedName} Articles &amp; Guides | Lawscope</title>`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:type" content="website">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<h1>${escapedName}</h1>`,
    `class="fa-solid ${escapeHtml(category.icon)}"`,
    `<p class="category-page__description">${escapedDescription}</p>`,
    `${matchingArticles.length} published guide`,
    'aria-label="Jurisdiction reminder"',
    `<h2 id="category-library-title">Latest ${escapedName} Articles</h2>`,
    `<div\n            class="category-library__grid"`,
    '<h2 id="category-related-title">Related Legal Topics</h2>',
    `Keep Up with ${escapedName}`,
    '<footer class="site-footer" data-site-footer>',
    '<script src="/js/newsletter.js" defer></script>',
    '<script src="/js/ad-slots.js" defer></script>'
  ]);
  contract(!/{{[A-Z0-9_]+}}/.test(html), `${category.slug}: unresolved build placeholder found`);
  contract((html.match(/<main\b/g) || []).length === 1, `${category.slug}: expected one main landmark`);
  contract((html.match(/<h1\b/g) || []).length === 1, `${category.slug}: expected one H1`);
  contract(!html.includes('class="category-featured"'), `${category.slug}: one-entry launch state must not duplicate an article as featured`);
  contract(!html.includes(`data-ad-slot="category-${category.slug}-in-feed"`), `${category.slug}: short launch feed must omit in-feed inventory`);

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
  const descriptionMatch = html.match(/<meta name="description" content="([^"]+)">/);
  contract(Boolean(titleMatch), `${category.slug}: title metadata missing`);
  contract(Boolean(descriptionMatch), `${category.slug}: description metadata missing`);
  if (titleMatch) metadataTitles.add(unescapeHtml(titleMatch[1]));
  if (descriptionMatch) {
    const description = unescapeHtml(descriptionMatch[1]);
    metadataDescriptions.add(description);
    contract(description.length <= 155, `${category.slug}: metadata description exceeds 155 characters`);
  }

  const breadcrumbMatch = html.match(/<ol class="breadcrumb__list" role="list">([\s\S]*?)<\/ol>/);
  contract(Boolean(breadcrumbMatch), `${category.slug}: breadcrumb list missing`);
  if (breadcrumbMatch) {
    requireFragments(`${category.slug} breadcrumb`, breadcrumbMatch[1], [
      '<a href="/">Home</a>',
      '<a href="/categories/">Categories</a>',
      `<li class="breadcrumb__item" aria-current="page">${escapedName}</li>`
    ]);
  }

  const cardSlugs = [...html.matchAll(/<article class="article-card"[\s\S]*?<a[\s\S]*?href="\/articles\/([^/]+)\//g)]
    .map((match) => match[1]);
  contract(cardSlugs.join(',') === expectedSlugs.join(','), `${category.slug}: visible card slugs must exactly match newest-first category entries`);
  const foreignSlugs = publishedArticles
    .filter((article) => article.category !== category.slug)
    .map((article) => article.slug);
  contract(!foreignSlugs.some((slug) => html.includes(`/articles/${slug}/`)), `${category.slug}: cross-category article leak detected`);

  const relatedMatch = html.match(/<nav\s+class="category-related"[\s\S]*?<\/nav>/);
  contract(Boolean(relatedMatch), `${category.slug}: related-topic navigation missing`);
  if (relatedMatch) {
    const relatedSlugs = [...relatedMatch[0].matchAll(/href="\/categories\/([^/]+)\//g)]
      .map((match) => match[1]);
    contract(relatedSlugs.join(',') === category.related_categories.join(','), `${category.slug}: related links must match editorial order exactly`);
    contract(relatedSlugs.length === 3, `${category.slug}: expected exactly three related links`);
  }

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  contract(Boolean(jsonLdMatch), `${category.slug}: CollectionPage JSON-LD missing`);
  if (jsonLdMatch) {
    try {
      const schema = JSON.parse(jsonLdMatch[1]);
      contract(schema['@type'] === 'CollectionPage', `${category.slug} schema: expected CollectionPage`);
      contract(schema.url === canonical, `${category.slug} schema: canonical URL mismatch`);
      contract(schema.about?.name === category.name, `${category.slug} schema: controlled topic mismatch`);
      contract(schema.breadcrumb?.['@type'] === 'BreadcrumbList', `${category.slug} schema: breadcrumb missing`);
      contract(schema.breadcrumb?.itemListElement?.length === 3, `${category.slug} schema: first page needs three breadcrumb entries`);
      contract(schema.mainEntity?.['@type'] === 'ItemList', `${category.slug} schema: visible list must be ItemList`);
      contract(schema.mainEntity?.numberOfItems === matchingArticles.length, `${category.slug} schema: visible count mismatch`);
      const schemaSlugs = (schema.mainEntity?.itemListElement || []).map((entry) =>
        entry.item?.url?.match(/\/articles\/([^/]+)\//)?.[1]
      );
      contract(schemaSlugs.join(',') === expectedSlugs.join(','), `${category.slug} schema: article list mismatch`);
    } catch (error) {
      contract(false, `${category.slug}: invalid JSON-LD (${error.message})`);
    }
  }

  contract(Boolean(manifestCategory), `${category.slug}: manifest record missing`);
  if (manifestCategory) {
    contract(manifestCategory.route === category.route, `${category.slug}: manifest route mismatch`);
    contract(manifestCategory.totalArticles === matchingArticles.length, `${category.slug}: manifest total mismatch`);
    contract(manifestCategory.totalPages === 1, `${category.slug}: launch page count must be one`);
    contract(manifestCategory.relatedCategorySlugs.join(',') === category.related_categories.join(','), `${category.slug}: manifest relationships mismatch`);
    contract(manifestCategory.pages[0].visibleArticleSlugs.join(',') === expectedSlugs.join(','), `${category.slug}: manifest visible slugs mismatch`);
    contract(manifestCategory.pages[0].featuredArticleSlug === null, `${category.slug}: launch manifest must not promote a lone entry`);
    contract(manifestCategory.pages[0].containsInFeedAdInsertion === false, `${category.slug}: launch manifest must not insert inventory`);
  }
}
contract(metadataTitles.size === categories.length, 'metadata: every category title must be unique');
contract(metadataDescriptions.size === categories.length, 'metadata: every category description must be unique');

requireFragments('category responsive CSS', componentsCss, [
  '/* Module 20: individual category landing pages and crawlable category pagination. */',
  '.category-page__hero {',
  '.category-featured__card {',
  '.category-library__grid {',
  'grid-template-columns: minmax(var(--space-0), 1fr)',
  '@media (min-width: 48rem)',
  'grid-template-columns: repeat(2, minmax(var(--space-0), 1fr))',
  '@media (min-width: 64rem)',
  'grid-template-columns: repeat(3, minmax(var(--space-0), 1fr))',
  '.category-library__empty {',
  '.category-related__list {',
  'min-block-size: var(--size-touch-target)',
  '@media (prefers-reduced-motion: reduce)'
]);
requireFragments('category page builder', buildScript, [
  "from './category-pages.mjs'",
  "path.join(projectRoot, 'pages/category.html')",
  "path.join(projectRoot, 'pages/partials/category-featured-article.html')",
  "path.join(projectRoot, 'pages/partials/ad-slot-category-in-feed.html')",
  'createAllCategoryPages(categories, publishedArticles',
  'renderCategoryStructuredData(page, pageDescription)',
  'renderCategoryNewsletter(',
  "path.join(outputDirectory, 'data/category-pages.json')",
  'renderedCategoryPages.map'
]);
requireFragments('category helper', helperScript, [
  'export const CATEGORY_PAGE_SIZE = 9',
  'export const CATEGORY_AD_INSERT_AFTER = 6',
  'export function createCategoryFeedSequence',
  'export function createCategoryPagination',
  'export function createCategoryPageModel',
  'export function createAllCategoryPages',
  'article.category === category.slug',
  '.sort(compareArticles)'
]);
requireFragments('Module 20 documentation', documentation, [
  'Module 20',
  '/categories/{slug}/',
  '/categories/{slug}/page/{number}/',
  'exactly three unique related-category slugs',
  'nine visible articles',
  'No articles are published in this category yet.',
  'after six regular cards',
  'hidden at launch',
  'CollectionPage',
  'progressive enhancements',
  'generated/data/category-pages.json'
]);

if (problems.length > 0) {
  console.error('Individual Category Page validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Individual Category Page validation passed (${contractCount} contracts; ${categories.length} controlled routes checked).`);
console.log('Exact-category feeds, empty/few/featured/ad/pagination fixtures, relationships, metadata, schema, responsive layout, and launch gates are valid.');
