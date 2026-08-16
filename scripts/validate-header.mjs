import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const indexHtml = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
const componentsCss = await readFile(path.join(projectRoot, 'css/components.css'), 'utf8');
const headerJavaScript = await readFile(path.join(projectRoot, 'js/header.js'), 'utf8');
const problems = [];

const requiredHtmlFragments = [
  '<a class="skip-link" href="#main-content">',
  '<header class="site-header" data-site-header>',
  'aria-label="Primary navigation"',
  'aria-current="page"',
  'href="/articles/"',
  'href="/categories/"',
  'href="/about/"',
  'href="/contact/"',
  'aria-controls="primary-navigation"',
  'aria-controls="site-search-panel"',
  'aria-pressed="false"',
  'role="search"',
  'type="search"',
  'data-menu-close',
  'data-search-close',
  'data-search-clear',
  'cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css',
  'integrity="sha512-',
  '<script src="/js/header.js" defer></script>',
  '<main class="container region flow" id="main-content"'
];

for (const fragment of requiredHtmlFragments) {
  if (!indexHtml.includes(fragment)) {
    problems.push(`index.html: missing header contract: ${fragment}`);
  }
}

const primaryRoutes = ['/', '/articles/', '/categories/', '/about/', '/contact/'];
for (const route of primaryRoutes) {
  const escapedRoute = route.replaceAll('/', '\\/');
  const matches = indexHtml.match(new RegExp(`href="${escapedRoute}"`, 'g')) || [];
  if (matches.length === 0) problems.push(`index.html: primary route absent: ${route}`);
}

if ((indexHtml.match(/<main\b/g) || []).length !== 1) {
  problems.push('index.html: the preview must contain exactly one main landmark');
}

const requiredCssFragments = [
  '.skip-link',
  '.site-header__inner',
  '.site-header__logo',
  '.site-header__navigation-link[aria-current="page"]',
  '.site-header__control',
  'min-inline-size: var(--size-touch-target)',
  'min-block-size: var(--size-touch-target)',
  '.site-search__field',
  '.js-enabled .site-header__menu-toggle',
  '@media (min-width: 48rem)',
  '@media (prefers-reduced-motion: reduce)'
];

for (const fragment of requiredCssFragments) {
  if (!componentsCss.includes(fragment)) {
    problems.push(`css/components.css: missing responsive header contract: ${fragment}`);
  }
}

const requiredJavaScriptFragments = [
  "root.classList.add('js-enabled')",
  "event.key === 'Escape'",
  "event.key !== 'Tab'",
  "document.addEventListener('focusin'",
  'returnFocus: true',
  "setAttribute('aria-expanded'",
  'desktopQuery.addEventListener',
  'searchClear.hidden = searchField.value.length === 0'
];

for (const fragment of requiredJavaScriptFragments) {
  if (!headerJavaScript.includes(fragment)) {
    problems.push(`js/header.js: missing keyboard/control contract: ${fragment}`);
  }
}

for (const themeConcern of ['localStorage', 'data-theme-toggle', 'dataset.theme']) {
  if (headerJavaScript.includes(themeConcern)) {
    problems.push(`js/header.js: theme behavior must remain isolated in js/theme.js: ${themeConcern}`);
  }
}

if (problems.length > 0) {
  console.error('Header and navigation validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Header and navigation validation passed (${requiredHtmlFragments.length} HTML contracts checked).`);
console.log('Keyboard menu containment, focus return, Escape close, and 44-pixel targets are present.');
