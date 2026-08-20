import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadPublishedArticles,
  readJpegDimensions,
  selectHomeContent,
  selectLatestArticles
} from './content-graph.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const problems = [];

const [partial, cardPartial, sourceIndex, buildSource, componentCss, generatedHtml] =
  await Promise.all([
    readFile(path.join(projectRoot, 'pages/partials/home-latest.html'), 'utf8'),
    readFile(path.join(projectRoot, 'pages/partials/article-card.html'), 'utf8'),
    readFile(path.join(projectRoot, 'index.html'), 'utf8'),
    readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
    readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
    readFile(path.join(projectRoot, 'generated/index.html'), 'utf8')
  ]);
const manifest = JSON.parse(
  await readFile(path.join(projectRoot, 'generated/data/home-selection.json'), 'utf8')
);

const partialContracts = [
  '<section',
  'class="latest-articles"',
  'aria-labelledby="latest-articles-title"',
  'data-latest-count="{{LATEST_COUNT}}"',
  '<h2 id="latest-articles-title">Latest Legal Guides</h2>',
  'class="latest-articles__grid"',
  '{{LATEST_CARDS}}',
  'class="latest-articles__actions"',
  'class="button button--secondary"',
  'href="/articles/"',
  '<span>View all law articles</span>'
];
for (const fragment of partialContracts) {
  if (!partial.includes(fragment)) problems.push(`home-latest.html: missing ${fragment}`);
}
if (/<h1\b/.test(partial)) {
  problems.push('home-latest.html: the latest section must not introduce another H1');
}
if (partial.indexOf('latest-articles__actions') < partial.indexOf('{{LATEST_CARDS}}')) {
  problems.push('home-latest.html: View all action must follow the complete latest grid');
}
if (!cardPartial.includes('class="article-card"')) {
  problems.push('article-card.html: shared Article Card partial is unavailable');
}

if (!sourceIndex.includes('{{HOME_LATEST}}')) {
  problems.push('index.html: missing build-time HOME_LATEST insertion point');
}
if (sourceIndex.indexOf('{{HOME_LATEST}}') < sourceIndex.indexOf('{{HOME_AD_SLOT_1}}')) {
  problems.push('index.html: Latest Articles must follow AdSense Slot 1 inventory');
}

const buildContracts = [
  'selectLatestArticles',
  'const latestExclusionSlugs = [',
  'hero.slug',
  '...featuredArticles.map((article) => article.slug)',
  'excludeSlugs: latestExclusionSlugs',
  'limit: 6',
  'renderArticleCard(articleCardTemplate, article)',
  'latestCardHtml.length > 0',
  'No legal guides are currently available.',
  "path.join(projectRoot, 'pages/partials/home-latest.html')",
  "{ rawKeys: ['LATEST_CARDS'] }",
  "replace('{{HOME_LATEST}}', latestSectionHtml)"
];
for (const fragment of buildContracts) {
  if (!buildSource.includes(fragment)) problems.push(`build.mjs: missing ${fragment}`);
}

const cssContracts = [
  '.latest-articles__grid',
  'grid-template-columns: minmax(var(--space-0), 1fr)',
  '@media (min-width: 48rem)',
  'grid-template-columns: repeat(2, minmax(var(--space-0), 1fr))',
  '@media (min-width: 64rem)',
  'grid-template-columns: repeat(3, minmax(var(--space-0), 1fr))',
  '.latest-articles__empty',
  '.latest-articles__actions',
  '.button--secondary',
  '.button--secondary:hover',
  '@media (prefers-reduced-motion: reduce)'
];
for (const fragment of cssContracts) {
  if (!componentCss.includes(fragment)) problems.push(`components.css: missing ${fragment}`);
}

const publishedArticles = await loadPublishedArticles(projectRoot);
const homeContent = selectHomeContent(publishedArticles);
const featuredArticles = homeContent.featuredGridCandidates.slice(0, 3);
const preferredExclusions = [
  homeContent.hero?.slug,
  ...featuredArticles.map((article) => article.slug)
].filter(Boolean);
const expectedArticles = selectLatestArticles(publishedArticles, {
  excludeSlugs: preferredExclusions,
  limit: 6
});
const expectedSlugs = expectedArticles.map((article) => article.slug);
const expectedLatestCount = Math.min(
  6,
  publishedArticles.length - preferredExclusions.length
);

