import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { APPROVED_CATEGORIES } from './content-graph.mjs';
import { fileURLToPath } from 'node:url';
import { loadCategories } from './content-graph.mjs';
import { loadSiteSettings } from './site-settings.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const problems = [];

const [
  sourceHtml,
  generatedHtml,
  overviewTile,
  homeTile,
  adPartial,
  componentsCss,
  buildScript,
  documentation,
  categories,
  settings
] = await Promise.all([
  readFile(path.join(projectRoot, 'pages/categories.html'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/categories/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/category-overview-tile.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/category-tile.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/ad-slot-categories-overview.html'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/categories-overview-page.md'), 'utf8'),
  loadCategories(projectRoot),
  loadSiteSettings(projectRoot)
]);

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) problems.push(`${label}: missing ${fragment}`);
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

function sentenceCount(value) {
  return value.trim().split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean).length;
}

requireFragments('pages/categories.html', sourceHtml, [
  '<title>{{PAGE_TITLE}}</title>',
  '<link rel="canonical" href="{{CANONICAL_URL}}">',
  '<meta property="og:type" content="website">',
  '<meta property="og:url" content="{{CANONICAL_URL}}">',
  '<meta name="twitter:card" content="summary_large_image">',
  '{{CATEGORIES_JSON_LD}}',
  'href="/categories/personal-injury/">Personal Injury</a>',
  '<main class="categories-page" id="main-content" tabindex="-1">',
  '<nav class="breadcrumb" aria-label="Breadcrumb">',
  '<li class="breadcrumb__item" aria-current="page">Categories</li>',
  '<h1>Explore Legal Topics</h1>',
  'Legal questions often cross more than one area of law.',
  'Federal rules may apply nationwide, but state and local law can change the answer.',
  'aria-label="Jurisdiction reminder"',
  'data-category-count="{{CATEGORY_COUNT}}"',
  '{{CATEGORY_TILES}}',
  '{{CATEGORIES_AD_SLOT}}',
  '<h2 id="category-guidance-title">Not sure where to start?</h2>',
  'Lawscope cannot evaluate personal cases or recommend',
  'a specific legal strategy.',
  '<a href="/contact/">contact Lawscope</a>',
  'href="/articles/">Browse all articles</a>',
  'href="/articles/#article-filter-keyword">',
  'Search Lawscope',
  '{{CATEGORIES_NEWSLETTER}}',
  '{{SITE_FOOTER}}',
  '{{CONSENT_MANAGER}}',
  '{{BACK_TO_TOP}}'
]);

if (sourceHtml.includes('/js/article-filters.js')) {
  problems.push('pages/categories.html: listing-filter JavaScript must not be loaded on the category directory');
}
if ((sourceHtml.match(/<main\b/g) || []).length !== 1) {
  problems.push('pages/categories.html: expected exactly one main landmark');
}
if ((sourceHtml.match(/<h1\b/g) || []).length !== 1) {
  problems.push('pages/categories.html: expected exactly one H1');
}

requireFragments('category-overview-tile.html', overviewTile, [
  '<li class="category-tile" data-category-slug="{{CATEGORY_SLUG}}">',
  'href="/categories/{{CATEGORY_SLUG}}/"',
  'class="fa-solid {{CATEGORY_ICON}}"',
  '<h3 class="category-tile__title">{{CATEGORY_NAME}}</h3>',
  '<p class="category-tile__description">{{CATEGORY_DESCRIPTION}}</p>',
  'Browse articles'
]);
if (!homeTile.includes('Explore topic') || homeTile.includes('Browse articles')) {
  problems.push('shared Home tile: its established Explore topic contract must remain separate');
}

requireFragments('categories ad partial', adPartial, [
  'aria-label="Advertisement"',
  'data-ad-slot="categories-overview-below-grid"',
  'data-ad-feature-enabled="{{AD_FEATURE_ENABLED}}"',
  'data-ad-consent="unknown"',
  'data-ad-provider="{{AD_PROVIDER}}"',
  'data-ad-unit-key="categories_overview"',
  'data-ad-state="{{AD_INITIAL_STATE}}"',
  '{{AD_HIDDEN_ATTRIBUTE}}',
  '>Advertisement</p>',
  'data-ad-container'
]);

