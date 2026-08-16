import { cp, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPROVED_CATEGORIES, loadCategories } from './content-graph.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const problems = [];

const [sectionPartial, tilePartial, sourceIndex, buildSource, componentCss, mainCss, generatedHtml] =
  await Promise.all([
    readFile(path.join(projectRoot, 'pages/partials/home-categories.html'), 'utf8'),
    readFile(path.join(projectRoot, 'pages/partials/category-tile.html'), 'utf8'),
    readFile(path.join(projectRoot, 'index.html'), 'utf8'),
    readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
    readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
    readFile(path.join(projectRoot, 'css/main.css'), 'utf8'),
    readFile(path.join(projectRoot, 'generated/index.html'), 'utf8')
  ]);
const manifest = JSON.parse(
  await readFile(path.join(projectRoot, 'generated/data/home-selection.json'), 'utf8')
);

const sectionContracts = [
  '<section',
  'class="popular-categories"',
  'aria-labelledby="popular-categories-title"',
  'data-category-count="{{CATEGORY_COUNT}}"',
  '<h2 id="popular-categories-title">Explore Popular Legal Topics</h2>',
  'class="popular-categories__intro"',
  '<ul class="popular-categories__grid" role="list">',
  '{{CATEGORY_TILES}}'
];
for (const fragment of sectionContracts) {
  if (!sectionPartial.includes(fragment)) {
    problems.push(`home-categories.html: missing ${fragment}`);
  }
}
if (/<h1\b/.test(sectionPartial)) {
  problems.push('home-categories.html: the home category section must not add another H1');
}

const tileContracts = [
  '<li class="category-tile"',
  'data-category-slug="{{CATEGORY_SLUG}}"',
  'class="category-tile__link"',
  'href="/categories/{{CATEGORY_SLUG}}/"',
  'class="category-tile__icon" aria-hidden="true"',
  'class="fa-solid {{CATEGORY_ICON}}"',
  '<h3 class="category-tile__title">{{CATEGORY_NAME}}</h3>',
  '<p class="category-tile__description">{{CATEGORY_DESCRIPTION}}</p>',
  'class="category-tile__action" aria-hidden="true"'
];
for (const fragment of tileContracts) {
  if (!tilePartial.includes(fragment)) {
    problems.push(`category-tile.html: missing ${fragment}`);
  }
}
if ((tilePartial.match(/<a\b/g) || []).length !== 1) {
  problems.push('category-tile.html: each tile must expose one unambiguous linked surface');
}
if ((tilePartial.match(/<h3\b/g) || []).length !== 1 || /<h1\b|<h2\b/.test(tilePartial)) {
  problems.push('category-tile.html: each tile must contain one H3 and no H1/H2');
}
if (/aria-label=/.test(tilePartial)) {
  problems.push('category-tile.html: visible category names must label links without replacement ARIA text');
}

if (!sourceIndex.includes('{{HOME_CATEGORIES}}')) {
  problems.push('index.html: missing build-time HOME_CATEGORIES insertion point');
}
if (sourceIndex.indexOf('{{HOME_CATEGORIES}}') < sourceIndex.indexOf('{{HOME_LATEST}}')) {
  problems.push('index.html: Popular Categories must follow Latest Articles');
}

const buildContracts = [
  'loadCategories(projectRoot)',
  'renderCategoryTile(categoryTileTemplate, category)',
  "path.join(projectRoot, 'pages/partials/category-tile.html')",
  "path.join(projectRoot, 'pages/partials/home-categories.html')",
  'CATEGORY_COUNT: categories.length',
  'CATEGORY_TILES: categoryTilesMarkup',
  "{ rawKeys: ['CATEGORY_TILES'] }",
  "replace('{{HOME_CATEGORIES}}', categoriesSectionHtml)",
  'homeCategorySlugs: categories.map((category) => category.slug)',
  'homeCategoryCount: categories.length'
];
for (const fragment of buildContracts) {
  if (!buildSource.includes(fragment)) problems.push(`build.mjs: missing ${fragment}`);
}

const cssContracts = [
  '.popular-categories__grid',
  'grid-template-columns: minmax(var(--space-0), 1fr)',
  '@media (min-width: 30rem)',
  'grid-template-columns: repeat(2, minmax(var(--space-0), 1fr))',
  '@media (min-width: 48rem)',
  'grid-template-columns: repeat(3, minmax(var(--space-0), 1fr))',
  '@media (min-width: 64rem)',
  'grid-template-columns: repeat(5, minmax(var(--space-0), 1fr))',
  '.category-tile__link:focus-visible',
  'min-block-size: var(--size-full)',
  'inline-size: var(--size-touch-target)',
  'block-size: var(--size-touch-target)',
  'color: var(--color-text-primary)',
  'color: var(--color-text-secondary)',
  'color: var(--color-brand)',
  '@media (hover: hover) and (pointer: fine)',
  '@media (prefers-reduced-motion: reduce)'
];
for (const fragment of cssContracts) {
  if (!componentCss.includes(fragment)) problems.push(`components.css: missing ${fragment}`);
}

