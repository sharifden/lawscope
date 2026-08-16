import {
  CONTACT_FORM_MESSAGES,
  createContactPayload,
  parseContactSuccessResponse,
  transitionContactFormState,
  validateContactValues
} from './contact-form-model.js';

const REQUEST_TIMEOUT = 15000;

function setFieldError(input, errorElement, message = '') {
  errorElement.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function readValues(form) {
  const data = new FormData(form);
  return {
    name: data.get('name'),
    email: data.get('email'),
    subject: data.get('subject'),
    message: data.get('message'),
    article_url: data.get('article_url'),
    privacy_consent: data.get('privacy_consent'),
    website: data.get('website'),
    started_at: data.get('started_at')
  };
}

function createSummaryItem(field, message) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = `#contact-${field.replaceAll('_', '-')}`;
  link.textContent = message;
  item.append(link);
  return item;
}

function announceStatus(statusElement, state, message, urgent = false) {
  statusElement.dataset.contactStatus = state;
  statusElement.textContent = message;
  statusElement.hidden = false;
  statusElement.setAttribute('role', urgent ? 'alert' : 'status');
  statusElement.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
}

function resetStatus(statusElement) {
  delete statusElement.dataset.contactStatus;
  statusElement.textContent = '';
  statusElement.hidden = true;
  statusElement.setAttribute('role', 'status');
  statusElement.setAttribute('aria-live', 'polite');
}

function setBusy(form, fieldset, submitButton, submitLabel, loadingIcon, busy) {
  form.dataset.submitting = String(busy);
  fieldset.disabled = busy;
  submitButton.disabled = busy;
  submitLabel.textContent = busy ? 'Sending…' : 'Send message';
  loadingIcon.hidden = !busy;
  if (busy) form.setAttribute('aria-busy', 'true');
  else form.removeAttribute('aria-busy');
}

