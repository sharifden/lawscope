const ARTICLE_ROUTE_PATTERN = /^\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;

export const SEARCH_INDEX_VERSION = 1;
export const SEARCH_INDEX_PUBLIC_PATH = '/data/search-index.json';

function compareEntries(entryA, entryB) {
  const dateDifference = Date.parse(entryB.published) - Date.parse(entryA.published);
  if (dateDifference !== 0) return dateDifference;
  const titleDifference = entryA.title.localeCompare(entryB.title, 'en-US');
  if (titleDifference !== 0) return titleDifference;
  return entryA.url.localeCompare(entryB.url, 'en-US');
}

function requireSearchText(value, fieldName, sourceName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${sourceName}: search index requires a non-empty ${fieldName}`);
  }
  return value.trim();
}

function normalizeTags(tags, sourceName) {
  if (tags === undefined) return [];
  if (!Array.isArray(tags)) {
    throw new Error(`${sourceName}: search index tags must be an array`);
  }

  return [...new Set(tags.map((tag) => requireSearchText(tag, 'tag', sourceName)))];
}

/**
 * Creates the small public search payload from the same eligible article graph
 * used by the static page build. Defensive eligibility checks prevent a caller
 * from leaking drafts, preview entries, or future-dated content into the file.
 */
export function createSearchIndex(articles, { buildDate = new Date() } = {}) {
  if (!Array.isArray(articles)) {
    throw new Error('Search index input must be an array of articles.');
  }
  if (!(buildDate instanceof Date) || !Number.isFinite(buildDate.getTime())) {
    throw new Error('Search index buildDate must be a valid Date.');
  }

  const entries = [];
  const routes = new Set();

  for (const article of articles) {
    if (!article || typeof article !== 'object') continue;
    if (article.status !== 'published' || article.preview === true) continue;

    const sourceName = article.sourceFile || article.slug || 'article';
    const publishedTime = Date.parse(article.publish_date);
    if (!Number.isFinite(publishedTime)) {
      throw new Error(`${sourceName}: search index requires a valid publish_date`);
    }
    if (publishedTime > buildDate.getTime()) continue;

    const slug = requireSearchText(article.slug, 'slug', sourceName);
    const url = `/articles/${slug}/`;
    if (!ARTICLE_ROUTE_PATTERN.test(url)) {
      throw new Error(`${sourceName}: search index article route is invalid`);
    }
    if (routes.has(url)) {
      throw new Error(`${sourceName}: duplicate search index route ${url}`);
    }
    routes.add(url);

    entries.push({
      title: requireSearchText(article.title, 'title', sourceName),
      url,
      category: requireSearchText(article.categoryName, 'category name', sourceName),
      tags: normalizeTags(article.tags, sourceName),
      excerpt: requireSearchText(article.excerpt, 'excerpt', sourceName),
      published: new Date(publishedTime).toISOString()
    });
  }

  entries.sort(compareEntries);

  return {
    version: SEARCH_INDEX_VERSION,
    count: entries.length,
    entries
  };
}