const categories = await loadCategories(projectRoot);
const expectedSlugs = APPROVED_CATEGORIES.map((category) => category.slug);
if (categories.length !== 10) {
  problems.push(`content: expected exactly ten categories, received ${categories.length}`);
}
if (JSON.stringify(categories.map((category) => category.slug)) !== JSON.stringify(expectedSlugs)) {
  problems.push('content: category order or approved slug set does not match the locked taxonomy');
}
for (const [index, category] of categories.entries()) {
  const approvedCategory = APPROVED_CATEGORIES[index];
  if (category.name !== approvedCategory.name) {
    problems.push(`content: ${category.slug} does not use its approved visible name`);
  }
  if (category.icon !== approvedCategory.icon) {
    problems.push(`content: ${category.slug} does not use its approved icon`);
  }
  if (category.route !== `/categories/${category.slug}/`) {
    problems.push(`content: ${category.slug} does not have a canonical category route`);
  }
  if (category.description.length < 100 || category.description.length > 260) {
    problems.push(`content: ${category.slug} description is outside the controlled range`);
  }
}

const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'lawscope-categories-'));
try {
  await cp(
    path.join(projectRoot, 'content/categories'),
    path.join(temporaryRoot, 'content/categories'),
    { recursive: true }
  );
  await unlink(path.join(temporaryRoot, 'content/categories/family-law.md'));
  let missingCategoryRejected = false;
  try {
    await loadCategories(temporaryRoot);
  } catch {
    missingCategoryRejected = true;
  }
  if (!missingCategoryRejected) {
    problems.push('collection fixture: a missing approved category was not rejected');
  }

  await cp(
    path.join(projectRoot, 'content/categories/family-law.md'),
    path.join(temporaryRoot, 'content/categories/family-law.md')
  );
  const criminalPath = path.join(temporaryRoot, 'content/categories/criminal-law.md');
  const criminalSource = await readFile(criminalPath, 'utf8');
  await writeFile(
    criminalPath,
    criminalSource.replace('icon: fa-scale-balanced', 'icon: fa-gavel'),
    'utf8'
  );
  let unapprovedIconRejected = false;
  try {
    await loadCategories(temporaryRoot);
  } catch {
    unapprovedIconRejected = true;
  }
  if (!unapprovedIconRejected) {
    problems.push('collection fixture: an unapproved icon was not rejected');
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

const generatedCategoriesSection = generatedHtml.match(
  /<section\s+class="popular-categories"[\s\S]*?<\/section>/
)?.[0] || '';
const generatedTiles = generatedCategoriesSection.match(
  /<li class="category-tile"[\s\S]*?<\/li>/g
) || [];
if (generatedTiles.length !== categories.length) {
  problems.push(
    `generated home: expected ${categories.length} category tiles, received ${generatedTiles.length}`
  );
}
if (!generatedCategoriesSection.includes('data-category-count="10"')) {
  problems.push('generated home: category count must equal the ten rendered entries');
}
if (!generatedCategoriesSection.includes('<h2 id="popular-categories-title">Explore Popular Legal Topics</h2>')) {
  problems.push('generated home: missing the approved Popular Categories heading');
}
if (generatedHtml.indexOf('class="popular-categories"') < generatedHtml.indexOf('class="latest-articles"')) {
  problems.push('generated home: Popular Categories appears before Latest Articles');
}

for (const [index, category] of categories.entries()) {
  const tile = generatedTiles[index] || '';
  for (const fragment of [
    `data-category-slug="${category.slug}"`,
    `href="/categories/${category.slug}/"`,
    `class="fa-solid ${category.icon}"`,
    `<h3 class="category-tile__title">${category.name.replace('&', '&amp;')}</h3>`,
    category.description,
    'class="category-tile__icon" aria-hidden="true"'
  ]) {
    if (!tile.includes(fragment)) {
      problems.push(`generated home: ${category.slug} is missing ${fragment}`);
    }
  }
  if ((tile.match(/<a\b/g) || []).length !== 1) {
    problems.push(`generated home: ${category.slug} must contain exactly one linked surface`);
  }
}

if (JSON.stringify(manifest.homeCategorySlugs) !== JSON.stringify(expectedSlugs)) {
  problems.push('manifest: home category slugs do not match the controlled collection order');
}
if (manifest.homeCategoryCount !== 10) {
  problems.push('manifest: home category count must be ten');
}

function readHexToken(css, tokenName) {
  const match = css.match(new RegExp(`--${tokenName}:\\s*(#[0-9a-fA-F]{6})`));
  return match?.[1] || null;
}

function relativeLuminance(hexColor) {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

const contrastPairs = [
  ['palette-light-primary-text', 'palette-light-white'],
  ['palette-light-secondary-text', 'palette-light-white'],
  ['palette-light-brand', 'palette-light-muted'],
  ['palette-light-link', 'palette-light-white'],
  ['palette-dark-primary-text', 'palette-dark-surface'],
  ['palette-dark-secondary-text', 'palette-dark-surface'],
  ['palette-dark-brand', 'palette-dark-alternate'],
  ['palette-dark-link', 'palette-dark-surface']
];
for (const [foregroundToken, backgroundToken] of contrastPairs) {
  const foreground = readHexToken(mainCss, foregroundToken);
  const background = readHexToken(mainCss, backgroundToken);
  if (!foreground || !background) {
    problems.push(`contrast: could not resolve ${foregroundToken} on ${backgroundToken}`);
  } else if (contrastRatio(foreground, background) < 4.5) {
    problems.push(`contrast: ${foregroundToken} on ${backgroundToken} is below WCAG AA`);
  }
}

if (problems.length > 0) {
  console.error('Popular Categories validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `Popular Categories validation passed (${sectionContracts.length + tileContracts.length + buildContracts.length + cssContracts.length} source contracts checked).`
);
console.log(
  'Rendered ten controlled, ordered category routes with visible names, decorative approved icons, linked surfaces, responsive 1/2/3/5-column layouts, and WCAG AA token contrast.'
);
