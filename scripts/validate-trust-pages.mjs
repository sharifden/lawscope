import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJpegDimensions } from './content-graph.mjs';
import {
  ABOUT_PAGE,
  EDITORIAL_POLICY_PAGE,
  TRUST_PAGE_MODIFICATION_DATE,
  TRUST_PAGE_PUBLICATION_DATE,
  canonicalTrustPageUrl,
  resolveRobotsDirective
} from './trust-pages.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function textContent(value) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&rsquo;', '’')
    .replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJsonLd(html) {
  const matches = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
  ];
  assert.equal(matches.length, 1, 'A trust page must include exactly one JSON-LD block.');
  return JSON.parse(matches[0][1]);
}

function graphNode(schema, type) {
  return schema['@graph']?.find((node) => node['@type'] === type);
}

function assertCommonPageContracts(html, page, expectedH1, expectedRobotsDirective) {
  const canonicalUrl = canonicalTrustPageUrl(page.route);
  const socialImageUrl = canonicalTrustPageUrl(page.socialImage);

  assert.equal(countMatches(html, /<h1\b/g), 1, `${page.route} must have exactly one H1.`);
  assert.match(html, new RegExp(`<h1[^>]*>${expectedH1.replace('&', '&amp;')}</h1>`));
  assert.ok(html.includes('<header class="site-header" data-site-header>'));
  assert.ok(html.includes('id="main-content" tabindex="-1"'));
  assert.ok(html.includes('<footer class="site-footer" data-site-footer>'));
  assert.ok(html.includes('<nav class="breadcrumb" aria-label="Breadcrumb">'));
  assert.ok(html.includes('<a class="skip-link" href="#main-content">Skip to main content</a>'));
  assert.ok(html.includes(`<title>${page.title.replace('&', '&amp;')}</title>`));
  assert.ok(html.includes(`<meta name="description" content="${page.description}">`));
  assert.ok(page.description.length <= 155, `${page.key} description must not exceed 155 characters.`);
  assert.ok(html.includes(`<link rel="canonical" href="${canonicalUrl}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${canonicalUrl}">`));
  assert.ok(html.includes(`<meta property="og:image" content="${socialImageUrl}">`));
  assert.ok(html.includes('<meta property="og:image:width" content="1200">'));
  assert.ok(html.includes('<meta property="og:image:height" content="630">'));
  assert.ok(html.includes(`<meta property="og:image:alt" content="${page.socialImageAlt}">`));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.ok(html.includes(`<meta name="twitter:image" content="${socialImageUrl}">`));
  assert.ok(html.includes(`<meta name="twitter:image:alt" content="${page.socialImageAlt}">`));
  assert.ok(html.includes(`<meta name="robots" content="${expectedRobotsDirective}">`));
  assert.doesNotMatch(html, /{{[A-Z0-9_]+}}/);
  assert.doesNotMatch(html, /data-ad-|class="[^"]*\bad(?:-|__|\s)|>Advertisement</i);
  assert.doesNotMatch(html, /\/js\/ad-slots\.js/);

  const schema = extractJsonLd(html);
  const breadcrumb = graphNode(schema, 'BreadcrumbList');
  const organization = graphNode(schema, 'Organization');
  assert.ok(breadcrumb, `${page.route} needs BreadcrumbList structured data.`);
  assert.ok(organization, `${page.route} needs Organization structured data.`);
  assert.equal(organization.name, 'Lawscope');
  assert.equal(organization.url, 'https://getlawscope.com/');
  assert.equal(breadcrumb.itemListElement.at(-1).item, canonicalUrl);
  assert.doesNotMatch(JSON.stringify(schema), /"@type":"(?:Person|LegalService|Attorney)"/);

  return schema;
}

const requiredFiles = [
  'pages/about.html',
  'pages/editorial-policy.html',
  'scripts/trust-pages.mjs',
  'generated/about/index.html',
  'generated/editorial-policy/index.html',
  'generated/data/trust-pages.json',
  'assets/images/about-lawscope-editorial.jpg',
  'assets/images/social/lawscope-editorial-standards.jpg'
];
await Promise.all(requiredFiles.map((file) => access(path.join(projectRoot, file))));

