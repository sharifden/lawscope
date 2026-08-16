import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadCategories, loadPublishedArticles } from './content-graph.mjs';
import {
  ARTICLE_FILTER_DEFAULT_SORT,
  compareArticleFilterRecords,
  createArticleFilterUrl,
  filterAndSortArticleRecords,
  formatArticleFilterCount,
  formatArticleFilterSummary,
  isArticleFilterStateActive,
  normalizeArticleFilterText,
  readArticleFilterState,
  sanitizeArticleFilterState
} from '../js/article-filter-model.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const readProjectFile = (relativePath) => readFile(path.join(projectRoot, relativePath), 'utf8');

const [
  sourceTemplate,
  cardPartial,
  buildSource,
  controllerSource,
  modelSource,
  componentCss,
  pageOneHtml,
  pageTwoHtml,
  documentation,
  categories,
  publishedArticles
] = await Promise.all([
  readProjectFile('pages/articles.html'),
  readProjectFile('pages/partials/article-card.html'),
  readProjectFile('scripts/build.mjs'),
  readProjectFile('js/article-filters.js'),
  readProjectFile('js/article-filter-model.js'),
  readProjectFile('css/components.css'),
  readProjectFile('generated/articles/index.html'),
  readProjectFile('generated/articles/page/2/index.html'),
  readProjectFile('docs/module-18-category-filters.md'),
  loadCategories(projectRoot),
  loadPublishedArticles(projectRoot, new Date())
]);

let contractCount = 0;
function contract(condition, message) {
  assert.ok(condition, message);
  contractCount += 1;
}
function includesAll(source, fragments, label) {
  for (const fragment of fragments) {
    contract(source.includes(fragment), `${label} must include: ${fragment}`);
  }
}
function extractBetween(source, startFragment, endFragment, label) {
  const start = source.indexOf(startFragment);
  const end = source.indexOf(endFragment, start + startFragment.length);
  contract(start >= 0 && end > start, `${label} boundaries must exist in generated HTML.`);
  return start >= 0 && end > start ? source.slice(start, end) : '';
}
function articleSlugs(source) {
  return [...source.matchAll(/data-article-slug="([^"]+)"/g)].map((match) => match[1]);
}

const categorySlugs = categories.map((category) => category.slug);
contract(categorySlugs.length === 10, 'The controlled CMS graph must expose exactly ten categories.');
contract(publishedArticles.length === 10, 'The validation fixture expects all ten published launch articles.');

