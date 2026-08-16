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
  partial,
  backToTopJavaScript,
  headerJavaScript,
  mainCss,
  componentsCss,
  buildScript,
  documentation
] = await Promise.all([
  readProjectFile('index.html'),
  readProjectFile('generated/index.html'),
  readProjectFile('pages/partials/back-to-top.html'),
  readProjectFile('js/back-to-top.js'),
  readProjectFile('js/header.js'),
  readProjectFile('css/main.css'),
  readProjectFile('css/components.css'),
  readProjectFile('scripts/build.mjs'),
  readProjectFile('docs/back-to-top.md')
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

includesAll(
  partial,
  [
    '<button',
    'class="back-to-top"',
    'type="button"',
    'aria-label="Back to top"',
    'data-back-to-top',
    'hidden',
    'fa-solid fa-arrow-up',
    'aria-hidden="true"',
    '<span class="back-to-top__label">Top</span>'
  ],
  'pages/partials/back-to-top.html'
);
contract(!partial.includes('<a '), 'Back-to-top activation must use native button semantics.');
contract(
  (partial.match(/data-back-to-top/g) || []).length === 1,
  'The shared partial must contain exactly one back-to-top hook.'
);

includesAll(
  sourceIndex,
  [
    '<script src="/js/back-to-top.js" defer></script>',
    'id="page-top"',
    'data-page-top-focus',
    '{{BACK_TO_TOP}}'
  ],
  'index.html'
);
contract(
  sourceIndex.indexOf('/js/header.js') < sourceIndex.indexOf('/js/back-to-top.js'),
  'The header controller must publish its initial surface state before the back-to-top controller runs.'
);

contract(
  (generatedIndex.match(/data-back-to-top/g) || []).length === 1,
  'The generated home page must contain exactly one shared back-to-top control.'
);
includesAll(
  generatedIndex,
  [
    '<script src="/js/back-to-top.js" defer></script>',
    'aria-label="Back to top"',
    'fa-solid fa-arrow-up',
    'data-page-top-focus'
  ],
  'generated/index.html'
);
contract(
  !generatedIndex.includes('{{BACK_TO_TOP}}'),
  'The generated page must not retain the back-to-top build placeholder.'
);

includesAll(
  buildScript,
  [
    "path.join(projectRoot, 'pages/partials/back-to-top.html')",
    ".replace('{{BACK_TO_TOP}}', backToTopHtml)"
  ],
  'scripts/build.mjs'
);

includesAll(
  mainCss,
  [
    '--size-touch-target: 2.75rem',
    '--consent-safe-block-offset:',
    '--safe-area-inset-block-end: env(safe-area-inset-bottom, 0rem)',
    '--safe-area-inset-inline-end: env(safe-area-inset-right, 0rem)',
    '--size-focus-ring:',
    '--z-index-sticky:'
  ],
  'css/main.css'
);

const componentRule = componentsCss.match(/\.back-to-top\s*\{([\s\S]*?)\n\}/);
contract(componentRule, 'components.css must define the back-to-top component rule.');
includesAll(
  componentRule[1],
  [
    'position: fixed',
    'z-index: var(--z-index-sticky)',
    'var(--consent-safe-block-offset)',
    'var(--safe-area-inset-block-end)',
    'var(--safe-area-inset-inline-end)',
    'min-inline-size: var(--size-touch-target)',
    'min-block-size: var(--size-touch-target)',
    'border-radius: var(--radius-pill)',
    'background-color: var(--color-brand)',
    'color: var(--color-on-brand)'
  ],
  'the .back-to-top CSS rule'
);
includesAll(
  componentsCss,
  [
    '.back-to-top:hover',
    ':root.site-surface-open .back-to-top',
    '@media (prefers-reduced-motion: reduce)',
    '.back-to-top {\n    transition: none;'
  ],
  'css/components.css'
);

includesAll(
  backToTopJavaScript,
  [
    "document.querySelector('[data-back-to-top]')",
    "document.querySelector('[data-page-top-focus]')",
    'window.scrollY >= viewportBlockSize',
    'document.documentElement.scrollHeight > viewportBlockSize',
    "root.classList.contains('site-surface-open')",
    "focusTarget.focus({ preventScroll: true })",
    'window.scrollTo({',
    'top: 0',
    "reducedMotionQuery.matches ? 'auto' : 'smooth'",
    "window.addEventListener('scroll', requestVisibilityUpdate, { passive: true })",
    "window.addEventListener('resize', requestVisibilityUpdate, { passive: true })",
    "window.addEventListener('pageshow', requestVisibilityUpdate)",
    'window.requestAnimationFrame(syncVisibility)',
    "document.addEventListener('lawscope:site-surface-change'",
    "'IntersectionObserver' in window",
    'adObserver.observe(slot)',
    'button.hidden = !shouldShow'
  ],
  'js/back-to-top.js'
);

for (const prohibitedConcern of [
  "addEventListener('keydown'",
  'setInterval(',
  'setTimeout(',
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon',
  'localStorage',
  'sessionStorage',
  'document.cookie'
]) {
  contract(
    !backToTopJavaScript.includes(prohibitedConcern),
    `The isolated back-to-top controller must not contain: ${prohibitedConcern}`
  );
}

includesAll(
  headerJavaScript,
  [
    'function publishSurfaceState()',
    "root.classList.toggle('site-surface-open', surfaceIsOpen)",
    "new CustomEvent('lawscope:site-surface-change'",
    'detail: { navigationIsOpen, searchIsOpen }'
  ],
  'js/header.js'
);

includesAll(
  documentation,
  [
    'one current viewport height',
    '`requestAnimationFrame`',
    '`IntersectionObserver`',
    '`--consent-safe-block-offset`',
    '`--size-touch-target` (44px)',
    '`data-page-top-focus`',
    '`preventScroll`',
    '`prefers-reduced-motion: reduce`',
    'reads no storage',
    'sends no requests'
  ],
  'docs/back-to-top.md'
);

function makeEventTarget(initialProperties = {}) {
  const listeners = new Map();
  return Object.assign(initialProperties, {
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) || [];
      typeListeners.push(listener);
      listeners.set(type, typeListeners);
    },
    emit(type, event = {}) {
      for (const listener of listeners.get(type) || []) {
        listener(event);
      }
    }
  });
}

