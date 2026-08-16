import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONTACT_PAGE,
  CONTACT_SUBJECTS,
  canonicalContactPageUrl,
  contactEndpointIsValid,
  resolveContactFeatureState,
  validateContactSettings
} from './contact-page.mjs';
import {
  CONTACT_FORM_MESSAGES,
  createContactPayload,
  parseContactSuccessResponse,
  transitionContactFormState,
  validateContactValues
} from '../js/contact-form-model.js';
import { handleContactRequest } from '../api/contact.mjs';
import { resolvePublicRobotsDirective } from './seo.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const fixedNow = new Date('2026-08-16T12:00:00.000Z');
const exactIntro = 'Contact us about corrections, source updates, accessibility, privacy, advertising, or general website questions. Lawscope cannot provide legal advice, assess a case, or match you with an attorney.';
const exactHelper = 'Include the article URL, the statement you are asking us to review, and an authoritative source when reporting a correction.';
const exactResponse = 'We aim to review editorial and website inquiries within five business days. Complex correction requests may take longer while sources are checked.';
const exactUrgent = 'Do not use this form for emergencies, court deadlines, arrest assistance, immigration deadlines, or confidential legal facts. Contact emergency services, the relevant court or agency, or a qualified attorney as appropriate.';
const exactConsent = 'I understand that Lawscope will use my information to respond to this inquiry as described in the Privacy Policy.';

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function textContent(value) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&rsquo;', '’')
    .replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'Contact must include exactly one JSON-LD block.');
  return JSON.parse(blocks[0][1]);
}

function graphNode(schema, type) {
  return schema['@graph']?.find((node) => node['@type'] === type);
}

function createRequest({
  method = 'POST',
  origin = 'https://getlawscope.com',
  contentType = 'application/json',
  body = {},
  ip = '203.0.113.10',
  contentLength
} = {}) {
  const headers = {
    origin,
    'content-type': contentType,
    'x-forwarded-for': ip
  };
  if (contentLength !== undefined) headers['content-length'] = String(contentLength);
  return { method, headers, body, socket: { remoteAddress: ip } };
}

const serverEnvironment = Object.freeze({
  CONTACT_FORM_ENABLED: 'true',
  CONTACT_DELIVERY_WEBHOOK_URL: 'https://support.example.test/lawscope-contact',
  CONTACT_DELIVERY_WEBHOOK_TOKEN: 'server-only-test-token',
  CONTACT_RATE_LIMIT_SECRET: 'privacy-safe-test-secret'
});
const validSubmission = Object.freeze({
  name: 'Jordan Reader',
  email: 'jordan@example.com',
  subject: 'correction',
  message: 'Please review the second paragraph and the linked agency source.',
  article_url: 'https://getlawscope.com/articles/understanding-bail-and-pretrial-release/',
  privacy_consent: true,
  website: '',
  started_at: '2026-08-16T11:59:00.000Z'
});

const requiredFiles = [
  'pages/contact.html',
  'scripts/contact-page.mjs',
  'scripts/render-contact-page.mjs',
  'js/contact-form-model.js',
  'js/contact-form.js',
  'api/contact.mjs',
  'generated/contact/index.html',
  'generated/data/contact-page.json'
];
await Promise.all(requiredFiles.map((file) => access(path.join(projectRoot, file))));

const [
  html,
  template,
  componentCss,
  clientSource,
  clientModelSource,
  endpointSource,
  buildSource,
  settingsText,
  manifestText
] = await Promise.all([
  readFile(path.join(projectRoot, 'generated/contact/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/contact.html'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'js/contact-form.js'), 'utf8'),
  readFile(path.join(projectRoot, 'js/contact-form-model.js'), 'utf8'),
  readFile(path.join(projectRoot, 'api/contact.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'content/settings/site.json'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/contact-page.json'), 'utf8')
]);
const settings = JSON.parse(settingsText);
const manifest = JSON.parse(manifestText);
const visibleText = textContent(html);

