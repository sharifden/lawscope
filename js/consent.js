(() => {
  'use strict';

  const root = document.documentElement;
  const banner = document.querySelector('[data-consent-banner]');
  const dialog = document.querySelector('[data-consent-dialog]');
  const form = dialog?.querySelector('[data-consent-form]');
  const analyticsInput = dialog?.querySelector('[data-consent-analytics]');
  const advertisingInput = dialog?.querySelector('[data-consent-advertising]');
  const analyticsState = dialog?.querySelector('[data-consent-analytics-state]');
  const advertisingState = dialog?.querySelector('[data-consent-advertising-state]');
  const gpcNotice = dialog?.querySelector('[data-consent-gpc-notice]');
  const statusRegion = document.querySelector('[data-consent-status]');
  const storageErrorRegions = Array.from(
    document.querySelectorAll('[data-consent-storage-error]')
  );
  const footerOpeners = Array.from(
    document.querySelectorAll('[data-open-consent-preferences]')
  );
  const revision = Number.parseInt(banner?.dataset.consentRevision || '', 10);

  if (
    !banner ||
    !dialog ||
    !form ||
    !analyticsInput ||
    !advertisingInput ||
    !Number.isInteger(revision) ||
    revision < 1
  ) {
    return;
  }

  const storageKey = 'lawscope:consent';
  const globalPrivacyControl = navigator.globalPrivacyControl === true;
  const defaultCategories = Object.freeze({
    essential: true,
    analytics: false,
    advertising: false
  });
  let hasDecision = false;
  let currentCategories = { ...defaultCategories };
  let dialogOpener = null;
  let dialogOpenedFromBanner = false;

  function hasExactKeys(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const actualKeys = Object.keys(value).sort();
    const expectedKeys = [...keys].sort();
    return (
      actualKeys.length === expectedKeys.length &&
      actualKeys.every((key, index) => key === expectedKeys[index])
    );
  }

  function isValidRecord(record) {
    return (
      hasExactKeys(record, ['version', 'categories']) &&
      record.version === revision &&
      hasExactKeys(record.categories, ['essential', 'analytics', 'advertising']) &&
      record.categories.essential === true &&
      typeof record.categories.analytics === 'boolean' &&
      typeof record.categories.advertising === 'boolean'
    );
  }

  function removeInvalidStoredRecord() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Storage may be blocked. The in-memory default remains deny-by-default.
    }
  }

  function readStoredRecord() {
    try {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue === null) return null;
      const record = JSON.parse(storedValue);
      if (!isValidRecord(record)) {
        removeInvalidStoredRecord();
        return null;
      }
      return record;
    } catch {
      removeInvalidStoredRecord();
      return null;
    }
  }

  function applyGlobalPrivacyControl(categories) {
    return {
      essential: true,
      analytics: categories.analytics === true,
      advertising: globalPrivacyControl ? false : categories.advertising === true
    };
  }

  function writeStoredRecord(categories) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: revision,
          categories
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  function announce(message) {
    if (!statusRegion) return;
    statusRegion.textContent = '';
    window.requestAnimationFrame(() => {
      statusRegion.textContent = message;
    });
  }

  function updateSafeOffset() {
    if (banner.hidden) {
      root.style.removeProperty('--consent-safe-block-offset');
      return;
    }
    const bannerHeight = Math.ceil(banner.getBoundingClientRect().height);
    root.style.setProperty('--consent-safe-block-offset', `${bannerHeight}px`);
  }

  function focusMainContent() {
    const main = document.querySelector('main');
    if (main instanceof HTMLElement) {
      main.focus({ preventScroll: true });
    }
  }

  function setBannerVisibility(visible, moveFocus = false) {
    banner.hidden = !visible;
    document.body.classList.toggle('consent-banner-visible', visible);
    if (visible) {
      window.requestAnimationFrame(updateSafeOffset);
    } else {
      root.style.removeProperty('--consent-safe-block-offset');
      if (moveFocus) window.requestAnimationFrame(focusMainContent);
    }
  }

  function updateCategoryStates() {
    if (analyticsState) analyticsState.textContent = analyticsInput.checked ? 'On' : 'Off';
    if (advertisingState) {
      advertisingState.textContent = globalPrivacyControl
        ? 'Blocked by GPC'
        : advertisingInput.checked
          ? 'On'
          : 'Off';
    }
  }

  function syncPreferenceControls() {
    analyticsInput.checked = currentCategories.analytics;
    advertisingInput.checked = currentCategories.advertising;
    advertisingInput.disabled = globalPrivacyControl;
    if (gpcNotice) gpcNotice.hidden = !globalPrivacyControl;
    updateCategoryStates();
  }

  function publishConsentState(source) {
    const status = hasDecision ? 'decided' : 'pending';
    root.dataset.consentStatus = status;
    root.dataset.consentAnalytics = hasDecision
      ? currentCategories.analytics
        ? 'granted'
        : 'denied'
      : 'pending';
    root.dataset.consentAdvertising = hasDecision
      ? currentCategories.advertising
        ? 'granted'
        : 'denied'
      : 'pending';
    root.dataset.globalPrivacyControl = String(globalPrivacyControl);

    document.dispatchEvent(
      new CustomEvent('lawscope:consent-change', {
        detail: {
          revision,
          status,
          source,
          globalPrivacyControl,
          categories: { ...currentCategories }
        }
      })
    );
  }

  function closeDialog() {
    if (!dialog.hasAttribute('open')) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      if (dialogOpener instanceof HTMLElement) {
        dialogOpener.focus({ preventScroll: true });
      }
    }
  }

  function openDialog(opener) {
    dialogOpener = opener instanceof HTMLElement ? opener : null;
    dialogOpenedFromBanner = Boolean(dialogOpener && banner.contains(dialogOpener));
    syncPreferenceControls();
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
      dialog.querySelector('button, input')?.focus();
    }
  }

  function clearStorageError() {
    storageErrorRegions.forEach((region) => {
      region.hidden = true;
      region.textContent = '';
    });
  }

  function showStorageError() {
    const message =
      'Your browser did not allow privacy choices to be saved. Optional analytics and advertising remain off.';
    storageErrorRegions.forEach((region) => {
      const isInActiveContext = dialog.open
        ? dialog.contains(region)
        : banner.contains(region);
      region.textContent = isInActiveContext ? message : '';
      region.hidden = !isInActiveContext;
    });
  }

  function completeDecision(categories, source, fromDialog = false) {
    const appliedCategories = applyGlobalPrivacyControl(categories);
    if (!writeStoredRecord(appliedCategories)) {
      currentCategories = { ...defaultCategories };
      hasDecision = false;
      syncPreferenceControls();
      setBannerVisibility(true);
      publishConsentState('storage-error');
      showStorageError();
      return;
    }

    clearStorageError();
    currentCategories = appliedCategories;
    hasDecision = true;
    syncPreferenceControls();
    publishConsentState(source);

    const returnFocusToContent = fromDialog && dialogOpenedFromBanner;
    if (fromDialog) closeDialog();
    setBannerVisibility(false, !fromDialog || returnFocusToContent);
    announce('Your privacy choices were saved.');
  }

  function acceptAll(fromDialog = false) {
    completeDecision(
      {
        essential: true,
        analytics: true,
        advertising: true
      },
      'user',
      fromDialog
    );
  }

  function rejectNonEssential(fromDialog = false) {
    completeDecision(defaultCategories, 'user', fromDialog);
  }

  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => {
    acceptAll();
  });
  banner.querySelector('[data-consent-reject]')?.addEventListener('click', () => {
    rejectNonEssential();
  });
  banner.querySelector('[data-consent-manage]')?.addEventListener('click', (event) => {
    openDialog(event.currentTarget);
  });

  footerOpeners.forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', (event) => openDialog(event.currentTarget));
  });

  dialog.querySelector('[data-consent-close]')?.addEventListener('click', closeDialog);
  dialog.querySelector('[data-consent-dialog-accept]')?.addEventListener('click', () => {
    acceptAll(true);
  });
  dialog.querySelector('[data-consent-dialog-reject]')?.addEventListener('click', () => {
    rejectNonEssential(true);
  });
  analyticsInput.addEventListener('change', updateCategoryStates);
  advertisingInput.addEventListener('change', updateCategoryStates);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    completeDecision(
      {
        essential: true,
        analytics: analyticsInput.checked,
        advertising: advertisingInput.checked
      },
      'user',
      true
    );
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && typeof dialog.showModal !== 'function') {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== 'Tab' || typeof dialog.showModal === 'function') return;

    const focusableElements = Array.from(
      dialog.querySelectorAll('button:not([disabled]), input:not([disabled])')
    );
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;
    const record = readStoredRecord();
    if (record) {
      clearStorageError();
      currentCategories = applyGlobalPrivacyControl(record.categories);
      hasDecision = true;
      syncPreferenceControls();
      setBannerVisibility(false, banner.contains(document.activeElement));
      publishConsentState('storage');
      announce('Your privacy choices were updated in another tab.');
      return;
    }

    currentCategories = { ...defaultCategories };
    hasDecision = false;
    syncPreferenceControls();
    setBannerVisibility(true);
    publishConsentState('storage');
    announce('Privacy choices were reset. Please choose your preferences again.');
  });

  if ('ResizeObserver' in window) {
    const bannerObserver = new ResizeObserver(updateSafeOffset);
    bannerObserver.observe(banner);
  } else {
    window.addEventListener('resize', updateSafeOffset);
  }

  const storedRecord = readStoredRecord();
  if (storedRecord) {
    currentCategories = applyGlobalPrivacyControl(storedRecord.categories);
    hasDecision = true;
  }
  syncPreferenceControls();
  setBannerVisibility(!hasDecision);
  root.classList.add('consent-enabled');
  publishConsentState(storedRecord ? 'stored' : 'default');
})();
