import { compareArticles } from './content-graph.mjs';

export const CATEGORY_PAGE_SIZE = 9;
export const CATEGORY_AD_INSERT_AFTER = 6;

function categorySlugIsValid(categorySlug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(categorySlug));
}

export function categoryPageRoute(categorySlug, pageNumber = 1) {
  if (!categorySlugIsValid(categorySlug)) {
    throw new Error('Category page routes require a valid controlled slug.');
  }
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error('Category page numbers must be positive integers.');
  }
  return pageNumber === 1
    ? `/categories/${categorySlug}/`
    : `/categories/${categorySlug}/page/${pageNumber}/`;
}

export const createCategoryRoute = categoryPageRoute;

export function selectCategoryFeaturedArticle(articles) {
  if (!Array.isArray(articles)) {
    throw new Error('Category featured selection requires an article array.');
  }
  if (articles.length < 2) return null;
  return [...articles].sort(compareArticles).find((article) => article.featured === true) || null;
}

export function createCategoryFeedSequence(
  articles,
  { adInsertAfter = CATEGORY_AD_INSERT_AFTER } = {}
) {
  if (!Array.isArray(articles)) {
    throw new Error('Category feed sequencing requires an article array.');
  }
  if (!Number.isInteger(adInsertAfter) || adInsertAfter < 1) {
    throw new Error('Category ad insertion position must be a positive integer.');
  }

  const sequence = articles.map((article) => Object.freeze({
    type: 'article',
    article
  }));
  if (articles.length > adInsertAfter) {
    sequence.splice(adInsertAfter, 0, Object.freeze({ type: 'advertisement' }));
  }
  return Object.freeze(sequence);
}

export function createCategoryPagination(
  categorySlug,
  articles,
  { pageSize = CATEGORY_PAGE_SIZE } = {}
) {
  if (!categorySlugIsValid(categorySlug)) {
    throw new Error('Category pagination requires a valid controlled slug.');
  }
  if (!Array.isArray(articles)) {
    throw new Error('Category pagination requires an article array.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Category page size must be a positive integer.');
  }
  if (articles.some((article) => article.category !== categorySlug)) {
    throw new Error(`Category pagination received an article outside ${categorySlug}.`);
  }

  const orderedArticles = [...articles].sort(compareArticles);
  const totalItems = orderedArticles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return Array.from({ length: totalPages }, (_, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const itemOffset = pageIndex * pageSize;
    const items = orderedArticles.slice(itemOffset, itemOffset + pageSize);

    return Object.freeze({
      categorySlug,
      pageNumber,
      route: categoryPageRoute(categorySlug, pageNumber),
      previousRoute: pageNumber > 1
        ? categoryPageRoute(categorySlug, pageNumber - 1)
        : null,
      nextRoute: pageNumber < totalPages
        ? categoryPageRoute(categorySlug, pageNumber + 1)
        : null,
      totalItems,
      totalPages,
      firstItemNumber: items.length > 0 ? itemOffset + 1 : 0,
      lastItemNumber: itemOffset + items.length,
      items: Object.freeze(items)
    });
  });
}

export function createCategoryPageModel(
  category,
  publishedArticles,
  { pageSize = CATEGORY_PAGE_SIZE } = {}
) {
  if (!category || !categorySlugIsValid(category.slug)) {
    throw new Error('Category page generation requires a controlled category record.');
  }
  if (!Array.isArray(publishedArticles)) {
    throw new Error('Category page generation requires published articles.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 2) {
    throw new Error('Category page models require a page size of at least two.');
  }

  const matchingArticles = publishedArticles
    .filter((article) => article.category === category.slug)
    .sort(compareArticles);
  const featuredArticle = selectCategoryFeaturedArticle(matchingArticles);
  const listingArticles = featuredArticle
    ? matchingArticles.filter((article) => article.slug !== featuredArticle.slug)
    : matchingArticles;
  const totalItems = matchingArticles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const pages = Array.from({ length: totalPages }, (_, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const listingOffset = featuredArticle
      ? pageIndex === 0
        ? 0
        : pageSize - 1 + (pageIndex - 1) * pageSize
      : pageIndex * pageSize;
    const listingLimit = featuredArticle && pageIndex === 0
      ? pageSize - 1
      : pageSize;
    const items = listingArticles.slice(listingOffset, listingOffset + listingLimit);
    const pageFeaturedArticle = pageIndex === 0 ? featuredArticle : null;
    const visibleArticles = pageFeaturedArticle
      ? [pageFeaturedArticle, ...items]
      : items;
    const itemOffset = pageIndex * pageSize;

    return Object.freeze({
      categorySlug: category.slug,
      pageNumber,
      route: categoryPageRoute(category.slug, pageNumber),
      previousRoute: pageNumber > 1
        ? categoryPageRoute(category.slug, pageNumber - 1)
        : null,
      nextRoute: pageNumber < totalPages
        ? categoryPageRoute(category.slug, pageNumber + 1)
        : null,
      totalItems,
      totalPages,
      firstItemNumber: visibleArticles.length > 0 ? itemOffset + 1 : 0,
      lastItemNumber: itemOffset + visibleArticles.length,
      featuredArticle: pageFeaturedArticle,
      items: Object.freeze(items),
      visibleArticles: Object.freeze(visibleArticles)
    });
  });

  return Object.freeze({
    category,
    totalArticles: matchingArticles.length,
    featuredArticle,
    pages: Object.freeze(pages)
  });
}

export function createAllCategoryPages(
  categories,
  publishedArticles,
  { pageSize = CATEGORY_PAGE_SIZE } = {}
) {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('Category page generation requires controlled categories.');
  }
  if (!Array.isArray(publishedArticles)) {
    throw new Error('Category page generation requires published articles.');
  }

  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  if (categoryBySlug.size !== categories.length) {
    throw new Error('Category page generation requires unique category slugs.');
  }

  return Object.freeze(
    categories.flatMap((category) => {
      const relatedCategories = category.related_categories.map((relatedSlug) => {
        const relatedCategory = categoryBySlug.get(relatedSlug);
        if (!relatedCategory) {
          throw new Error(`${category.slug}: unknown related category ${relatedSlug}.`);
        }
        return relatedCategory;
      });
      const categoryModel = createCategoryPageModel(category, publishedArticles, { pageSize });
      return categoryModel.pages.map((page) => Object.freeze({
        ...page,
        category,
        relatedCategories: Object.freeze(relatedCategories)
      }));
    })
  );
}
