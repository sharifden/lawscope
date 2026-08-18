(() => {
  'use strict';

  const COMPANION_META_NAME = 'cms-companion-origin';
  const UNPROVISIONED_SUFFIX = '.invalid';
  const PRODUCTION_PUBLIC_ORIGIN = 'https://getlawscope.com';

  function resolveServiceOrigin() {
    const meta = document.querySelector(`meta[name="${COMPANION_META_NAME}"]`);
    const rawValue = meta ? meta.content.trim() : '';
    if (!rawValue) return null;

    try {
      const configured = new URL(rawValue);
      const hostname = configured.hostname.toLowerCase();
      const safeOrigin =
        configured.protocol === 'https:' &&
        !configured.username &&
        !configured.password &&
        configured.origin === rawValue.replace(/\/$/, '') &&
        !hostname.endsWith(UNPROVISIONED_SUFFIX);
      if (!safeOrigin) return null;

      const pageOrigin = window.location && window.location.origin;
      if (pageOrigin === PRODUCTION_PUBLIC_ORIGIN) return pageOrigin;
      if (typeof pageOrigin === 'string' && pageOrigin.startsWith('https://')) return pageOrigin;
      return configured.origin;
    } catch {
      return null;
    }
  }

  const identity = window.netlifyIdentity;
  if (!identity || typeof identity.init !== 'function') return;

  const serviceOrigin = resolveServiceOrigin();
  if (!serviceOrigin) return;

  identity.init({ APIUrl: `${serviceOrigin}/.netlify/identity` });
})();
