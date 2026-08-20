import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadPublishedArticles } from './content-graph.mjs';
import {
  createSearchIndex,
  SEARCH_INDEX_PUBLIC_PATH,
  SEARCH_INDEX_VERSION
} from './generate-search-index.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const readProjectFile = (relativePath) =>
  readFile(path.join(projectRoot, relativePath), 'utf8');

const [
  sourceIndex,
  generatedIndex,
  generatedSearchText,
  generatedManifestText,
  searchJavaScript,
  headerJavaScript,
  generatorJavaScript,
  buildJavaScript,
  mainCss,
  componentsCss,
  searchDocumentation,
  headerDocumentation
] = await Promise.all([
  readProjectFile('index.html'),
  readProjectFile('generated/index.html'),
  readProjectFile('generated/data/search-index.json'),
  readProjectFile('generated/data/home-selection.json'),
  readProjectFile('js/search.js'),
  readProjectFile('js/header.js'),
  readProjectFile('scripts/generate-search-index.mjs'),
  readProjectFile('scripts/build.mjs'),
  readProjectFile('css/main.css'),
  readProjectFile('css/components.css'),
  readProjectFile('docs/search.md'),
  readProjectFile('docs/header-navigation.md')
]);

const generatedSearch = JSON.parse(generatedSearchText);
const generatedManifest = JSON.parse(generatedManifestText);
const validationBuildDate = new Date();
const fixtureBuildDate = new Date('2026-08-15T12:00:00.000Z');
const publishedArticles = await loadPublishedArticles(projectRoot, validationBuildDate);
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

// Build source, schema, deterministic ordering, eligibility, and payload size.
includesAll(
  buildJavaScript,
  [
    "from './generate-search-index.mjs'",
    'loadPublishedArticles(projectRoot, buildDate)',
    'createSearchIndex(publishedArticles, { buildDate })',
    'SEARCH_INDEX_PUBLIC_PATH.replace(/^\\//, \'\')',
    'JSON.stringify(searchIndex)',
    'indexedArticleCount: searchIndex.count'
  ],
  'scripts/build.mjs'
);
includesAll(
  generatorJavaScript,
  [
    "article.status !== 'published'",
    'article.preview === true',
    'publishedTime > buildDate.getTime()',
    'title:',
    'category:',
    'tags:',
    'excerpt:',
    'published:',
    'entries.sort(compareEntries)'
  ],
  'scripts/generate-search-index.mjs'
);
contract(
  SEARCH_INDEX_PUBLIC_PATH === '/data/search-index.json',
  'The public index must use the approved root-relative JSON path.'
);
contract(generatedSearch.version === SEARCH_INDEX_VERSION, 'Generated index version must match its generator.');
contract(generatedSearch.count === publishedArticles.length, 'Every eligible published article must be indexed once.');
contract(generatedSearch.entries.length === generatedSearch.count, 'Index count must equal its entry array length.');
contract(Buffer.byteLength(generatedSearchText) <= 50 * 1024, 'Baseline search index must remain below 50 KiB.');

const regeneratedSearch = createSearchIndex(publishedArticles, {
  buildDate: validationBuildDate
});
contract(
  JSON.stringify(generatedSearch) === JSON.stringify(regeneratedSearch),
  'Generated search data must be deterministic for the eligible content graph.'
);
const expectedRoutes = publishedArticles.map((article) => `/articles/${article.slug}/`);
contract(
  JSON.stringify(generatedSearch.entries.map((entry) => entry.url)) === JSON.stringify(expectedRoutes),
  'Generated entries must retain deterministic newest-first article ordering.'
);
contract(
  new Set(generatedSearch.entries.map((entry) => entry.url)).size === generatedSearch.count,
  'Generated article routes must be unique.'
);
const allowedEntryKeys = ['category', 'excerpt', 'published', 'tags', 'title', 'url'];
for (const entry of generatedSearch.entries) {
  contract(
    JSON.stringify(Object.keys(entry).sort()) === JSON.stringify(allowedEntryKeys),
    `${entry.url}: public search payload must contain only minimal matching/display fields.`
  );
  contract(/^\/articles\/[a-z0-9-]+\/$/.test(entry.url), `${entry.url}: route must be a local article URL.`);
  contract(Number.isFinite(Date.parse(entry.published)), `${entry.url}: publication timestamp must be valid.`);
  contract(Array.isArray(entry.tags), `${entry.url}: tags must remain a controlled array.`);
}
for (const prohibitedField of ['body', 'sourceFile', 'status', 'featured_image', 'author', 'sources']) {
  contract(!generatedSearchText.includes(`"${prohibitedField}"`), `Public index must omit ${prohibitedField}.`);
}