includesAll(sourceTemplate, [
  '<script src="/js/article-filters.js" type="module" defer></script>',
  'data-article-filter-form',
  'data-article-filter-keyword',
  'data-article-filter-category',
  'data-article-filter-sort',
  'data-article-filter-clear',
  'aria-disabled="true"',
  'data-article-filter-summary',
  'No filters applied.',
  'data-article-results',
  '<template data-article-filter-supplement>',
  '{{ARTICLE_FILTER_SUPPLEMENT}}',
  '<template data-article-empty-template>',
  '{{ARTICLE_EMPTY_STATE}}',
  '{{ARTICLE_PAGINATION}}'
], 'pages/articles.html');
includesAll(cardPartial, [
  'data-article-category="{{CATEGORY_SLUG}}"',
  'data-article-tags="{{ARTICLE_TAGS}}"',
  'data-article-published="{{PUBLISH_DATE_ISO}}"',
  'data-article-updated="{{UPDATED_DATE_ISO}}"'
], 'article-card partial');
includesAll(buildSource, [
  'ARTICLE_TAGS:',
  'UPDATED_DATE_ISO:',
  'publishedArticles',
  '.filter((article) => !pageArticleSlugs.has(article.slug))',
  'ARTICLE_FILTER_SUPPLEMENT: filterSupplementHtml',
  'ARTICLE_EMPTY_STATE: articleEmptyStateHtml',
  'data-article-filter-reset'
], 'scripts/build.mjs');
includesAll(modelSource, [
  "normalize('NFKD')",
  "export const ARTICLE_FILTER_DEFAULT_SORT = 'newest'",
  "export const ARTICLE_FILTER_SORTS = Object.freeze(['newest', 'updated'])",
  'queryTokens.every',
  'left.updated || left.published',
  "KNOWN_PARAMETERS = ['q', 'category', 'sort']"
], 'article filter model');
includesAll(controllerSource, [
  "document.querySelector('[data-article-library]')",
  'supplement.content.querySelectorAll',
  'originalResultNodes',
  'results.replaceChildren(...originalResultNodes)',
  'filterAndSortArticleRecords(records, state)',
  'resultCount.textContent = formatArticleFilterCount(matches.length)',
  'pagination.hidden = true',
  "window.history[historyMethod]",
  "window.addEventListener('popstate'",
  'currentPage > 1 && initialStateIsActive',
  'window.location.replace(stateUrl(initialState))',
  "initialStateIsActive ? '/articles/' : window.location.pathname"
], 'article filter controller');
for (const prohibitedConcern of [
  'fetch(',
  'XMLHttpRequest',
  'localStorage',
  'sessionStorage',
  'document.cookie',
  'innerHTML',
  'outerHTML',
  'search-index.json',
  '.md'
]) {
  contract(!controllerSource.includes(prohibitedConcern), `Filter controller must not contain ${prohibitedConcern}.`);
}
includesAll(componentCss, [
  '.article-filter__summary',
  '[data-article-filter-clear][aria-disabled="true"]',
  'min-block-size: var(--size-touch-target)',
  '@media (prefers-reduced-motion: reduce)'
], 'components.css');

for (const [html, route, staticCount, supplementCount] of [
  [pageOneHtml, 'https://getlawscope.com/articles/', 9, 1],
  [pageTwoHtml, 'https://getlawscope.com/articles/page/2/', 1, 9]
]) {
  const activeMarkup = extractBetween(
    html,
    'data-article-results',
    '<template data-article-filter-supplement>',
    `${route} active results`
  );
  const supplementMarkup = extractBetween(
    html,
    '<template data-article-filter-supplement>',
    '<template data-article-empty-template>',
    `${route} supplement`
  );
  const activeSlugs = articleSlugs(activeMarkup);
  const supplementSlugs = articleSlugs(supplementMarkup);
  const fullGraph = [...activeSlugs, ...supplementSlugs];

  contract(activeSlugs.length === staticCount, `${route} must retain its original static card count.`);
  contract(supplementSlugs.length === supplementCount, `${route} must supplement only cards from the other static page.`);
  contract(new Set(fullGraph).size === publishedArticles.length, `${route} must expose each article once across active and inert cards.`);
  contract(
    publishedArticles.every((article) => fullGraph.includes(article.slug)),
    `${route} must make the complete published graph available to filtering.`
  );
  contract(
    (html.match(/data-article-category="[a-z0-9-]+"/g) || []).length === publishedArticles.length,
    `${route} cards must all expose bounded category metadata.`
  );
  contract(
    (html.match(/data-article-published="[^"]+"/g) || []).length === publishedArticles.length,
    `${route} cards must all expose a publication timestamp.`
  );
  contract(
    html.includes(`<link rel="canonical" href="${route}">`),
    `${route} must retain its clean static canonical URL.`
  );
  contract(!/<link rel="canonical" href="[^"]+\?/.test(html), `${route} canonical must never include filter state.`);
  contract(html.includes('aria-label="Articles pagination"'), `${route} must retain crawlable static pagination.`);
  contract(!html.includes('href="/articles/?q='), `${route} static primary content must not depend on a query URL.`);
}