if (categories.length !== APPROVED_CATEGORIES.length) {
  problems.push(
    `controlled categories: expected ${APPROVED_CATEGORIES.length} records, received ${categories.length}`
  );
}
const normalizedDescriptions = categories.map((category) => category.description.trim().toLowerCase());
if (new Set(normalizedDescriptions).size !== categories.length) {
  problems.push('controlled categories: every overview description must be unique');
}
for (const category of categories) {
  if (sentenceCount(category.description) !== 2) {
    problems.push(`${category.sourceFile}: overview description must contain exactly two sentences`);
  }
  if (category.route !== `/categories/${category.slug}/`) {
    problems.push(`${category.sourceFile}: canonical category route is incorrect`);
  }
}

const gridMatch = generatedHtml.match(
  /<ul class="category-directory__grid" role="list">([\s\S]*?)<\/ul>/
);
if (!gridMatch) {
  problems.push('generated categories page: category directory grid not found');
} else {
  const gridHtml = gridMatch[1];
  const tileCount = (gridHtml.match(/<li class="category-tile"/g) || []).length;
  if (tileCount !== categories.length) {
    problems.push(
      `generated categories page: expected ${categories.length} tiles, received ${tileCount}`
    );
  }
  if (gridHtml.includes('data-ad-slot=') || gridHtml.includes('>Advertisement</p>')) {
    problems.push('generated categories page: advertising inventory must never appear between category tiles');
  }

  let priorIndex = -1;
  for (const category of categories) {
    const slugMarker = `data-category-slug="${escapeHtml(category.slug)}"`;
    const tileIndex = gridHtml.indexOf(slugMarker);
    if (tileIndex === -1) {
      problems.push(`generated categories page: missing tile for ${category.slug}`);
      continue;
    }
    if (tileIndex <= priorIndex) {
      problems.push(`generated categories page: category order is not controlled at ${category.slug}`);
    }
    priorIndex = tileIndex;

    const nextTileIndex = gridHtml.indexOf('<li class="category-tile"', tileIndex + 1);
    const tileHtml = gridHtml.slice(tileIndex, nextTileIndex === -1 ? undefined : nextTileIndex);
    requireFragments(`generated ${category.slug} tile`, tileHtml, [
      `href="${escapeHtml(category.route)}"`,
      `class="fa-solid ${escapeHtml(category.icon)}"`,
      `<h3 class="category-tile__title">${escapeHtml(category.name)}</h3>`,
      `<p class="category-tile__description">${escapeHtml(category.description)}</p>`,
      'Browse articles'
    ]);
  }
}

requireFragments('generated categories page', generatedHtml, [
  '<meta name="description" content="Explore U.S. legal information by category, from criminal and family law to employment, consumer rights, and legal news.">',
  '<title>Legal Topics &amp; Categories | Lawscope</title>',
  '<link rel="canonical" href="https://getlawscope.com/categories/">',
  `data-category-count="${APPROVED_CATEGORIES.length}"`,
  'data-ad-slot="categories-overview-below-grid"',
  'data-ad-feature-enabled="false"',
  'data-ad-state="disabled"',
  '<section\n  class="newsletter-signup"',
  '<footer class="site-footer" data-site-footer>',
  '<script src="/js/newsletter.js" defer></script>',
  '<script src="/js/ad-slots.js" defer></script>',
  '<script src="/js/scroll-reveal.js" defer></script>'
]);
if (/{{[A-Z0-9_]+}}/.test(generatedHtml)) {
  problems.push('generated categories page: unresolved build placeholder found');
}
const adIndex = generatedHtml.indexOf('data-ad-slot="categories-overview-below-grid"');
const gridEndIndex = generatedHtml.indexOf('</ul>', generatedHtml.indexOf('category-directory__grid'));
const guidanceIndex = generatedHtml.indexOf('class="category-guidance"');
if (!(adIndex > gridEndIndex && guidanceIndex > adIndex)) {
  problems.push('generated categories page: optional advertising inventory must follow the complete grid and precede guidance');
}
const adOpeningStart = generatedHtml.lastIndexOf('<aside', adIndex);
const adOpeningEnd = generatedHtml.indexOf('>', adIndex);
const adOpeningTag = generatedHtml.slice(adOpeningStart, adOpeningEnd + 1);
if (!/\shidden(?:\s|>)/.test(adOpeningTag)) {
  problems.push('generated categories page: disabled launch advertising inventory must be hidden');
}
if (settings.advertising.enabled !== false) {
  problems.push('content/settings/site.json: advertising must remain disabled at launch');
}

