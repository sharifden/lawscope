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
const partialPath = path.join(projectRoot, 'pages/partials/home-hero.html');
const partial = await readFile(partialPath, 'utf8');
const indexHtml = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
const problems = [];

const requiredPartialFragments = [
  '<section',
  'class="home-hero"',
  'aria-labelledby="home-hero-title"',
  '<h1 class="home-hero__title" id="home-hero-title">{{HERO_TITLE}}</h1>',
  'href="/categories/{{CATEGORY_SLUG}}/"',
  '{{HERO_EXCERPT}}',
  '{{READING_TIME}} min read',
  '<time datetime="{{PUBLISH_DATE_ISO}}">',
  'Read the guide',
  'href="/articles/{{HERO_SLUG}}/"',
  'src="{{IMAGE_SOURCE}}"',
  'width="{{IMAGE_WIDTH}}"',
  'height="{{IMAGE_HEIGHT}}"',
  'alt="{{IMAGE_ALT}}"',
  'fetchpriority="high"'
];

for (const fragment of requiredPartialFragments) {
  if (!partial.includes(fragment)) problems.push(`home-hero.html: missing ${fragment}`);
}

if ((partial.match(/<h1\b/g) || []).length !== 1) {
  problems.push('home-hero.html: hero must contain exactly one H1');
}
if (partial.includes('loading="lazy"')) {
  problems.push('home-hero.html: the above-the-fold hero image must not be lazy loaded');
}
if (!indexHtml.includes('{{HOME_HERO}}')) {
  problems.push('index.html: missing build-time HOME_HERO insertion point');
}
if ((indexHtml.match(/<h1\b/g) || []).length !== 0) {
  problems.push('index.html: source shell must delegate its sole H1 to the generated hero');
}

const publishedArticles = await loadPublishedArticles(projectRoot);
const homeContent = selectHomeContent(publishedArticles);
const hero = homeContent.hero;
if (!hero) {
  problems.push('content: no eligible hero article');
} else {
  if (hero.readingTime !== 9) {
    problems.push(`content: expected derived preview reading time of 9, received ${hero.readingTime}`);
  }
  if (homeContent.featuredGridCandidates.some((article) => article.slug === hero.slug)) {
    problems.push('selection: hero slug appears in featured-grid candidates');
  }
  if (!homeContent.excludedFromFeaturedGrid.includes(hero.slug)) {
    problems.push('selection: hero slug is absent from the featured-grid exclusion list');
  }

  const imagePath = path.join(projectRoot, hero.featured_image.replace(/^\//, ''));
  const imageDimensions = await readJpegDimensions(imagePath);
  const imageStats = await stat(imagePath);
  if (imageDimensions.width !== 1600 || imageDimensions.height !== 900) {
    problems.push(
      `image: expected 1600x900, received ${imageDimensions.width}x${imageDimensions.height}`
    );
  }
  if (imageStats.size > 400_000) {
    problems.push(`image: ${imageStats.size} bytes exceeds the 400 KB hero target`);
  }
}

const fixtureArticles = [
  {
    title: 'Newest Unfeatured',
    slug: 'newest-unfeatured',
    publish_date: '2026-08-14T00:00:00Z',
    featured: false
  },
  {
    title: 'Older Featured',
    slug: 'older-featured',
    publish_date: '2026-08-13T00:00:00Z',
    featured: true
  },
  {
    title: 'Oldest Featured',
    slug: 'oldest-featured',
    publish_date: '2026-08-12T00:00:00Z',
    featured: true
  }
];
const explicitSelection = selectHomeContent(fixtureArticles);
if (explicitSelection.hero?.slug !== 'older-featured') {
  problems.push('selection test: newest explicitly featured article was not selected');
}
if (explicitSelection.featuredGridCandidates.some(
  (article) => article.slug === explicitSelection.hero?.slug
)) {
  problems.push('selection test: explicitly featured hero was not excluded from grid candidates');
}

const fallbackSelection = selectHomeContent(
  fixtureArticles.map((article) => ({ ...article, featured: false }))
);
if (
  fallbackSelection.hero?.slug !== 'newest-unfeatured' ||
  fallbackSelection.heroReason !== 'newest-published-fallback'
) {
  problems.push('selection test: newest-published fallback is not deterministic');
}

const tieSelection = selectHomeContent([
  {
    title: 'Zulu Guide',
    slug: 'zulu-guide',
    publish_date: '2026-08-14T00:00:00Z',
    featured: false
  },
  {
    title: 'Alpha Guide',
    slug: 'alpha-guide',
    publish_date: '2026-08-14T00:00:00Z',
    featured: false
  }
]);
if (tieSelection.hero?.slug !== 'alpha-guide') {
  problems.push('selection test: equal-date title tie-break is not deterministic');
}

if (problems.length > 0) {
  console.error('Home hero validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Home hero validation passed (${requiredPartialFragments.length} template contracts checked).`);
console.log('Hero fallback sorting, grid exclusion, derived reading time, image dimensions, and alt contract passed.');