// Pure executable model: normalization, controlled state, matching, sorting, count, and URL stability.
contract(normalizeArticleFilterText('Résumé & Due–Process') === 'resume due process', 'Matching must be case-, punctuation-, and diacritic-insensitive.');
const cleanState = sanitizeArticleFilterState(
  { q: '  Court   order  ', category: 'family-law', sort: 'updated' },
  categorySlugs
);
contract(cleanState.q === 'Court order', 'Query state must trim and collapse whitespace.');
contract(cleanState.category === 'family-law' && cleanState.sort === 'updated', 'Valid controlled category and sort values must survive.');
const rejectedState = sanitizeArticleFilterState(
  { q: '', category: 'invented-category', sort: 'popular' },
  categorySlugs
);
contract(rejectedState.category === '' && rejectedState.sort === ARTICLE_FILTER_DEFAULT_SORT, 'Unknown category and sort values must fall back safely.');
contract(isArticleFilterStateActive(cleanState), 'A query/category/nondefault sort must create active state.');
contract(!isArticleFilterStateActive(rejectedState), 'Default empty state must remain inactive.');

const parsedState = readArticleFilterState('?q=credit%20report&category=consumer-law&sort=updated', categorySlugs);
contract(parsedState.q === 'credit report' && parsedState.category === 'consumer-law' && parsedState.sort === 'updated', 'URL state must parse predictably.');
const stableUrl = createArticleFilterUrl(
  'https://getlawscope.com/articles/page/2/?utm_source=brief&q=old&sort=newest#library',
  { q: 'court order', category: 'family-law', sort: 'updated' },
  { allowedCategories: categorySlugs }
);
contract(stableUrl.pathname === '/articles/', 'Active state URLs must use the base listing route.');
contract(stableUrl.searchParams.get('utm_source') === 'brief', 'Unrelated tracking parameters must be preserved.');
contract(stableUrl.searchParams.get('q') === 'court order', 'Stable URLs must retain normalized query state.');
contract(stableUrl.searchParams.get('category') === 'family-law', 'Stable URLs must retain controlled category state.');
contract(stableUrl.searchParams.get('sort') === 'updated', 'Stable URLs must retain only nondefault sort state.');
contract(stableUrl.hash === '#library', 'Unrelated URL fragments must be preserved.');
const defaultUrl = createArticleFilterUrl(
  'https://getlawscope.com/articles/?utm_campaign=launch&q=old&category=family-law&sort=updated',
  { q: '', category: '', sort: 'newest' },
  { allowedCategories: categorySlugs }
);
contract(defaultUrl.search === '?utm_campaign=launch', 'Reset must remove only known filter parameters and omit the default sort.');

