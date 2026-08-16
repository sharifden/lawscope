import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const readProjectFile = (relativePath) =>
  readFile(path.join(projectRoot, relativePath), 'utf8');

const [
  sourceIndex,
  generatedIndex,
  themeJavaScript,
  headerJavaScript,
  mainCss,
  darkModeCss,
  componentsCss,
  darkModeDocumentation
] = await Promise.all([
  readProjectFile('index.html'),
  readProjectFile('generated/index.html'),
  readProjectFile('js/theme.js'),
  readProjectFile('js/header.js'),
  readProjectFile('css/main.css'),
  readProjectFile('css/dark-mode.css'),
  readProjectFile('css/components.css'),
  readProjectFile('docs/dark-mode.md')
]);

let contractCount = 0;

function contract(condition, message) {
  assert.ok(condition, message);
  contractCount += 1;
}

function includesAll(source, fragments, sourceName) {
  for (const fragment of fragments) {
    contract(source.includes(fragment), `${sourceName} must include: ${fragment}`);
  }
}

const initializerMatch = sourceIndex.match(
  /<script data-theme-initializer>([\s\S]*?)<\/script>/
);
contract(initializerMatch, 'index.html must contain the pre-paint theme initializer.');
const initializerJavaScript = initializerMatch[1];

contract(
  sourceIndex.indexOf('<script data-theme-initializer>') <
    sourceIndex.indexOf('<link rel="stylesheet"'),
  'The theme initializer must execute before any stylesheet request.'
);
contract(
  sourceIndex.indexOf('<script src="/js/theme.js" defer></script>') <
    sourceIndex.indexOf('<script src="/js/header.js" defer></script>'),
  'The deferred theme controller must run before the header reveals its controls.'
);
contract(
  generatedIndex.indexOf('<script data-theme-initializer>') <
    generatedIndex.indexOf('<link rel="stylesheet"'),
  'The generated page must preserve pre-paint initializer ordering.'
);
contract(
  generatedIndex.includes('<script src="/js/theme.js" defer></script>'),
  'The generated page must load the deferred theme controller.'
);

includesAll(
  sourceIndex,
  [
    "const storageKey = 'lawscope-theme'",
    "storedTheme === 'light' || storedTheme === 'dark'",
    "'(prefers-color-scheme: dark)'",
    'document.documentElement.dataset.theme = resolvedTheme',
    'data-theme-toggle',
    'aria-pressed="false"',
    'aria-label="Switch to dark mode"',
    'data-theme-icon',
    'data-theme-label'
  ],
  'index.html'
);

includesAll(
  themeJavaScript,
  [
    "const storageKey = 'lawscope-theme'",
    "new Set(['light', 'dark'])",
    'window.localStorage.getItem(storageKey)',
    'window.localStorage.setItem(storageKey, theme)',
    "window.matchMedia('(prefers-color-scheme: dark)')",
    "themeToggle?.addEventListener('click'",
    "themeToggle.setAttribute('aria-pressed', String(isDark))",
    "themeToggle.setAttribute('aria-label', accessibleLabel)",
    "isDark ? 'Switch to light mode' : 'Switch to dark mode'",
    "isDark ? 'Light mode' : 'Dark mode'",
    "themeIcon?.classList.toggle('fa-moon', !isDark)",
    "themeIcon?.classList.toggle('fa-sun', isDark)",
    "systemDarkQuery.addEventListener('change'",
    "window.addEventListener('storage'",
    "readStoredTheme() === null",
    "root.classList.add('theme-transition')",
    "getPropertyValue('--duration-standard')",
    'applyTheme(resolveTheme())',
    "root.classList.add('theme-enabled')"
  ],
  'js/theme.js'
);

for (const prohibitedConcern of [
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon',
  'document.cookie',
  'location.href'
]) {
  contract(
    !themeJavaScript.includes(prohibitedConcern),
    `Theme preference logic must not transmit or expose data: ${prohibitedConcern}`
  );
}

