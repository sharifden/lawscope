import {
  ARTICLE_FILTER_DEFAULT_SORT,
  createArticleFilterUrl,
  filterAndSortArticleRecords,
  formatArticleFilterCount,
  formatArticleFilterSummary,
  isArticleFilterStateActive,
  readArticleFilterState,
  sanitizeArticleFilterState
} from './article-filter-model.js';

const library = document.querySelector('[data-article-library]');

if (library) {
  const form = library.querySelector('[data-article-filter-form]');
  const keywordControl = library.querySelector('[data-article-filter-keyword]');
  const categoryControl = library.querySelector('[data-article-filter-category]');
  const sortControl = library.querySelector('[data-article-filter-sort]');
  const clearControl = library.querySelector('[data-article-filter-clear]');
  const filterSummary = library.querySelector('[data-article-filter-summary]');
  const resultCount = library.querySelector('[data-article-result-count]');
  const results = library.querySelector('[data-article-results]');
  const supplement = library.querySelector('[data-article-filter-supplement]');
  const emptyTemplate = library.querySelector('[data-article-empty-template]');
  const pagination = library.querySelector('.article-pagination');

  const requiredElements = [
    form,
    keywordControl,
    categoryControl,
    sortControl,
    clearControl,
    filterSummary,
    resultCount,
    results,
    supplement,
    emptyTemplate
  ];

  if (requiredElements.every(Boolean)) {
    const allowedCategories = Array.from(categoryControl.options)
      .map((option) => option.value)
      .filter(Boolean);
    const categoryNames = new Map(
      Array.from(categoryControl.options)
        .filter((option) => option.value)
        .map((option) => [option.value, option.textContent.trim()])
    );
    const originalResultNodes = Array.from(results.childNodes);
    const originalResultCount = resultCount.textContent.trim();
    const originalResultsLabel = results.getAttribute('aria-label');
    const originalPaginationHidden = pagination?.hidden ?? false;
    const currentPage = Number.parseInt(library.dataset.currentPage, 10) || 1;
    const staticCards = Array.from(results.querySelectorAll('.article-card'));
    const supplementalCards = Array.from(
      supplement.content.querySelectorAll('.article-card')
    );
    const seenSlugs = new Set();
    const cards = [...staticCards, ...supplementalCards].filter((card) => {
      const slug = card.dataset.articleSlug;
      if (!slug || seenSlugs.has(slug)) return false;
      seenSlugs.add(slug);
      return true;
    });
    const records = cards.map((card) => ({
      node: card,
      slug: card.dataset.articleSlug,
      title: card.querySelector('.article-card__title')?.textContent.trim() ?? '',
      excerpt: card.querySelector('.article-card__excerpt')?.textContent.trim() ?? '',
      category: card.dataset.articleCategory ?? '',
      categoryName: card.querySelector('.article-card__category')?.textContent.trim() ?? '',
      tags: card.dataset.articleTags ?? '',
      published: card.dataset.articlePublished ?? '',
      updated: card.dataset.articleUpdated ?? ''
    }));

    function stateFromControls() {
      return sanitizeArticleFilterState(
        {
          q: keywordControl.value,
          category: categoryControl.value,
          sort: sortControl.value
        },
        allowedCategories
      );
    }

    function stateFromLocation() {
      return readArticleFilterState(window.location.search, allowedCategories);
    }

    function setControls(state) {
      keywordControl.value = state.q;
      categoryControl.value = state.category;
      sortControl.value = state.sort;
    }

    function updateClearControl(active) {
      clearControl.setAttribute('aria-disabled', String(!active));
      clearControl.dataset.active = String(active);
    }

    function restoreStaticListing(state) {
      results.replaceChildren(...originalResultNodes);
      resultCount.textContent = originalResultCount;
      if (originalResultsLabel === null) {
        results.removeAttribute('aria-label');
      } else {
        results.setAttribute('aria-label', originalResultsLabel);
      }
      if (pagination) pagination.hidden = originalPaginationHidden;
      filterSummary.textContent = formatArticleFilterSummary(state);
      updateClearControl(false);
      library.dataset.filterState = 'inactive';
    }

    function renderActiveListing(state) {
      const matches = filterAndSortArticleRecords(records, state);
      const renderedNodes = matches.length > 0
        ? matches.map((record) => record.node)
        : [emptyTemplate.content.firstElementChild.cloneNode(true)];

      results.replaceChildren(...renderedNodes);
      results.setAttribute('aria-label', 'Filtered law articles');
      resultCount.textContent = formatArticleFilterCount(matches.length);
      filterSummary.textContent = formatArticleFilterSummary(
        state,
        categoryNames.get(state.category)
      );
      if (pagination) pagination.hidden = true;
      updateClearControl(true);
      library.dataset.filterState = matches.length > 0 ? 'active' : 'empty';
    }

    function renderState(state) {
      setControls(state);
      if (isArticleFilterStateActive(state)) {
        renderActiveListing(state);
      } else {
        restoreStaticListing(state);
      }
    }

    function stateUrl(state, basePath = '/articles/') {
      return createArticleFilterUrl(window.location.href, state, {
        basePath,
        allowedCategories
      });
    }

    function commitState(state, historyMethod = 'pushState') {
      const url = stateUrl(state);
      window.history[historyMethod]({ articleFilters: state }, '', url);
      renderState(state);
    }

    const initialState = stateFromLocation();
    const initialStateIsActive = isArticleFilterStateActive(initialState);

    if (currentPage > 1 && initialStateIsActive) {
      window.location.replace(stateUrl(initialState));
    } else {
      const stableInitialUrl = stateUrl(
        initialState,
        initialStateIsActive ? '/articles/' : window.location.pathname
      );
      if (stableInitialUrl.href !== window.location.href) {
        window.history.replaceState({ articleFilters: initialState }, '', stableInitialUrl);
      }
      renderState(initialState);

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        commitState(stateFromControls());
      });

      clearControl.addEventListener('click', (event) => {
        event.preventDefault();
        if (clearControl.dataset.active !== 'true') return;
        commitState(
          sanitizeArticleFilterState(
            { q: '', category: '', sort: ARTICLE_FILTER_DEFAULT_SORT },
            allowedCategories
          )
        );
      });

      library.addEventListener('click', (event) => {
        const resetControl = event.target.closest('[data-article-filter-reset]');
        if (!resetControl) return;
        event.preventDefault();
        commitState(
          sanitizeArticleFilterState(
            { q: '', category: '', sort: ARTICLE_FILTER_DEFAULT_SORT },
            allowedCategories
          )
        );
      });

      window.addEventListener('popstate', () => {
        renderState(stateFromLocation());
      });
    }
  }
}
