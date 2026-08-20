import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { APPROVED_CATEGORIES } from './content-graph.mjs';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

const requiredPaths = [
  '.env.example',
  '.gitignore',
  '.nvmrc',
  'Lawscope_Planning_and_Requirements.md',
  'README.md',
  'admin',
  'admin/index.html',
  'admin/config.yml',
  'admin/cms.js',
  'admin/cms-manual-init.js',
  'admin/cms-identity-init.js',
  'admin/cms-shell.css',
  'admin/cms-preview.css',
  'assets/icons',
  'assets/images',
  'content/articles',
  'content/categories',
  'css',
  'css/components.css',
  'css/dark-mode.css',
  'css/main.css',
  'docs',
  'index.html',
  'js',
  'netlify-companion/index.html',
  'netlify-companion/companion.css',
  'netlify-companion/identity-callback.js',
  'netlify-companion/robots.txt',
  'netlify.toml',
  'package.json',
  'pages',
  'robots.txt',
  'scripts/build.mjs',
  'scripts/seo.mjs',
  'scripts/sitemap-robots.mjs',
  'scripts/analytics.mjs',
  'scripts/advertising.mjs',
  'scripts/validate-seo.mjs',
  'scripts/validate-sitemap-robots.mjs',
  'scripts/validate-analytics.mjs',
  'scripts/validate-adsense.mjs',
  'scripts/cms-auth.mjs',
  'scripts/validate-cms-auth.mjs',
  'scripts/validate-final-qa.mjs',
  'scripts/validate-css.mjs',
  'scripts/validate-typography.mjs',
  'scripts/validate-header.mjs',
  'scripts/validate-hero.mjs',
  'scripts/validate-featured.mjs',
  'scripts/validate-ad-slot.mjs',
  'scripts/validate-latest.mjs',
  'scripts/validate-categories.mjs',
  'scripts/validate-newsletter.mjs',
  'scripts/validate-footer.mjs',
  'scripts/validate-theme.mjs',
  'scripts/validate-consent.mjs',
  'scripts/validate-back-to-top.mjs',
  'scripts/validate-scroll-reveal.mjs',
  'scripts/validate-search.mjs',
  'scripts/generate-search-index.mjs',
  'scripts/content-graph.mjs',
  'scripts/article-pages.mjs',
  'scripts/validate-article-pages.mjs',
  'scripts/trust-pages.mjs',
  'scripts/validate-trust-pages.mjs',
  'scripts/contact-page.mjs',
  'scripts/render-contact-page.mjs',
  'scripts/validate-contact-page.mjs',
  'scripts/privacy-policy.mjs',
  'scripts/render-privacy-policy.mjs',
  'scripts/validate-privacy-policy.mjs',
  'scripts/legal-disclaimer.mjs',
  'scripts/render-legal-disclaimer.mjs',
  'scripts/validate-legal-disclaimer.mjs',
  'scripts/not-found-page.mjs',
  'scripts/render-not-found-page.mjs',
  'scripts/validate-not-found-page.mjs',
  'scripts/validate-cms.mjs',
  'scripts/site-settings.mjs',
  'scripts/preview.mjs',
  'js/header.js',
  'js/deferred-styles.js',
  'js/theme.js',
  'js/consent.js',
  'js/analytics-config.js',
  'js/analytics.js',
  'js/adsense-config.js',
  'js/adsense.js',
  'js/back-to-top.js',
  'js/scroll-reveal.js',
  'js/search.js',
  'js/article-page.js',
  'js/contact-form-model.js',
  'js/contact-form.js',
  'api/contact.mjs',
  'api/cms-gateway.mjs',
  'api/cms-proxy/[...path].mjs',
  'middleware.js',
  'docs/header-navigation.md',
  'docs/home-hero.md',
  'docs/featured-articles.md',
  'docs/ad-slot-1.md',
  'docs/latest-articles.md',
  'docs/popular-categories.md',
  'docs/newsletter-signup.md',
  'docs/site-footer.md',
  'docs/dark-mode.md',
  'docs/consent-management.md',
  'docs/back-to-top.md',
  'docs/scroll-reveal.md',
  'docs/search.md',
  'docs/module-21-individual-article-page.md',
  'docs/module-22-about-lawscope.md',
  'docs/module-23-contact-page.md',
  'docs/module-24-privacy-policy.md',
  'docs/module-25-legal-disclaimer.md',
  'docs/module-26-404-error-page.md',
  'docs/module-27-netlify-cms-configuration.md',
  'docs/module-28-seo-implementation.md',
  'docs/module-29-sitemap-robots.md',
  'docs/module-30-google-analytics-ga4.md',
  'docs/module-31-google-adsense.md',
  'docs/module-32-netlify-identity-git-gateway.md',
  'docs/netlify-identity-git-gateway-feasibility.md',
  'docs/module-33-final-integration-qa-accessibility.md',
  'qa/module-33-acceptance.json',
  'docs/deployment-plan.md',
  'pages/404.html',
  'pages/article.html',
  'pages/about.html',
  'pages/contact.html',
  'pages/editorial-policy.html',
  'pages/privacy-policy.html',
  'pages/legal-disclaimer.html',
  'pages/partials/article-disclaimer.html',
  'pages/partials/ad-slot-article.html',
  'pages/partials/ad-slot-articles-in-feed.html',
  'pages/partials/ad-slot-categories-overview.html',
  'pages/partials/ad-slot-category-in-feed.html',
  'pages/partials/home-hero.html',
  'pages/partials/home-featured.html',
  'pages/partials/home-latest.html',
  'pages/partials/home-categories.html',
  'pages/partials/home-newsletter.html',
  'pages/partials/site-footer.html',
  'pages/partials/consent-manager.html',
  'pages/partials/back-to-top.html',
  'pages/partials/article-card.html',
  'pages/partials/category-tile.html',
  'pages/partials/ad-slot-horizontal.html',
  'content/settings/site.json',
  'content/settings/privacy-policy.json',
  'content/settings/legal-disclaimer.json',
  'js/ad-slots.js',
  'js/newsletter.js',
  ...APPROVED_CATEGORIES.map(({ slug }) => `content/categories/${slug}.md`),
  'content/articles/what-happens-after-an-arrest.md',
  'content/articles/at-will-employment-meaning-and-limits.md',
  'content/articles/security-deposits-common-rules.md',
  'content/articles/choosing-llc-or-corporation.md',
  'content/articles/child-custody-orders-common-factors.md',
  'content/articles/uscis-notices-types-and-response-basics.md',
  'content/articles/disputing-credit-report-errors.md',
  'content/articles/reasonable-accommodation-requests.md',
  'assets/images/what-happens-after-an-arrest-hero.jpg',
  'assets/images/at-will-employment-card.jpg',
  'assets/images/security-deposits-card.jpg',
  'assets/images/llc-versus-corporation-card.jpg',
  'assets/images/child-custody-orders-card.jpg',
  'assets/images/personal-injury-evidence-card.jpg',
  'assets/images/uscis-notices-card.jpg',
  'assets/images/credit-report-errors-card.jpg',
  'assets/images/accommodation-requests-card.jpg',
  'assets/images/reading-court-decisions-card.jpg',
  'assets/images/about-lawscope-editorial.jpg',
  'assets/images/lawscope-publisher-logo.png',
  'assets/images/social/lawscope-editorial-standards.jpg',
  'generated/404.html',
  'generated/robots.txt',
  'generated/sitemap.xml',
  'generated/data/seo-policy.json',
  'generated/data/sitemap-robots.json',
  'generated/data/analytics-manifest.json',
  'generated/data/advertising-manifest.json',
  'generated/js/analytics-config.js',
  'generated/js/analytics.js',
  'generated/js/adsense-config.js',
  'generated/js/adsense.js',
  'generated/data/not-found-page.json',
  'generated/admin/index.html',
  'generated/admin/config.yml',
  'generated/admin/cms.js',
  'generated/admin/cms-manual-init.js',
  'generated/admin/cms-identity-init.js',
  'generated/admin/cms-shell.css',
  'generated/data/cms-auth-manifest.json',
  'generated/admin/cms-preview.css',
  'vercel.json'
];

