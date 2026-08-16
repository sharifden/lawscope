(() => {
  const searchPanel = document.querySelector('[data-search-panel]');
  if (!searchPanel) return;

  const searchForm = searchPanel.querySelector('[data-search-form]');
  const searchField = searchPanel.querySelector('[data-search-field]');
  const searchClear = searchPanel.querySelector('[data-search-clear]');
  const searchResults = searchPanel.querySelector('[data-search-results]');
  const searchStatus = searchPanel.querySelector('[data-search-status]');
  const searchList = searchPanel.querySelector('[data-search-list]');
  const searchFallback = searchPanel.querySelector('[data-search-fallback]');

  if (
    !searchForm ||
    !searchField ||
    !searchResults ||
    !searchStatus ||
    !searchList ||
    !searchFallback
  ) {
    return;
  }

  const SEARCH_INDEX_VERSION = 1;
  const INPUT_DELAY = 140;
  const MAX_INDEX_ENTRIES = 5000;
  const ARTICLE_ROUTE_PATTERN = /^\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
  const searchIndexUrl = searchResults.dataset.searchIndexUrl;
  const configuredLimit = Number.parseInt(searchResults.dataset.searchLimit, 10);
  const resultLimit = Number.isInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : 6;
  const maximumQueryLength = Number.parseInt(searchField.getAttribute('maxlength'), 10) || 120;
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });

  let indexedEntries = null;
  let indexPromise = null;
  let indexState = 'idle';
  let indexError = null;
  let inputTimer = null;
  let queryRevision = 0;
  let searchWasOpen = !searchPanel.hidden;

  function normalizeSearchText(value) {
    return String(value)
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('en-US')
      .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function currentQuery() {
    return searchField.value.trim().slice(0, maximumQueryLength);
  }

  function clearInputTimer() {
    if (inputTimer === null) return;
    window.clearTimeout(inputTimer);
    inputTimer = null;
  }

  function clearRenderedResults() {
    searchList.replaceChildren();
    searchList.hidden = true;
  }

  function setSearchState(state, message) {
    searchResults.dataset.searchState = state;
    searchResults.setAttribute('aria-busy', String(state === 'loading'));
    searchFallback.hidden = state !== 'empty' && state !== 'error';

    if (state !== 'results') clearRenderedResults();
    if (searchStatus.textContent.trim() !== message) searchStatus.textContent = message;
  }

  function renderPrompt(message = 'Enter a legal topic or phrase to search published Lawscope guides.') {
    setSearchState('idle', message);
  }

  function renderLoading() {
    setSearchState('loading', 'Loading the published article search index…');
  }

  function renderError() {
    setSearchState(
      'error',
      'Search is temporarily unavailable. You can browse all articles or categories instead.'
    );
  }

  function validateText(value, maximumLength) {
    return typeof value === 'string' && value.trim() !== '' && value.length <= maximumLength;
  }

  function prepareIndex(payload) {
    if (
      !payload ||
      payload.version !== SEARCH_INDEX_VERSION ||
      !Array.isArray(payload.entries) ||
      payload.entries.length > MAX_INDEX_ENTRIES ||
      payload.count !== payload.entries.length
    ) {
      throw new Error('Search index schema is invalid.');
    }

    return payload.entries.map((entry) => {
      const validTags = Array.isArray(entry.tags) &&
        entry.tags.length <= 20 &&
        entry.tags.every((tag) => validateText(tag, 100));
      const publishedTime = Date.parse(entry.published);

      if (
        !validateText(entry.title, 240) ||
        !validateText(entry.category, 120) ||
        !validateText(entry.excerpt, 500) ||
        !validTags ||
        !ARTICLE_ROUTE_PATTERN.test(entry.url) ||
        !Number.isFinite(publishedTime)
      ) {
        throw new Error('Search index entry is invalid.');
      }

      const normalizedTitle = normalizeSearchText(entry.title);
      const normalizedCategory = normalizeSearchText(entry.category);
      const normalizedTags = entry.tags.map(normalizeSearchText);
      const normalizedExcerpt = normalizeSearchText(entry.excerpt);

      return {
        ...entry,
        publishedTime,
        normalizedTitle,
        normalizedCategory,
        normalizedTags,
        normalizedExcerpt,
        searchText: [
          normalizedTitle,
          normalizedCategory,
          ...normalizedTags,
          normalizedExcerpt
        ].join(' ')
      };
    });
  }

  async function loadSearchIndex({ retry = false } = {}) {
    if (indexedEntries) return indexedEntries;
    if (indexPromise) return indexPromise;
    if (indexState === 'error' && !retry) throw indexError;
    if (!searchIndexUrl) throw new Error('Search index URL is not configured.');

    indexState = 'loading';
    indexError = null;
    indexPromise = fetch(searchIndexUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'force-cache',
      referrerPolicy: 'same-origin'
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Search index request failed with ${response.status}.`);
        return response.json();
      })
      .then((payload) => {
        indexedEntries = prepareIndex(payload);
        indexState = 'ready';
        return indexedEntries;
      })
      .catch((error) => {
        indexState = 'error';
        indexError = error;
        throw error;
      })
      .finally(() => {
        indexPromise = null;
      });

    return indexPromise;
  }

  function scoreEntry(entry, normalizedQuery, queryTokens) {
    if (!queryTokens.every((token) => entry.searchText.includes(token))) return null;

    let score = 0;
    if (entry.normalizedTitle === normalizedQuery) score += 120;
    else if (entry.normalizedTitle.startsWith(normalizedQuery)) score += 80;
    else if (entry.normalizedTitle.includes(normalizedQuery)) score += 55;

    if (entry.normalizedCategory === normalizedQuery) score += 45;
    else if (entry.normalizedCategory.includes(normalizedQuery)) score += 25;

    if (entry.normalizedTags.some((tag) => tag === normalizedQuery)) score += 50;
    else if (entry.normalizedTags.some((tag) => tag.includes(normalizedQuery))) score += 30;

    if (entry.normalizedExcerpt.includes(normalizedQuery)) score += 12;

    for (const token of queryTokens) {
      if (entry.normalizedTitle.includes(token)) score += 12;
      if (entry.normalizedCategory.includes(token)) score += 7;
      if (entry.normalizedTags.some((tag) => tag.includes(token))) score += 9;
      if (entry.normalizedExcerpt.includes(token)) score += 2;
    }

    return score;
  }

  function findMatches(query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return { normalizedQuery, matches: [] };

    const queryTokens = [...new Set(normalizedQuery.split(' '))];
    const matches = indexedEntries
      .map((entry) => ({
        entry,
        score: scoreEntry(entry, normalizedQuery, queryTokens)
      }))
      .filter((match) => match.score !== null)
      .sort(
        (matchA, matchB) =>
          matchB.score - matchA.score ||
          matchB.entry.publishedTime - matchA.entry.publishedTime ||
          matchA.entry.title.localeCompare(matchB.entry.title, 'en-US')
      );

    return { normalizedQuery, matches };
  }

  function createResultItem(entry, index) {
    const item = document.createElement('li');
    item.className = 'site-search__item';

    const link = document.createElement('a');
    link.className = 'site-search__result';
    link.href = entry.url;
    link.dataset.searchResultLink = '';
    link.id = `site-search-result-${index + 1}`;

    const title = document.createElement('span');
    title.className = 'site-search__result-title';
    title.textContent = entry.title;

    const metadata = document.createElement('span');
    metadata.className = 'site-search__result-meta';

    const category = document.createElement('span');
    category.textContent = entry.category;

    const separator = document.createElement('span');
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '•';

    const date = document.createElement('time');
    date.dateTime = entry.published;
    date.textContent = dateFormatter.format(new Date(entry.publishedTime));

    metadata.append(category, separator, date);
    link.append(title, metadata);
    item.append(link);
    return item;
  }

  function renderMatches(query, matches) {
    if (matches.length === 0) {
      setSearchState('empty', `No published articles found for “${query}”.`);
      return [];
    }

    const displayedMatches = matches.slice(0, resultLimit);
    const fragment = document.createDocumentFragment();
    displayedMatches.forEach(({ entry }, index) => {
      fragment.append(createResultItem(entry, index));
    });
    searchList.replaceChildren(fragment);
    searchList.hidden = false;
    searchFallback.hidden = true;
    searchResults.dataset.searchState = 'results';
    searchResults.setAttribute('aria-busy', 'false');

    const resultWord = matches.length === 1 ? 'result' : 'results';
    const boundedMessage = matches.length > displayedMatches.length
      ? ` Showing the first ${displayedMatches.length}.`
      : '';
    const message = `${matches.length} ${resultWord} found for “${query}”.${boundedMessage}`;
    if (searchStatus.textContent.trim() !== message) searchStatus.textContent = message;

    return [...searchList.querySelectorAll('[data-search-result-link]')];
  }

  async function executeSearch(query, revision, { focusFirst = false } = {}) {
    if (!normalizeSearchText(query)) {
      if (revision === queryRevision) {
        renderPrompt('Enter at least one letter or number to search published guides.');
      }
      return;
    }

    if (!indexedEntries) renderLoading();

    try {
      await loadSearchIndex();
    } catch {
      if (revision === queryRevision && !searchPanel.hidden) renderError();
      return;
    }

    if (revision !== queryRevision || searchPanel.hidden || currentQuery() !== query) return;
    const { matches } = findMatches(query);
    const resultLinks = renderMatches(query, matches);
    if (focusFirst) resultLinks.at(0)?.focus();
  }

  function queueInputSearch() {
    clearInputTimer();
    const query = currentQuery();
    const revision = ++queryRevision;

    if (!query) {
      renderPrompt();
      return;
    }

    inputTimer = window.setTimeout(() => {
      inputTimer = null;
      void executeSearch(query, revision);
    }, INPUT_DELAY);
  }

  async function handleSearchOpen() {
    clearInputTimer();
    const revision = ++queryRevision;
    const query = currentQuery();

    if (!indexedEntries) renderLoading();

    try {
      await loadSearchIndex({ retry: indexState === 'error' });
    } catch {
      if (revision === queryRevision && !searchPanel.hidden) renderError();
      return;
    }

    if (revision !== queryRevision || searchPanel.hidden) return;
    if (query) {
      await executeSearch(query, revision);
    } else {
      renderPrompt();
    }
  }

  function resetClosedSearch() {
    clearInputTimer();
    queryRevision += 1;
    searchField.value = '';
    if (searchClear) searchClear.hidden = true;
    renderPrompt();
  }

  function resultLinks() {
    return [...searchList.querySelectorAll('[data-search-result-link]')];
  }

  searchField.addEventListener('input', queueInputSearch);

  searchField.addEventListener('keydown', (event) => {
    const links = resultLinks();
    if (links.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      links.at(0).focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      links.at(-1).focus();
    }
  });

  searchList.addEventListener('keydown', (event) => {
    const activeLink = event.target.closest?.('[data-search-result-link]');
    const links = resultLinks();
    const activeIndex = links.indexOf(activeLink);
    if (activeIndex < 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      links.at(Math.min(activeIndex + 1, links.length - 1)).focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (activeIndex === 0) searchField.focus();
      else links.at(activeIndex - 1).focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      links.at(0).focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      links.at(-1).focus();
    }
  });

  searchForm.addEventListener('submit', (event) => {
    const query = currentQuery();
    if (!normalizeSearchText(query)) {
      event.preventDefault();
      queryRevision += 1;
      renderPrompt('Enter at least one letter or number to search published guides.');
      searchField.focus();
      return;
    }

    // A known index failure releases the ordinary GET form as a progressive fallback.
    if (indexState === 'error') return;

    event.preventDefault();
    clearInputTimer();
    const revision = ++queryRevision;
    void executeSearch(query, revision, { focusFirst: true });
  });

  document.addEventListener('lawscope:site-surface-change', (event) => {
    const searchIsOpen = event.detail?.searchIsOpen === true;
    if (searchIsOpen === searchWasOpen) return;
    searchWasOpen = searchIsOpen;

    if (searchIsOpen) {
      void handleSearchOpen();
    } else {
      resetClosedSearch();
    }
  });
})();