assert.equal(resolveRobotsDirective('production'), 'index, follow');
assert.equal(resolveRobotsDirective('preview'), 'noindex, nofollow');
assert.equal(resolveRobotsDirective('development'), 'noindex, nofollow');

const [aboutHtml, policyHtml, footerTemplate, componentCss, buildSource, manifestText] =
  await Promise.all([
    readFile(path.join(projectRoot, 'generated/about/index.html'), 'utf8'),
    readFile(path.join(projectRoot, 'generated/editorial-policy/index.html'), 'utf8'),
    readFile(path.join(projectRoot, 'pages/partials/site-footer.html'), 'utf8'),
    readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
    readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
    readFile(path.join(projectRoot, 'generated/data/trust-pages.json'), 'utf8')
  ]);

assert.ok(footerTemplate.includes('<a href="/editorial-policy/">Editorial Policy</a>'));
assert.ok(buildSource.includes('resolveRobotsDirective(deploymentEnvironment)'));
assert.ok(buildSource.includes('renderedTrustPages'));
assert.ok(buildSource.includes("'data/trust-pages.json'"));

const manifest = JSON.parse(manifestText);
const aboutSchema = assertCommonPageContracts(
  aboutHtml,
  ABOUT_PAGE,
  'About Lawscope',
  manifest.robotsDirective
);
const aboutPageNode = graphNode(aboutSchema, 'AboutPage');
assert.ok(aboutPageNode, 'About must use AboutPage structured data.');
assert.equal(aboutPageNode.url, 'https://getlawscope.com/about/');
assert.equal(aboutPageNode.mainEntity['@id'], 'https://getlawscope.com/#organization');

const aboutText = textContent(aboutHtml);
for (const requiredText of [
  'Why Lawscope Exists',
  'Clarity',
  'Accuracy',
  'Boundaries',
  'How We Work',
  'Research',
  'Plain-English Editing',
  'Source Review',
  'Updates & Corrections',
  'What Lawscope Is—and Is Not',
  'Lawscope is an independent educational publication.',
  'It is not a law firm',
  'Our Editorial Standards',
  'The GetLawscope Team',
  'Lawscope will not display unverified credentials.',
  'Help Us Keep Information Accurate'
]) {
  assert.ok(aboutText.includes(requiredText), `About page is missing: ${requiredText}`);
}
assert.ok(aboutHtml.includes('href="/editorial-policy/"'));
assert.ok(aboutHtml.includes('href="/contact/">Report a correction'));
assert.ok(aboutHtml.includes('data-newsletter-section'));
assert.equal(countMatches(aboutHtml, /data-newsletter-form/g), 1);
assert.equal(countMatches(aboutHtml, /class="about-process__item"/g), 4);
assert.equal(countMatches(aboutHtml, /class="about-principles__item"/g), 3);
assert.match(
  aboutHtml,
  /<img[\s\S]*?src="\/assets\/images\/about-lawscope-editorial\.jpg"[\s\S]*?alt="[^"]+"[\s\S]*?>/
);
assert.doesNotMatch(aboutText, /\b(?:founder|J\.D\.|licensed attorney|years of legal experience)\b/i);

const policySchema = assertCommonPageContracts(
  policyHtml,
  EDITORIAL_POLICY_PAGE,
  'Editorial Policy',
  manifest.robotsDirective
);
const policyPageNode = graphNode(policySchema, 'WebPage');
assert.ok(policyPageNode, 'Editorial Policy must use WebPage structured data.');
assert.equal(policyPageNode.datePublished, TRUST_PAGE_PUBLICATION_DATE);
assert.equal(policyPageNode.dateModified, TRUST_PAGE_MODIFICATION_DATE);
assert.equal(policyPageNode.publisher['@id'], 'https://getlawscope.com/#organization');
assert.ok(policyHtml.includes(`<meta name="date" content="${TRUST_PAGE_PUBLICATION_DATE}">`));
assert.ok(policyHtml.includes(`<meta name="last-modified" content="${TRUST_PAGE_MODIFICATION_DATE}">`));
assert.equal(
  countMatches(policyHtml, new RegExp(`datetime="${TRUST_PAGE_PUBLICATION_DATE}"`, 'g')),
  3,
  'The initial policy date must be visible as effective, updated, and change-log dates.'
);
assert.doesNotMatch(policyHtml, /data-newsletter-|\/js\/newsletter\.js/);