const missingPaths = [];

for (const requiredPath of requiredPaths) {
  try {
    await access(path.join(projectRoot, requiredPath));
  } catch {
    missingPaths.push(requiredPath);
  }
}

if (missingPaths.length > 0) {
  console.error('Missing required project paths:');
  for (const missingPath of missingPaths) {
    console.error(`- ${missingPath}`);
  }
  process.exit(1);
}

try {
  await access(path.join(projectRoot, '.env'));
  // Modern local dev uses .env for CMS_COMPANION_ORIGIN and Keystatic — allowed if gitignored
  const envContent = await readFile(path.join(projectRoot, '.env'), 'utf8');
  const hasSecret = /CONTACT_DELIVERY|GITHUB_TOKEN|NETLIFY_TOKEN|KEYSTATIC_GITHUB_TOKEN/.test(envContent);
  if (hasSecret) {
    console.error('A local .env file exists with secret values. Remove secrets before committing.');
    process.exit(1);
  }
  console.warn('Note: local .env file detected (allowed for CMS_COMPANION_ORIGIN/Keystatic dev). Ensure it is gitignored and contains no secrets.');
} catch {
  // Expected: local environment files are absent in the repository baseline — also fine.
}

const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, 'package.json'), 'utf8')
);
const dependencyNames = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {})
];
const prohibitedDependencies = [
  'bootstrap',
  'jquery',
  'tailwindcss',
  'vue'
];
let effectiveProhibited = [...prohibitedDependencies];
try {
  await access(path.join(projectRoot, 'keystatic.config.ts'));
  // Modern Keystatic stack legitimately uses React — allow it when modern CMS is present
} catch {
  effectiveProhibited.push('react');
}
const detectedProhibitedDependencies = dependencyNames.filter((dependency) =>
  effectiveProhibited.includes(dependency.toLowerCase())
);

if (detectedProhibitedDependencies.length > 0) {
  console.error(
    `Prohibited dependencies detected: ${detectedProhibitedDependencies.join(', ')}`
  );
  process.exit(1);
}

const gitignore = await readFile(path.join(projectRoot, '.gitignore'), 'utf8');
for (const requiredRule of ['.env', '.vercel/', 'generated/', 'node_modules/']) {
  if (!gitignore.includes(requiredRule)) {
    console.error(`.gitignore is missing required rule: ${requiredRule}`);
    process.exit(1);
  }
}

console.log(`Project structure valid (${requiredPaths.length} required paths checked).`);
console.log('No prohibited framework dependencies detected.');
console.log('No local .env file detected.');
