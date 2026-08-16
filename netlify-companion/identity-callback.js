(() => {
  'use strict';

  const PRODUCTION_ADMIN_URL = 'https://getlawscope.com/admin/';
  const MAXIMUM_FRAGMENT_LENGTH = 8192;
  const ACCEPTED_TOKEN_KEYS = new Set([
    'invite_token',
    'recovery_token',
    'confirmation_token',
    'email_change_token'
  ]);
  const status = document.querySelector('[data-callback-status]');
  const fragment = window.location.hash;

  function updateStatus(message, state) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  function removeRejectedFragment() {
    if (window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState(null, document.title, window.location.pathname);
    }
  }

  if (!fragment) return;

  if (fragment.length > MAXIMUM_FRAGMENT_LENGTH) {
    removeRejectedFragment();
    updateStatus(
      'This authentication link is not valid. Its fragment was removed; request a new link from the Lawscope account owner.',
      'rejected'
    );
    return;
  }

  const parameters = new URLSearchParams(fragment.slice(1));
  const entries = [...parameters.entries()];
  const isAcceptedToken =
    entries.length === 1 &&
    ACCEPTED_TOKEN_KEYS.has(entries[0][0]) &&
    entries[0][1].length > 0;

  if (!isAcceptedToken) {
    removeRejectedFragment();
    updateStatus(
      'This page received an unsupported or incomplete authentication action. Its fragment was removed; contact the Lawscope account owner.',
      'rejected'
    );
    return;
  }

  updateStatus('Transferring this one-time authentication action to the Lawscope Editorial CMS…', 'transferring');
  window.location.replace(`${PRODUCTION_ADMIN_URL}${fragment}`);
})();
