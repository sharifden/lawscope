import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  loadSiteSettings,
  resolveNewsletterFeatureState
} from './site-settings.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

const [
  sourceIndex,
  generatedIndex,
  partial,
  clientScript,
  componentsCss,
  environmentExample,
  manifestText,
  siteSettings
] = await Promise.all([
  readFile(path.join(projectRoot, 'index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/home-newsletter.html'), 'utf8'),
  readFile(path.join(projectRoot, 'js/newsletter.js'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, '.env.example'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/home-selection.json'), 'utf8'),
  loadSiteSettings(projectRoot)
]);
const manifest = JSON.parse(manifestText);
let contractCount = 0;

function contract(condition, message) {
  assert.ok(condition, message);
  contractCount += 1;
}

function includesAll(haystack, needles, label) {
  for (const needle of needles) {
    contract(haystack.includes(needle), `${label} must include: ${needle}`);
  }
}

function createElement({ dataset = {}, attributes = {}, value = '' } = {}) {
  const attributeMap = new Map(Object.entries(attributes));
  return {
    dataset: { ...dataset },
    textContent: '',
    hidden: false,
    disabled: false,
    value,
    listeners: new Map(),
    focusCalled: false,
    setAttribute(name, attributeValue) {
      attributeMap.set(name, String(attributeValue));
    },
    getAttribute(name) {
      return attributeMap.has(name) ? attributeMap.get(name) : null;
    },
    hasAttribute(name) {
      return attributeMap.has(name);
    },
    removeAttribute(name) {
      attributeMap.delete(name);
    },
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    focus() {
      this.focusCalled = true;
    },
    checkValidity() {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value) && this.value.length <= 254;
    }
  };
}

function createHarness({
  enabled = true,
  provider = 'generic-form',
  endpoint = 'https://forms.example.test/lawscope',
  fetchImplementation
} = {}) {
  const section = createElement({ dataset: { newsletterState: enabled ? 'idle' : 'unavailable' } });
  const input = createElement();
  const errorElement = createElement();
  const submitButton = createElement();
  const submitLabel = createElement();
  submitLabel.textContent = 'Subscribe';
  const loadingIcon = createElement();
  loadingIcon.hidden = true;
  const statusElement = createElement();
  statusElement.hidden = enabled;
  const elements = new Map([
    ['[data-newsletter-email]', input],
    ['[data-newsletter-error]', errorElement],
    ['[data-newsletter-submit]', submitButton],
    ['[data-newsletter-submit-label]', submitLabel],
    ['[data-newsletter-loading-icon]', loadingIcon],
    ['[data-newsletter-status]', statusElement]
  ]);
  const form = createElement({
    dataset: {
      newsletterEnabled: String(enabled),
      newsletterProvider: provider
    },
    attributes: endpoint ? { action: endpoint } : {}
  });
  form.querySelector = (selector) => elements.get(selector) || null;
  form.closest = () => section;

  const fetchCalls = [];
  const fetchMock = (...arguments_) => {
    fetchCalls.push(arguments_);
    return fetchImplementation(...arguments_);
  };
  const dispatchedEvents = [];
  class MockCustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  }
  const context = vm.createContext({
    document: {
      querySelectorAll(selector) {
        return selector === '[data-newsletter-form]' ? [form] : [];
      },
      dispatchEvent(event) {
        dispatchedEvents.push(event);
        return true;
      }
    },
    CustomEvent: MockCustomEvent,
    fetch: fetchMock,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout
  });
  vm.runInContext(clientScript, context, { filename: 'js/newsletter.js' });

  return {
    section,
    form,
    input,
    errorElement,
    submitButton,
    submitLabel,
    loadingIcon,
    statusElement,
    fetchCalls,
    dispatchedEvents
  };
}

async function submit(harness) {
  const listener = harness.form.listeners.get('submit');
  contract(typeof listener === 'function', 'Enabled newsletter form must register submit behavior.');
  let prevented = false;
  await listener({ preventDefault: () => { prevented = true; } });
  contract(prevented, 'Enhanced newsletter submission must prevent native navigation.');
}