function initializeContactForm(form) {
  const section = form.closest('[data-contact-section]');
  const fieldset = form.querySelector('[data-contact-fields]');
  const submitButton = form.querySelector('[data-contact-submit]');
  const submitLabel = form.querySelector('[data-contact-submit-label]');
  const loadingIcon = form.querySelector('[data-contact-loading-icon]');
  const statusElement = form.querySelector('[data-contact-status]');
  const summary = form.querySelector('[data-contact-error-summary]');
  const summaryList = form.querySelector('[data-contact-error-list]');
  const result = form.querySelector('[data-contact-result]');
  const resultMessage = form.querySelector('[data-contact-result-message]');
  const referenceWrap = form.querySelector('[data-contact-reference-wrap]');
  const reference = form.querySelector('[data-contact-reference]');
  const resetButton = form.querySelector('[data-contact-reset]');
  const startedAt = form.elements.namedItem('started_at');
  const messageField = form.elements.namedItem('message');
  const messageCount = form.querySelector('[data-contact-message-count]');
  const enabled = form.dataset.contactEnabled === 'true';
  const endpoint = form.getAttribute('action') || '';
  let currentState = enabled ? 'idle' : 'unavailable';
  const allowedSubjects = Array.from(form.elements.namedItem('subject')?.options || [])
    .map((option) => option.value)
    .filter(Boolean);
  const fieldNames = [
    'name',
    'email',
    'subject',
    'message',
    'article_url',
    'privacy_consent'
  ];
  const fields = new Map(
    fieldNames.map((name) => [name, form.elements.namedItem(name)])
  );
  const errorElements = new Map(
    fieldNames.map((name) => [name, form.querySelector(`[data-contact-error="${name}"]`)])
  );

  if (
    !section ||
    !fieldset ||
    !submitButton ||
    !submitLabel ||
    !loadingIcon ||
    !statusElement ||
    !summary ||
    !summaryList ||
    !result ||
    !resultMessage ||
    !referenceWrap ||
    !reference ||
    !resetButton ||
    !startedAt ||
    !messageField ||
    !messageCount ||
    Array.from(fields.values()).some((field) => !field) ||
    Array.from(errorElements.values()).some((element) => !element)
  ) {
    return;
  }

  if (!enabled || !endpoint || form.dataset.contactProvider !== 'lawscope-serverless') {
    form.setAttribute('aria-disabled', 'true');
    fieldset.disabled = true;
    submitButton.disabled = true;
    return;
  }

  function moveState(event) {
    currentState = transitionContactFormState(currentState, event);
    section.dataset.contactState = currentState;
  }

  startedAt.value = new Date().toISOString();

  function updateMessageCount() {
    messageCount.textContent = `${messageField.value.length.toLocaleString('en-US')} of 5,000 characters`;
  }

  function clearSummary() {
    summary.hidden = true;
    summaryList.replaceChildren();
  }

  function clearAllErrors() {
    for (const name of fieldNames) {
      setFieldError(fields.get(name), errorElements.get(name));
    }
    clearSummary();
  }

  function validateAndDisplay({ focusSummary = false } = {}) {
    const validation = validateContactValues(readValues(form), allowedSubjects);
    clearSummary();

    for (const name of fieldNames) {
      const message = validation.errors[name] || '';
      setFieldError(fields.get(name), errorElements.get(name), message);
      if (message) summaryList.append(createSummaryItem(name, message));
    }

    if (!validation.valid) {
      summary.hidden = false;
      if (currentState === 'idle' || currentState === 'error') {
        moveState('VALIDATION_FAILURE');
      }
      if (focusSummary) summary.focus();
    }

    return validation;
  }

  for (const [name, field] of fields) {
    const clearCurrentError = () => {
      if (field.hasAttribute('aria-invalid')) {
        setFieldError(field, errorElements.get(name));
      }
      if (!summary.hidden) clearSummary();
      if (currentState === 'invalid' || currentState === 'error') moveState('EDIT');
      if (statusElement.dataset.contactStatus === 'error') resetStatus(statusElement);
    };
    field.addEventListener(name === 'privacy_consent' || name === 'subject' ? 'change' : 'input', clearCurrentError);
    field.addEventListener('blur', () => {
      if (!String(field.value || '').trim() && name !== 'privacy_consent') return;
      const validation = validateContactValues(readValues(form), allowedSubjects);
      setFieldError(field, errorElements.get(name), validation.errors[name] || '');
    });
  }

  messageField.addEventListener('input', updateMessageCount);
  updateMessageCount();

  resetButton.addEventListener('click', () => {
    form.reset();
    startedAt.value = new Date().toISOString();
    clearAllErrors();
    resetStatus(statusElement);
    result.hidden = true;
    fieldset.hidden = false;
    fieldset.disabled = false;
    submitButton.hidden = false;
    submitButton.disabled = false;
    submitLabel.textContent = 'Send message';
    loadingIcon.hidden = true;
    referenceWrap.hidden = true;
    reference.textContent = '';
    moveState('RESET');
    updateMessageCount();
    fields.get('name').focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.submitting === 'true') return;

    const validation = validateAndDisplay({ focusSummary: true });
    if (!validation.valid) return;

    const payload = createContactPayload(validation.values, allowedSubjects);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    clearSummary();
    moveState('SUBMIT');
    setBusy(form, fieldset, submitButton, submitLabel, loadingIcon, true);
    announceStatus(statusElement, 'processing', 'Sending your message…');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
        referrerPolicy: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Contact endpoint rejected the request.');
      const responsePayload = parseContactSuccessResponse(await response.json());

      form.reset();
      clearAllErrors();
      resetStatus(statusElement);
      fieldset.hidden = true;
      submitButton.hidden = true;
      resultMessage.textContent = CONTACT_FORM_MESSAGES.success;
      reference.textContent = responsePayload.reference;
      referenceWrap.hidden = false;
      result.hidden = false;
      moveState('SUCCESS');
      result.focus();

      document.dispatchEvent(new CustomEvent('lawscope:contact-success'));
    } catch {
      announceStatus(statusElement, 'error', CONTACT_FORM_MESSAGES.error, true);
      moveState('FAILURE');
    } finally {
      clearTimeout(timeout);
      if (currentState !== 'success') {
        setBusy(form, fieldset, submitButton, submitLabel, loadingIcon, false);
      } else {
        form.dataset.submitting = 'false';
        form.removeAttribute('aria-busy');
      }
    }
  });
}

for (const form of document.querySelectorAll('[data-contact-form]')) {
  initializeContactForm(form);
}
