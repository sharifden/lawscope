(() => {
  'use strict';

  const root = document.documentElement;
  const button = document.querySelector('[data-back-to-top]');
  const focusTarget = document.querySelector('[data-page-top-focus]');

  if (!button || !focusTarget) {
    return;
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const adSlots = Array.from(document.querySelectorAll('[data-ad-slot]'));
  const adVisibility = new Map(
    adSlots.map((slot) => [slot, !slot.hidden])
  );

  let updateQueued = false;

  function getViewportBlockSize() {
    return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  }

  function pageRequiresScrolling(viewportBlockSize) {
    return document.documentElement.scrollHeight > viewportBlockSize;
  }

  function advertisingControlIsVisible() {
    return Array.from(adVisibility.entries()).some(
      ([slot, isIntersecting]) => isIntersecting && !slot.hidden
    );
  }

  function shouldShowButton() {
    const viewportBlockSize = getViewportBlockSize();
    const reachedThreshold = window.scrollY >= viewportBlockSize;
    const siteSurfaceIsOpen = root.classList.contains('site-surface-open');

    return (
      pageRequiresScrolling(viewportBlockSize) &&
      reachedThreshold &&
      !siteSurfaceIsOpen &&
      !advertisingControlIsVisible()
    );
  }

  function moveFocusToPageTop() {
    focusTarget.focus({ preventScroll: true });
  }

  function syncVisibility() {
    updateQueued = false;

    const shouldShow = shouldShowButton();

    if (!shouldShow && document.activeElement === button) {
      moveFocusToPageTop();
    }

    button.hidden = !shouldShow;
  }

  function requestVisibilityUpdate() {
    if (updateQueued) {
      return;
    }

    updateQueued = true;
    window.requestAnimationFrame(syncVisibility);
  }

  function returnToPageTop() {
    moveFocusToPageTop();
    window.scrollTo({
      top: 0,
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth'
    });
    requestVisibilityUpdate();
  }

  button.addEventListener('click', returnToPageTop);
  window.addEventListener('scroll', requestVisibilityUpdate, { passive: true });
  window.addEventListener('resize', requestVisibilityUpdate, { passive: true });
  window.addEventListener('pageshow', requestVisibilityUpdate);
  document.addEventListener('lawscope:site-surface-change', requestVisibilityUpdate);

  if ('IntersectionObserver' in window) {
    const adObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        adVisibility.set(entry.target, entry.isIntersecting);
      });
      requestVisibilityUpdate();
    });

    adSlots.forEach((slot) => adObserver.observe(slot));
  }

  syncVisibility();
})();
