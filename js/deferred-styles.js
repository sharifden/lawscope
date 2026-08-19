(() => {
  'use strict';

  // Non-critical stylesheets are shipped as rel="preload" so they never block the
  // first paint. Once this deferred script runs they are promoted to real
  // stylesheets. The matching <noscript> element covers visitors without
  // JavaScript, so icon styling degrades gracefully either way.
  const promoteDeferredStylesheets = () => {
    const links = document.querySelectorAll('link[data-deferred-stylesheet]');
    for (const link of links) {
      if (link.rel === 'stylesheet') continue;
      link.rel = 'stylesheet';
      link.removeAttribute('data-deferred-stylesheet');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', promoteDeferredStylesheets, { once: true });
  } else {
    promoteDeferredStylesheets();
  }
})();
