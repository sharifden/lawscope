import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const stylePaths = [
  'css/main.css',
  'css/dark-mode.css',
  'css/components.css'
];

function removeComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function removeRootBlocks(css) {
  return css.replace(/:root\s*\{[^}]*\}/g, '');
}

const problems = [];

for (const stylePath of stylePaths) {
  const source = await readFile(path.join(projectRoot, stylePath), 'utf8');
  const uncommentedSource = removeComments(source);
  const sourceOutsideDefaultRoot = removeRootBlocks(uncommentedSource);
  // CSS custom properties cannot be evaluated inside media-query conditions.
  // Breakpoint conditions mirror the documented :root reference tokens, so remove
  // only those conditions before checking declarations for component hardcoding.
  const sourceWithoutMediaConditions = sourceOutsideDefaultRoot.replace(
    /@media\s*\([^)]*\)/gi,
    '@media'
  );

  const rawColorsOutsideRoot = sourceWithoutMediaConditions.match(
    /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi
  );
  if (rawColorsOutsideRoot) {
    problems.push(
      `${stylePath}: raw colors outside :root (${rawColorsOutsideRoot.join(', ')})`
    );
  }

  const rawSpacingOutsideRoot = sourceWithoutMediaConditions.match(
    /:\s*-?\d*\.?\d+(?:px|rem)\b/g
  );
  if (rawSpacingOutsideRoot) {
    problems.push(
      `${stylePath}: raw px/rem values outside :root (${rawSpacingOutsideRoot.join(', ')})`
    );
  }
}

const mainCss = await readFile(path.join(projectRoot, 'css/main.css'), 'utf8');
const requiredTokens = [
  '--color-background',
  '--color-text-primary',
  '--color-brand',
  '--color-focus',
  '--font-family-heading',
  '--font-family-body',
  '--space-page-gutter',
  '--space-section',
  '--size-container',
  '--shadow-card',
  '--duration-standard'
];

for (const requiredToken of requiredTokens) {
  if (!mainCss.includes(requiredToken)) {
    problems.push(`css/main.css: missing required token ${requiredToken}`);
  }
}

if (problems.length > 0) {
  console.error('CSS validation failed:');
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(`CSS token validation passed (${requiredTokens.length} core tokens checked).`);
console.log('No raw colors or px/rem declarations detected outside the main :root token block.');