const policyText = textContent(policyHtml);
for (const requiredText of [
  'Mission, Audience, and Scope',
  'Article Selection and Public Interest',
  'Primary Sources and Citation Standards',
  'Plain-English Writing and Jurisdiction',
  'Authorship, Contributors, and Reviewer Identification',
  'Legal Review',
  'Fact-Checking, Dates, and Updates',
  'Corrections Process',
  'Legal-News Standards',
  'Conflicts, Commercial Relationships, and Editorial Independence',
  'Advertisers do not select, assign, write, edit, review, approve, or suppress Lawscope editorial content.',
  'AI-Assisted Work',
  'responsible human editor',
  'fabricated or unverified citations are prohibited',
  'Confidential user material',
  'User Submissions and Privacy',
  'Accessibility and Inclusive Language',
  'Contact and Policy Changes',
  'Material revision record',
  'Initial publication of Lawscope’s Editorial Policy.'
]) {
  assert.ok(policyText.includes(requiredText), `Editorial Policy is missing: ${requiredText}`);
}

const tocHtml = policyHtml.match(/<nav class="policy-toc"[\s\S]*?<\/nav>/)?.[0] || '';
const tocHrefs = [...tocHtml.matchAll(/<a href="#([a-z0-9-]+)">/g)].map((match) => match[1]);
assert.equal(tocHrefs.length, 14, 'Editorial Policy TOC must link all 14 policy groups.');
for (const id of tocHrefs) {
  assert.equal(countMatches(policyHtml, new RegExp(`id="${id}"`, 'g')), 1, `TOC target #${id} must exist once.`);
}

assert.match(componentCss, /\.about-hero\s*\{[\s\S]*?display:\s*grid/);
assert.match(componentCss, /\.about-process__list\s*\{[\s\S]*?grid-template-columns:\s*minmax/);
assert.match(componentCss, /\.policy-document\s*\{[\s\S]*?max-inline-size:\s*var\(--size-legal-reading\)/);
assert.match(componentCss, /@media \(min-width: 48rem\)[\s\S]*?\.about-hero,[\s\S]*?grid-template-columns:\s*repeat\(2/);
assert.match(componentCss, /\.policy-toc__list a\s*\{[\s\S]*?min-block-size:\s*var\(--size-touch-target\)/);

const heroDimensions = await readJpegDimensions(
  path.join(projectRoot, 'assets/images/about-lawscope-editorial.jpg')
);
assert.equal(heroDimensions.width, 1376);
assert.equal(heroDimensions.height, 768);
const socialDimensions = await readJpegDimensions(
  path.join(projectRoot, 'assets/images/social/lawscope-editorial-standards.jpg')
);
assert.deepEqual(socialDimensions, { width: 1200, height: 630 });

assert.equal(manifest.module, 22);
assert.equal(manifest.robotsDirective, resolveRobotsDirective(manifest.deploymentEnvironment));
assert.equal(manifest.advertisingPolicy, 'omitted');
assert.equal(manifest.routes.length, 2);
assert.deepEqual(manifest.routes.map(({ route }) => route), ['/about/', '/editorial-policy/']);
assert.equal(manifest.routes.find(({ route }) => route === '/editorial-policy/').dated, true);

console.log('Module 22 trust-page validation passed.');
console.log('About: mission, principles, process, boundaries, identity, corrections, and newsletter verified.');
console.log('Editorial Policy: dates, linked TOC, required standards, ad-free output, production indexing contract, metadata, and schema verified.');
