import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const indexHtml = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
const mainCss = await readFile(path.join(projectRoot, 'css/main.css'), 'utf8');
const problems = [];

const requiredHtmlFragments = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400',
  'family=Merriweather:wght@700;900',
  'amp;display=swap'
];

for (const fragment of requiredHtmlFragments) {
  if (!indexHtml.includes(fragment)) {
    problems.push(`index.html: missing Google Fonts configuration fragment: ${fragment}`);
  }
}

const requiredCssFragments = [
  '--font-family-heading',
  '--font-family-body',
  '--font-size-h1',
  '--font-size-h2',
  '--font-size-h3',
  '--font-size-h4',
  '--line-height-reading',
  '.text-lead',
  '.text-meta',
  '.text-caption',
  '.prose'
];

for (const fragment of requiredCssFragments) {
  if (!mainCss.includes(fragment)) {
    problems.push(`css/main.css: missing typography contract: ${fragment}`);
  }
}

const cssOutsideRoot = mainCss
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/:root\s*\{[^}]*\}/g, '');
const fontFamilyDeclarations = [
  ...cssOutsideRoot.matchAll(/font-family:\s*([^;]+);/gi)
];
const rawFontFamilies = fontFamilyDeclarations
  .map((match) => match[1].trim())
  .filter((value) => !value.startsWith('var('));

if (rawFontFamilies.length > 0) {
  problems.push(
    `css/main.css: raw font family outside :root (${rawFontFamilies.join(', ')})`
  );
}

if (indexHtml.includes('@import')) {
  problems.push('index.html: blocking CSS @import must not be used for fonts');
}

if (problems.length > 0) {
  console.error('Typography validation failed:');
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(`Typography validation passed (${requiredCssFragments.length} CSS contracts checked).`);
console.log('Google Fonts use preconnect hints and display=swap.');