const jsonLdMatch = generatedHtml.match(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
);
if (!jsonLdMatch) {
  problems.push('generated categories page: JSON-LD block not found');
} else {
  try {
    const schema = JSON.parse(jsonLdMatch[1]);
    if (schema['@type'] !== 'CollectionPage') problems.push('categories schema: expected CollectionPage');
    if (schema.url !== 'https://getlawscope.com/categories/') problems.push('categories schema: canonical URL mismatch');
    if (schema.name !== 'Explore Legal Topics') problems.push('categories schema: visible page name mismatch');
    if (schema.breadcrumb?.['@type'] !== 'BreadcrumbList') problems.push('categories schema: BreadcrumbList missing');
    if (schema.breadcrumb?.itemListElement?.length !== 2) problems.push('categories schema: expected two breadcrumb entries');
    if (schema.publisher?.name !== 'Lawscope') problems.push('categories schema: publisher reference missing');
    if (schema.mainEntity?.['@type'] !== 'ItemList') problems.push('categories schema: mainEntity must be an ItemList');
    if (schema.mainEntity?.numberOfItems !== categories.length) {
      problems.push(`categories schema: numberOfItems must be ${categories.length}`);
    }
    const schemaItems = schema.mainEntity?.itemListElement || [];
    if (schemaItems.length !== categories.length) {
      problems.push('categories schema: visible category list is incomplete');
    }
    categories.forEach((category, index) => {
      const item = schemaItems[index];
      if (
        item?.position !== index + 1 ||
        item?.name !== category.name ||
        item?.url !== `https://getlawscope.com${category.route}` ||
        item?.description !== category.description
      ) {
        problems.push(`categories schema: controlled item mismatch at ${category.slug}`);
      }
    });
  } catch (error) {
    problems.push(`generated categories page: invalid JSON-LD (${error.message})`);
  }
}

requireFragments('categories responsive CSS', componentsCss, [
  '/* Module 19: statically generated legal-topic directory and guidance panel. */',
  '.category-directory__grid {',
  'grid-template-columns: minmax(var(--space-0), 1fr)',
  '@media (min-width: 48rem)',
  'grid-template-columns: repeat(2, minmax(var(--space-0), 1fr))',
  '@media (min-width: 64rem)',
  'grid-template-columns: repeat(3, minmax(var(--space-0), 1fr))',
  '.category-directory__grid > :last-child:nth-child(3n + 1)',
  'grid-column: 2',
  '.category-guidance__actions',
  'minmax(var(--space-0), 1fr)'
]);

requireFragments('build.mjs', buildScript, [
  "path.join(projectRoot, 'pages/categories.html')",
  "path.join(projectRoot, 'pages/partials/category-overview-tile.html')",
  "path.join(projectRoot, 'pages/partials/ad-slot-categories-overview.html')",
  'renderCategoriesStructuredData(categories, categoriesSeo)',
  "outputPathForRoute('/categories/')",
  'categoryOverviewTilesHtml',
  'categoriesAdSlotHtml',
  'renderedCategoriesHtml'
]);

requireFragments('categories overview documentation', documentation, [
  'Module 19',
  '/categories/',
  'controlled category collection',
  'one column',
  'two columns',
  'three columns',
  'Browse articles',
  'after the complete grid',
  'hidden at launch',
  'CollectionPage',
  'progressive enhancement',
  'Module 20'
]);

if (problems.length > 0) {
  console.error('Categories Overview Page validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Categories Overview Page validation passed (${categories.length} controlled category tiles checked).`);
console.log('Routes, two-sentence descriptions, responsive grid, post-grid ad inventory, guidance, metadata, and CollectionPage schema are valid.');
