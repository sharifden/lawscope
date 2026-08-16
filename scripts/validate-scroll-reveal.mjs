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
  revealJavaScript,
  mainCss,
  componentsCss,
  featuredPartial,
  latestPartial,
  categoriesPartial,
  newsletterPartial,
  footerPartial,
  heroPartial,
  adPartial,
  consentPartial,
  backToTopPartial,
  documentation
] = await Promise.all([
  readProjectFile('index.html'),
  readProjectFile('generated/index.html'),
  readProjectFile('js/scroll-reveal.js'),
  readProjectFile('css/main.css'),
  readProjectFile('css/components.css'),
  readProjectFile('pages/partials/home-featured.html'),
  readProjectFile('pages/partials/home-latest.html'),
  readProjectFile('pages/partials/home-categories.html'),
  readProjectFile('pages/partials/home-newsletter.html'),
  readProjectFile('pages/partials/site-footer.html'),
  readProjectFile('pages/partials/home-hero.html'),
  readProjectFile('pages/partials/ad-slot-horizontal.html'),
  readProjectFile('pages/partials/consent-manager.html'),
  readProjectFile('pages/partials/back-to-top.html'),
  readProjectFile('docs/scroll-reveal.md')
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

contract(
  sourceIndex.includes('<script src="/js/scroll-reveal.js" defer></script>'),
  'index.html must defer the isolated scroll-reveal controller.'
);
contract(
  sourceIndex.indexOf('/js/back-to-top.js') < sourceIndex.indexOf('/js/scroll-reveal.js'),
  'Scroll reveal must load after the earlier interaction controllers.'
);
contract(
  (generatedIndex.match(/data-scroll-reveal/g) || []).length === 5,
  'The generated home page must contain exactly five deliberate reveal regions.'
);
contract(
  generatedIndex.includes('<script src="/js/scroll-reveal.js" defer></script>'),
  'The generated page must load the deferred scroll-reveal controller.'
);

for (const [name, partial, preservedClass] of [
  ['Featured Articles', featuredPartial, 'class="featured-articles"'],
  ['Latest Articles', latestPartial, 'class="latest-articles"'],
  ['Popular Categories', categoriesPartial, 'class="popular-categories"'],
  ['Newsletter Signup', newsletterPartial, 'class="newsletter-signup"'],
  ['Shared Footer', footerPartial, 'class="site-footer"']
]) {
  includesAll(
    partial,
    [preservedClass, 'data-scroll-reveal'],
    `${name} partial`
  );
}

for (const [name, partial] of [
  ['home hero', heroPartial],
  ['advertising slot', adPartial],
  ['consent manager', consentPartial],
  ['back-to-top control', backToTopPartial]
]) {
  contract(
    !partial.includes('data-scroll-reveal'),
    `The ${name} must remain outside non-essential reveal motion.`
  );
}

includesAll(
  mainCss,
  [
    '--duration-reveal:',
    '--easing-emphasized:',
    '--motion-distance-reveal:',
    '--opacity-transparent: 0;',
    '--opacity-opaque: 1;',
    '--reveal-observer-root-margin: 0% 0% -10% 0%;',
    '--reveal-observer-threshold: 0.12;'
  ],
  'css/main.css'
);

const revealCssStart = componentsCss.indexOf(
  '/* Module 15: progressive scroll-reveal enhancement. */'
);
contract(revealCssStart >= 0, 'components.css must contain the Module 15 reveal block.');
const revealCss = componentsCss.slice(revealCssStart);

includesAll(
  revealCss,
  [
    '.scroll-reveal-enabled .scroll-reveal--pending',
    '.scroll-reveal--pending:not(.scroll-reveal--visible)',
    'opacity: var(--opacity-transparent)',
    'transform: translateY(var(--motion-distance-reveal))',
    '.scroll-reveal-enabled .scroll-reveal--visible',
    'opacity: var(--opacity-opaque)',
    'transition-duration: var(--duration-reveal)',
    'transition-timing-function: var(--easing-emphasized)',
    '@media (prefers-reduced-motion: reduce)',
    'transition: none'
  ],
  'the Module 15 CSS block'
);
contract(
  !/^\.scroll-reveal\s*\{/m.test(revealCss),
  'The base scroll-reveal class must not hide or transform content without JavaScript.'
);
contract(
  revealCss.indexOf('.scroll-reveal-enabled') < revealCss.indexOf('opacity: var(--opacity-transparent)'),
  'Transparent reveal state must be gated by the JavaScript-enabled root class.'
);

includesAll(
  revealJavaScript,
  [
    "document.querySelectorAll('[data-scroll-reveal]')",
    "window.matchMedia('(prefers-reduced-motion: reduce)')",
    "!('IntersectionObserver' in window)",
    "getPropertyValue('--reveal-observer-root-margin')",
    "getPropertyValue('--reveal-observer-threshold')",
    'new IntersectionObserver(',
    'entry.isIntersecting',
    "element.classList.add('scroll-reveal--pending')",
    "element.classList.add('scroll-reveal--visible')",
    'element.getBoundingClientRect().top <= initialViewportBlockSize',
    'observer.observe(element)',
    'observer?.unobserve(element)',
    'observer?.disconnect()',
    "document.addEventListener('focusin', revealFocusedContent)",
    "reducedMotionQuery.addEventListener('change', handleMotionPreferenceChange)",
    'revealElements.forEach(reveal)',
    "root.classList.remove('scroll-reveal-enabled')",
    "root.classList.add('scroll-reveal-enabled')"
  ],
  'js/scroll-reveal.js'
);
contract(
  revealJavaScript.lastIndexOf("root.classList.add('scroll-reveal-enabled')") >
    revealJavaScript.indexOf('observer = new IntersectionObserver'),
  'The root enabling class must be added only after observer setup succeeds.'
);

for (const prohibitedConcern of [
  "addEventListener('scroll'",
  "addEventListener('resize'",
  'requestAnimationFrame(',
  'setTimeout(',
  'setInterval(',
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon',
  'localStorage',
  'sessionStorage',
  'document.cookie',
  'innerHTML'
]) {
  contract(
    !revealJavaScript.includes(prohibitedConcern),
    `The reveal controller must not contain: ${prohibitedConcern}`
  );
}

includesAll(
  documentation,
  [
    'fully present and visible without JavaScript',
    'Largest Contentful Paint',
    '`IntersectionObserver` is unavailable',
    'initial viewport bottom',
    '`scroll-reveal-enabled`',
    '`prefers-reduced-motion: reduce`',
    '`focusin`',
    'unobserve',
    'no network requests',
    'no scroll handlers'
  ],
  'docs/scroll-reveal.md'
);

function makeEventTarget(initialProperties = {}) {
  const listeners = new Map();
  return Object.assign(initialProperties, {
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) || new Set();
      typeListeners.add(listener);
      listeners.set(type, typeListeners);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type, event = {}) {
      for (const listener of [...(listeners.get(type) || [])]) {
        listener(event);
      }
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    }
  });
}

function makeClassList(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    add(className) {
      classes.add(className);
    },
    remove(className) {
      classes.delete(className);
    },
    contains(className) {
      return classes.has(className);
    }
  };
}

