import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadPublishedArticles,
  readJpegDimensions,
  selectHomeContent
} from './content-graph.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const problems = [];

const [cardPartial, sectionPartial, sourceIndex, buildSource, componentCss, generatedHtml] =
  await Promise.all([
    readFile(path.join(projectRoot, 'pages/partials/article-card.html'), 'utf8'),
    readFile(path.join(projectRoot, 'pages/partials/home-featured.html'), 'utf8'),
    readFile(path.join(projectRoot, 'index.html'), 'utf8'),
    readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
    readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
    readFile(path.join(projectRoot, 'generated/index.html'), 'utf8')
  ]);
const manifest = JSON.parse(
  await readFile(path.join(projectRoot, 'generated/data/home-selection.json'), 'utf8')
);

const cardContracts = [
  '<article class="article-card"',
  'data-article-slug="{{ARTICLE_SLUG}}"',
  'href="/categories/{{CATEGORY_SLUG}}/"',
  'href="/articles/{{ARTICLE_SLUG}}/"',
  '<h3 class="article-card__title"',
  '{{ARTICLE_TITLE}}',
  '{{ARTICLE_EXCERPT}}',
  'By {{AUTHOR}}',
  '{{READING_TIME}} min read',
  '<time datetime="{{PUBLISH_DATE_ISO}}">',
  'src="{{IMAGE_SOURCE}}"',
  'width="{{IMAGE_WIDTH}}"',
  'height="{{IMAGE_HEIGHT}}"',
  'alt="{{IMAGE_ALT}}"',
  'loading="lazy"',
  'decoding="async"',
  '<span>Read more</span>',
  '<span class="visually-hidden"> about {{ARTICLE_TITLE}}</span>'
];
for (const fragment of cardContracts) {
  if (!cardPartial.includes(fragment)) problems.push(`article-card.html: missing ${fragment}`);
}
if (/<article\b[^>]*\bhref=/.test(cardPartial)) {
  problems.push('article-card.html: the whole card must not be one large link');
}
if ((cardPartial.match(/<h3\b/g) || []).length !== 1 || /<h1\b|<h2\b/.test(cardPartial)) {
  problems.push('article-card.html: each reusable card must contain one H3 and no H1/H2');
}

const sectionContracts = [
  '<section',
  'class="featured-articles"',
  'aria-labelledby="featured-articles-title"',
  'data-featured-count="{{FEATURED_COUNT}}"',
  '<h2 id="featured-articles-title">Featured Legal Guides</h2>',
  'class="featured-articles__grid"',
  '{{FEATURED_CARDS}}'
];
for (const fragment of sectionContracts) {
  if (!sectionPartial.includes(fragment)) problems.push(`home-featured.html: missing ${fragment}`);
}
if (/<h1\b/.test(sectionPartial)) {
  problems.push('home-featured.html: the featured section must not introduce another H1');
}

if (!sourceIndex.includes('{{HOME_FEATURED}}')) {
  problems.push('index.html: missing build-time HOME_FEATURED insertion point');
}
if (sourceIndex.indexOf('{{HOME_FEATURED}}') < sourceIndex.indexOf('{{HOME_HERO}}')) {
  problems.push('index.html: featured articles must follow the home hero');
}
for (const fragment of [
  'homeContent.featuredGridCandidates.slice(0, 3)',
  "{ rawKeys: ['FEATURED_CARDS'] }",
  'featuredCardHtml.length > 0',
  'New featured guides are being prepared.',
  "replace('{{HOME_FEATURED}}', featuredSectionHtml)"
]) {
  if (!buildSource.includes(fragment)) problems.push(`build.mjs: missing ${fragment}`);
}

const cssContracts = [
  '.featured-articles__grid',
  'grid-template-columns: minmax(0, 1fr)',
  '@media (min-width: 48rem)',
  'grid-template-columns: repeat(2, minmax(0, 1fr))',
  '@media (min-width: 64rem)',
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
  '.article-card:focus-within',
  '@media (hover: hover) and (pointer: fine)',
  '@media (prefers-reduced-motion: reduce)',
  'aspect-ratio: var(--ratio-landscape)',
  'block-size: var(--size-full)'
];
for (const fragment of cssContracts) {
  if (!componentCss.includes(fragment)) problems.push(`components.css: missing ${fragment}`);
}

const publishedArticles = await loadPublishedArticles(projectRoot);
const homeContent = selectHomeContent(publishedArticles);
const expectedCards = homeContent.featuredGridCandidates.slice(0, 3);
if (!homeContent.hero) {
  problems.push('selection: no eligible hero is available');
}
if (expectedCards.length !== 3) {
  problems.push(`selection: expected three eligible non-hero featured entries, received ${expectedCards.length}`);
}
if (expectedCards.some((article) => article.slug === homeContent.hero?.slug)) {
  problems.push('selection: the hero was repeated in the displayed featured entries');
}
if (new Set(expectedCards.map((article) => article.slug)).size !== expectedCards.length) {
  problems.push('selection: duplicate featured card slugs were selected');
}