const fixtureBase = {
  title: 'Published Fixture',
  slug: 'published-fixture',
  categoryName: 'Consumer Law',
  tags: ['Consumer Rights'],
  excerpt: 'Fixture excerpt for deterministic search validation.',
  publish_date: '2026-08-14T09:00:00Z',
  status: 'published',
  sourceFile: 'published-fixture.md'
};
const eligibilityFixture = createSearchIndex(
  [
    fixtureBase,
    { ...fixtureBase, title: 'Draft Secret', slug: 'draft-secret', status: 'draft' },
    { ...fixtureBase, title: 'Preview Secret', slug: 'preview-secret', preview: true },
    {
      ...fixtureBase,
      title: 'Future Secret',
      slug: 'future-secret',
      publish_date: '2026-08-16T09:00:00Z'
    }
  ],
  { buildDate: fixtureBuildDate }
);
contract(eligibilityFixture.count === 1, 'Draft, preview, and future fixtures must all be excluded.');
contract(eligibilityFixture.entries[0].title === 'Published Fixture', 'Only the eligible fixture may remain.');
assert.throws(
  () => createSearchIndex([{ ...fixtureBase, title: '' }], { buildDate: fixtureBuildDate }),
  /non-empty title/,
  'Invalid published metadata must fail instead of entering the index.'
);
contractCount += 1;
assert.throws(
  () => createSearchIndex([fixtureBase, fixtureBase], { buildDate: fixtureBuildDate }),
  /duplicate search index route/,
  'Duplicate article routes must fail the index build.'
);
contractCount += 1;

contract(
  generatedManifest.search.indexVersion === SEARCH_INDEX_VERSION &&
    generatedManifest.search.indexPath === SEARCH_INDEX_PUBLIC_PATH &&
    generatedManifest.search.indexedArticleCount === generatedSearch.count,
  'Generated selection manifest must record the index version, path, and count.'
);
contract(
  JSON.stringify(generatedManifest.search.indexedArticleRoutes) === JSON.stringify(expectedRoutes),
  'Generated selection manifest must record exactly the indexed article routes.'
);
const generatedRootEntries = await readdir(path.join(projectRoot, 'generated'));
contract(!generatedRootEntries.includes('search'), 'The build must not create an indexable search-results directory.');
contract(!generatedIndex.includes('/search/?') && !generatedIndex.includes('SearchAction'), 'Home output must not advertise a duplicate query-results route.');

// Markup, state semantics, ordinary fallbacks, controller order, and responsive CSS.
for (const html of [sourceIndex, generatedIndex]) {
  includesAll(
    html,
    [
      '<script src="/js/search.js" defer></script>',
      'action="/articles/"',
      'method="get"',
      'type="search"',
      'autocomplete="off"',
      'maxlength="120"',
      'aria-controls="site-search-results"',
      'aria-describedby="site-search-help site-search-status"',
      'data-search-index-url="/data/search-index.json"',
      'data-search-limit="6"',
      'data-search-state="idle"',
      'aria-busy="false"',
      'role="status"',
      'aria-live="polite"',
      'aria-atomic="true"',
      'aria-label="Search results"',
      'Browse all articles',
      'Browse categories',
      '<noscript>'
    ],
    html === sourceIndex ? 'index.html' : 'generated/index.html'
  );
}
contract(
  sourceIndex.indexOf('/js/header.js') < sourceIndex.indexOf('/js/search.js') &&
    sourceIndex.indexOf('/js/search.js') < sourceIndex.indexOf('/js/consent.js'),
  'Deferred search must run after the shared header controller and before unrelated page enhancements.'
);
contract((sourceIndex.match(/data-search-status/g) || []).length === 1, 'Search must use one restrained live status region.');
contract((sourceIndex.match(/data-search-list/g) || []).length === 1, 'Search must use one bounded result list.');