function createHarness({
  positions = [100, 900, 1400],
  reducedMotion = false,
  observerSupported = true,
  tokenValues = {
    '--reveal-observer-root-margin': '0% 0% -10% 0%',
    '--reveal-observer-threshold': '0.12'
  }
} = {}) {
  const root = {
    clientHeight: 800,
    classList: makeClassList()
  };
  const elements = positions.map((top) => ({
    classList: makeClassList(['scroll-reveal']),
    getBoundingClientRect() {
      return { top };
    }
  }));
  const documentMock = makeEventTarget({
    documentElement: root,
    querySelectorAll(selector) {
      return selector === '[data-scroll-reveal]' ? elements : [];
    }
  });
  const motionQuery = makeEventTarget({ matches: reducedMotion });
  const observerState = {
    constructed: false,
    disconnected: false,
    observed: new Set(),
    unobserved: new Set(),
    options: null,
    callback: null
  };

  class IntersectionObserverMock {
    constructor(callback, options) {
      observerState.constructed = true;
      observerState.callback = callback;
      observerState.options = options;
    }

    observe(element) {
      observerState.observed.add(element);
    }

    unobserve(element) {
      observerState.observed.delete(element);
      observerState.unobserved.add(element);
    }

    disconnect() {
      observerState.disconnected = true;
      observerState.observed.clear();
    }
  }

  const windowMock = {
    innerHeight: 800,
    matchMedia() {
      return motionQuery;
    }
  };
  const sandbox = {
    document: documentMock,
    window: windowMock,
    getComputedStyle() {
      return {
        getPropertyValue(tokenName) {
          return tokenValues[tokenName] || '';
        }
      };
    },
    Array,
    Math,
    Number,
    Set
  };

  if (observerSupported) {
    windowMock.IntersectionObserver = IntersectionObserverMock;
    sandbox.IntersectionObserver = IntersectionObserverMock;
  }

  vm.runInNewContext(revealJavaScript, sandbox);

  return {
    root,
    elements,
    documentMock,
    motionQuery,
    observerState,
    intersect(element, isIntersecting = true) {
      observerState.callback?.([{ target: element, isIntersecting }]);
    }
  };
}

