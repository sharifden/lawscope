import { createHmac, randomBytes } from 'node:crypto';
import {
  CONTACT_LIMITS,
  CONTACT_SUBJECTS
} from '../scripts/contact-page.mjs';
import {
  CONTACT_FORM_MESSAGES,
  validateContactValues
} from '../js/contact-form-model.js';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_BUCKET_MAX = 5000;
const DELIVERY_TIMEOUT_MS = 10000;
const MIN_COMPLETION_MS = 3000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const FALLBACK_RATE_SECRET = randomBytes(32).toString('hex');
const rateBuckets = new Map();
const ALLOWED_FIELDS = new Set([
  'name',
  'email',
  'subject',
  'message',
  'article_url',
  'privacy_consent',
  'website',
  'started_at'
]);
const ALLOWED_SUBJECTS = CONTACT_SUBJECTS.map(({ value }) => value);

function response(status, payload, additionalHeaders = {}) {
  return {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...additionalHeaders
    },
    body: JSON.stringify(payload)
  };
}

function deliveryConfiguration(environment) {
  const enabled = environment.CONTACT_FORM_ENABLED === 'true';
  const webhook = String(environment.CONTACT_DELIVERY_WEBHOOK_URL || '').trim();
  const token = String(environment.CONTACT_DELIVERY_WEBHOOK_TOKEN || '').trim();

  let webhookUrl = null;
  try {
    webhookUrl = new URL(webhook);
  } catch {
    // Invalid configuration remains unavailable without exposing details.
  }

  return {
    ready:
      enabled &&
      webhookUrl?.protocol === 'https:' &&
      Boolean(token),
    webhook: webhookUrl?.href || '',
    token
  };
}

function allowedOrigins(environment) {
  const origins = new Set(['https://getlawscope.com', 'https://www.getlawscope.com']);
  const environmentValues = [
    environment.VERCEL_URL,
    environment.VERCEL_PROJECT_PRODUCTION_URL
  ];

  for (const value of environmentValues) {
    if (!value) continue;
    try {
      origins.add(new URL(`https://${String(value).replace(/^https?:\/\//, '')}`).origin);
    } catch {
      // Ignore malformed platform metadata.
    }
  }

  if (environment.CONTACT_ALLOWED_ORIGINS) {
    for (const value of environment.CONTACT_ALLOWED_ORIGINS.split(',')) {
      try {
        const origin = new URL(value.trim()).origin;
        if (origin.startsWith('https://')) origins.add(origin);
      } catch {
        // Ignore malformed optional origins rather than widening access.
      }
    }
  }

  return origins;
}

function requestOriginIsAllowed(request, environment) {
  const originValue = String(request.headers?.origin || '').trim();
  if (!originValue) return false;

  try {
    return allowedOrigins(environment).has(new URL(originValue).origin);
  } catch {
    return false;
  }
}

