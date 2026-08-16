(() => {
  'use strict';

  const root = document.documentElement;
  const config = window.LawscopeAdvertisingConfig || {};
  const slots = Array.from(document.querySelectorAll('[data-ad-slot]'));
  const publisherPattern = /^ca-pub-\d{16}$/;
  const slotPattern = /^\d{10}$/;
  const placeholderPublisherId = 'ca-pub-0000000000000000';
  const placeholderSlotId = '0000000000';
  const loaderId = 'lawscope-adsense-loader';
  const queue = new Set();
  let loaderPromise = null;
  let loaderLoaded = false;
  let loaderFailed = false;

  function dispatchStatus(slot, status, reason = '') {
    document.dispatchEvent(
      new CustomEvent('lawscope:ad-status', {
        detail: {
          slot: slot.dataset.adSlot,
          status,
          provider: 'adsense',
          reason
        }
      })
    );
  }

  function dispatchProviderState(state, reason = '') {
    document.dispatchEvent(
      new CustomEvent('lawscope:ad-provider-state', {
        detail: { provider: 'adsense', state, reason }
      })
    );
  }

  function hasAdvertisingConsent() {
    return root.dataset.consentAdvertising === 'granted';
  }

  function isCanonicalProductionOrigin() {
    return (
      config.environment === 'production' &&
      window.location?.origin === config.siteOrigin &&
      config.siteOrigin === 'https://getlawscope.com'
    );
  }

  function isRealPublisherId(value) {
    return publisherPattern.test(String(value || '')) && value !== placeholderPublisherId;
  }

  function isRealSlotId(value) {
    return slotPattern.test(String(value || '')) && value !== placeholderSlotId;
  }

  function configurationIsReady() {
    if (
      config.enabled !== true ||
      config.provider !== 'adsense' ||
      !isRealPublisherId(config.publisherId) ||
      !config.slotIds ||
      typeof config.slotIds !== 'object'
    ) {
      return false;
    }
    return slots.every((slot) => isRealSlotId(config.slotIds[slot.dataset.adUnitKey]));
  }

  function isDesktopEligible(slot) {
    if (slot.dataset.adDesktopOnly !== 'true') return true;
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(config.desktopSidebarMediaQuery || '(min-width: 64rem)').matches;
  }

  function slotCanRequest(slot) {
    return (
      slot.dataset.adFeatureEnabled === 'true' &&
      slot.dataset.adProvider === 'adsense' &&
      hasAdvertisingConsent() &&
      isDesktopEligible(slot)
    );
  }

  function blockSlot(slot, reason) {
    queue.delete(slot);
    dispatchStatus(slot, 'error', reason);
  }

  function blockAllSlots(reason) {
    slots
      .filter((slot) => slot.dataset.adFeatureEnabled === 'true')
      .forEach((slot) => {
        slot.dataset.adRuntimeBlocked = 'true';
        slot.dataset.adFeatureEnabled = 'false';
        slot.dataset.adProvider = 'none';
        slot.dataset.adState = 'runtime-blocked';
        slot.hidden = true;
        blockSlot(slot, reason);
      });
    dispatchProviderState('blocked', reason);
  }

  function handleAdStatus(slot, adElement) {
    const status = adElement.getAttribute('data-ad-status');
    if (status === 'filled') {
      dispatchStatus(slot, 'filled');
    } else if (status === 'unfilled' || status === 'unfill-optimized') {
      dispatchStatus(slot, 'no-fill', status);
    }
  }

  function observeAdStatus(slot, adElement) {
    handleAdStatus(slot, adElement);
    if (typeof MutationObserver !== 'function') return;
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === 'data-ad-status')) {
        handleAdStatus(slot, adElement);
      }
    });
    observer.observe(adElement, {
      attributes: true,
      attributeFilter: ['data-ad-status']
    });
  }

  function createAdElement(slot) {
    const unitKey = slot.dataset.adUnitKey;
    const adElement = document.createElement('ins');
    adElement.className = 'adsbygoogle ad-slot__unit';
    adElement.setAttribute('aria-label', 'Advertisement');
    adElement.dataset.adClient = config.publisherId;
    adElement.dataset.adSlot = config.slotIds[unitKey];
    adElement.dataset.adFormat = 'auto';
    adElement.dataset.fullWidthResponsive = 'true';
    return adElement;
  }

  function requestPreparedSlot(slot) {
    if (!slotCanRequest(slot)) return;
    const existingAd = slot.querySelector('ins.adsbygoogle');
    if (existingAd) {
      handleAdStatus(slot, existingAd);
      return;
    }

    const frame = slot.querySelector('[data-ad-container]');
    const unitKey = slot.dataset.adUnitKey;
    if (!frame || !isRealSlotId(config.slotIds[unitKey])) {
      blockSlot(slot, 'slot-configuration-invalid');
      return;
    }

    const adElement = createAdElement(slot);
    frame.replaceChildren(adElement);
    observeAdStatus(slot, adElement);
    slot.dataset.adsenseRequested = 'true';

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      blockSlot(slot, 'request-failed');
    }
  }

  function flushQueue() {
    if (!loaderLoaded) return;
    const pendingSlots = Array.from(queue);
    queue.clear();
    pendingSlots.forEach(requestPreparedSlot);
  }

  function markLoaderFailed(reason) {
    if (loaderLoaded || loaderFailed) return;
    loaderFailed = true;
    const pendingSlots = Array.from(queue);
    queue.clear();
    pendingSlots.forEach((slot) => blockSlot(slot, reason));
    dispatchProviderState('error', reason);
  }

  function loadProviderOnce() {
    if (loaderPromise) return loaderPromise;
    loaderPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(loaderId);
      if (existing) {
        reject(new Error('duplicate-loader'));
        return;
      }

      const script = document.createElement('script');
      const timeoutMilliseconds = Number(config.loaderTimeoutMilliseconds) || 12000;
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('loader-timeout'));
      }, timeoutMilliseconds);

      script.id = loaderId;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.publisherId)}`;
      script.addEventListener('load', () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve();
      }, { once: true });
      script.addEventListener('error', () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        reject(new Error('loader-error'));
      }, { once: true });
      document.head.append(script);
    });

    loaderPromise
      .then(() => {
        loaderLoaded = true;
        dispatchProviderState('ready');
        window.dispatchEvent(new CustomEvent('lawscope:ad-provider-ready'));
        flushQueue();
      })
      .catch((error) => {
        markLoaderFailed(error instanceof Error ? error.message : 'loader-error');
      });
    return loaderPromise;
  }

  function queueSlot(slot) {
    if (!slotCanRequest(slot)) return;
    if (loaderFailed) {
      blockSlot(slot, 'loader-unavailable');
      return;
    }
    queue.add(slot);
    if (loaderLoaded) {
      dispatchStatus(slot, 'loading');
      flushQueue();
      return;
    }
    loadProviderOnce();
  }

  function queueEligibleSlots() {
    slots.forEach(queueSlot);
  }

  if (slots.length === 0 || config.enabled !== true) return;

  if (!configurationIsReady()) {
    blockAllSlots('configuration-invalid');
    return;
  }
  if (!isCanonicalProductionOrigin()) {
    blockAllSlots('canonical-origin-blocked');
    return;
  }

  document.addEventListener('lawscope:ad-slot-ready', (event) => {
    const slot = event.detail?.element;
    if (slot instanceof Element && slots.includes(slot)) queueSlot(slot);
  });
  document.addEventListener('lawscope:consent-change', (event) => {
    if (event.detail?.categories?.advertising === true) {
      queueEligibleSlots();
    } else {
      queue.clear();
    }
  });

  if (typeof window.matchMedia === 'function') {
    const desktopQuery = window.matchMedia(
      config.desktopSidebarMediaQuery || '(min-width: 64rem)'
    );
    desktopQuery.addEventListener?.('change', (event) => {
      if (event.matches && hasAdvertisingConsent()) queueEligibleSlots();
    });
  }

  if (hasAdvertisingConsent()) queueEligibleSlots();
})();
