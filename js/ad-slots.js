(() => {
  'use strict';

  const CONSENT_EVENT = 'lawscope:consent-change';
  const STATUS_EVENT = 'lawscope:ad-status';
  const READY_EVENT = 'lawscope:ad-slot-ready';
  const COLLAPSED_STATUSES = new Set(['no-fill', 'error']);
  const VISIBLE_STATUSES = new Set(['loading', 'filled']);
  const slots = Array.from(document.querySelectorAll('[data-ad-slot]'));

  if (slots.length === 0) return;

  function featureIsEnabled(slot) {
    return slot.dataset.adFeatureEnabled === 'true';
  }

  function setPlaceholderVisibility(slot, isVisible) {
    const placeholder = slot.querySelector('.ad-slot__placeholder');
    if (placeholder) placeholder.hidden = !isVisible;
  }

  function collapseSlot(slot, state) {
    slot.dataset.adState = state;
    slot.hidden = true;
    const container = slot.querySelector('[data-ad-container]');
    if (container) container.removeAttribute('aria-busy');
  }

  function reserveSlot(slot, state) {
    slot.dataset.adState = state;
    slot.hidden = false;
  }

  function advertisingConsentIsPending(detail) {
    return detail?.status === 'pending';
  }

  function advertisingConsentWasGranted(detail) {
    return (
      !advertisingConsentIsPending(detail) &&
      (detail?.categories?.advertising === true || detail?.advertising === true)
    );
  }

  function advertisingConsentWasDenied(detail) {
    return (
      !advertisingConsentIsPending(detail) &&
      (detail?.categories?.advertising === false || detail?.advertising === false)
    );
  }

  function awaitConsent(slot) {
    slot.dataset.adConsent = 'unknown';
    reserveSlot(slot, 'awaiting-consent');
  }

  function signalReady(slot) {
    if (slot.dataset.adState === 'ready') return;
    slot.dataset.adConsent = 'granted';
    reserveSlot(slot, 'ready');
    slot.dispatchEvent(
      new CustomEvent(READY_EVENT, {
        bubbles: true,
        detail: { slot: slot.dataset.adSlot }
      })
    );
  }

  function signalInitialReady(slot) {
    reserveSlot(slot, 'awaiting-consent');
    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          const consentState = document.documentElement.dataset.consentAdvertising;
          if (consentState === 'granted') signalReady(slot);
          else if (consentState === 'denied') {
            slot.dataset.adConsent = 'denied';
            collapseSlot(slot, 'consent-blocked');
          } else awaitConsent(slot);
        },
        { once: true }
      );
    } else {
      signalReady(slot);
    }
  }

  const initialConsentState = document.documentElement.dataset.consentAdvertising;
  for (const slot of slots) {
    if (!featureIsEnabled(slot)) {
      collapseSlot(slot, 'disabled');
      continue;
    }
    if (initialConsentState === 'granted') {
      signalInitialReady(slot);
    } else if (initialConsentState === 'denied') {
      slot.dataset.adConsent = 'denied';
      collapseSlot(slot, 'consent-blocked');
    } else {
      awaitConsent(slot);
    }
  }

  document.addEventListener(CONSENT_EVENT, (event) => {
    for (const slot of slots) {
      if (!featureIsEnabled(slot)) continue;

      if (advertisingConsentWasGranted(event.detail)) {
        signalReady(slot);
      } else if (advertisingConsentWasDenied(event.detail)) {
        slot.dataset.adConsent = 'denied';
        collapseSlot(slot, 'consent-blocked');
      } else if (advertisingConsentIsPending(event.detail)) {
        awaitConsent(slot);
      }
    }
  });

  document.addEventListener(STATUS_EVENT, (event) => {
    const slotName = event.detail?.slot;
    const status = event.detail?.status;
    const slot = slots.find((candidate) => candidate.dataset.adSlot === slotName);

    if (!slot || !featureIsEnabled(slot) || slot.dataset.adConsent !== 'granted') return;

    if (COLLAPSED_STATUSES.has(status)) {
      setPlaceholderVisibility(slot, true);
      collapseSlot(slot, status);
      return;
    }

    if (!VISIBLE_STATUSES.has(status)) return;

    const container = slot.querySelector('[data-ad-container]');
    if (container) {
      if (status === 'loading') container.setAttribute('aria-busy', 'true');
      else container.removeAttribute('aria-busy');
    }
    setPlaceholderVisibility(slot, status !== 'filled');
    reserveSlot(slot, status);
  });
})();