function privacySafeClientKey(request, environment) {
  const forwarded = String(request.headers?.['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  const address = forwarded || request.socket?.remoteAddress || 'unknown';
  const secret = environment.CONTACT_RATE_LIMIT_SECRET || FALLBACK_RATE_SECRET;
  return createHmac('sha256', secret).update(address).digest('hex');
}

function rateLimitAllows(key, now = Date.now()) {
  for (const [storedKey, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(storedKey);
  }

  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (rateBuckets.size >= RATE_BUCKET_MAX) {
      const oldestKey = rateBuckets.keys().next().value;
      if (oldestKey) rateBuckets.delete(oldestKey);
    }
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}

async function readTextBody(request) {
  if (typeof request.body === 'string') return request.body;
  if (Buffer.isBuffer(request.body)) return request.body.toString('utf8');
  if (request.body && typeof request.body === 'object') {
    return JSON.stringify(request.body);
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > CONTACT_LIMITS.requestBytesMax) {
      const error = new RangeError('Request body too large.');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function parseBody(request, contentType) {
  const declaredLength = Number(request.headers?.['content-length'] || 0);
  if (
    !Number.isFinite(declaredLength) ||
    declaredLength < 0 ||
    declaredLength > CONTACT_LIMITS.requestBytesMax
  ) {
    const error = new RangeError('Request body too large.');
    error.code = 'BODY_TOO_LARGE';
    throw error;
  }

  if (
    request.body &&
    typeof request.body === 'object' &&
    !Buffer.isBuffer(request.body)
  ) {
    const encoded = JSON.stringify(request.body);
    if (Buffer.byteLength(encoded) > CONTACT_LIMITS.requestBytesMax) {
      const error = new RangeError('Request body too large.');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    return request.body;
  }

  const text = await readTextBody(request);
  if (Buffer.byteLength(text) > CONTACT_LIMITS.requestBytesMax) {
    const error = new RangeError('Request body too large.');
    error.code = 'BODY_TOO_LARGE';
    throw error;
  }

  if (contentType === 'application/json') return JSON.parse(text);
  return Object.fromEntries(new URLSearchParams(text));
}

function timingLooksHuman(startedAt, now = Date.now()) {
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return false;
  const elapsed = now - started;
  return elapsed >= MIN_COMPLETION_MS && elapsed <= MAX_FORM_AGE_MS;
}

function createReference(now = new Date()) {
  const day = now.toISOString().slice(0, 10).replaceAll('-', '');
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `LS-${day}-${random}`;
}

async function deliverContactMessage(configuration, payload, reference, fetchImplementation) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const deliveryResponse = await fetchImplementation(configuration.webhook, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${configuration.token}`,
        'Content-Type': 'application/json;charset=UTF-8',
        'Idempotency-Key': reference,
        'User-Agent': 'Lawscope-Contact/1.0'
      },
      body: JSON.stringify({
        event: 'lawscope.contact.received',
        reference,
        received_at: new Date().toISOString(),
        contact: {
          name: payload.name,
          email: payload.email,
          subject: payload.subject,
          message: payload.message,
          article_url: payload.article_url || null,
          privacy_consent: true
        }
      }),
      redirect: 'error',
      signal: controller.signal
    });

    return deliveryResponse.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleContactRequest(
  request,
  {
    environment = process.env,
    fetchImplementation = globalThis.fetch,
    now = () => new Date()
  } = {}
) {
  if (request.method !== 'POST') {
    return response(405, { status: 'method_not_allowed' }, { Allow: 'POST' });
  }

  const configuration = deliveryConfiguration(environment);
  if (!configuration.ready || typeof fetchImplementation !== 'function') {
    return response(503, { status: 'unavailable' }, { 'Retry-After': '3600' });
  }

  if (!requestOriginIsAllowed(request, environment)) {
    return response(403, { status: 'forbidden' });
  }

  const contentType = String(request.headers?.['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!['application/json', 'application/x-www-form-urlencoded'].includes(contentType)) {
    return response(415, { status: 'unsupported_media_type' });
  }

  const rateLimit = rateLimitAllows(
    privacySafeClientKey(request, environment),
    now().getTime()
  );
  if (!rateLimit.allowed) {
    return response(
      429,
      { status: 'rate_limited' },
      { 'Retry-After': String(rateLimit.retryAfter) }
    );
  }

  let submitted;
  try {
    submitted = await parseBody(request, contentType);
  } catch (error) {
    if (error?.code === 'BODY_TOO_LARGE') {
      return response(413, { status: 'request_too_large' });
    }
    return response(400, { status: 'invalid_request' });
  }

  if (
    !submitted ||
    typeof submitted !== 'object' ||
    Array.isArray(submitted) ||
    Object.keys(submitted).some((field) => !ALLOWED_FIELDS.has(field))
  ) {
    return response(400, { status: 'invalid_request' });
  }

  if (String(submitted.website || '').trim()) {
    return response(400, { status: 'invalid_request' });
  }

  const submittedTiming = String(submitted.started_at || '').trim();
  const timingRequired = contentType === 'application/json' || Boolean(submittedTiming);
  if (timingRequired && !timingLooksHuman(submittedTiming, now().getTime())) {
    return response(400, { status: 'invalid_request' });
  }

  const validation = validateContactValues(submitted, ALLOWED_SUBJECTS);
  if (!validation.valid) {
    return response(422, {
      status: 'invalid',
      fields: Object.keys(validation.errors)
    });
  }

  const reference = createReference(now());
  const delivered = await deliverContactMessage(
    configuration,
    validation.values,
    reference,
    fetchImplementation
  );
  if (!delivered) {
    return response(502, { status: 'delivery_failed' });
  }

  return response(201, { status: 'received', reference });
}

function nativeFormHtml(result) {
  let payload = {};
  try {
    payload = JSON.parse(result.body);
  } catch {
    payload = {};
  }
  const succeeded = result.status === 201 && /^LS-\d{8}-[A-F0-9]{8}$/.test(payload.reference || '');
  const title = succeeded ? 'Message received | Lawscope' : 'Message not sent | Lawscope';
  const heading = succeeded ? 'Message received' : 'Message not sent';
  const message = succeeded ? CONTACT_FORM_MESSAGES.success : CONTACT_FORM_MESSAGES.error;
  const reference = succeeded
    ? `<p><strong>Reference:</strong> <code>${payload.reference}</code></p>`
    : '';
  const nextStep = succeeded
    ? '<p>We will review your inquiry and respond when appropriate. Editorial and website inquiries are normally reviewed within five business days.</p>'
    : '<p>Your information was not confirmed as delivered. Return to the form to review it and try again.</p>';

  return `<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>${title}</title>
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/css/dark-mode.css">
    <link rel="stylesheet" href="/css/components.css">
  </head>
  <body>
    <main class="contact-native-response container" id="main-content">
      <p class="eyebrow">Lawscope contact</p>
      <h1>${heading}</h1>
      <p>${message}</p>
      ${reference}
      ${nextStep}
      <p><a class="button button--secondary" href="/contact/">Return to Contact</a></p>
    </main>
  </body>
</html>`;
}

export default async function contactEndpoint(request, serverResponse) {
  const result = await handleContactRequest(request);
  const contentType = String(request.headers?.['content-type'] || '').toLowerCase();
  const accept = String(request.headers?.accept || '').toLowerCase();
  const nativeFormRequest =
    contentType.startsWith('application/x-www-form-urlencoded') &&
    accept.includes('text/html');

  if (nativeFormRequest) {
    result.headers['Content-Type'] = 'text/html; charset=utf-8';
    result.headers['Content-Security-Policy'] =
      "default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
    result.body = nativeFormHtml(result);
  }

  for (const [name, value] of Object.entries(result.headers)) {
    serverResponse.setHeader(name, value);
  }
  serverResponse.statusCode = result.status;
  serverResponse.end(result.body);
}
