import { compareArticles } from './content-graph.mjs';

export const ARTICLES_PAGE_SIZE = 9;
export const ARTICLES_AD_INSERT_AFTER = 6;

export function articlesPageRoute(pageNumber) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error('Article listing page numbers must be positive integers.');
  }
  return pageNumber === 1 ? '/articles/' : `/articles/page/${pageNumber}/`;
}

export function createArticlesPagination(
  articles,
  { pageSize = ARTICLES_PAGE_SIZE } = {}
) {
  if (!Array.isArray(articles)) {
    throw new Error('Article pagination requires an array of published articles.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Article listing page size must be a positive integer.');
  }

  const orderedArticles = [...articles].sort(compareArticles);
  const totalItems = orderedArticles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return Array.from({ length: totalPages }, (_, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const itemOffset = pageIndex * pageSize;
    const items = orderedArticles.slice(itemOffset, itemOffset + pageSize);
    const firstItemNumber = items.length > 0 ? itemOffset + 1 : 0;
    const lastItemNumber = itemOffset + items.length;

    return Object.freeze({
      pageNumber,
      route: articlesPageRoute(pageNumber),
      previousRoute: pageNumber > 1 ? articlesPageRoute(pageNumber - 1) : null,
      nextRoute: pageNumber < totalPages ? articlesPageRoute(pageNumber + 1) : null,
      totalItems,
      totalPages,
      firstItemNumber,
      lastItemNumber,
      items: Object.freeze(items)
    });
  });
}