for (const isolatedThemeConcern of ['localStorage', 'data-theme-toggle', 'dataset.theme']) {
  contract(
    !headerJavaScript.includes(isolatedThemeConcern),
    `js/header.js must not duplicate theme ownership: ${isolatedThemeConcern}`
  );
}

const semanticThemeTokens = [
  '--color-background',
  '--color-background-alternate',
  '--color-surface',
  '--color-surface-muted',
  '--color-surface-raised',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-muted',
  '--color-brand',
  '--color-brand-hover',
  '--color-on-brand',
  '--color-link',
  '--color-link-hover',
  '--color-focus',
  '--color-border',
  '--color-border-strong',
  '--color-success',
  '--color-success-surface',
  '--color-error',
  '--color-error-surface',
  '--color-disclaimer-border',
  '--color-disclaimer-surface',
  '--color-disclaimer-text',
  '--color-ad-surface',
  '--color-overlay',
  '--shadow-color',
  '--shadow-color-strong'
];

for (const token of semanticThemeTokens) {
  const occurrences = darkModeCss.match(new RegExp(`${token.replaceAll('-', '\\-')}:`, 'g')) || [];
  contract(
    occurrences.length === 2,
    `Dark mapping and no-JavaScript system fallback must both define ${token}.`
  );
}

includesAll(
  darkModeCss,
  [
    ':root[data-theme="dark"]',
    ':root[data-theme="light"]',
    'color-scheme: dark',
    'color-scheme: light',
    '@media (prefers-color-scheme: dark)',
    ':root:not([data-theme="light"])',
    ':root.theme-transition',
    'transition-property: background-color, border-color, box-shadow, color, fill, stroke',
    'transition-duration: var(--duration-standard)',
    'transition-timing-function: var(--easing-standard)',
    '@media (prefers-reduced-motion: reduce)',
    'transition: none !important'
  ],
  'css/dark-mode.css'
);

contract(
  componentsCss.includes('.theme-enabled .site-header__theme-toggle'),
  'The theme toggle must remain hidden until its dedicated controller initializes.'
);
contract(
  !componentsCss.includes('[data-theme='),
  'Components must consume semantic tokens instead of component-specific theme overrides.'
);

includesAll(
  darkModeDocumentation,
  [
    'explicit valid `lawscope-theme` value',
    'operating-system',
    'Light mode',
    'before stylesheet requests',
    'Storage access is wrapped',
    '`aria-pressed`',
    '`storage` event',
    '`prefers-reduced-motion: reduce`',
    'WCAG AA 4.5:1',
    '3:1'
  ],
  'docs/dark-mode.md'
);

function extractHexTokens(css) {
  return new Map(
    [...css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(
      ([, token, value]) => [token, value.toLowerCase()]
    )
  );
}

function relativeLuminance(hexColor) {
  const channels = [1, 3, 5].map((index) =>
    Number.parseInt(hexColor.slice(index, index + 2), 16) / 255
  );
  const linearChannels = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  );
  return (
    0.2126 * linearChannels[0] +
    0.7152 * linearChannels[1] +
    0.0722 * linearChannels[2]
  );
}