const fixtureRecords = [
  {
    slug: 'employment',
    title: 'At-Will Employment',
    excerpt: 'Workplace rights and exceptions.',
    category: 'employment-law',
    categoryName: 'Employment Law',
    tags: 'jobs termination',
    published: '2026-08-11T09:00:00Z',
    updated: ''
  },
  {
    slug: 'credit',
    title: 'Disputing Credit Report Errors',
    excerpt: 'How to challenge inaccurate reporting.',
    category: 'consumer-law',
    categoryName: 'Consumer Law',
    tags: 'résumé report dispute',
    published: '2026-08-03T09:00:00Z',
    updated: '2026-08-15T09:00:00Z'
  },
  {
    slug: 'custody',
    title: 'Child Custody Orders',
    excerpt: 'Factors courts commonly consider.',
    category: 'family-law',
    categoryName: 'Family Law',
    tags: 'children court order',
    published: '2026-08-08T09:00:00Z',
    updated: ''
  }
];
contract(
  filterAndSortArticleRecords(fixtureRecords, { q: 'resume', category: '', sort: 'newest' })[0]?.slug === 'credit',
  'Query matching must include normalized tags.'
);
contract(
  filterAndSortArticleRecords(fixtureRecords, { q: 'court factors', category: 'family-law', sort: 'newest' })[0]?.slug === 'custody',
  'Every query token must match across title, category, tags, or excerpt while category remains conjunctive.'
);
contract(
  filterAndSortArticleRecords(fixtureRecords, { q: '', category: '', sort: 'newest' }).map(({ slug }) => slug).join('|') === 'employment|custody|credit',
  'Newest sorting must use publication date descending.'
);
contract(
  filterAndSortArticleRecords(fixtureRecords, { q: '', category: '', sort: 'updated' }).map(({ slug }) => slug).join('|') === 'credit|employment|custody',
  'Updated sorting must use update date with publication fallback.'
);
contract(
  compareArticleFilterRecords(
    { title: 'Alpha', slug: 'a', published: '2026-01-01', updated: '' },
    { title: 'Beta', slug: 'b', published: '2026-01-01', updated: '' },
    'newest'
  ) < 0,
  'Equal dates must use a deterministic title/slug tie-break.'
);
contract(formatArticleFilterCount(1) === 'Showing 1 matching article.', 'Singular result count must be grammatical.');
contract(formatArticleFilterCount(0) === 'Showing 0 matching articles.', 'Zero result count must be explicit.');
contract(
  formatArticleFilterSummary(cleanState, 'Family Law') === 'Active filters — Keyword: “Court order”; Category: Family Law; Sort: Recently updated.',
  'Visible active-state summary must describe query, category, and sort.'
);
for (const categorySlug of categorySlugs) {
  const result = filterAndSortArticleRecords(
    publishedArticles.map((article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      categoryName: article.categoryName,
      tags: article.tags.join(' '),
      published: article.publish_date,
      updated: article.updated_date || ''
    })),
    { q: '', category: categorySlug, sort: 'newest' }
  );
  contract(result.length > 0, `Controlled category ${categorySlug} must resolve at least one published card.`);
  contract(result.every((article) => article.category === categorySlug), `${categorySlug} filtering must not leak other categories.`);
}