includesAll(
  mainCss,
  ['--size-search-panel:', '--size-search-results-block:', '--size-touch-target: 2.75rem'],
  'css/main.css'
);
includesAll(
  componentsCss,
  [
    '.site-search__results',
    '.site-search__results[data-search-state="loading"]',
    '.site-search__results[data-search-state="error"]',
    '.site-search__list',
    'max-block-size: var(--size-search-results-block)',
    'overscroll-behavior: contain',
    '.site-search__result',
    'min-block-size: var(--size-touch-target)',
    '.site-search__result-title',
    '.site-search__result-meta',
    '.site-search__fallback'
  ],
  'css/components.css'
);

// Controller isolation, normalized fields, bounded rendering, keyboard behavior, and privacy.
includesAll(
  searchJavaScript,
  [
    "document.querySelector('[data-search-panel]')",
    'fetch(searchIndexUrl, {',
    "Accept: 'application/json'",
    "credentials: 'same-origin'",
    "cache: 'force-cache'",
    "referrerPolicy: 'same-origin'",
    ".normalize('NFKD')",
    "replace(/\\p{Diacritic}/gu, '')",
    'normalizedTitle',
    'normalizedCategory',
    'normalizedTags',
    'normalizedExcerpt',
    'queryTokens.every',
    'matches.slice(0, resultLimit)',
    "document.createElement('a')",
    'link.href = entry.url',
    'title.textContent = entry.title',
    'category.textContent = entry.category',
    'date.dateTime = entry.published',
    "event.key === 'ArrowDown'",
    "event.key === 'ArrowUp'",
    "event.key === 'Home'",
    "event.key === 'End'",
    'resultLinks.at(0)?.focus()',
    "document.addEventListener('lawscope:site-surface-change'",
    'queryRevision',
    "if (indexState === 'error') return"
  ],
  'js/search.js'
);
includesAll(
  headerJavaScript,
  [
    "event.key === 'Escape'",
    'closeSearch({ returnFocus: true })',
    "searchField.dispatchEvent(new Event('input', { bubbles: true }))",
    'searchClear.hidden = searchField.value.length === 0'
  ],
  'js/header.js'
);
for (const prohibitedConcern of [
  'localStorage',
  'sessionStorage',
  'document.cookie',
  'sendBeacon',
  'XMLHttpRequest',
  'history.pushState',
  'history.replaceState',
  'innerHTML',
  'outerHTML',
  '.md`',
  "document.addEventListener('keydown'",
  "window.addEventListener('keydown'"
]) {
  contract(!searchJavaScript.includes(prohibitedConcern), `Search controller must not contain: ${prohibitedConcern}`);
}
contract(
  !/fetch\([^)]*(?:query|searchField|currentQuery)/s.test(searchJavaScript),
  'The static index request must never contain the reader query.'
);

includesAll(
  searchDocumentation,
  [
    '`loadPublishedArticles()`',
    '`generated/data/search-index.json`',
    'never fetches raw Markdown',
    'title, category, tag, or excerpt',
    'no more than',
    '`aria-busy="true"`',
    'Up/Down Arrow',
    'Home and End',
    'Escape',
    'browser memory',
    'does not put queries into history',
    'loads no third-party search code',
    'Closing the panel clears',
    'does not create a separate search-results page'
  ],
  'docs/search.md'
);
contract(headerDocumentation.includes('./search.md'), 'Header documentation must point to the search contract.');