// Source, placement, semantics, and approved copy.
includesAll(sourceIndex, ['/js/newsletter.js', '{{HOME_NEWSLETTER}}'], 'Home source');
contract(
  sourceIndex.indexOf('{{HOME_CATEGORIES}}') < sourceIndex.indexOf('{{HOME_NEWSLETTER}}') &&
    sourceIndex.indexOf('{{HOME_NEWSLETTER}}') < sourceIndex.indexOf('{{SITE_FOOTER}}'),
  'Newsletter placeholder must follow Popular Categories and precede the footer.'
);
includesAll(
  partial,
  [
    'Understand the Law, One Clear Guide at a Time',
    'Get new Lawscope explainers and important editorial updates in your inbox. No case advice, no daily noise, and you can unsubscribe at any time.',
    'Email address',
    'placeholder="you@example.com"',
    '>Subscribe<',
    'We use your email only to send Lawscope updates and manage your subscription.',
    'Read our <a href="/privacy-policy/">Privacy Policy</a>.',
    'method="post"',
    'type="email"',
    'autocomplete="email"',
    'aria-describedby="newsletter-email-help newsletter-email-error"',
    'role="status"',
    'aria-live="polite"',
    'data-double-opt-in="true"',
    '{{NEWSLETTER_ACTION_ATTRIBUTE}}',
    '{{NEWSLETTER_DISABLED_ATTRIBUTE}}'
  ],
  'Newsletter partial'
);
contract(
  partial.includes('Your subscription starts only after you confirm.'),
  'The consent copy must explain double opt in before submission.'
);
contract(
  !/method=["']get["']/i.test(partial),
  'The newsletter form must never submit subscriber PII with GET.'
);

const categoriesPosition = generatedIndex.indexOf('class="popular-categories"');
const newsletterPosition = generatedIndex.indexOf('class="newsletter-signup"');
const footerPosition = generatedIndex.indexOf('<footer');
contract(
  categoriesPosition >= 0 && categoriesPosition < newsletterPosition && newsletterPosition < footerPosition,
  'Generated homepage must place the newsletter after categories and before the footer.'
);
contract(
  (generatedIndex.match(/class="newsletter-signup"/g) || []).length === 1,
  'Generated homepage must contain exactly one newsletter section.'
);
contract(
  generatedIndex.includes('data-newsletter-enabled="false"') &&
    generatedIndex.includes('data-newsletter-state="unavailable"'),
  'An unconfigured build must expose a clear unavailable state.'
);
contract(
  generatedIndex.includes('Newsletter signup is not available yet. No email address will be sent or stored.'),
  'An unconfigured build must explain that no address is transmitted or stored.'
);
contract(
  !/<form[^>]*data-newsletter-form[^>]*action=/s.test(generatedIndex),
  'An unconfigured generated form must not expose an action endpoint.'
);
contract(
  /data-newsletter-email[\s\S]*?disabled/.test(generatedIndex) &&
    /data-newsletter-submit[\s\S]*?disabled/.test(generatedIndex),
  'Unconfigured email and submit controls must both be disabled.'
);
contract(!/{{[A-Z0-9_]+}}/.test(generatedIndex), 'Generated homepage must not retain build tokens.');

// Settings and endpoint resolution contracts.
contract(siteSettings.newsletter.enabled === false, 'Baseline newsletter delivery must remain disabled.');
contract(siteSettings.newsletter.double_opt_in === true, 'Double opt in must be locked on in settings.');
contract(
  environmentExample.includes('NEWSLETTER_FORM_ENDPOINT=') &&
    environmentExample.includes('NEWSLETTER_PROVIDER=generic-form'),
  'Public endpoint and provider environment variables must be documented.'
);
const enabledSettings = structuredClone(siteSettings);
enabledSettings.newsletter.enabled = true;
const httpsState = resolveNewsletterFeatureState(enabledSettings, {
  NEWSLETTER_FORM_ENDPOINT: 'https://forms.example.test/lawscope',
  NEWSLETTER_PROVIDER: 'generic-json'
});
contract(httpsState.enabled === true, 'HTTPS environment endpoint must enable requested delivery.');
contract(httpsState.provider === 'generic-json', 'Provider environment override must be resolved.');
contract(httpsState.doubleOptIn === true, 'Resolved newsletter state must retain double opt in.');
const relativeState = resolveNewsletterFeatureState(
  { ...enabledSettings, newsletter: { ...enabledSettings.newsletter, endpoint: '/api/newsletter' } },
  {}
);
contract(relativeState.enabled === true, 'A root-relative same-origin endpoint must be accepted.');
assert.throws(
  () => resolveNewsletterFeatureState(enabledSettings, { NEWSLETTER_FORM_ENDPOINT: 'http://forms.example.test/signup' }),
  /HTTPS/,
  'Non-HTTPS external endpoints must be rejected.'
);
contractCount += 1;
assert.throws(
  () => resolveNewsletterFeatureState(enabledSettings, {}),
  /not configured/,
  'Requested delivery without an endpoint must fail the build contract.'
);
contractCount += 1;
assert.throws(
  () => resolveNewsletterFeatureState(enabledSettings, {
    NEWSLETTER_FORM_ENDPOINT: 'https://forms.example.test/signup',
    NEWSLETTER_PROVIDER: 'unknown-provider'
  }),
  /not approved/,
  'Unknown provider adapters must be rejected.'
);
contractCount += 1;
assert.throws(
  () => resolveNewsletterFeatureState(
    {
      ...enabledSettings,
      newsletter: { ...enabledSettings.newsletter, double_opt_in: false }
    },
    { NEWSLETTER_FORM_ENDPOINT: 'https://forms.example.test/signup' }
  ),
  /double opt in/,
  'Double opt in must not be disabled by configuration.'
);
contractCount += 1;
contract(
  manifest.newsletter.enabled === false &&
    manifest.newsletter.doubleOptIn === true &&
    manifest.newsletter.initialState === 'unavailable',
  'Generated manifest must record the safe baseline state.'
);
contract(
  !Object.hasOwn(manifest.newsletter, 'endpoint'),
  'Generated selection metadata must not duplicate the provider endpoint.'
);

// Client privacy and adapter contracts.
includesAll(
  clientScript,
  [
    "'generic-form'",
    "'generic-json'",
    "method: 'POST'",
    "credentials: 'omit'",
    "referrerPolicy: 'no-referrer'",
    "cache: 'no-store'",
    "redirect: 'error'",
    'AbortController',
    'data-newsletter-form',
    'Please check your inbox to confirm your subscription.',
    'That address is already subscribed. Check your inbox or manage your preferences.',
    'We could not complete your subscription. Please try again shortly.'
  ],
  'Newsletter enhancement'
);
for (const forbiddenToken of ['console.', 'localStorage', 'sessionStorage', 'analytics', 'window.location']) {
  contract(
    !clientScript.includes(forbiddenToken),
    `Newsletter enhancement must not use privacy-risking token: ${forbiddenToken}`
  );
}

// Browser-state contract: client-side validation.
const invalidHarness = createHarness({
  fetchImplementation: async () => ({ ok: true, status: 200, json: async () => ({}) })
});
invalidHarness.input.value = 'not-an-email';
await submit(invalidHarness);
contract(invalidHarness.fetchCalls.length === 0, 'Invalid email must not reach the provider adapter.');
contract(invalidHarness.section.dataset.newsletterState === 'invalid', 'Invalid input must expose a distinct form state.');
contract(invalidHarness.input.focusCalled, 'Invalid email must return focus to the field.');
contract(
  invalidHarness.input.getAttribute('aria-invalid') === 'true' &&
    invalidHarness.errorElement.textContent === 'Enter a valid email address, such as name@example.com.',
  'Invalid email must expose an accessible field error.'
);

// Browser-state contract: loading and confirmation requested.
let resolvePendingFetch;
const pendingFetch = new Promise((resolve) => { resolvePendingFetch = resolve; });
const successHarness = createHarness({ fetchImplementation: () => pendingFetch });
successHarness.input.value = 'reader@example.test';
const successListener = successHarness.form.listeners.get('submit');
let successPrevented = false;
const successPromise = successListener({ preventDefault: () => { successPrevented = true; } });
contract(successPrevented, 'Valid enhanced submission must prevent navigation immediately.');
contract(successHarness.section.dataset.newsletterState === 'loading', 'Valid submission must enter loading state.');
contract(successHarness.form.getAttribute('aria-busy') === 'true', 'Loading form must expose aria-busy.');
contract(
  successHarness.input.disabled && successHarness.submitButton.disabled && !successHarness.loadingIcon.hidden,
  'Loading state must disable duplicate submission and reveal progress.'
);
resolvePendingFetch({ ok: true, status: 202, json: async () => ({ status: 'pending' }) });
await successPromise;
contract(successHarness.fetchCalls.length === 1, 'Valid email must make one provider request.');
const [successUrl, successOptions] = successHarness.fetchCalls[0];
contract(successOptions.method === 'POST', 'Provider adapter must submit with POST.');
contract(!successUrl.includes('reader%40') && !successUrl.includes('reader@'), 'Email PII must not enter the request URL.');
contract(successOptions.body.includes('reader%40example.test'), 'Form adapter must place email in the request body.');
contract(
  successOptions.credentials === 'omit' &&
    successOptions.referrerPolicy === 'no-referrer' &&
    successOptions.redirect === 'error',
  'Provider request must omit credentials/referrer data and reject redirects.'
);
contract(
  successHarness.section.dataset.newsletterState === 'success' &&
    successHarness.statusElement.textContent === 'Please check your inbox to confirm your subscription.',
  'Accepted request must announce confirmation requested, not immediate subscription.'
);
contract(successHarness.input.value === '', 'Accepted request must clear email PII from the input.');
contract(
  successHarness.dispatchedEvents.length === 1 &&
    successHarness.dispatchedEvents[0].type === 'lawscope:newsletter-success' &&
    successHarness.dispatchedEvents[0].detail === undefined,
  'A confirmed new signup must emit one PII-free analytics success signal.'
);
contract(
  !successHarness.input.disabled && !successHarness.submitButton.disabled && successHarness.loadingIcon.hidden,
  'Completed request must leave loading state.'
);

// Browser-state contract: already subscribed.
const existingHarness = createHarness({
  fetchImplementation: async () => ({
    ok: false,
    status: 409,
    json: async () => ({ status: 'already_subscribed' })
  })
});
existingHarness.input.value = 'existing@example.test';
await submit(existingHarness);
contract(
  existingHarness.section.dataset.newsletterState === 'existing' &&
    existingHarness.statusElement.textContent ===
      'That address is already subscribed. Check your inbox or manage your preferences.',
  'Existing subscriber response must have its approved distinct message.'
);
contract(existingHarness.input.value === '', 'Existing-subscriber response must clear email PII.');
contract(
  existingHarness.dispatchedEvents.length === 0,
  'An already-subscribed response must not emit a new-signup analytics signal.'
);

// Browser-state contract: generic provider/network error.
const errorHarness = createHarness({
  provider: 'generic-json',
  fetchImplementation: async () => { throw new Error('network details stay private'); }
});
errorHarness.input.value = 'retry@example.test';
await submit(errorHarness);
contract(
  errorHarness.section.dataset.newsletterState === 'error' &&
    errorHarness.statusElement.textContent ===
      'We could not complete your subscription. Please try again shortly.',
  'Provider failure must use the approved generic error without leaking details.'
);
contract(errorHarness.statusElement.getAttribute('role') === 'alert', 'Provider failure must be announced urgently.');
const [, jsonOptions] = errorHarness.fetchCalls[0];
contract(jsonOptions.headers['Content-Type'] === 'application/json', 'JSON provider must use its isolated adapter.');
contract(JSON.parse(jsonOptions.body).email === 'retry@example.test', 'JSON adapter must place email only in its body.');

// Browser-state contract: unconfigured safety gate.
const disabledHarness = createHarness({
  enabled: false,
  endpoint: '',
  fetchImplementation: async () => ({ ok: true, status: 200, json: async () => ({}) })
});
contract(!disabledHarness.form.listeners.has('submit'), 'Unconfigured form must not register submission behavior.');
contract(
  disabledHarness.input.disabled &&
    disabledHarness.submitButton.disabled &&
    disabledHarness.form.getAttribute('aria-disabled') === 'true',
  'Unconfigured client gate must keep all submission controls inert.'
);

// Styling contracts: BEM, 44px tokens, semantic states, responsive layout, reduced motion.
includesAll(
  componentsCss,
  [
    '.newsletter-signup__panel',
    '.newsletter-signup__form',
    '.newsletter-signup__input',
    '.newsletter-signup__submit',
    '.newsletter-signup__status[data-newsletter-status="success"]',
    '.newsletter-signup__status[data-newsletter-status="error"]',
    'min-block-size: var(--size-touch-target)',
    '@media (min-width: 64rem)',
    '@media (prefers-reduced-motion: reduce)'
  ],
  'Newsletter CSS'
);
contract(
  !/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i.test(
    componentsCss.slice(componentsCss.indexOf('/* Module 10:'))
  ),
  'Newsletter component styles must use semantic color tokens.'
);

console.log(`Newsletter Signup Section validation passed (${contractCount} contracts).`);
