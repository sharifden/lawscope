import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadSiteSettings,
  resolveActiveSocialProfiles
} from './site-settings.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

const [
  sourceIndex,
  generatedIndex,
  footerTemplate,
  buildScript,
  componentsCss,
  mainCss,
  manifestText,
  siteSettings
] = await Promise.all([
  readFile(path.join(projectRoot, 'index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/site-footer.html'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'css/main.css'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/home-selection.json'), 'utf8'),
  loadSiteSettings(projectRoot)
]);
const manifest = JSON.parse(manifestText);
let contractCount = 0;

function contract(condition, message) {
  assert.ok(condition, message);
  contractCount += 1;
}

function includesAll(haystack, needles, label) {
  for (const needle of needles) {
    contract(haystack.includes(needle), `${label} must include: ${needle}`);
  }
}

const categoryRecords = [
  ['criminal-law', 'Criminal Law'],
  ['family-law', 'Family Law'],
  ['business-law', 'Business Law'],
  ['employment-law', 'Employment Law'],
  ['personal-injury', 'Personal Injury'],
  ['real-estate-property-law', 'Real Estate &amp; Property Law'],
  ['immigration-law', 'Immigration Law'],
  ['consumer-law', 'Consumer Law'],
  ['civil-rights', 'Civil Rights'],
  ['legal-news-updates', 'Legal News &amp; Updates']
];
const primaryRoutes = ['/', '/articles/', '/categories/', '/about/', '/contact/'];
const policyRoutes = [
  '/privacy-policy/',
  '/legal-disclaimer/',
  '/editorial-policy/',
  '/contact/'
];
const approvedInternalRoutes = new Set([
  ...primaryRoutes,
  ...policyRoutes,
  ...categoryRecords.map(([slug]) => `/categories/${slug}/`)
]);

// Shared shell and source-template placement.
contract(
  sourceIndex.includes('{{SITE_FOOTER}}'),
  'Home source must use the shared footer build placeholder.'
);
contract(
  sourceIndex.indexOf('</main>') < sourceIndex.indexOf('{{SITE_FOOTER}}') &&
    sourceIndex.indexOf('{{SITE_FOOTER}}') < sourceIndex.indexOf('</body>'),
  'Footer placeholder must follow main content and precede the body close.'
);
includesAll(
  footerTemplate,
  [
    '<footer class="site-footer" data-site-footer>',
    'class="site-footer__main container"',
    '{{SITE_TITLE}}',
    '{{SITE_TAGLINE}}',
    'Lawscope publishes general legal information for educational purposes. It is not a law firm and does not provide legal advice.',
    '>Home<',
    '>Articles<',
    '>Categories<',
    '>About<',
    '>Contact<',
    '>Privacy Policy<',
    '>Legal Disclaimer<',
    '>Editorial Policy<',
    '{{FOOTER_CATEGORY_LINKS}}',
    '{{FOOTER_SOCIAL_SECTION}}',
    '&copy; {{CURRENT_YEAR}} {{SITE_TITLE}}. All rights reserved.',
    'aria-labelledby="footer-navigation-title"',
    'aria-labelledby="footer-categories-title"',
    'aria-labelledby="footer-policies-title"'
  ],
  'Footer partial'
);
contract(
  !/<a[^>]*href=["'][^"']*[#?][^"']*["']/i.test(footerTemplate),
  'Static footer routes must not use placeholder fragments or query strings.'
);

// Generated footer content and route integrity.
const footerMatches = generatedIndex.match(/<footer\b[\s\S]*?<\/footer>/g) || [];
contract(footerMatches.length === 1, 'Generated homepage must contain exactly one footer landmark.');
const footerHtml = footerMatches[0] || '';
contract(
  generatedIndex.indexOf('</main>') < generatedIndex.indexOf('<footer') &&
    generatedIndex.indexOf('</footer>') < generatedIndex.indexOf('</body>'),
  'Generated footer must remain outside main and inside body.'
);
includesAll(
  footerHtml,
  [
    'U.S. law, explained with clarity and care.',
    'Lawscope publishes general legal information for educational purposes.',
    'It is not a law firm and does not provide legal advice.',
    `&copy; ${new Date().getUTCFullYear()} Lawscope. All rights reserved.`,
    'href="/editorial-policy/">Editorial Policy</a>',
    'href="/legal-disclaimer/">Legal Disclaimer</a>',
    'href="/privacy-policy/">Privacy Policy</a>'
  ],
  'Generated footer'
);
contract(
  (footerHtml.match(/<nav\b/g) || []).length === 3,
  'Baseline footer must render primary, category, and policy navigation landmarks.'
);
contract(
  (footerHtml.match(/data-footer-categories/g) || []).length === 1,
  'Footer must contain one controlled category-link group.'
);
for (const [slug, escapedName] of categoryRecords) {
  contract(
    footerHtml.includes(`href="/categories/${slug}/">${escapedName}</a>`),
    `Footer must render the approved ${slug} category route and visible name.`
  );
}
for (const route of primaryRoutes) {
  contract(
    footerHtml.includes(`href="${route}"`),
    `Footer must include approved primary route ${route}.`
  );
}
for (const route of policyRoutes) {
  contract(
    footerHtml.includes(`href="${route}"`),
    `Footer must include approved policy route ${route}.`
  );
}
const footerHrefs = [...footerHtml.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(
  (match) => match[1]
);
contract(footerHrefs.length === 20, 'Baseline footer must render 20 intentional internal links.');
for (const href of footerHrefs) {
  contract(approvedInternalRoutes.has(href), `Footer link is outside the approved sitemap: ${href}`);
  contract(!href.includes('?') && !href.includes('#'), `Footer link must be a clean route: ${href}`);
}
contract(
  !footerHtml.includes('fa-brands') && !footerHtml.includes('site-footer__social'),
  'Inactive social profiles must hide the complete social group.'
);
contract(!/{{[A-Z0-9_]+}}/.test(generatedIndex), 'Generated homepage must not retain build tokens.');
const footerIds = [...footerHtml.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
contract(
  footerIds.length === new Set(footerIds).size,
  'Footer heading IDs must be unique for reliable accessible names.'
);

// Settings-driven social-profile safety and visibility.
contract(siteSettings.site_title === 'Lawscope', 'Footer site title must come from validated settings.');
contract(
  siteSettings.site_tagline === 'U.S. law, explained with clarity and care.',
  'Footer tagline must come from validated settings.'
);
contract(
  Object.values(siteSettings.social_profiles).every((url) => url === ''),
  'Committed social profile values must remain empty until active accounts are approved.'
);
contract(
  resolveActiveSocialProfiles(siteSettings).length === 0,
  'Empty social profile settings must resolve to no public links.'
);
const activeSettings = structuredClone(siteSettings);
activeSettings.social_profiles = {
  x: 'https://x.com/lawscope',
  facebook: 'https://www.facebook.com/lawscope',
  linkedin: 'https://www.linkedin.com/company/lawscope'
};
const activeProfiles = resolveActiveSocialProfiles(activeSettings);
contract(
  activeProfiles.map(({ key }) => key).join(',') === 'x,facebook,linkedin',
  'Active social profiles must preserve the approved X/Facebook/LinkedIn order.'
);
contract(
  activeProfiles.map(({ label }) => label).join('|') ===
    'Follow Lawscope on X|Follow Lawscope on Facebook|Follow Lawscope on LinkedIn',
  'Active social profiles must expose the approved accessible labels.'
);
contract(
  activeProfiles.every(({ url }) => url.startsWith('https://')),
  'Every resolved active social profile must use HTTPS.'
);
for (const [key, invalidUrl, expectedMessage] of [
  ['x', 'http://x.com/lawscope', /approved HTTPS/],
  ['facebook', 'https://example.com/lawscope', /approved HTTPS/],
  ['linkedin', 'https://www.linkedin.com/company/lawscope?tracking=1', /approved HTTPS/],
  ['x', 'https://x.com/lawscope#profile', /approved HTTPS/],
  ['facebook', 'https://www.facebook.com/', /approved HTTPS/]
]) {
  const invalidSettings = structuredClone(siteSettings);
  invalidSettings.social_profiles[key] = invalidUrl;
  assert.throws(
    () => resolveActiveSocialProfiles(invalidSettings),
    expectedMessage,
    `Invalid ${key} URL must fail validation.`
  );
  contractCount += 1;
}
const extraProfileSettings = structuredClone(siteSettings);
extraProfileSettings.social_profiles.instagram = 'https://www.instagram.com/lawscope';
assert.throws(
  () => resolveActiveSocialProfiles(extraProfileSettings),
  /unsupported social profile/,
  'Unsupported social profile keys must not appear without an approved implementation.'
);
contractCount += 1;
includesAll(
  buildScript,
  [
    'resolveActiveSocialProfiles',
    'activeSocialProfiles.length > 0',
    'aria-labelledby="footer-social-title"',
    'rel="me noreferrer"',
    'aria-label="${escapeHtml(profile.label)}"',
    '<span class="visually-hidden">${escapeHtml(profile.label)}</span>',
    "const footerYear = new Date().getUTCFullYear();",
    ".replace('{{SITE_FOOTER}}', footerHtml)"
  ],
  'Footer build integration'
);

// Manifest records public structure without duplicating public profile URLs.
contract(
  manifest.footer.copyrightYear === new Date().getUTCFullYear(),
  'Footer manifest must record the current UTC build year.'
);
contract(
  JSON.stringify(manifest.footer.primaryRoutes) === JSON.stringify(primaryRoutes),
  'Footer manifest primary routes must match the approved group.'
);
contract(
  JSON.stringify(manifest.footer.policyRoutes) === JSON.stringify(policyRoutes),
  'Footer manifest policy routes must match the approved group.'
);
contract(
  JSON.stringify(manifest.footer.categorySlugs) ===
    JSON.stringify(categoryRecords.map(([slug]) => slug)),
  'Footer manifest must record all ten controlled category slugs in order.'
);
contract(
  manifest.footer.activeSocialProfiles.length === 0,
  'Footer manifest must record no active baseline profiles.'
);
contract(
  !Object.hasOwn(manifest.footer, 'socialUrls'),
  'Footer manifest must not duplicate social profile URLs.'
);

// Mobile-first, tokenized, accessible layout contracts.
includesAll(
  componentsCss,
  [
    '/* Module 11: shared, settings-driven site footer. */',
    '.site-footer__main',
    'grid-template-columns: minmax(var(--space-0), 1fr)',
    '@media (min-width: 48rem)',
    'grid-template-columns: repeat(2, minmax(var(--space-0), 1fr))',
    '@media (min-width: 64rem)',
    'grid-template-columns: repeat(4, minmax(var(--space-0), 1fr))',
    '.site-footer__category-links',
    'grid-template-columns: repeat(2, minmax(var(--space-0), 1fr))',
    '.site-footer__links a',
    'min-block-size: var(--size-touch-target)',
    '.site-footer__social-links a',
    'inline-size: var(--size-touch-target)',
    'block-size: var(--size-touch-target)',
    '@media (prefers-reduced-motion: reduce)'
  ],
  'Footer CSS'
);
contract(
  mainCss.includes(':focus-visible') && mainCss.includes('outline: var(--size-focus-ring)'),
  'Footer links must inherit the project-wide visible focus treatment.'
);
const footerCss = componentsCss.slice(componentsCss.indexOf('/* Module 11:'));
contract(
  !/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i.test(footerCss),
  'Footer component styles must use semantic color tokens.'
);
contract(
  !/^\s*(?:width|height|margin|padding|gap|font-size):\s*[0-9.]+(?:px|rem)\b/m.test(footerCss),
  'Footer component dimensions must use shared design tokens.'
);

console.log(`Footer validation passed (${contractCount} contracts).`);
console.log(
  'Rendered validated brand, primary navigation, ten category routes, policy links, dynamic copyright, and settings-gated social profiles.'
);
