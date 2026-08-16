(() => {
  'use strict';

  const SUCCESS_MESSAGE = 'Please check your inbox to confirm your subscription.';
  const EXISTING_MESSAGE =
    'That address is already subscribed. Check your inbox or manage your preferences.';
  const ERROR_MESSAGE =
    'We could not complete your subscription. Please try again shortly.';
  const REQUEST_TIMEOUT = 12000;

  const providerAdapters = new Map([
    [
      'generic-form',
      ({ endpoint, email, signal }) => {
        const body = new URLSearchParams({
          email,
          consent: 'true',
          source: 'lawscope-home',
          double_opt_in: 'true'
        });
        return fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: body.toString(),
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          cache: 'no-store',
          redirect: 'error',
          signal
        });
      }
    ],
    [
      'generic-json',
      ({ endpoint, email, signal }) =>
        fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            consent: true,
            source: 'lawscope-home',
            double_opt_in: true
          }),
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          cache: 'no-store',
          redirect: 'error',
          signal
        })
    ]
  ]);

  function setFieldError(input, errorElement, message = '') {
    errorElement.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validateEmail(input, errorElement) {
    const email = input.value.trim();
    input.value = email;

    if (!email) {
      setFieldError(input, errorElement, 'Enter your email address.');
      return false;
    }
    if (!input.checkValidity()) {
      setFieldError(
        input,
        errorElement,
        'Enter a valid email address, such as name@example.com.'
      );
      return false;
    }

    setFieldError(input, errorElement);
    return true;
  }

  function setStatus(section, statusElement, state, message, { urgent = false } = {}) {
    section.dataset.newsletterState = state;
    statusElement.dataset.newsletterStatus = state;
    statusElement.textContent = message;
    statusElement.hidden = false;
    statusElement.setAttribute('role', urgent ? 'alert' : 'status');
    statusElement.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
  }

  function resetStatus(section, statusElement, state = 'idle') {
    section.dataset.newsletterState = state;
    delete statusElement.dataset.newsletterStatus;
    statusElement.textContent = '';
    statusElement.hidden = true;
    statusElement.setAttribute('role', 'status');
    statusElement.setAttribute('aria-live', 'polite');
  }

  function setBusy(form, input, submitButton, label, loadingIcon, busy) {
    form.dataset.submitting = String(busy);
    if (busy) form.setAttribute('aria-busy', 'true');
    else form.removeAttribute('aria-busy');
    input.disabled = busy;
    submitButton.disabled = busy;
    label.textContent = busy ? 'Subscribing…' : 'Subscribe';
    loadingIcon.hidden = !busy;
  }

  async function classifyResponse(response) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    const providerStatus = String(payload.status || payload.result || '').toLowerCase();
    if (
      response.status === 409 ||
      ['already_subscribed', 'already-subscribed', 'existing'].includes(providerStatus)
    ) {
      return 'existing';
    }
    if (!response.ok) throw new Error('Newsletter provider rejected the request.');
    return 'success';
  }

  const forms = Array.from(document.querySelectorAll('[data-newsletter-form]'));

  for (const form of forms) {
    const section = form.closest('[data-newsletter-section]');
    const input = form.querySelector('[data-newsletter-email]');
    const errorElement = form.querySelector('[data-newsletter-error]');
    const submitButton = form.querySelector('[data-newsletter-submit]');
    const submitLabel = form.querySelector('[data-newsletter-submit-label]');
    const loadingIcon = form.querySelector('[data-newsletter-loading-icon]');
    const statusElement = form.querySelector('[data-newsletter-status]');
    const featureEnabled = form.dataset.newsletterEnabled === 'true';
    const endpoint = form.getAttribute('action') || '';
    const adapter = providerAdapters.get(form.dataset.newsletterProvider);

    if (
      !section ||
      !input ||
      !errorElement ||
      !submitButton ||
      !submitLabel ||
      !loadingIcon ||
      !statusElement
    ) {
      continue;
    }

    if (!featureEnabled || !endpoint || !adapter) {
      form.setAttribute('aria-disabled', 'true');
      input.disabled = true;
      submitButton.disabled = true;
      continue;
    }

    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) setFieldError(input, errorElement);
      if (section.dataset.newsletterState !== 'loading') {
        resetStatus(section, statusElement);
      }
    });
    input.addEventListener('blur', () => {
      if (!input.value.trim()) return;
      const isValid = validateEmail(input, errorElement);
      section.dataset.newsletterState = isValid ? 'idle' : 'invalid';
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.dataset.submitting === 'true') return;
      if (!validateEmail(input, errorElement)) {
        resetStatus(section, statusElement, 'invalid');
        input.focus();
        return;
      }

      const submittedEmail = input.value;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      setBusy(form, input, submitButton, submitLabel, loadingIcon, true);
      setStatus(section, statusElement, 'loading', 'Submitting your subscription…');

      try {
        const response = await adapter({
          endpoint,
          email: submittedEmail,
          signal: controller.signal
        });
        const result = await classifyResponse(response);
        input.value = '';
        if (result === 'existing') {
          setStatus(section, statusElement, 'existing', EXISTING_MESSAGE);
        } else {
          setStatus(section, statusElement, 'success', SUCCESS_MESSAGE);
          document.dispatchEvent(new CustomEvent('lawscope:newsletter-success'));
        }
      } catch {
        setStatus(section, statusElement, 'error', ERROR_MESSAGE, { urgent: true });
      } finally {
        clearTimeout(timeout);
        setBusy(form, input, submitButton, submitLabel, loadingIcon, false);
      }
    });
  }
})();
