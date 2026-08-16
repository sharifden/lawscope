(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const themeIcon = themeToggle?.querySelector('[data-theme-icon]');
  const themeLabel = themeToggle?.querySelector('[data-theme-label]');
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'lawscope-theme';
  const allowedThemes = new Set(['light', 'dark']);
  let transitionCleanupId;

  function readStoredTheme() {
    try {
      const storedTheme = window.localStorage.getItem(storageKey);
      return allowedThemes.has(storedTheme) ? storedTheme : null;
    } catch {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // The selected theme still applies for this page when storage is unavailable.
    }
  }

  function resolveSystemTheme() {
    return systemDarkQuery.matches ? 'dark' : 'light';
  }

  function resolveTheme() {
    return readStoredTheme() || resolveSystemTheme();
  }

  function parseCssTime(value) {
    const normalizedValue = value.trim().toLowerCase();
    const numericValue = Number.parseFloat(normalizedValue);
    if (!Number.isFinite(numericValue)) return 0;
    return normalizedValue.endsWith('ms') ? numericValue : numericValue * 1000;
  }

  function beginPaletteTransition() {
    window.clearTimeout(transitionCleanupId);
    root.classList.add('theme-transition');
    root.getBoundingClientRect();

    const duration = parseCssTime(
      getComputedStyle(root).getPropertyValue('--duration-standard')
    );
    transitionCleanupId = window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, duration);
  }

  function syncThemeControl(theme) {
    if (!themeToggle) return;
    const isDark = theme === 'dark';
    const accessibleLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', accessibleLabel);
    if (themeLabel) themeLabel.textContent = isDark ? 'Light mode' : 'Dark mode';
    themeIcon?.classList.toggle('fa-moon', !isDark);
    themeIcon?.classList.toggle('fa-sun', isDark);
  }

  function applyTheme(theme, { animate = false } = {}) {
    if (!allowedThemes.has(theme)) return;
    if (animate && root.dataset.theme !== theme) beginPaletteTransition();
    root.dataset.theme = theme;
    syncThemeControl(theme);
  }

  themeToggle?.addEventListener('click', () => {
    const activeTheme = allowedThemes.has(root.dataset.theme)
      ? root.dataset.theme
      : resolveTheme();
    const selectedTheme = activeTheme === 'dark' ? 'light' : 'dark';
    storeTheme(selectedTheme);
    applyTheme(selectedTheme, { animate: true });
  });

  const handleSystemThemeChange = () => {
    if (readStoredTheme() === null) {
      applyTheme(resolveSystemTheme(), { animate: true });
    }
  };

  if (typeof systemDarkQuery.addEventListener === 'function') {
    systemDarkQuery.addEventListener('change', handleSystemThemeChange);
  } else {
    systemDarkQuery.addListener(handleSystemThemeChange);
  }

  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      applyTheme(resolveTheme(), { animate: true });
    }
  });

  applyTheme(resolveTheme());
  root.classList.add('theme-enabled');
})();