// Minimal executable controller harness for submit, reset, popstate, and page-2 routing.
function eventTarget(properties = {}) {
  const listeners = new Map();
  return Object.assign(properties, {
    addEventListener(type, listener) {
      const entries = listeners.get(type) || [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    emit(type, event = {}) {
      if (!('target' in event)) event.target = this;
      for (const listener of listeners.get(type) || []) listener(event);
    }
  });
}

function element(properties = {}) {
  const attributes = new Map(Object.entries(properties.attributes || {}));
  return eventTarget(Object.assign({
    dataset: {},
    childNodes: [],
    children: [],
    hidden: false,
    textContent: '',
    value: '',
    options: [],
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    replaceChildren(...nodes) {
      this.childNodes = [...nodes];
      this.children = [...nodes];
    },
    querySelectorAll(selector) {
      return selector === '.article-card'
        ? this.childNodes.filter((node) => node.isCard)
        : [];
    }
  }, properties));
}

function card(record) {
  return element({
    isCard: true,
    dataset: {
      articleSlug: record.slug,
      articleCategory: record.category,
      articleTags: record.tags,
      articlePublished: record.published,
      articleUpdated: record.updated
    },
    querySelector(selector) {
      const values = {
        '.article-card__title': record.title,
        '.article-card__excerpt': record.excerpt,
        '.article-card__category': record.categoryName
      };
      return selector in values ? { textContent: values[selector] } : null;
    }
  });
}

function createControllerHarness({ page = 1, search = '?utm_source=test' } = {}) {
  const staticA = card(fixtureRecords[0]);
  const staticB = card(fixtureRecords[1]);
  const supplemental = card(fixtureRecords[2]);
  const ad = element({ dataset: { adSlot: 'articles-in-feed' } });
  const form = element();
  const keyword = element();
  const category = element({
    options: [
      { value: '', textContent: 'All legal categories' },
      { value: 'employment-law', textContent: 'Employment Law' },
      { value: 'consumer-law', textContent: 'Consumer Law' },
      { value: 'family-law', textContent: 'Family Law' }
    ]
  });
  const sort = element({ value: 'newest' });
  const clear = element({ attributes: { 'aria-disabled': 'true' } });
  const summary = element({ textContent: 'No filters applied.' });
  const count = element({ textContent: 'Showing 3 articles. Page 1 displays articles 1–2.' });
  const results = element({
    childNodes: [staticA, ad, staticB],
    children: [staticA, ad, staticB],
    attributes: { 'aria-label': `Law articles, page ${page} of 2` }
  });
  const supplement = element({
    content: {
      querySelectorAll(selector) {
        return selector === '.article-card' ? [supplemental] : [];
      }
    }
  });
  const emptyState = element({
    cloneNode() {
      return element({ dataset: { articleEmptyState: '' } });
    }
  });
  const emptyTemplate = element({ content: { firstElementChild: emptyState } });
  const pagination = element();
  const map = new Map([
    ['[data-article-filter-form]', form],
    ['[data-article-filter-keyword]', keyword],
    ['[data-article-filter-category]', category],
    ['[data-article-filter-sort]', sort],
    ['[data-article-filter-clear]', clear],
    ['[data-article-filter-summary]', summary],
    ['[data-article-result-count]', count],
    ['[data-article-results]', results],
    ['[data-article-filter-supplement]', supplement],
    ['[data-article-empty-template]', emptyTemplate],
    ['.article-pagination', pagination]
  ]);
  const library = element({
    dataset: { currentPage: String(page) },
    querySelector(selector) {
      return map.get(selector) || null;
    }
  });
  const documentMock = {
    querySelector(selector) {
      return selector === '[data-article-library]' ? library : null;
    }
  };
  const locationState = { replaceCalls: [] };
  const initialUrl = new URL(`https://getlawscope.com${page === 1 ? '/articles/' : '/articles/page/2/'}${search}`);
  const location = {
    href: initialUrl.href,
    search: initialUrl.search,
    pathname: initialUrl.pathname,
    replace(url) {
      locationState.replaceCalls.push(String(url));
    }
  };
  function setLocation(url) {
    const next = new URL(String(url), location.href);
    location.href = next.href;
    location.search = next.search;
    location.pathname = next.pathname;
  }
  const historyState = { pushes: [], replacements: [] };
  const windowMock = eventTarget({
    location,
    history: {
      pushState(state, unused, url) {
        historyState.pushes.push({ state, url: String(url) });
        setLocation(url);
      },
      replaceState(state, unused, url) {
        historyState.replacements.push({ state, url: String(url) });
        setLocation(url);
      }
    }
  });

  const runnableController = controllerSource.replace(/^import[\s\S]*?from '\.\/article-filter-model\.js';\n/, '');
  vm.runInNewContext(runnableController, {
    document: documentMock,
    window: windowMock,
    URL,
    URLSearchParams,
    Array,
    Map,
    Set,
    String,
    Number,
    Boolean,
    Object,
    console,
    ARTICLE_FILTER_DEFAULT_SORT,
    createArticleFilterUrl,
    filterAndSortArticleRecords,
    formatArticleFilterCount,
    formatArticleFilterSummary,
    isArticleFilterStateActive,
    readArticleFilterState,
    sanitizeArticleFilterState
  }, { filename: 'js/article-filters.js' });

  return {
    library,
    form,
    keyword,
    category,
    sort,
    clear,
    summary,
    count,
    results,
    pagination,
    staticNodes: [staticA, ad, staticB],
    historyState,
    locationState,
    windowMock,
    setLocation
  };
}

const controllerHarness = createControllerHarness();
contract(controllerHarness.library.dataset.filterState === 'inactive', 'Initial clean state must preserve the static listing.');
contract(controllerHarness.results.childNodes[1] === controllerHarness.staticNodes[1], 'Initial static state must preserve the in-feed ad node.');
contract(controllerHarness.clear.getAttribute('aria-disabled') === 'true', 'Clear must start disabled when no filter is active.');
controllerHarness.keyword.value = 'resume';
controllerHarness.form.emit('submit', { preventDefault() {} });
contract(controllerHarness.historyState.pushes.length === 1, 'Submitting filters must create one browser-history entry.');
contract(controllerHarness.results.childNodes.length === 1 && controllerHarness.results.childNodes[0].dataset.articleSlug === 'credit', 'Submitting must render only matching full-library cards.');
contract(controllerHarness.count.textContent === 'Showing 1 matching article.', 'Submitting must update the live result count.');
contract(controllerHarness.pagination.hidden, 'Active filters must hide static pagination.');
contract(controllerHarness.clear.getAttribute('aria-disabled') === 'false', 'Active state must enable Clear filters.');
contract(new URL(controllerHarness.historyState.pushes[0].url).searchParams.get('utm_source') === 'test', 'Controller history must preserve unrelated parameters.');

controllerHarness.clear.emit('click', { preventDefault() {} });
contract(controllerHarness.historyState.pushes.length === 2, 'Clearing must create a predictable history entry.');
contract(controllerHarness.library.dataset.filterState === 'inactive', 'Clearing must restore inactive state.');
contract(controllerHarness.results.childNodes.every((node, index) => node === controllerHarness.staticNodes[index]), 'Clearing must restore the exact original cards and ad nodes.');
contract(!controllerHarness.pagination.hidden, 'Clearing must restore crawlable pagination.');
contract(controllerHarness.count.textContent.startsWith('Showing 3 articles.'), 'Clearing must restore the original static count copy.');

controllerHarness.setLocation('https://getlawscope.com/articles/?utm_source=test&category=family-law');
controllerHarness.windowMock.emit('popstate');
contract(controllerHarness.category.value === 'family-law', 'Popstate must restore category controls from the URL.');
contract(controllerHarness.results.childNodes[0]?.dataset.articleSlug === 'custody', 'Popstate must restore filtered results without adding history.');
const pushesBeforeSecondPop = controllerHarness.historyState.pushes.length;
controllerHarness.setLocation('https://getlawscope.com/articles/?utm_source=test');
controllerHarness.windowMock.emit('popstate');
contract(controllerHarness.library.dataset.filterState === 'inactive', 'Back/Forward to a clean URL must restore static state.');
contract(controllerHarness.historyState.pushes.length === pushesBeforeSecondPop, 'Popstate rendering must never push another history entry.');

const pageTwoHarness = createControllerHarness({
  page: 2,
  search: '?utm_medium=email&category=consumer-law'
});
contract(pageTwoHarness.locationState.replaceCalls.length === 1, 'Direct active state on page 2 must navigate once to the base listing.');
const redirectedUrl = new URL(pageTwoHarness.locationState.replaceCalls[0]);
contract(redirectedUrl.pathname === '/articles/', 'Page-2 active-state navigation must target /articles/.');
contract(redirectedUrl.searchParams.get('category') === 'consumer-law', 'Page-2 navigation must preserve active filter state.');
contract(redirectedUrl.searchParams.get('utm_medium') === 'email', 'Page-2 navigation must preserve unrelated parameters.');

includesAll(documentation, [
  'progressive enhancement',
  'ten controlled categories',
  '`q`',
  '`category`',
  '`sort=updated`',
  '`pushState`',
  '`replaceState`',
  '`popstate`',
  'canonical',
  'inert `<template>`',
  'does not fetch',
  'original static DOM nodes',
  'Module 19'
], 'Module 18 documentation');

console.log(`Category Filters validation passed (${contractCount} contracts).`);
console.log('All-ten matching, deterministic sorting, stable URLs, reset, result counts, canonical policy, and Back/Forward behavior verified.');