// Public settings and build gating.
validateContactSettings(settings);
assert.equal(settings.contact.enabled, false, 'Contact must be safely disabled by default.');
assert.equal(settings.contact.endpoint, '/api/contact/');
assert.equal(settings.contact.provider, 'lawscope-serverless');
assert.equal(contactEndpointIsValid('/api/contact/'), true);
for (const invalidEndpoint of [
  '',
  'https://example.com/api/contact',
  '//example.com/api/contact',
  '/contact',
  '/api/contact?token=secret',
  '/api/contact#secret'
]) {
  assert.equal(contactEndpointIsValid(invalidEndpoint), false, `${invalidEndpoint} must be rejected.`);
}
const disabledFeature = resolveContactFeatureState(settings, {});
assert.equal(disabledFeature.enabled, false);
assert.equal(disabledFeature.endpoint, '/api/contact/');
assert.equal(disabledFeature.initialState, 'unavailable');
const toggleOnlyFeature = resolveContactFeatureState(settings, { CONTACT_FORM_ENABLED: 'true' });
assert.equal(toggleOnlyFeature.requested, true);
assert.equal(toggleOnlyFeature.enabled, false, 'The public form must remain unavailable without server delivery configuration.');
assert.equal(toggleOnlyFeature.deliveryConfigured, false);
const enabledFeature = resolveContactFeatureState(settings, {
  CONTACT_FORM_ENABLED: 'true',
  CONTACT_DELIVERY_WEBHOOK_URL: 'https://support.example.test/lawscope-contact',
  CONTACT_DELIVERY_WEBHOOK_TOKEN: 'server-only-test-token'
});
assert.equal(enabledFeature.enabled, true);
assert.equal(enabledFeature.deliveryConfigured, true);
assert.equal(enabledFeature.endpoint, '/api/contact/');
assert.equal(enabledFeature.initialState, 'idle');
assert.throws(
  () => resolveContactFeatureState(settings, { CONTACT_FORM_ENABLED: 'yes' }),
  /must be true or false/
);
assert.doesNotMatch(settingsText, /webhook|token|secret|support@example|mailto:/i);
assert.ok(buildSource.includes('renderContactPage'));
assert.ok(buildSource.includes("'data/contact-page.json'"));

