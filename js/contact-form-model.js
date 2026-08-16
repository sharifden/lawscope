export const CONTACT_FORM_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  messageMin: 20,
  messageMax: 5000,
  articleUrlMax: 2048
});

export const CONTACT_FORM_MESSAGES = Object.freeze({
  success: 'Thank you. Your message has been received. Keep a copy of any reference number shown here.',
  error: 'Your message could not be sent. Please try again or use the published support email once configured.'
});

const CONTACT_STATE_TRANSITIONS = Object.freeze({
  unavailable: Object.freeze({}),
  idle: Object.freeze({ VALIDATION_FAILURE: 'invalid', SUBMIT: 'processing' }),
  invalid: Object.freeze({ EDIT: 'idle', SUBMIT: 'processing' }),
  processing: Object.freeze({ SUCCESS: 'success', FAILURE: 'error' }),
  error: Object.freeze({ EDIT: 'idle', VALIDATION_FAILURE: 'invalid', SUBMIT: 'processing' }),
  success: Object.freeze({ RESET: 'idle' })
});

export function transitionContactFormState(currentState, event) {
  const nextState = CONTACT_STATE_TRANSITIONS[currentState]?.[event];
  if (!nextState) {
    throw new TypeError(`Invalid contact form transition: ${currentState} -> ${event}`);
  }
  return nextState;
}

function normalizeSingleLine(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeMessage(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .trim();
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function articleUrlIsValid(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['getlawscope.com', 'www.getlawscope.com'].includes(url.hostname) &&
      url.pathname.startsWith('/articles/') &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function normalizeContactValues(values = {}) {
  return Object.freeze({
    name: normalizeSingleLine(values.name),
    email: normalizeSingleLine(values.email),
    subject: normalizeSingleLine(values.subject),
    message: normalizeMessage(values.message),
    article_url: String(values.article_url ?? '').trim(),
    privacy_consent:
      values.privacy_consent === true ||
      values.privacy_consent === 'true' ||
      values.privacy_consent === 'on',
    website: String(values.website ?? '').trim(),
    started_at: String(values.started_at ?? '').trim()
  });
}

export function validateContactValues(values, allowedSubjects = []) {
  const cleanValues = normalizeContactValues(values);
  const allowedSubjectSet = new Set(allowedSubjects);
  const errors = {};

  if (!cleanValues.name) {
    errors.name = 'Enter your name.';
  } else if (cleanValues.name.length < CONTACT_FORM_LIMITS.nameMin) {
    errors.name = 'Enter at least 2 characters for your name.';
  } else if (cleanValues.name.length > CONTACT_FORM_LIMITS.nameMax) {
    errors.name = 'Keep your name to 100 characters or fewer.';
  }

  if (!cleanValues.email) {
    errors.email = 'Enter your email address.';
  } else if (
    cleanValues.email.length > CONTACT_FORM_LIMITS.emailMax ||
    !emailIsValid(cleanValues.email)
  ) {
    errors.email = 'Enter a valid email address, such as name@example.com.';
  }

  if (!cleanValues.subject) {
    errors.subject = 'Choose the type of inquiry.';
  } else if (!allowedSubjectSet.has(cleanValues.subject)) {
    errors.subject = 'Choose one of the available inquiry types.';
  }

  if (!cleanValues.message) {
    errors.message = 'Enter your message.';
  } else if (cleanValues.message.length < CONTACT_FORM_LIMITS.messageMin) {
    errors.message = 'Enter at least 20 characters so we can understand your inquiry.';
  } else if (cleanValues.message.length > CONTACT_FORM_LIMITS.messageMax) {
    errors.message = 'Keep your message to 5,000 characters or fewer.';
  }

  if (
    cleanValues.article_url &&
    (cleanValues.article_url.length > CONTACT_FORM_LIMITS.articleUrlMax ||
      !articleUrlIsValid(cleanValues.article_url))
  ) {
    errors.article_url = 'Enter a full Lawscope article URL beginning with https://getlawscope.com/articles/.';
  }

  if (!cleanValues.privacy_consent) {
    errors.privacy_consent = 'Confirm that you understand how Lawscope will use this information.';
  }

  return Object.freeze({
    values: cleanValues,
    errors: Object.freeze(errors),
    valid: Object.keys(errors).length === 0
  });
}

export function createContactPayload(values, allowedSubjects = []) {
  const result = validateContactValues(values, allowedSubjects);
  if (!result.valid) {
    throw new TypeError('Cannot create a contact payload from invalid values.');
  }

  return Object.freeze({
    name: result.values.name,
    email: result.values.email,
    subject: result.values.subject,
    message: result.values.message,
    article_url: result.values.article_url,
    privacy_consent: true,
    website: result.values.website,
    started_at: result.values.started_at
  });
}

export function parseContactSuccessResponse(payload) {
  const reference = String(payload?.reference ?? '');
  if (payload?.status !== 'received' || !/^LS-\d{8}-[A-F0-9]{8}$/.test(reference)) {
    throw new TypeError('The contact endpoint returned an invalid success response.');
  }
  return Object.freeze({ status: 'received', reference });
}