function contrastRatio(firstColor, secondColor) {
  const firstLuminance = relativeLuminance(firstColor);
  const secondLuminance = relativeLuminance(secondColor);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

const palette = extractHexTokens(mainCss);
const contrastPairs = [
  ['light primary text/page', '--palette-light-primary-text', '--palette-light-page', 4.5],
  ['light secondary text/page', '--palette-light-secondary-text', '--palette-light-page', 4.5],
  ['light muted text/page', '--palette-light-muted-text', '--palette-light-page', 4.5],
  ['light muted text/alternate', '--palette-light-muted-text', '--palette-light-alternate', 4.5],
  ['light brand/page', '--palette-light-brand', '--palette-light-page', 4.5],
  ['light brand/muted surface', '--palette-light-brand', '--palette-light-muted', 4.5],
  ['light brand hover/page', '--palette-light-brand-hover', '--palette-light-page', 4.5],
  ['light link/page', '--palette-light-link', '--palette-light-page', 4.5],
  ['light link hover/page', '--palette-light-link-hover', '--palette-light-page', 4.5],
  ['light on-brand/brand', '--palette-light-white', '--palette-light-brand', 4.5],
  ['light on-brand/brand hover', '--palette-light-white', '--palette-light-brand-hover', 4.5],
  ['light success/status surface', '--palette-light-success', '--palette-light-success-surface', 4.5],
  ['light error/status surface', '--palette-light-error', '--palette-light-error-surface', 4.5],
  ['light disclaimer text/surface', '--palette-light-disclaimer-text', '--palette-light-disclaimer-surface', 4.5],
  ['light focus/page', '--palette-light-focus', '--palette-light-page', 3],
  ['light strong border/control', '--palette-light-border-strong', '--palette-light-white', 3],
  ['dark primary text/page', '--palette-dark-primary-text', '--palette-dark-page', 4.5],
  ['dark primary text/surface', '--palette-dark-primary-text', '--palette-dark-surface', 4.5],
  ['dark primary text/raised', '--palette-dark-primary-text', '--palette-dark-raised', 4.5],
  ['dark secondary text/page', '--palette-dark-secondary-text', '--palette-dark-page', 4.5],
  ['dark secondary text/alternate', '--palette-dark-secondary-text', '--palette-dark-alternate', 4.5],
  ['dark secondary text/surface', '--palette-dark-secondary-text', '--palette-dark-surface', 4.5],
  ['dark muted text/page', '--palette-dark-muted-text', '--palette-dark-page', 4.5],
  ['dark muted text/alternate', '--palette-dark-muted-text', '--palette-dark-alternate', 4.5],
  ['dark muted text/surface', '--palette-dark-muted-text', '--palette-dark-surface', 4.5],
  ['dark brand/page', '--palette-dark-brand', '--palette-dark-page', 4.5],
  ['dark brand/alternate', '--palette-dark-brand', '--palette-dark-alternate', 4.5],
  ['dark brand/surface', '--palette-dark-brand', '--palette-dark-surface', 4.5],
  ['dark brand hover/page', '--palette-dark-brand-hover', '--palette-dark-page', 4.5],
  ['dark link/page', '--palette-dark-link', '--palette-dark-page', 4.5],
  ['dark link hover/page', '--palette-dark-link-hover', '--palette-dark-page', 4.5],
  ['dark on-brand/brand', '--palette-dark-on-brand', '--palette-dark-brand', 4.5],
  ['dark on-brand/brand hover', '--palette-dark-on-brand', '--palette-dark-brand-hover', 4.5],
  ['dark success/status surface', '--palette-dark-success', '--palette-dark-success-surface', 4.5],
  ['dark error/status surface', '--palette-dark-error', '--palette-dark-error-surface', 4.5],
  ['dark disclaimer text/surface', '--palette-dark-disclaimer-text', '--palette-dark-disclaimer-surface', 4.5],
  ['dark focus/page', '--palette-dark-focus', '--palette-dark-page', 3],
  ['dark strong border/page control', '--palette-dark-border-strong', '--palette-dark-page', 3],
  ['dark strong border/surface control', '--palette-dark-border-strong', '--palette-dark-surface', 3]
];

for (const [label, foregroundToken, backgroundToken, minimumRatio] of contrastPairs) {
  const foreground = palette.get(foregroundToken);
  const background = palette.get(backgroundToken);
  contract(foreground && background, `${label}: both palette tokens must exist.`);
  const ratio = contrastRatio(foreground, background);
  contract(
    ratio >= minimumRatio,
    `${label}: ${ratio.toFixed(2)}:1 is below ${minimumRatio}:1.`
  );
}

function createClassList(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
    toggle(name, force) {
      const shouldAdd = force === undefined ? !classes.has(name) : force;
      if (shouldAdd) classes.add(name);
      else classes.delete(name);
      return shouldAdd;
    }
  };
}