function createHarness() {
  const state = {
    viewportBlockSize: 800,
    documentBlockSize: 2400,
    scrollY: 0,
    reducedMotion: false,
    scrollCalls: [],
    focusCalls: [],
    frameCallbacks: []
  };
  const rootClasses = new Set();
  const root = {
    get clientHeight() {
      return state.viewportBlockSize;
    },
    get scrollHeight() {
      return state.documentBlockSize;
    },
    classList: {
      contains(className) {
        return rootClasses.has(className);
      },
      add(className) {
        rootClasses.add(className);
      },
      remove(className) {
        rootClasses.delete(className);
      }
    }
  };
  const button = makeEventTarget({ hidden: true });
  const adSlot = { hidden: true };
  const documentMock = makeEventTarget({
    documentElement: root,
    activeElement: null,
    querySelector(selector) {
      if (selector === '[data-back-to-top]') return button;
      if (selector === '[data-page-top-focus]') return focusTarget;
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[data-ad-slot]' ? [adSlot] : [];
    }
  });
  const focusTarget = {
    focus(options) {
      state.focusCalls.push(options);
      documentMock.activeElement = focusTarget;
    }
  };
  button.focus = () => {
    documentMock.activeElement = button;
  };

  let intersectionObserverCallback = null;
  class IntersectionObserverMock {
    constructor(callback) {
      intersectionObserverCallback = callback;
    }

    observe() {}
  }

  const windowMock = makeEventTarget({
    get innerHeight() {
      return state.viewportBlockSize;
    },
    get scrollY() {
      return state.scrollY;
    },
    matchMedia() {
      return {
        get matches() {
          return state.reducedMotion;
        }
      };
    },
    requestAnimationFrame(callback) {
      state.frameCallbacks.push(callback);
    },
    scrollTo(options) {
      state.scrollCalls.push(options);
      state.scrollY = options.top;
    },
    IntersectionObserver: IntersectionObserverMock
  });

  vm.runInNewContext(backToTopJavaScript, {
    document: documentMock,
    window: windowMock,
    IntersectionObserver: IntersectionObserverMock,
    Map,
    Array,
    Math
  });

  return {
    state,
    root,
    button,
    adSlot,
    windowMock,
    documentMock,
    triggerAdIntersection(isIntersecting) {
      intersectionObserverCallback([{ target: adSlot, isIntersecting }]);
    },
    flushFrame() {
      while (state.frameCallbacks.length > 0) {
        const callbacks = state.frameCallbacks.splice(0);
        callbacks.forEach((callback) => callback());
      }
    }
  };
}