// Static page, exact approved copy, landmarks, fields, and no-ad contract.
assert.equal(countMatches(html, /<h1\b/g), 1);
assert.ok(html.includes('<h1>Contact Lawscope</h1>'));
assert.ok(html.includes('<header class="site-header" data-site-header>'));
assert.ok(html.includes('<footer class="site-footer" data-site-footer>'));
assert.ok(html.includes('<nav class="breadcrumb" aria-label="Breadcrumb">'));
assert.ok(html.includes('<li class="breadcrumb__item"><a href="/">Home</a></li>'));
assert.ok(html.includes('<li class="breadcrumb__item" aria-current="page">Contact</li>'));
assert.ok(html.includes('<a class="skip-link" href="#main-content">Skip to main content</a>'));
assert.ok(html.includes('id="main-content" tabindex="-1"'));
for (const requiredText of [
  exactIntro,
  exactHelper,
  'Before You Send a Message',
  exactResponse,
  exactUrgent,
  CONTACT_FORM_MESSAGES.success,
  'Reporting a Correction',
  'Choose Report a correction as the inquiry type.',
  'Paste the full Lawscope article URL into the optional URL field.',
  'Identify the statement to review and include an authoritative source when possible.',
  'Send message'
]) {
  assert.ok(visibleText.includes(requiredText), `Contact page is missing: ${requiredText}`);
}
assert.ok(clientModelSource.includes(CONTACT_FORM_MESSAGES.error));
const consentLabelHtml = html.match(/<label for="contact-privacy-consent">([\s\S]*?)<\/label>/)?.[1] || '';
assert.equal(
  consentLabelHtml.replace(/<[^>]+>/g, '').replace('*', '').replace(/\s+/g, ' ').trim(),
  exactConsent
);
assert.equal(countMatches(html, /data-contact-form(?:\s|>)/g), 1);
assert.ok(html.includes('action="/api/contact/"'));
assert.ok(html.includes('method="post"'));
assert.ok(html.includes('data-contact-enabled="false"'));
assert.ok(html.includes('data-contact-provider="lawscope-serverless"'));
assert.ok(html.includes('data-contact-state="unavailable"'));
assert.ok(html.includes('Message sending is not available yet'));
assert.match(html, /<fieldset class="contact-form__fields" data-contact-fields disabled>/);
assert.match(html, /data-contact-submit\s+disabled/);
assert.ok(html.includes('<script type="module" src="/js/contact-form.js"></script>'));
assert.doesNotMatch(html, /\/js\/(?:newsletter|ad-slots)\.js/);
assert.ok(html.includes('<h2 id="contact-urgent-title">Not for Urgent or Legal Help</h2>'));
assert.ok(html.includes('data-contact-error-summary'));
assert.ok(html.includes('tabindex="-1"'));
assert.ok(html.includes('role="alert"'));
assert.ok(html.includes('aria-live="assertive"'));
assert.ok(html.includes('data-contact-status'));
assert.ok(html.includes('data-contact-result'));
assert.ok(html.includes('data-contact-reference'));
assert.ok(html.includes('data-contact-reset'));
assert.ok(html.includes('name="website"'));
assert.ok(html.includes('autocomplete="off"'));
assert.ok(html.includes('name="started_at"'));
assert.equal(countMatches(html, /href="\/privacy-policy\/"/g) >= 2, true);
for (const field of ['name', 'email', 'subject', 'message', 'article_url', 'privacy_consent']) {
  assert.ok(html.includes(`name="${field}"`), `Missing ${field} control.`);
  assert.ok(html.includes(`data-contact-error="${field}"`), `Missing ${field} inline error.`);
}
const optionLabels = [...html.matchAll(/<option value="[^"]*">([^<]+)<\/option>/g)]
  .map((match) => match[1])
  .filter((label) => label !== 'Choose an inquiry type');
assert.deepEqual(optionLabels, CONTACT_SUBJECTS.map(({ label }) => label));
assert.doesNotMatch(html, /data-ad-|\/js\/ad-slots\.js|>Advertisement</i);
assert.doesNotMatch(html, /{{[A-Z0-9_]+}}/);
assert.doesNotMatch(template, /(?:api[_-]?key|bearer\s+[a-z0-9]|webhook\.site|CONTACT_DELIVERY_WEBHOOK_TOKEN)/i);

// Unique metadata, absolute social/canonical URLs, robots, and structured data.
assert.ok(html.includes(`<title>${CONTACT_PAGE.title}</title>`));
assert.ok(html.includes(`<meta name="description" content="${CONTACT_PAGE.description}">`));
assert.ok(CONTACT_PAGE.description.length <= 155);
assert.ok(html.includes('<link rel="canonical" href="https://getlawscope.com/contact/">'));
assert.ok(html.includes('<meta property="og:url" content="https://getlawscope.com/contact/">'));
assert.match(html, /<meta property="og:image" content="https:\/\/getlawscope\.com\/assets\/images\//);
assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
assert.ok(html.includes(`<meta name="robots" content="${manifest.robotsDirective}">`));
assert.equal(canonicalContactPageUrl(), 'https://getlawscope.com/contact/');
const schema = extractJsonLd(html);
const contactPageNode = graphNode(schema, 'ContactPage');
const organizationNode = graphNode(schema, 'Organization');
const breadcrumbNode = graphNode(schema, 'BreadcrumbList');
assert.ok(contactPageNode);
assert.ok(organizationNode);
assert.ok(breadcrumbNode);
assert.equal(contactPageNode.url, 'https://getlawscope.com/contact/');
assert.equal(contactPageNode.about['@id'], 'https://getlawscope.com/#organization');
assert.equal(organizationNode.name, 'Lawscope');
assert.equal(breadcrumbNode.itemListElement.at(-1).item, 'https://getlawscope.com/contact/');
assert.doesNotMatch(JSON.stringify(schema), /ContactPoint|LegalService|Attorney|email|telephone/);

// Mobile-first, full-width controls, adjacent errors, responsive columns, and reduced motion.
assert.match(componentCss, /\.contact-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(var\(--space-0\), 1fr\)/);
assert.match(componentCss, /\.contact-form__field :where\(input, select, textarea\)\s*\{[\s\S]*?inline-size:\s*var\(--size-full\)/);
assert.match(componentCss, /\.contact-form__submit\s*\{[\s\S]*?inline-size:\s*var\(--size-full\)/);
assert.match(componentCss, /@media \(min-width: 48rem\)[\s\S]*?\.contact-layout\s*\{[\s\S]*?grid-template-columns:[^;]*3fr[^;]*2fr/);
assert.match(componentCss, /\.contact-form__field-error\s*\{[\s\S]*?color:\s*var\(--color-error\)/);
assert.match(componentCss, /\.contact-guidance__urgent\s*\{[\s\S]*?var\(--color-disclaimer-border\)/);
assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.contact-form__submit \.fa-spin/);
assert.doesNotMatch(componentCss, /\.contact-[^{]+\{[^}]*#[0-9a-f]{3,8}/i);

// Pure client validation and explicit state transitions.
const subjectValues = CONTACT_SUBJECTS.map(({ value }) => value);
const validation = validateContactValues(validSubmission, subjectValues);
assert.equal(validation.valid, true);
assert.equal(validation.values.name, 'Jordan Reader');
assert.equal(validation.values.privacy_consent, true);
const payload = createContactPayload(validSubmission, subjectValues);
assert.deepEqual(Object.keys(payload).sort(), [
  'article_url',
  'email',
  'message',
  'name',
  'privacy_consent',
  'started_at',
  'subject',
  'website'
]);
const invalid = validateContactValues(
  {
    name: 'A',
    email: 'not-an-email',
    subject: 'legal-advice',
    message: 'Too short',
    article_url: 'http://example.com/private',
    privacy_consent: false
  },
  subjectValues
);
assert.equal(invalid.valid, false);
assert.deepEqual(Object.keys(invalid.errors), [
  'name',
  'email',
  'subject',
  'message',
  'article_url',
  'privacy_consent'
]);
assert.throws(() => createContactPayload(invalid.values, subjectValues), /invalid values/);
assert.deepEqual(parseContactSuccessResponse({ status: 'received', reference: 'LS-20260816-A1B2C3D4' }), {
  status: 'received',
  reference: 'LS-20260816-A1B2C3D4'
});
assert.throws(() => parseContactSuccessResponse({ status: 'received', reference: 'Jordan Reader' }), /invalid success response/);
let state = 'idle';
state = transitionContactFormState(state, 'VALIDATION_FAILURE');
assert.equal(state, 'invalid');
state = transitionContactFormState(state, 'EDIT');
assert.equal(state, 'idle');
state = transitionContactFormState(state, 'SUBMIT');
assert.equal(state, 'processing');
state = transitionContactFormState(state, 'FAILURE');
assert.equal(state, 'error');
state = transitionContactFormState(state, 'SUBMIT');
assert.equal(state, 'processing');
state = transitionContactFormState(state, 'SUCCESS');
assert.equal(state, 'success');
state = transitionContactFormState(state, 'RESET');
assert.equal(state, 'idle');
assert.throws(() => transitionContactFormState('success', 'SUBMIT'), /Invalid contact form transition/);
for (const stateName of ['processing', 'success', 'error']) {
  assert.ok(clientSource.includes(`'${stateName}'`), `Client is missing ${stateName} behavior.`);
}
assert.ok(clientSource.includes("new CustomEvent('lawscope:contact-success')"));
const analyticsDispatch = clientSource.match(/new CustomEvent\('lawscope:contact-success'\)/)?.[0] || '';
assert.ok(analyticsDispatch);
assert.doesNotMatch(analyticsDispatch, /detail|subject|name|email|message|article_url|started_at|website/);

// Serverless method, availability, CSRF, body-size, abuse, validation, and delivery tests.
assert.equal(
  (await handleContactRequest(createRequest({ method: 'GET' }), { environment: {} })).status,
  405
);
assert.equal(
  (await handleContactRequest(createRequest({ ip: '203.0.113.11' }), { environment: {} })).status,
  503
);
assert.equal(
  (await handleContactRequest(createRequest({ origin: 'https://attacker.example', ip: '203.0.113.12' }), { environment: serverEnvironment })).status,
  403
);
assert.equal(
  (await handleContactRequest(createRequest({ contentType: 'text/plain', ip: '203.0.113.13' }), { environment: serverEnvironment })).status,
  415
);
assert.equal(
  (await handleContactRequest(createRequest({ contentLength: 40000, ip: '203.0.113.14' }), {
    environment: serverEnvironment,
    now: () => fixedNow
  })).status,
  413
);
assert.equal(
  (await handleContactRequest(createRequest({ body: { ...validSubmission, unexpected: 'value' }, ip: '203.0.113.15' }), {
    environment: serverEnvironment,
    now: () => fixedNow
  })).status,
  400
);
assert.equal(
  (await handleContactRequest(createRequest({ body: { ...validSubmission, website: 'spam.example' }, ip: '203.0.113.16' }), {
    environment: serverEnvironment,
    now: () => fixedNow
  })).status,
  400
);
assert.equal(
  (await handleContactRequest(createRequest({ body: { ...validSubmission, started_at: '2026-08-16T11:59:59.000Z' }, ip: '203.0.113.17' }), {
    environment: serverEnvironment,
    now: () => fixedNow
  })).status,
  400
);
const invalidServerResult = await handleContactRequest(
  createRequest({ body: { ...validSubmission, email: 'invalid' }, ip: '203.0.113.18' }),
  { environment: serverEnvironment, now: () => fixedNow }
);
assert.equal(invalidServerResult.status, 422);
assert.deepEqual(JSON.parse(invalidServerResult.body), { status: 'invalid', fields: ['email'] });
assert.doesNotMatch(invalidServerResult.body, /Jordan|jordan@example|second paragraph/);

let deliveredRequest;
const successResult = await handleContactRequest(
  createRequest({ body: validSubmission, ip: '203.0.113.19' }),
  {
    environment: serverEnvironment,
    now: () => fixedNow,
    fetchImplementation: async (url, options) => {
      deliveredRequest = { url, options };
      return { ok: true };
    }
  }
);
assert.equal(successResult.status, 201);
const successPayload = JSON.parse(successResult.body);
assert.equal(successPayload.status, 'received');
assert.match(successPayload.reference, /^LS-20260816-[A-F0-9]{8}$/);
assert.deepEqual(Object.keys(successPayload).sort(), ['reference', 'status']);
assert.doesNotMatch(successResult.body, /Jordan|jordan@example|second paragraph|getlawscope\.com\/articles/);
assert.equal(deliveredRequest.url, serverEnvironment.CONTACT_DELIVERY_WEBHOOK_URL);
assert.equal(deliveredRequest.options.headers.Authorization, `Bearer ${serverEnvironment.CONTACT_DELIVERY_WEBHOOK_TOKEN}`);
assert.equal(deliveredRequest.options.headers['Idempotency-Key'], successPayload.reference);
const deliveredPayload = JSON.parse(deliveredRequest.options.body);
assert.equal(deliveredPayload.reference, successPayload.reference);
assert.equal(deliveredPayload.contact.email, validSubmission.email);
assert.equal(deliveredPayload.contact.privacy_consent, true);

const nativeFormResult = await handleContactRequest(
  createRequest({
    body: { ...validSubmission, started_at: '' },
    contentType: 'application/x-www-form-urlencoded',
    ip: '203.0.113.21'
  }),
  {
    environment: serverEnvironment,
    now: () => fixedNow,
    fetchImplementation: async () => ({ ok: true })
  }
);
assert.equal(nativeFormResult.status, 201, 'Native URL-encoded submission must remain usable without the JavaScript timing signal.');
assert.match(endpointSource, /nativeFormHtml/);
assert.match(endpointSource, /contentType\.startsWith\('application\/x-www-form-urlencoded'\)/);
assert.match(endpointSource, /CONTACT_FORM_MESSAGES\.error/);

const deliveryFailure = await handleContactRequest(
  createRequest({ body: validSubmission, ip: '203.0.113.20' }),
  {
    environment: serverEnvironment,
    now: () => fixedNow,
    fetchImplementation: async () => ({ ok: false })
  }
);
assert.equal(deliveryFailure.status, 502);
assert.deepEqual(JSON.parse(deliveryFailure.body), { status: 'delivery_failed' });

const rateStatuses = [];
for (let index = 0; index < 6; index += 1) {
  const rateResult = await handleContactRequest(
    createRequest({
      body: { ...validSubmission, started_at: 'invalid' },
      ip: '203.0.113.200'
    }),
    { environment: serverEnvironment, now: () => fixedNow }
  );
  rateStatuses.push(rateResult.status);
}
assert.deepEqual(rateStatuses, [400, 400, 400, 400, 400, 429]);
assert.match(endpointSource, /createHmac\('sha256'/);
assert.match(endpointSource, /CONTACT_RATE_LIMIT_SECRET/);
assert.match(endpointSource, /Cache-Control': 'no-store/);
assert.doesNotMatch(endpointSource, /console\.(?:log|info|warn|error)/);
assert.ok(endpointSource.includes('RATE_BUCKET_MAX'));
assert.ok(endpointSource.includes('controller.abort()'));
assert.doesNotMatch(endpointSource, /process\.env\.[A-Z_]+\s*\|\|\s*['"]https:\/\/(?!getlawscope\.com)/);

assert.equal(manifest.module, 23);
assert.equal(
  manifest.robotsDirective,
  resolvePublicRobotsDirective(manifest.deploymentEnvironment)
);
assert.equal(manifest.route, '/contact/');
assert.equal(manifest.canonicalUrl, 'https://getlawscope.com/contact/');
assert.equal(manifest.form.enabled, false);
assert.equal(manifest.form.endpoint, '/api/contact/');
assert.equal(manifest.form.serverValidation, true);
assert.equal(manifest.form.privacyConsentRequired, true);
assert.equal(manifest.form.analyticsAllowsPii, false);
assert.equal(manifest.advertisingPolicy, 'omitted');
assert.deepEqual(manifest.form.subjects, CONTACT_SUBJECTS);

console.log('Module 23 contact-page validation passed.');
console.log('Contact: exact copy, guidance, correction workflow, metadata, schema, no-ad layout, responsive/accessibility contracts, and safe disabled default verified.');
console.log('Form: client validation/state model plus server method/origin/size/field/timing/honeypot/rate-limit/delivery and PII-safe response contracts verified.');
