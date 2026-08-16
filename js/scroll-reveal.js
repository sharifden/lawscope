(() => {
  'use strict';

  const root = document.documentElement;
  const revealElements = Array.from(document.querySelectorAll('[data-scroll-reveal]'));

  if (revealElements.length === 0) {
    return;
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
    return;
  }

  const rootStyles = getComputedStyle(root);
  const observerRootMargin = rootStyles
    .getPropertyValue('--reveal-observer-root-margin')
    .trim();
  const observerThreshold = Number.parseFloat(
    rootStyles.getPropertyValue('--reveal-observer-threshold')
  );

  if (!observerRootMargin || !Number.isFinite(observerThreshold)) {
    return;
  }

  const pendingElements = new Set(revealElements);
  let observer;

  function reveal(element) {
    if (!pendingElements.has(element)) {
      return;
    }

    element.classList.add('scroll-reveal--visible');
    pendingElements.delete(element);
    observer?.unobserve(element);

    if (pendingElements.size === 0) {
      observer?.disconnect();
      document.removeEventListener('focusin', revealFocusedContent);
      reducedMotionQuery.removeEventListener('change', handleMotionPreferenceChange);
    }
  }

  function revealFocusedContent(event) {
    const revealContainer = event.target.closest?.('[data-scroll-reveal]');
    if (revealContainer) {
      reveal(revealContainer);
    }
  }

  function disableEnhancement() {
    observer?.disconnect();
    revealElements.forEach(reveal);
    root.classList.remove('scroll-reveal-enabled');
    document.removeEventListener('focusin', revealFocusedContent);
    reducedMotionQuery.removeEventListener('change', handleMotionPreferenceChange);
  }

  function handleMotionPreferenceChange(event) {
    if (event.matches) {
      disableEnhancement();
    }
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: observerRootMargin,
      threshold: observerThreshold
    }
  );

  const initialViewportBlockSize = Math.max(root.clientHeight, window.innerHeight || 0);

  revealElements.forEach((element) => {
    element.classList.add('scroll-reveal--pending');

    if (element.getBoundingClientRect().top <= initialViewportBlockSize) {
      reveal(element);
    } else {
      observer.observe(element);
    }
  });

  if (pendingElements.size === 0) {
    observer.disconnect();
    return;
  }

  document.addEventListener('focusin', revealFocusedContent);
  reducedMotionQuery.addEventListener('change', handleMotionPreferenceChange);
  root.classList.add('scroll-reveal-enabled');
})();
