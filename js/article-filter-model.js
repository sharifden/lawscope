const KNOWN_PARAMETERS = ['q', 'category', 'sort'];

export const ARTICLE_FILTER_DEFAULT_SORT = 'newest';
export const ARTICLE_FILTER_SORTS = Object.freeze(['newest', 'updated']);

export function normalizeArticleFilterText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function sanitizeArticleFilterState(state = {}, allowedCategories = []) {
  const allowedCategorySet = new Set(allowedCategories);
  const q = String(state.q ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const requestedCategory = String(state.category ?? '');
  const requestedSort = String(state.sort ?? ARTICLE_FILTER_DEFAULT_SORT);

  return Object.freeze({
    q,
    category: allowedCategorySet.has(requestedCategory) ? requestedCategory : '',
    sort: ARTICLE_FILTER_SORTS.includes(requestedSort)
      ? requestedSort
      : ARTICLE_FILTER_DEFAULT_SORT
  });
}

export function readArticleFilterState(search, allowedCategories = []) {
  const parameters = new URLSearchParams(search);
  return sanitizeArticleFilterState(
    {
      q: parameters.get('q'),
      category: parameters.get('category'),
      sort: parameters.get('sort')
    },
    allowedCategories
  );
}

export function isArticleFilterStateActive(state) {
  return Boolean(
    state.q ||
    state.category ||
    state.sort !== ARTICLE_FILTER_DEFAULT_SORT
  );
}

export function createArticleFilterUrl(
  href,
  state,
  { basePath = '/articles/', allowedCategories = [] } = {}
) {
  const url = new URL(href);
  const cleanState = sanitizeArticleFilterState(state, allowedCategories);

  KNOWN_PARAMETERS.forEach((parameter) => url.searchParams.delete(parameter));
  if (cleanState.q) url.searchParams.set('q', cleanState.q);
  if (cleanState.category) url.searchParams.set('category', cleanState.category);
  if (cleanState.sort !== ARTICLE_FILTER_DEFAULT_SORT) {
    url.searchParams.set('sort', cleanState.sort);
  }
  url.pathname = basePath;

  return url;
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'en-US', { sensitivity: 'base' });
}

function timestamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compareArticleFilterRecords(left, right, sort = ARTICLE_FILTER_DEFAULT_SORT) {
  if (sort === 'updated') {
    const leftUpdated = timestamp(left.updated || left.published);
    const rightUpdated = timestamp(right.updated || right.published);
    if (rightUpdated !== leftUpdated) return rightUpdated - leftUpdated;
  }

  const publishedDifference = timestamp(right.published) - timestamp(left.published);
  if (publishedDifference !== 0) return publishedDifference;

  const titleDifference = compareText(left.title, right.title);
  if (titleDifference !== 0) return titleDifference;

  return compareText(left.slug, right.slug);
}

export function filterAndSortArticleRecords(records, state) {
  const queryTokens = normalizeArticleFilterText(state.q).split(' ').filter(Boolean);

  return records
    .filter((record) => {
      if (state.category && record.category !== state.category) return false;

      const searchableText = normalizeArticleFilterText([
        record.title,
        record.category,
        record.categoryName,
        record.tags,
        record.excerpt
      ].join(' '));

      return queryTokens.every((token) => searchableText.includes(token));
    })
    .sort((left, right) => compareArticleFilterRecords(left, right, state.sort));
}

export function formatArticleFilterCount(count) {
  return count === 1
    ? 'Showing 1 matching article.'
    : `Showing ${count} matching articles.`;
}

export function formatArticleFilterSummary(state, categoryName = '') {
  const parts = [];
  if (state.q) parts.push(`Keyword: “${state.q}”`);
  if (state.category) parts.push(`Category: ${categoryName || state.category}`);
  if (state.sort === 'updated') parts.push('Sort: Recently updated');
  return parts.length > 0 ? `Active filters — ${parts.join('; ')}.` : 'No filters applied.';
}