function makeEventTarget(initialProperties = {}) {
  const listeners = new Map();
  return Object.assign(initialProperties, {
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) || [];
      typeListeners.push(listener);
      listeners.set(type, typeListeners);
    },
    emit(type, event = {}) {
      if (!('target' in event)) event.target = this;
      for (const listener of listeners.get(type) || []) listener(event);
    }
  });
}

function createElement(documentMock, tagName = 'div', options = {}) {
  const attributes = new Map(Object.entries(options.attributes || {}));
  const element = makeEventTarget({
    tagName: tagName.toUpperCase(),
    dataset: { ...(options.dataset || {}) },
    children: [],
    parentElement: null,
    hidden: options.hidden || false,
    value: options.value || '',
    textContent: options.textContent || '',
    className: '',
    id: '',
    href: '',
    dateTime: '',
    focusCount: 0,
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    append(...nodes) {
      for (const node of nodes) {
        if (node?.isFragment) {
          this.append(...node.children);
          node.children = [];
          continue;
        }
        node.parentElement = this;
        this.children.push(node);
      }
    },
    replaceChildren(...nodes) {
      this.children = [];
      this.append(...nodes);
    },
    querySelectorAll(selector) {
      const results = [];
      const visit = (node) => {
        for (const child of node.children || []) {
          if (selector === '[data-search-result-link]' && 'searchResultLink' in child.dataset) {
            results.push(child);
          }
          visit(child);
        }
      };
      visit(this);
      return results;
    },
    closest(selector) {
      let current = this;
      while (current) {
        if (selector === '[data-search-result-link]' && 'searchResultLink' in current.dataset) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    },
    focus() {
      this.focusCount += 1;
      documentMock.activeElement = this;
    }
  });
  return element;
}

function createHarness({ payload = generatedSearch } = {}) {
  const state = {
    timers: new Map(),
    nextTimerId: 1,
    fetchCalls: [],
    fetchResolve: null,
    fetchReject: null
  };
  const documentMock = makeEventTarget({
    activeElement: null,
    querySelector(selector) {
      return selector === '[data-search-panel]' ? panel : null;
    },
    createElement(tagName) {
      return createElement(documentMock, tagName);
    },
    createDocumentFragment() {
      const fragment = createElement(documentMock, '#fragment');
      fragment.isFragment = true;
      return fragment;
    }
  });
  const panel = createElement(documentMock, 'section', { hidden: true });
  const form = createElement(documentMock, 'form');
  const field = createElement(documentMock, 'input', {
    attributes: { maxlength: '120' }
  });
  const clear = createElement(documentMock, 'button', { hidden: true });
  const results = createElement(documentMock, 'div', {
    dataset: {
      searchIndexUrl: '/data/search-index.json',
      searchLimit: '6',
      searchState: 'idle'
    },
    attributes: { 'aria-busy': 'false' }
  });
  const status = createElement(documentMock, 'p', {
    textContent: 'Enter a legal topic or phrase to search published Lawscope guides.'
  });
  const list = createElement(documentMock, 'ul', { hidden: true });
  const fallback = createElement(documentMock, 'nav', { hidden: true });
  const panelElements = new Map([
    ['[data-search-form]', form],
    ['[data-search-field]', field],
    ['[data-search-clear]', clear],
    ['[data-search-results]', results],
    ['[data-search-status]', status],
    ['[data-search-list]', list],
    ['[data-search-fallback]', fallback]
  ]);
  panel.querySelector = (selector) => panelElements.get(selector) || null;

  const windowMock = {
    setTimeout(callback) {
      const timerId = state.nextTimerId;
      state.nextTimerId += 1;
      state.timers.set(timerId, callback);
      return timerId;
    },
    clearTimeout(timerId) {
      state.timers.delete(timerId);
    }
  };
  const fetchMock = (...arguments_) => {
    state.fetchCalls.push(arguments_);
    return new Promise((resolve, reject) => {
      state.fetchResolve = () => resolve({
        ok: true,
        status: 200,
        json: async () => payload
      });
      state.fetchReject = reject;
    });
  };

  vm.runInNewContext(searchJavaScript, {
    document: documentMock,
    window: windowMock,
    fetch: fetchMock,
    Intl,
    Date,
    String,
    Number,
    Set,
    Error,
    Promise,
    console
  }, { filename: 'js/search.js' });

  return {
    state,
    documentMock,
    panel,
    form,
    field,
    clear,
    results,
    status,
    list,
    fallback,
    open() {
      panel.hidden = false;
      documentMock.emit('lawscope:site-surface-change', {
        detail: { searchIsOpen: true }
      });
    },
    close() {
      panel.hidden = true;
      documentMock.emit('lawscope:site-surface-change', {
        detail: { searchIsOpen: false }
      });
    },
    resolveFetch() {
      state.fetchResolve();
    },
    rejectFetch(error = new Error('offline')) {
      state.fetchReject(error);
    },
    runTimers() {
      const callbacks = [...state.timers.values()];
      state.timers.clear();
      for (const callback of callbacks) callback();
    }
  };
}

async function flushAsync() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

async function searchFor(harness, query) {
  harness.field.value = query;
  harness.field.emit('input');
  harness.runTimers();
  await flushAsync();
  return harness.list.querySelectorAll('[data-search-result-link]');
}

// Executable loading, matching, bounds, keyboard, reset, stale-work, and failure contracts.
const harness = createHarness();
harness.open();
contract(harness.results.dataset.searchState === 'loading', 'Opening search must expose loading immediately.');
contract(harness.results.getAttribute('aria-busy') === 'true', 'Loading search must expose aria-busy.');
contract(harness.status.textContent.includes('Loading'), 'Loading state must be explicit text.');
contract(harness.state.fetchCalls.length === 1, 'Opening search must request the index once.');
const [fetchUrl, fetchOptions] = harness.state.fetchCalls[0];
contract(fetchUrl === '/data/search-index.json', 'Runtime must request only the static JSON URL.');
contract(
  fetchOptions.method === 'GET' &&
    fetchOptions.credentials === 'same-origin' &&
    fetchOptions.cache === 'force-cache' &&
    fetchOptions.referrerPolicy === 'same-origin',
  'Runtime index request must use the low-cost same-origin request policy.'
);
harness.resolveFetch();
await flushAsync();
contract(harness.results.dataset.searchState === 'idle', 'Loaded index with no query must return to instructions.');
contract(harness.results.getAttribute('aria-busy') === 'false', 'Settled search must clear aria-busy.');

let links = await searchFor(harness, 'child custody orders factors');
contract(harness.results.dataset.searchState === 'results', 'Title query must produce results.');
contract(links.length === 1, 'Custody-orders title query must resolve one baseline guide.');
contract(links[0].href.includes('child-custody-orders-common-factors'), 'Title query must rank the matching article.');
links = await searchFor(harness, 'legal basics');
contract(
  links.length === 6 && links.every((link) => link.href.includes('/articles/')),
  'Category matching must work across the full library.'
);
links = await searchFor(harness, 'parenting plans');
contract(links.length === 1 && links[0].href.includes('child-custody'), 'Tag matching must work.');
links = await searchFor(harness, 'investigation results');
contract(links.length === 1 && links[0].href.includes('credit-report-errors'), 'Excerpt matching must work.');
links = await searchFor(harness, 'at will employment');
contract(links.length === 1 && links[0].href.includes('at-will-employment'), 'Punctuation-normalized title matching must work.');
links = await searchFor(harness, 'consumer investigation');
contract(links.length === 1 && links[0].href.includes('credit-report-errors'), 'Tokens may match across weighted fields.');
links = await searchFor(harness, 'legal');
contract(links.length === 6, 'Broad queries must render no more than the configured initial limit.');
contract(harness.status.textContent.includes('Showing the first 6'), 'Bounded result announcements must disclose truncation.');
contract(harness.state.fetchCalls.length === 1, 'Settled searches must reuse the in-memory index.');

let prevented = false;
harness.field.emit('keydown', {
  key: 'ArrowDown',
  preventDefault() { prevented = true; }
});
contract(prevented && harness.documentMock.activeElement === links[0], 'Down Arrow must focus the first result.');
prevented = false;
harness.list.emit('keydown', {
  key: 'End',
  target: links[0],
  preventDefault() { prevented = true; }
});
contract(prevented && harness.documentMock.activeElement === links.at(-1), 'End must focus the final displayed result.');
prevented = false;
harness.list.emit('keydown', {
  key: 'Home',
  target: links.at(-1),
  preventDefault() { prevented = true; }
});
contract(prevented && harness.documentMock.activeElement === links[0], 'Home must focus the first result.');
prevented = false;
harness.list.emit('keydown', {
  key: 'ArrowUp',
  target: links[0],
  preventDefault() { prevented = true; }
});
contract(prevented && harness.documentMock.activeElement === harness.field, 'Up Arrow on the first result must return to input.');

harness.field.value = 'credit report';
prevented = false;
harness.form.emit('submit', {
  preventDefault() { prevented = true; }
});
await flushAsync();
contract(prevented, 'Enhanced non-empty submission must remain inside the panel when index is ready.');
contract(
  harness.documentMock.activeElement?.href.includes('credit-report-errors'),
  'Submitting a settled query must move focus to its first result.'
);

links = await searchFor(harness, 'query-with-no-baseline-match');
contract(links.length === 0 && harness.results.dataset.searchState === 'empty', 'No-match state must be explicit.');
contract(!harness.fallback.hidden, 'No-match state must reveal ordinary browse links.');
contract(harness.status.textContent.includes('No published articles found'), 'No-match status must be announced.');
harness.field.value = '';
harness.field.emit('input');
contract(harness.results.dataset.searchState === 'idle', 'Clearing input must restore idle instructions immediately.');
harness.close();
contract(harness.field.value === '', 'Closing search must clear the potentially sensitive query.');
contract(harness.list.hidden && harness.list.children.length === 0, 'Closing search must clear rendered results.');

const staleHarness = createHarness();
staleHarness.open();
staleHarness.field.value = 'court decision';
staleHarness.field.emit('input');
staleHarness.runTimers();
staleHarness.field.value = 'parenting plans';
staleHarness.field.emit('input');
staleHarness.runTimers();
staleHarness.resolveFetch();
await flushAsync();
const staleLinks = staleHarness.list.querySelectorAll('[data-search-result-link]');
contract(
  staleHarness.status.textContent.includes('parenting plans') &&
    staleLinks[0]?.href.includes('child-custody'),
  'A stale pending query must never overwrite the newest query.'
);

const failureHarness = createHarness();
failureHarness.open();
failureHarness.rejectFetch();
await flushAsync();
contract(failureHarness.results.dataset.searchState === 'error', 'Request failure must produce an explicit error state.');
contract(!failureHarness.fallback.hidden, 'Request failure must reveal browse alternatives.');
failureHarness.field.value = 'employment';
prevented = false;
failureHarness.form.emit('submit', {
  preventDefault() { prevented = true; }
});
contract(!prevented, 'Known index failure must release the ordinary Articles GET fallback.');

console.log(`Search validation passed (${contractCount} contracts checked).`);
console.log(`Published index: ${generatedSearch.count} articles, ${Buffer.byteLength(generatedSearchText)} bytes, no draft/preview/future fixtures.`);
console.log('Title/category/tag/excerpt matching, bounded announcements, stale safety, fallbacks, and keyboard paths passed executable checks.');