function runInitializer({ storedTheme = null, storageThrows = false, systemDark = false }) {
  const root = { dataset: {} };
  let setCalls = 0;
  const context = {
    document: { documentElement: root },
    window: {
      localStorage: {
        getItem() {
          if (storageThrows) throw new Error('Storage blocked');
          return storedTheme;
        },
        setItem() {
          setCalls += 1;
        }
      },
      matchMedia: () => ({ matches: systemDark })
    }
  };
  vm.runInNewContext(initializerJavaScript, context);
  return { theme: root.dataset.theme, setCalls };
}

const initializerFixtures = [
  ['stored dark overrides light system', { storedTheme: 'dark', systemDark: false }, 'dark'],
  ['stored light overrides dark system', { storedTheme: 'light', systemDark: true }, 'light'],
  ['dark system is the no-choice fallback', { systemDark: true }, 'dark'],
  ['light is the final fallback', { systemDark: false }, 'light'],
  ['invalid storage falls back to system', { storedTheme: 'sepia', systemDark: true }, 'dark'],
  ['blocked storage falls back to system', { storageThrows: true, systemDark: true }, 'dark']
];

for (const [label, fixture, expectedTheme] of initializerFixtures) {
  const result = runInitializer(fixture);
  contract(result.theme === expectedTheme, `${label}: expected ${expectedTheme}.`);
  contract(result.setCalls === 0, `${label}: pre-paint resolution must not write storage.`);
}

function createControllerHarness({ storedTheme = null, systemDark = false, storageThrows = false } = {}) {
  const root = {
    dataset: {},
    classList: createClassList(),
    getBoundingClientRect: () => ({ width: 0, height: 0 })
  };
  const icon = { classList: createClassList(['fa-regular', 'fa-moon']) };
  const label = { textContent: 'Dark mode' };
  const attributes = new Map();
  const toggleListeners = new Map();
  const toggle = {
    querySelector(selector) {
      if (selector === '[data-theme-icon]') return icon;
      if (selector === '[data-theme-label]') return label;
      return null;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    addEventListener(type, listener) {
      toggleListeners.set(type, listener);
    }
  };
  const mediaListeners = new Map();
  const mediaQuery = {
    matches: systemDark,
    addEventListener(type, listener) {
      mediaListeners.set(type, listener);
    },
    addListener(listener) {
      mediaListeners.set('change', listener);
    }
  };
  const windowListeners = new Map();
  const values = new Map();
  if (storedTheme !== null) values.set('lawscope-theme', storedTheme);
  let storageSetCalls = 0;
  const timers = new Map();
  let timerId = 0;
  const windowMock = {
    localStorage: {
      getItem(key) {
        if (storageThrows) throw new Error('Storage blocked');
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        if (storageThrows) throw new Error('Storage blocked');
        storageSetCalls += 1;
        values.set(key, value);
      }
    },
    matchMedia: () => mediaQuery,
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    setTimeout(listener) {
      timerId += 1;
      timers.set(timerId, listener);
      return timerId;
    },
    clearTimeout(id) {
      timers.delete(id);
    }
  };
  const context = {
    document: {
      documentElement: root,
      querySelector: (selector) => (selector === '[data-theme-toggle]' ? toggle : null)
    },
    window: windowMock,
    getComputedStyle: () => ({
      getPropertyValue: (property) => (property === '--duration-standard' ? '200ms' : '')
    }),
    Set,
    Number
  };
  vm.runInNewContext(themeJavaScript, context);

  return {
    root,
    icon,
    label,
    attributes,
    values,
    mediaQuery,
    storageSetCalls: () => storageSetCalls,
    click: () => toggleListeners.get('click')?.(),
    changeSystem(dark) {
      mediaQuery.matches = dark;
      mediaListeners.get('change')?.({ matches: dark });
    },
    dispatchStorage(key = 'lawscope-theme') {
      windowListeners.get('storage')?.({ key });
    },
    runTimers() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    }
  };
}

