const root = document.documentElement;
root.classList.add('js-enabled');

const header = document.querySelector('[data-site-header]');

if (header) {
  const navigation = header.querySelector('[data-primary-navigation]');
  const menuToggle = header.querySelector('[data-menu-toggle]');
  const menuClose = header.querySelector('[data-menu-close]');
  const searchToggle = header.querySelector('[data-search-toggle]');
  const searchPanel = header.querySelector('[data-search-panel]');
  const searchClose = header.querySelector('[data-search-close]');
  const searchField = header.querySelector('[data-search-field]');
  const searchClear = header.querySelector('[data-search-clear]');
  const searchForm = header.querySelector('[data-search-form]');
  const breakpointMedium = getComputedStyle(root)
    .getPropertyValue('--breakpoint-medium')
    .trim();
  const desktopQuery = window.matchMedia(`(min-width: ${breakpointMedium})`);
  let menuIsOpen = false;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function publishSurfaceState() {
    const navigationIsOpen = menuIsOpen && !desktopQuery.matches;
    const searchIsOpen = Boolean(searchPanel && !searchPanel.hidden);
    const surfaceIsOpen = navigationIsOpen || searchIsOpen;

    root.classList.toggle('site-surface-open', surfaceIsOpen);
    document.dispatchEvent(
      new CustomEvent('lawscope:site-surface-change', {
        detail: { navigationIsOpen, searchIsOpen }
      })
    );
  }

  function animateOpening(element) {
    if (!element) return;
    element.classList.remove('is-opening');
    window.requestAnimationFrame(() => element.classList.add('is-opening'));
    element.addEventListener(
      'animationend',
      () => element.classList.remove('is-opening'),
      { once: true }
    );
  }

  function closeSearch({ returnFocus = false } = {}) {
    if (!searchPanel || !searchToggle || searchPanel.hidden) return;
    searchPanel.hidden = true;
    searchPanel.classList.remove('is-opening');
    searchToggle.setAttribute('aria-expanded', 'false');
    searchToggle.setAttribute('aria-label', 'Open site search');
    publishSurfaceState();
    if (returnFocus) searchToggle.focus();
  }

  function closeMenu({ returnFocus = false } = {}) {
    if (!navigation || !menuToggle) return;
    menuIsOpen = false;
    navigation.classList.remove('is-opening');
    navigation.hidden = !desktopQuery.matches;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open main menu');
    publishSurfaceState();
    if (returnFocus && !desktopQuery.matches) menuToggle.focus();
  }

  function openMenu() {
    if (!navigation || !menuToggle || desktopQuery.matches) return;
    closeSearch();
    menuIsOpen = true;
    navigation.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close main menu');
    publishSurfaceState();
    animateOpening(navigation);
    (menuClose || navigation.querySelector(focusableSelector))?.focus();
  }

  function openSearch() {
    if (!searchPanel || !searchToggle) return;
    closeMenu();
    searchPanel.hidden = false;
    searchToggle.setAttribute('aria-expanded', 'true');
    searchToggle.setAttribute('aria-label', 'Close site search');
    publishSurfaceState();
    animateOpening(searchPanel);
    searchField?.focus();
  }

  function syncSearchClear() {
    if (!searchField || !searchClear) return;
    searchClear.hidden = searchField.value.length === 0;
  }

  menuToggle?.addEventListener('click', () => {
    if (menuIsOpen) {
      closeMenu({ returnFocus: true });
    } else {
      openMenu();
    }
  });

  menuClose?.addEventListener('click', () => closeMenu({ returnFocus: true }));

  navigation?.addEventListener('click', (event) => {
    if (event.target.closest('a[href]') && !desktopQuery.matches) closeMenu();
  });

  navigation?.addEventListener('keydown', (event) => {
    if (!menuIsOpen || desktopQuery.matches) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ returnFocus: true });
      return;
    }

    if (event.key !== 'Tab') return;
    const focusableElements = [...navigation.querySelectorAll(focusableSelector)];
    const firstElement = focusableElements.at(0);
    const lastElement = focusableElements.at(-1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  });

  document.addEventListener('focusin', (event) => {
    if (
      menuIsOpen &&
      !desktopQuery.matches &&
      navigation &&
      !navigation.contains(event.target)
    ) {
      (menuClose || navigation.querySelector(focusableSelector))?.focus();
    }
  });

  searchToggle?.addEventListener('click', () => {
    if (searchPanel?.hidden) {
      openSearch();
    } else {
      closeSearch({ returnFocus: true });
    }
  });

  searchClose?.addEventListener('click', () => closeSearch({ returnFocus: true }));

  searchPanel?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch({ returnFocus: true });
    }
  });

  searchField?.addEventListener('input', syncSearchClear);

  searchClear?.addEventListener('click', () => {
    if (!searchField) return;
    searchField.value = '';
    syncSearchClear();
    searchField.dispatchEvent(new Event('input', { bubbles: true }));
    searchField.focus();
  });

  searchForm?.addEventListener('submit', (event) => {
    if (!searchField?.value.trim()) {
      event.preventDefault();
      searchField?.focus();
    }
  });

  desktopQuery.addEventListener('change', () => {
    closeMenu();
    if (navigation) navigation.hidden = !desktopQuery.matches;
  });

  if (navigation) navigation.hidden = !desktopQuery.matches;
  syncSearchClear();
  publishSurfaceState();
}