const harness = createHarness();
contract(harness.button.hidden, 'The control must initialize hidden at the top of a long page.');

harness.state.scrollY = 799;
harness.windowMock.emit('scroll');
harness.flushFrame();
contract(harness.button.hidden, 'The control must remain hidden before one viewport of scrolling.');

harness.state.scrollY = 800;
harness.windowMock.emit('scroll');
harness.flushFrame();
contract(!harness.button.hidden, 'The control must display at the one-viewport threshold.');

harness.button.focus();
harness.root.classList.add('site-surface-open');
harness.documentMock.emit('lawscope:site-surface-change');
harness.flushFrame();
contract(harness.button.hidden, 'Expanded navigation/search surfaces must suppress the control.');
contract(
  harness.documentMock.activeElement !== harness.button,
  'A suppressed control must not retain keyboard focus while hidden.'
);

harness.root.classList.remove('site-surface-open');
harness.documentMock.emit('lawscope:site-surface-change');
harness.flushFrame();
contract(!harness.button.hidden, 'The eligible control must return after a site surface closes.');

harness.adSlot.hidden = false;
harness.triggerAdIntersection(true);
harness.flushFrame();
contract(harness.button.hidden, 'An intersecting enabled ad slot must suppress the control.');

harness.triggerAdIntersection(false);
harness.flushFrame();
contract(!harness.button.hidden, 'A non-intersecting ad slot must not suppress the control.');

harness.state.documentBlockSize = 800;
harness.state.scrollY = 900;
harness.windowMock.emit('scroll');
harness.flushFrame();
contract(harness.button.hidden, 'A document that does not overflow must not display the control.');

harness.state.documentBlockSize = 2400;
harness.state.scrollY = 900;
harness.windowMock.emit('scroll');
harness.flushFrame();
contract(!harness.button.hidden, 'An eligible long document must redisplay the control.');

harness.button.emit('click');
harness.flushFrame();
contract(
  harness.state.scrollCalls.at(-1).top === 0 &&
    harness.state.scrollCalls.at(-1).behavior === 'smooth',
  'Normal activation must request a smooth return to the top.'
);
contract(
  harness.state.focusCalls.at(-1)?.preventScroll === true,
  'Activation must move focus to the page-top target without an abrupt focus scroll.'
);
contract(harness.button.hidden, 'The control must hide after returning to the top.');

harness.state.reducedMotion = true;
harness.state.scrollY = 900;
harness.windowMock.emit('scroll');
harness.flushFrame();
harness.button.emit('click');
harness.flushFrame();
contract(
  harness.state.scrollCalls.at(-1).behavior === 'auto',
  'Reduced-motion activation must disable smooth scrolling.'
);

console.log(`Back-to-top valid (${contractCount} contracts checked).`);
console.log('Threshold, overflow, focus, motion, navigation, consent, and ad-safety behavior passed.');