if (expectedArticles.length !== expectedLatestCount) {
  problems.push(
    `selection: expected ${expectedLatestCount} latest entries, received ${expectedArticles.length}`
  );
}
if (new Set(expectedSlugs).size !== expectedSlugs.length) {
  problems.push('selection: latest entries contain duplicate slugs');
}
if (expectedSlugs.some((slug) => preferredExclusions.includes(slug))) {
  problems.push('selection: hero or displayed Featured Article repeated despite eligible alternatives');
}
for (let index = 1; index < expectedArticles.length; index += 1) {
  if (Date.parse(expectedArticles[index - 1].publish_date) < Date.parse(expectedArticles[index].publish_date)) {
    problems.push('selection: latest entries are not ordered newest first');
    break;
  }
}

for (const article of expectedArticles) {
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
    problems.push(`image: ${article.slug} exceeds the 180 KB latest-card target`);
  }
}

const sortingFixture = [
  { title: 'Zulu', slug: 'zulu', publish_date: '2026-08-14T09:00:00Z' },
  { title: 'Alpha', slug: 'alpha-z', publish_date: '2026-08-14T09:00:00Z' },
  { title: 'Alpha', slug: 'alpha-a', publish_date: '2026-08-14T09:00:00Z' },
  { title: 'Older', slug: 'older', publish_date: '2026-08-13T09:00:00Z' }
];
const sortedFixtureSlugs = selectLatestArticles(sortingFixture, { limit: 4 }).map(
  (article) => article.slug
);
if (JSON.stringify(sortedFixtureSlugs) !== JSON.stringify(['alpha-a', 'alpha-z', 'zulu', 'older'])) {
  problems.push('selection fixture: date/title/slug tie-breaking is not deterministic');
}

const exclusionFixture = Array.from({ length: 5 }, (_, index) => ({
  title: `Guide ${index}`,
  slug: `guide-${index}`,
  publish_date: new Date(Date.UTC(2026, 7, 14 - index)).toISOString()
}));
const preferredOnly = selectLatestArticles(exclusionFixture, {
  excludeSlugs: ['guide-0'],
  limit: 3
}).map((article) => article.slug);
if (JSON.stringify(preferredOnly) !== JSON.stringify(['guide-1', 'guide-2', 'guide-3'])) {
  problems.push('selection fixture: avoidable hero/featured duplication was not excluded');
}
const strictExclusion = selectLatestArticles(exclusionFixture, {
  excludeSlugs: ['guide-0', 'guide-1', 'guide-2', 'guide-3'],
  limit: 3
}).map((article) => article.slug);
if (JSON.stringify(strictExclusion) !== JSON.stringify(['guide-4'])) {
  problems.push('selection fixture: excluded hero/featured entries must never fill the latest grid');
}
if (selectLatestArticles([], { limit: 6 }).length !== 0) {
  problems.push('selection fixture: empty article input must produce an empty latest selection');
}
if (selectLatestArticles(exclusionFixture.slice(0, 2), { limit: 6 }).length !== 2) {
  problems.push('selection fixture: fewer than six published entries must render naturally');
}
let invalidLimitRejected = false;
try {
  selectLatestArticles(exclusionFixture, { limit: -1 });
} catch {
  invalidLimitRejected = true;
}
if (!invalidLimitRejected) {
  problems.push('selection fixture: invalid negative limits must be rejected');
}