const controller = createControllerHarness({ systemDark: false });
contract(controller.root.dataset.theme === 'light', 'Controller must use light final fallback.');
contract(controller.root.classList.contains('theme-enabled'), 'Toggle must be revealed only after controller initialization.');
contract(controller.storageSetCalls() === 0, 'Initial controller resolution must not create an explicit choice.');
contract(controller.attributes.get('aria-pressed') === 'false', 'Light mode must expose aria-pressed=false.');
contract(controller.attributes.get('aria-label') === 'Switch to dark mode', 'Light mode must announce the dark-mode action.');
contract(controller.label.textContent === 'Dark mode', 'Light mode must show the dark-mode action text.');
contract(controller.icon.classList.contains('fa-moon'), 'Light mode must show the decorative moon icon.');

controller.click();
contract(controller.root.dataset.theme === 'dark', 'Activating the toggle must select dark mode.');
contract(controller.values.get('lawscope-theme') === 'dark', 'Explicit dark choice must persist.');
contract(controller.storageSetCalls() === 1, 'One activation must perform one storage write.');
contract(controller.attributes.get('aria-pressed') === 'true', 'Dark mode must expose aria-pressed=true.');
contract(controller.attributes.get('aria-label') === 'Switch to light mode', 'Dark mode must announce the light-mode action.');
contract(controller.label.textContent === 'Light mode', 'Dark mode must show the light-mode action text.');
contract(controller.icon.classList.contains('fa-sun'), 'Dark mode must show the decorative sun icon.');
contract(!controller.icon.classList.contains('fa-moon'), 'Dark mode must remove the decorative moon icon.');
contract(controller.root.classList.contains('theme-transition'), 'Interactive changes must enable palette transitions.');
controller.runTimers();
contract(!controller.root.classList.contains('theme-transition'), 'Palette transition state must clean itself up.');

controller.changeSystem(true);
contract(controller.root.dataset.theme === 'dark', 'System changes must not override an explicit choice.');
controller.changeSystem(false);
contract(controller.root.dataset.theme === 'dark', 'Explicit choice must continue to outrank light system preference.');
controller.values.delete('lawscope-theme');
controller.dispatchStorage();
contract(controller.root.dataset.theme === 'light', 'Clearing choice in another tab must restore the current system theme.');
controller.changeSystem(true);
contract(controller.root.dataset.theme === 'dark', 'No-choice state must follow later system changes.');
controller.values.set('lawscope-theme', 'light');
controller.dispatchStorage();
contract(controller.root.dataset.theme === 'light', 'Cross-tab explicit light preference must synchronize.');

const storedController = createControllerHarness({ storedTheme: 'dark', systemDark: false });
contract(storedController.root.dataset.theme === 'dark', 'Deferred controller must preserve a stored dark preference.');
contract(storedController.storageSetCalls() === 0, 'Reloading a stored preference must not rewrite it.');

const blockedStorageController = createControllerHarness({ storageThrows: true, systemDark: true });
contract(blockedStorageController.root.dataset.theme === 'dark', 'Blocked storage must retain system fallback behavior.');
blockedStorageController.click();
contract(blockedStorageController.root.dataset.theme === 'light', 'Blocked storage must not prevent current-page switching.');

console.log(`Dark Mode Logic validation passed (${contractCount} contracts).`);
console.log(`WCAG contrast audit passed for ${contrastPairs.length} approved light/dark palette pairs.`);
console.log('Pre-paint priority, persistence, accessible state, system changes, storage safety, cross-tab sync, and reduced-motion transitions passed.');