const standardHarness = createHarness();
contract(
  standardHarness.elements[0].classList.contains('scroll-reveal--visible'),
  'An initially visible region must be marked visible immediately.'
);
contract(
  !standardHarness.observerState.observed.has(standardHarness.elements[0]),
  'An initially visible region must not remain observed.'
);
contract(
  standardHarness.root.classList.contains('scroll-reveal-enabled'),
  'Supported pages with below-fold regions must enable reveal styling.'
);
contract(
  standardHarness.observerState.observed.has(standardHarness.elements[1]) &&
    standardHarness.observerState.observed.has(standardHarness.elements[2]),
  'Below-fold regions must be observed.'
);
contract(
  standardHarness.observerState.options.rootMargin === '0% 0% -10% 0%' &&
    standardHarness.observerState.options.threshold === 0.12,
  'IntersectionObserver must consume the shared observer tokens.'
);

standardHarness.intersect(standardHarness.elements[1], false);
contract(
  !standardHarness.elements[1].classList.contains('scroll-reveal--visible'),
  'A non-intersecting region must remain pending.'
);
standardHarness.intersect(standardHarness.elements[1], true);
contract(
  standardHarness.elements[1].classList.contains('scroll-reveal--visible') &&
    standardHarness.observerState.unobserved.has(standardHarness.elements[1]),
  'An intersecting region must reveal once and be unobserved.'
);

const focusTarget = {
  closest(selector) {
    return selector === '[data-scroll-reveal]' ? standardHarness.elements[2] : null;
  }
};
standardHarness.documentMock.emit('focusin', { target: focusTarget });
contract(
  standardHarness.elements[2].classList.contains('scroll-reveal--visible'),
  'Keyboard focus must immediately reveal its opted-in ancestor.'
);
contract(
  standardHarness.observerState.disconnected &&
    standardHarness.documentMock.listenerCount('focusin') === 0 &&
    standardHarness.motionQuery.listenerCount('change') === 0,
  'Observation and temporary listeners must be cleaned up after all regions reveal.'
);

const unsupportedHarness = createHarness({ observerSupported: false });
contract(
  !unsupportedHarness.root.classList.contains('scroll-reveal-enabled') &&
    unsupportedHarness.elements.every((element) =>
      !element.classList.contains('scroll-reveal--pending')
    ),
  'Missing IntersectionObserver support must leave all content immediately visible.'
);

const startupReducedHarness = createHarness({ reducedMotion: true });
contract(
  !startupReducedHarness.root.classList.contains('scroll-reveal-enabled') &&
    !startupReducedHarness.observerState.constructed &&
    startupReducedHarness.elements.every((element) =>
      !element.classList.contains('scroll-reveal--pending')
    ),
  'Startup reduced motion must bypass non-essential reveal behavior.'
);

const liveReducedHarness = createHarness({ positions: [900, 1400] });
liveReducedHarness.motionQuery.matches = true;
liveReducedHarness.motionQuery.emit('change', { matches: true });
contract(
  !liveReducedHarness.root.classList.contains('scroll-reveal-enabled') &&
    liveReducedHarness.elements.every((element) =>
      element.classList.contains('scroll-reveal--visible')
    ),
  'A live change to reduced motion must expose every pending region immediately.'
);
contract(
  liveReducedHarness.observerState.disconnected &&
    liveReducedHarness.documentMock.listenerCount('focusin') === 0,
  'A live reduced-motion change must disconnect enhancement work.'
);

const allVisibleHarness = createHarness({ positions: [-600, 200, 800] });
contract(
  !allVisibleHarness.root.classList.contains('scroll-reveal-enabled') &&
    allVisibleHarness.elements.every((element) =>
      element.classList.contains('scroll-reveal--visible')
    ),
  'A page with only initial-viewport regions must not enable hidden reveal states.'
);

const invalidTokenHarness = createHarness({ tokenValues: {} });
contract(
  !invalidTokenHarness.root.classList.contains('scroll-reveal-enabled') &&
    !invalidTokenHarness.observerState.constructed,
  'Missing observer tokens must fail visibly and safely before enhancement begins.'
);

console.log(`Scroll fade-in valid (${contractCount} contracts checked).`);
console.log('Progressive fallback, initial visibility, one-time observation, focus, and reduced motion passed.');