const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'lawscope-latest-'));
try {
  const temporaryArticleDirectory = path.join(temporaryRoot, 'content/articles');
  await mkdir(temporaryArticleDirectory, { recursive: true });
  const fixtureSource = (slug, status, publishDate) => `---\ntitle: "${slug}"\nslug: ${slug}\npublish_date: ${publishDate}\nauthor: The GetLawscope Team\ncategory: legal-basics\ntags:\n  - Fixture\nfeatured: false\nstatus: ${status}\nfeatured_image: /assets/images/fixture.jpg\nfeatured_image_alt: "A descriptive fixture image used for validation."\nsocial_image: /assets/images/social/fixture.jpg\nexcerpt: "A concise validation fixture excerpt."\nmeta_description: "A bounded validation description for deterministic publication eligibility testing."\nsources:\n  - label: Official fixture source\n    url: https://example.gov/fixture\n---\n\n## Fixture body\n\nPublished content used to test deterministic eligibility rules.\n`;
  await Promise.all([
    writeFile(
      path.join(temporaryArticleDirectory, 'published.md'),
      fixtureSource('published', 'published', '2026-08-14T09:00:00Z')
    ),
    writeFile(
      path.join(temporaryArticleDirectory, 'draft.md'),
      fixtureSource('draft', 'draft', '2026-08-13T09:00:00Z')
    ),
    writeFile(
      path.join(temporaryArticleDirectory, 'future.md'),
      fixtureSource('future', 'published', '2026-08-16T09:00:00Z')
    )
  ]);
  const eligibleFixtureArticles = await loadPublishedArticles(
    temporaryRoot,
    new Date('2026-08-15T12:00:00Z')
  );
  if (
    eligibleFixtureArticles.length !== 1 ||
    eligibleFixtureArticles[0].slug !== 'published'
  ) {
    problems.push('eligibility fixture: drafts or future-dated entries were not excluded');
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

const generatedLatestSection = generatedHtml.match(
  /<section\s+class="latest-articles"[\s\S]*?<\/section>/
)?.[0] || '';
const generatedCards = generatedLatestSection.match(
  /<article class="article-card"[\s\S]*?<\/article>/g
) || [];
if (generatedCards.length !== expectedArticles.length) {
  problems.push(
    `generated home: expected ${expectedArticles.length} latest cards, received ${generatedCards.length}`
  );
}
if (!generatedLatestSection.includes(`data-latest-count="${expectedArticles.length}"`)) {
  problems.push('generated home: latest count does not match rendered cards');
}
if (!generatedLatestSection.includes('<h2 id="latest-articles-title">Latest Legal Guides</h2>')) {
  problems.push('generated home: missing Latest Legal Guides H2');
}
if ((generatedLatestSection.match(/<h3\b/g) || []).length !== expectedArticles.length) {
  problems.push('generated home: each latest Article Card must contain one H3');
}
if ((generatedLatestSection.match(/loading="lazy"/g) || []).length !== expectedArticles.length) {
  problems.push('generated home: every latest card image must be lazy loaded');
}
if (!generatedLatestSection.includes('class="button button--secondary" href="/articles/"')) {
  problems.push('generated home: View all law articles action is missing or incorrect');
}
if (
  generatedHtml.indexOf('class="latest-articles"') <
  generatedHtml.indexOf('data-ad-slot="home-below-featured"')
) {
  problems.push('generated home: Latest Articles appears before AdSense Slot 1');
}

for (const [index, article] of expectedArticles.entries()) {
  const card = generatedCards[index] || '';
  const publishDate = new Date(article.publish_date);
  if (!card.includes(`data-article-slug="${article.slug}"`)) {
    problems.push(`generated home: latest card ${index + 1} does not match ${article.slug}`);
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
}

if (JSON.stringify(manifest.latestArticleSlugs) !== JSON.stringify(expectedSlugs)) {
  problems.push('manifest: latest article slugs do not match rendered deterministic order');
}
if (JSON.stringify(manifest.latestPreferredExclusionSlugs) !== JSON.stringify(preferredExclusions)) {
  problems.push('manifest: latest preferred exclusions do not match hero/featured display');
}
if (!Array.isArray(manifest.latestRepeatedSlugs) || manifest.latestRepeatedSlugs.length !== 0) {
  problems.push('manifest: current latest selection should not repeat hero/featured entries');
}

if (problems.length > 0) {
  console.error('Latest Articles validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `Latest Articles validation passed (${partialContracts.length + buildContracts.length + cssContracts.length} source contracts checked).`
);
console.log(
  `Rendered ${expectedArticles.length} newest eligible non-duplicate cards in deterministic order; draft/future, tie-break, exclusion, empty, and fewer-entry fixtures passed.`
);