for (const article of expectedCards) {
  const imagePath = path.join(projectRoot, article.featured_image.replace(/^\//, ''));
  const [dimensions, imageStats] = await Promise.all([
    readJpegDimensions(imagePath),
    stat(imagePath)
  ]);
  if (dimensions.width !== 800 || dimensions.height !== 450) {
    problems.push(
      `image: ${article.slug} must be 800x450; received ${dimensions.width}x${dimensions.height}`
    );
  }
  if (imageStats.size > 180_000) {
    problems.push(`image: ${article.slug} exceeds the 180 KB featured-card target`);
  }
}

for (const eligibleCount of [1, 2, 3]) {
  const fixture = Array.from({ length: eligibleCount + 1 }, (_, index) => ({
    title: `Fixture ${index}`,
    slug: `fixture-${index}`,
    publish_date: new Date(Date.UTC(2026, 7, 14 - index)).toISOString(),
    featured: true
  }));
  const selection = selectHomeContent(fixture);
  if (selection.featuredGridCandidates.length !== eligibleCount) {
    problems.push(`selection fixture: expected ${eligibleCount} non-hero cards`);
  }
  if (selection.featuredGridCandidates.some((article) => article.slug === selection.hero?.slug)) {
    problems.push(`selection fixture: hero repeated with ${eligibleCount} available cards`);
  }
}

const generatedFeaturedSection = generatedHtml.match(
  /<section\s+class="featured-articles"[\s\S]*?<\/section>/
)?.[0] || '';
const generatedCards = generatedFeaturedSection.match(
  /<article class="article-card"[\s\S]*?<\/article>/g
) || [];
if (generatedCards.length !== expectedCards.length) {
  problems.push(
    `generated home: expected ${expectedCards.length} featured article cards, received ${generatedCards.length}`
  );
}
if ((generatedHtml.match(/<h1\b/g) || []).length !== 1) {
  problems.push('generated home: page must retain exactly one H1');
}
if (!generatedHtml.includes('<h2 id="featured-articles-title">Featured Legal Guides</h2>')) {
  problems.push('generated home: missing featured section H2');
}
if ((generatedCards.join('').match(/<h3\b/g) || []).length !== expectedCards.length) {
  problems.push('generated home: each article card must have one H3');
}
if ((generatedCards.join('').match(/loading="lazy"/g) || []).length !== expectedCards.length) {
  problems.push('generated home: every below-the-fold card image must be lazy loaded');
}
if (/{{[A-Z0-9_]+}}/.test(generatedHtml)) {
  problems.push('generated home: unresolved build placeholder found');
}

for (const [index, article] of expectedCards.entries()) {
  const card = generatedCards[index] || '';
  const publishDate = new Date(article.publish_date);
  if (!card.includes(`data-article-slug="${article.slug}"`)) {
    problems.push(`generated home: card ${index + 1} does not match ${article.slug}`);
  }
  for (const fragment of [
    `href="/categories/${article.category}/"`,
    article.title,
    article.excerpt,
    `By ${article.author}`,
    `${article.readingTime} min read`,
    `datetime="${publishDate.toISOString()}"`,
    `src="${article.featured_image}"`,
    'width="800"',
    'height="450"',
    `alt="${article.featured_image_alt}"`,
    'loading="lazy"'
  ]) {
    if (!card.includes(fragment)) {
      problems.push(`generated home: ${article.slug} is missing ${fragment}`);
    }
  }
  const articleHref = `href="/articles/${article.slug}/"`;
  if ((card.split(articleHref).length - 1) < 3) {
    problems.push(`generated home: ${article.slug} must expose separate image, title, and read-more links`);
  }
}

const expectedSlugs = expectedCards.map((article) => article.slug);
if (manifest.heroSlug !== homeContent.hero?.slug) {
  problems.push('manifest: hero slug does not match deterministic selection');
}
if (JSON.stringify(manifest.displayedFeaturedSlugs) !== JSON.stringify(expectedSlugs)) {
  problems.push('manifest: displayed featured slugs do not match rendered card order');
}
if (manifest.displayedFeaturedSlugs?.includes(manifest.heroSlug)) {
  problems.push('manifest: hero slug appears in displayed featured slugs');
}

if (problems.length > 0) {
  console.error('Featured articles validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `Featured articles validation passed (${cardContracts.length + sectionContracts.length + cssContracts.length} contracts checked).`
);
console.log(
  `Rendered ${expectedCards.length} unique, CMS-driven non-hero cards with intrinsic 16:9 images, truthful metadata, individual links, and responsive/fallback behavior.`
);
