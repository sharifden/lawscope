import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  ANALYTICS_EVENTS,
  GA4_PLACEHOLDER_MEASUREMENT_ID,
  createAnalyticsManifest,
  createAnalyticsRuntimeSource,
  isRealGa4MeasurementId,
  resolveAnalyticsFeatureState,
  validateAnalyticsSettings
} from './analytics.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const generatedRoot = path.join(projectRoot, 'generated');
const templatePaths = [
  'index.html',
  'pages/404.html',
  'pages/about.html',
  'pages/article.html',
  'pages/articles.html',
  'pages/categories.html',
  'pages/category.html',
  'pages/contact.html',
  'pages/editorial-policy.html',
  'pages/legal-disclaimer.html',
  'pages/privacy-policy.html'
];

const [
  analyticsSource,
  fallbackConfigSource,
  buildSource,
  siteSettingsText,
  adminConfig,
  adminHtml,
  environmentExample,
  measurementPlan,
  privacyTemplate,
  privacySettingsText,
  newsletterSource,
  contactSource,
  articleTemplate,
  generatedConfigSource,
  generatedManifestText,
  renderPrivacySource
] = await Promise.all([
  readFile(path.join(projectRoot, 'js/analytics.js'), 'utf8'),
  readFile(path.join(projectRoot, 'js/analytics-config.js'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'content/settings/site.json'), 'utf8'),
  readFile(path.join(projectRoot, 'admin/config.yml'), 'utf8'),
  readFile(path.join(projectRoot, 'admin/index.html'), 'utf8'),
  readFile(path.join(projectRoot, '.env.example'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/module-30-google-analytics-ga4.md'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/privacy-policy.html'), 'utf8'),
  readFile(path.join(projectRoot, 'content/settings/privacy-policy.json'), 'utf8'),
  readFile(path.join(projectRoot, 'js/newsletter.js'), 'utf8'),
  readFile(path.join(projectRoot, 'js/contact-form.js'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/article.html'), 'utf8'),
  readFile(path.join(generatedRoot, 'js/analytics-config.js'), 'utf8'),
  readFile(path.join(generatedRoot, 'data/analytics-manifest.json'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/render-privacy-policy.mjs'), 'utf8')
]);
const siteSettings = JSON.parse(siteSettingsText);
const privacySettings = JSON.parse(privacySettingsText);
const generatedManifest = JSON.parse(generatedManifestText);

function dataLayerCommands(windowObject) {
  return windowObject.dataLayer.map((entry) => Array.from(entry));
}

function eventCommands(windowObject, name) {
  return dataLayerCommands(windowObject).filter(
    (entry) => entry[0] === 'event' && entry[1] === name
  );
}

function createRuntimeHarness({ article = false, consent = 'pending' } = {}) {
  class Target {
    constructor() {
      this.listeners = new Map();
    }
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }
    removeEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      this.listeners.set(type, listeners.filter((candidate) => candidate !== listener));
    }
    dispatch(type, event = {}) {
      for (const listener of [...(this.listeners.get(type) || [])]) {
        listener({ type, defaultPrevented: false, ...event });
      }
    }
  }

  let currentTime = 0;
  let timerId = 0;
  const timers = new Map();
  const headChildren = [];
  const root = { dataset: { consentAnalytics: consent } };
  const prose = {
    top: 900,
    height: 1000,
    getBoundingClientRect() {
      return { top: this.top, height: this.height };
    }
  };
  const articleElement = article
    ? {
        dataset: {
          analyticsArticleSlug: 'what-happens-after-an-arrest',
          analyticsCategorySlug: 'criminal-law'
        },
        querySelector(selector) {
          return selector === '[data-article-prose]' ? prose : null;
        }
      }
    : null;
  const documentObject = new Target();
  Object.assign(documentObject, {
    documentElement: root,
    title: 'Private query test | Lawscope',
    referrer: 'https://search.example.test/results?q=private#secret',
    visibilityState: 'visible',
    head: {
      append(node) {
        headChildren.push(node);
      }
    },
    createElement(tagName) {
      assert.equal(tagName, 'script');
      const element = new Target();
      element.dataset = {};
      element.async = false;
      element.src = '';
      return element;
    },
    querySelector(selector) {
      return selector === '[data-analytics-article]' ? articleElement : null;
    }
  });

  const windowObject = new Target();
  Object.assign(windowObject, {
    LawscopeAnalyticsConfig: Object.freeze({
      module: 30,
      enabled: true,
      environment: 'production',
      measurementId: 'G-1234567890',
      debugMode: true,
      siteOrigin: 'https://getlawscope.com',
      consentCategory: 'analytics'
    }),
    location: {
      origin: 'https://getlawscope.com',
      pathname: '/articles/what-happens-after-an-arrest/',
      search: '?q=private-email%40example.test',
      hash: '#secret'
    },
    innerHeight: 1000,
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    }
  });
  windowObject.window = windowObject;
  windowObject.document = documentObject;

  class MockDate extends Date {
    constructor(...arguments_) {
      super(...(arguments_.length ? arguments_ : [currentTime]));
    }
    static now() {
      return currentTime;
    }
  }

  const context = vm.createContext({
    window: windowObject,
    document: documentObject,
    URL,
    Date: MockDate,
    encodeURIComponent,
    Object,
    String,
    Math,
    RegExp,
    console
  });
  vm.runInContext(analyticsSource, context, { filename: 'js/analytics.js' });

  return {
    windowObject,
    documentObject,
    root,
    prose,
    timers,
    headChildren,
    setTime(value) {
      currentTime = value;
    },
    runLongestTimer() {
      const timer = [...timers.entries()].sort((a, b) => b[1].delay - a[1].delay)[0];
      assert.ok(timer, 'Expected an active engagement timer.');
      timers.delete(timer[0]);
      timer[1].callback();
    }
  };
}

async function collectPublicHtml(rootDirectory) {
  const htmlPaths = [];
  async function walk(directory, relativeDirectory = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (relativePath === 'admin' || relativePath.startsWith(`admin${path.sep}`)) continue;
      if (relativePath === 'pages' || relativePath.startsWith(`pages${path.sep}`)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolutePath, relativePath);
      else if (entry.isFile() && entry.name.endsWith('.html')) htmlPaths.push(relativePath);
    }
  }
  await walk(rootDirectory);
  return htmlPaths.sort();
}

async function isolatedBuild(environment, environmentOverrides) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), `lawscope-analytics-${environment}-`));
  const outputDirectory = path.join(temporaryRoot, 'output');
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      LAWSCOPE_OUTPUT_DIR: outputDirectory,
      VERCEL_ENV: environment,
      ...environmentOverrides
    },
    encoding: 'utf8',
    timeout: 120000
  });
  if (result.status !== 0) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw new Error(`Isolated ${environment} build failed:\n${result.stdout}\n${result.stderr}`);
  }
  return {
    temporaryRoot,
    outputDirectory,
    config: await readFile(path.join(outputDirectory, 'js/analytics-config.js'), 'utf8'),
    manifest: JSON.parse(
      await readFile(path.join(outputDirectory, 'data/analytics-manifest.json'), 'utf8')
    )
  };
}

// Settings, resolver, runtime serialization, and explicit production-only behavior.
validateAnalyticsSettings(siteSettings);
assert.equal(siteSettings.analytics.enabled, true, 'Committed settings must request GA4 activation.');
assert.equal(
  isRealGa4MeasurementId(siteSettings.analytics.measurement_id),
  true,
  'Committed settings must carry a real public measurement ID.'
);
assert.notEqual(siteSettings.analytics.measurement_id, GA4_PLACEHOLDER_MEASUREMENT_ID);
assert.equal(isRealGa4MeasurementId('G-1234567890'), true);
assert.equal(isRealGa4MeasurementId(GA4_PLACEHOLDER_MEASUREMENT_ID), false);
assert.equal(isRealGa4MeasurementId('UA-123456-1'), false);

// The committed configuration activates in production only, and stays reversible from the environment.
const committedProductionState = resolveAnalyticsFeatureState(siteSettings, 'production', {});
assert.equal(committedProductionState.enabled, true);
assert.equal(committedProductionState.measurementId, siteSettings.analytics.measurement_id);
assert.equal(committedProductionState.debugMode, false);
assert.equal(committedProductionState.initialState, 'awaiting-consent');
assert.equal(committedProductionState.consentCategory, 'analytics');
for (const environment of ['development', 'preview']) {
  const committedState = resolveAnalyticsFeatureState(siteSettings, environment, {});
  assert.equal(committedState.enabled, false);
  assert.equal(committedState.reason, 'environment-blocked');
  assert.equal(committedState.measurementId, GA4_PLACEHOLDER_MEASUREMENT_ID);
}
const environmentOptOutState = resolveAnalyticsFeatureState(siteSettings, 'production', {
  GA4_ENABLED: 'false'
});
assert.equal(environmentOptOutState.enabled, false);
assert.equal(environmentOptOutState.reason, 'not-requested');
assert.equal(environmentOptOutState.measurementId, GA4_PLACEHOLDER_MEASUREMENT_ID);

const placeholderSettings = structuredClone(siteSettings);
placeholderSettings.analytics.enabled = false;
placeholderSettings.analytics.measurement_id = GA4_PLACEHOLDER_MEASUREMENT_ID;

const requestedSettings = structuredClone(siteSettings);
requestedSettings.analytics.enabled = true;
requestedSettings.analytics.measurement_id = 'G-1234567890';
const productionState = resolveAnalyticsFeatureState(requestedSettings, 'production', {});
assert.equal(productionState.enabled, true);
assert.equal(productionState.measurementId, 'G-1234567890');
assert.equal(productionState.debugMode, false);
for (const environment of ['development', 'preview']) {
  const state = resolveAnalyticsFeatureState(requestedSettings, environment, {
    GA4_ENABLED: 'true',
    GA4_MEASUREMENT_ID: 'G-1234567890',
    GA4_DEBUG_MODE: 'true'
  });
  assert.equal(state.enabled, false);
  assert.equal(state.reason, 'environment-blocked');
  assert.equal(state.measurementId, GA4_PLACEHOLDER_MEASUREMENT_ID);
  assert.equal(state.debugMode, false);
}
assert.throws(
  () => resolveAnalyticsFeatureState(placeholderSettings, 'production', { GA4_ENABLED: 'true' }),
  /real GA4_MEASUREMENT_ID/
);
assert.throws(
  () => resolveAnalyticsFeatureState(placeholderSettings, 'production', { GA4_ENABLED: 'yes' }),
  /must be true or false/
);
assert.throws(
  () => resolveAnalyticsFeatureState(placeholderSettings, 'development', { GA4_MEASUREMENT_ID: 'invalid' }),
  /G-XXXXXXXXXX format/
);
const runtimeSource = createAnalyticsRuntimeSource(productionState);
assert.ok(runtimeSource.includes('G-1234567890'));
assert.doesNotMatch(runtimeSource, /api[_-]?key|secret|visitor|email/i);
const directManifest = createAnalyticsManifest(productionState);
assert.deepEqual(directManifest.events.map(({ name }) => name), ANALYTICS_EVENTS.map(({ name }) => name));

// Template placement, public/admin isolation, article metadata, and generated default artifact.
for (const templatePath of templatePaths) {
  const template = await readFile(path.join(projectRoot, templatePath), 'utf8');
  assert.equal((template.match(/\/js\/analytics-config\.js/g) || []).length, 1, `${templatePath}: config script`);
  assert.equal((template.match(/\/js\/analytics\.js/g) || []).length, 1, `${templatePath}: analytics script`);
  assert.ok(
    template.indexOf('/js/consent.js') < template.indexOf('/js/analytics-config.js') &&
      template.indexOf('/js/analytics-config.js') < template.indexOf('/js/analytics.js'),
    `${templatePath}: consent/config/client order`
  );
}
assert.doesNotMatch(adminHtml, /analytics(?:-config)?\.js|googletagmanager|G-[A-Z0-9]{10}/i);
assert.doesNotMatch(adminConfig, /GA4_MEASUREMENT_ID|googletagmanager/);
assert.ok(adminConfig.includes('name: analytics'));
assert.ok(adminConfig.includes("'^G-[A-Z0-9]{10}$'"));
assert.ok(articleTemplate.includes('data-analytics-article-slug="{{ARTICLE_SLUG}}"'));
assert.ok(articleTemplate.includes('data-analytics-category-slug="{{CATEGORY_SLUG}}"'));
assert.ok(articleTemplate.includes('data-article-prose'));
assert.ok(buildSource.includes('ARTICLE_SLUG: article.slug'));
assert.ok(buildSource.includes('resolveAnalyticsFeatureState'));
assert.ok(buildSource.includes("'data', 'analytics-manifest.json'"));

const publicHtmlPaths = await collectPublicHtml(generatedRoot);
assert.equal(publicHtmlPaths.length, 30, 'All 29 canonical public routes plus the host-level 404 must be audited.');
for (const relativePath of publicHtmlPaths) {
  const html = await readFile(path.join(generatedRoot, relativePath), 'utf8');
  assert.equal((html.match(/\/js\/analytics\.js/g) || []).length, 1, `${relativePath}: analytics client`);
  assert.equal((html.match(/\/js\/analytics-config\.js/g) || []).length, 1, `${relativePath}: analytics config`);
  assert.doesNotMatch(html, /googletagmanager\.com|G-(?!XXXXXXXXXX)[A-Z0-9]{10}/);
}
assert.ok(fallbackConfigSource.includes("measurementId: 'G-XXXXXXXXXX'"));
assert.ok(generatedConfigSource.includes('"enabled":false'));
assert.ok(generatedConfigSource.includes('"environment":"development"'));
assert.ok(generatedConfigSource.includes('"measurementId":"G-XXXXXXXXXX"'));
assert.equal(generatedManifest.module, 30);
assert.equal(generatedManifest.enabled, false);
assert.equal(generatedManifest.environment, 'development');
assert.equal(generatedManifest.measurementId, GA4_PLACEHOLDER_MEASUREMENT_ID);
assert.equal(generatedManifest.preConsentNetworkRequests, false);
assert.equal(generatedManifest.automaticPageViews, false);
assert.equal(generatedManifest.advertisingSignals, false);
assert.deepEqual(
  generatedManifest.events.map(({ name }) => name),
  ['page_view', 'newsletter_signup', 'contact_form_submit', 'category_click', 'article_read']
);

// Source privacy contracts and PII-free success signals.
for (const requiredToken of [
  "window.gtag('consent', 'default', deniedConsent)",
  "analytics_storage: 'granted'",
  "ad_storage: 'denied'",
  "ad_user_data: 'denied'",
  "ad_personalization: 'denied'",
  'send_page_view: false',
  'allow_google_signals: false',
  'allow_ad_personalization_signals: false',
  'ga-disable-',
  "sendEvent('newsletter_signup')",
  "sendEvent('contact_form_submit')",
  "sendEvent('category_click'",
  "sendEvent('article_read'",
  'articleReadSeconds = 30',
  'articleReadDepth = 75'
]) {
  assert.ok(analyticsSource.includes(requiredToken), `Analytics client is missing ${requiredToken}`);
}
for (const forbiddenToken of [
  'location.href',
  'location.search',
  'location.hash',
  'event.detail',
  'FormData',
  'localStorage',
  'sessionStorage',
  'user_id'
]) {
  assert.ok(!analyticsSource.includes(forbiddenToken), `Analytics client must not use ${forbiddenToken}`);
}
assert.ok(newsletterSource.includes("new CustomEvent('lawscope:newsletter-success')"));
assert.doesNotMatch(newsletterSource.match(/new CustomEvent\('lawscope:newsletter-success'\)[^;]*;/)?.[0] || '', /detail|email/);
assert.ok(contactSource.includes("new CustomEvent('lawscope:contact-success')"));
assert.doesNotMatch(contactSource.match(/new CustomEvent\('lawscope:contact-success'\)[^;]*;/)?.[0] || '', /detail|subject|name|email|message|reference/);

// Executable consent, page-view sanitation, custom events, and withdrawal behavior.
const runtime = createRuntimeHarness();
assert.equal(runtime.headChildren.length, 0, 'The Google tag must not be requested while consent is pending.');
assert.equal(eventCommands(runtime.windowObject, 'page_view').length, 0);
assert.equal(runtime.windowObject['ga-disable-G-1234567890'], true);
runtime.documentObject.dispatch('lawscope:newsletter-success');
assert.equal(eventCommands(runtime.windowObject, 'newsletter_signup').length, 0, 'Denied/pending interactions must not queue.');

runtime.root.dataset.consentAnalytics = 'granted';
runtime.documentObject.dispatch('lawscope:consent-change');
assert.equal(runtime.headChildren.length, 1);
assert.equal(runtime.headChildren[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-1234567890');
assert.equal(runtime.windowObject['ga-disable-G-1234567890'], false);
const pageViews = eventCommands(runtime.windowObject, 'page_view');
assert.equal(pageViews.length, 1);
assert.equal(pageViews[0][2].page_location, 'https://getlawscope.com/articles/what-happens-after-an-arrest/');
assert.equal(pageViews[0][2].page_referrer, 'https://search.example.test/');
assert.doesNotMatch(JSON.stringify(pageViews[0]), /private|secret|%40|example\.test\/results/);
const configCommand = dataLayerCommands(runtime.windowObject).find((entry) => entry[0] === 'config');
assert.equal(configCommand[2].send_page_view, false);
assert.equal(configCommand[2].allow_google_signals, false);
assert.equal(configCommand[2].allow_ad_personalization_signals, false);

runtime.documentObject.dispatch('lawscope:newsletter-success');
runtime.documentObject.dispatch('lawscope:contact-success');
runtime.documentObject.dispatch('click', {
  button: 0,
  target: {
    closest() {
      return { href: 'https://getlawscope.com/categories/criminal-law/' };
    }
  }
});
assert.equal(eventCommands(runtime.windowObject, 'newsletter_signup').length, 1);
assert.equal(eventCommands(runtime.windowObject, 'contact_form_submit').length, 1);
const categoryEvents = eventCommands(runtime.windowObject, 'category_click');
assert.equal(categoryEvents.length, 1);
assert.equal(categoryEvents[0][2].category_slug, 'criminal-law');
assert.deepEqual(
  Object.keys(categoryEvents[0][2]).sort(),
  ['category_slug', 'debug_mode', 'page_location', 'send_to'].sort()
);

runtime.root.dataset.consentAnalytics = 'denied';
runtime.documentObject.dispatch('lawscope:consent-change');
assert.equal(runtime.windowObject['ga-disable-G-1234567890'], true);
const countAtWithdrawal = dataLayerCommands(runtime.windowObject).length;
runtime.documentObject.dispatch('lawscope:newsletter-success');
assert.equal(dataLayerCommands(runtime.windowObject).length, countAtWithdrawal);
runtime.root.dataset.consentAnalytics = 'granted';
runtime.documentObject.dispatch('lawscope:consent-change');
assert.equal(eventCommands(runtime.windowObject, 'page_view').length, 1, 'Regrant must not duplicate page view.');
assert.equal(runtime.headChildren.length, 1, 'Regrant must not duplicate the provider script.');

// Article read requires post-consent foreground time and post-consent prose depth, once.
const articleRuntime = createRuntimeHarness({ article: true });
articleRuntime.prose.top = -1000;
articleRuntime.windowObject.dispatch('scroll');
articleRuntime.root.dataset.consentAnalytics = 'granted';
articleRuntime.documentObject.dispatch('lawscope:consent-change');
assert.equal(eventCommands(articleRuntime.windowObject, 'article_read').length, 0);
articleRuntime.prose.top = 200;
articleRuntime.windowObject.dispatch('scroll');
assert.equal(eventCommands(articleRuntime.windowObject, 'article_read').length, 0);
articleRuntime.setTime(30000);
articleRuntime.runLongestTimer();
const readEvents = eventCommands(articleRuntime.windowObject, 'article_read');
assert.equal(readEvents.length, 1);
assert.equal(readEvents[0][2].article_slug, 'what-happens-after-an-arrest');
assert.equal(readEvents[0][2].category_slug, 'criminal-law');
articleRuntime.windowObject.dispatch('scroll');
assert.equal(eventCommands(articleRuntime.windowObject, 'article_read').length, 1);

// Isolated artifacts prove real IDs cannot leak into development/Preview and can activate only in production.
const realId = 'G-1234567890';
const committedId = siteSettings.analytics.measurement_id;
const isolatedArtifacts = [];
try {
  const development = await isolatedBuild('development', {
    GA4_ENABLED: 'true',
    GA4_MEASUREMENT_ID: realId,
    GA4_DEBUG_MODE: 'true'
  });
  isolatedArtifacts.push(development);
  assert.equal(development.manifest.enabled, false);
  assert.equal(development.manifest.measurementId, GA4_PLACEHOLDER_MEASUREMENT_ID);
  assert.ok(!development.config.includes(realId));
  assert.ok(
    !development.config.includes(committedId),
    'The committed production measurement ID must not reach development output.'
  );

  const preview = await isolatedBuild('preview', {
    GA4_ENABLED: 'true',
    GA4_MEASUREMENT_ID: realId,
    GA4_DEBUG_MODE: 'true'
  });
  isolatedArtifacts.push(preview);
  assert.equal(preview.manifest.enabled, false);
  assert.equal(preview.manifest.environmentAllowed, false);
  assert.equal(preview.manifest.measurementId, GA4_PLACEHOLDER_MEASUREMENT_ID);
  assert.ok(!preview.config.includes(realId));
  assert.ok(
    !preview.config.includes(committedId),
    'The committed production measurement ID must not reach Preview output.'
  );

  const production = await isolatedBuild('production', {
    GA4_ENABLED: 'true',
    GA4_MEASUREMENT_ID: realId,
    GA4_DEBUG_MODE: 'true'
  });
  isolatedArtifacts.push(production);
  assert.equal(production.manifest.enabled, true);
  assert.equal(production.manifest.measurementId, realId);
  assert.equal(production.manifest.debugMode, true);
  assert.ok(production.config.includes(realId));
  const productionAdmin = await readFile(path.join(production.outputDirectory, 'admin/index.html'), 'utf8');
  assert.doesNotMatch(productionAdmin, /analytics(?:-config)?\.js|googletagmanager|G-[A-Z0-9]{10}/i);

  // The committed settings alone must activate the approved measurement ID on a production build.
  const committedProduction = await isolatedBuild('production', {
    GA4_ENABLED: undefined,
    GA4_MEASUREMENT_ID: undefined,
    GA4_DEBUG_MODE: undefined
  });
  isolatedArtifacts.push(committedProduction);
  assert.equal(committedProduction.manifest.enabled, true);
  assert.equal(committedProduction.manifest.requested, true);
  assert.equal(committedProduction.manifest.environmentAllowed, true);
  assert.equal(committedProduction.manifest.measurementConfigured, true);
  assert.equal(committedProduction.manifest.measurementId, committedId);
  assert.equal(committedProduction.manifest.debugMode, false, 'DebugView must stay off for routine releases.');
  assert.equal(committedProduction.manifest.consentMode, 'strict-opt-in');
  assert.equal(committedProduction.manifest.automaticPageViews, false);
  assert.equal(committedProduction.manifest.advertisingSignals, false);
  assert.equal(committedProduction.manifest.preConsentNetworkRequests, false);
  assert.ok(committedProduction.config.includes(committedId));
  const committedProductionHtmlPaths = await collectPublicHtml(committedProduction.outputDirectory);
  assert.equal(committedProductionHtmlPaths.length, 30);
  for (const relativePath of committedProductionHtmlPaths) {
    const html = await readFile(path.join(committedProduction.outputDirectory, relativePath), 'utf8');
    assert.equal((html.match(/\/js\/analytics\.js/g) || []).length, 1, `${relativePath}: analytics client`);
    assert.equal((html.match(/\/js\/analytics-config\.js/g) || []).length, 1, `${relativePath}: analytics config`);
    assert.doesNotMatch(
      html,
      /googletagmanager\.com/,
      `${relativePath}: the Google tag must never be hard-coded into a document.`
    );
  }
} finally {
  await Promise.all(
    isolatedArtifacts.map(({ temporaryRoot }) => rm(temporaryRoot, { recursive: true, force: true }))
  );
}

// Public disclosure, environment controls, DebugView, filters, retention, and PII documentation.
const analyticsService = privacySettings.service_inventory.find(({ key }) => key === 'analytics');
assert.equal(analyticsService.name, 'Google Analytics 4');
assert.equal(
  analyticsService.status,
  siteSettings.analytics.enabled ? 'configured' : 'inactive',
  'The Privacy Policy service inventory must match the committed analytics activation state.'
);
assert.ok(analyticsService.privacy_url.startsWith('https://'));
assert.match(analyticsService.retention, /two-month event-data retention/i);
assert.ok(
  renderPrivacySource.includes('Current status: available after opt-in.') &&
    renderPrivacySource.includes('Current status: inactive.'),
  'The Privacy Policy renderer must keep both the active and inactive GA4 disclosures.'
);
for (const phrase of [
  'Google Analytics 4',
  'no consent-mode ping before',
  '30 foreground seconds',
  '75% of the article prose',
  'does not send names, email addresses',
  'two-month event-data retention',
  'Google’s browser opt-out add-on'
]) {
  assert.ok(privacyTemplate.includes(phrase), `Privacy Policy is missing: ${phrase}`);
}
for (const token of ['GA4_ENABLED=false', 'GA4_MEASUREMENT_ID=G-XXXXXXXXXX', 'GA4_DEBUG_MODE=false']) {
  assert.ok(environmentExample.includes(token), `.env.example is missing ${token}`);
}
for (const phrase of [
  'Measurement plan',
  '`page_view`',
  '`newsletter_signup`',
  '`contact_form_submit`',
  '`category_click`',
  '`article_read`',
  'DebugView',
  'developer traffic',
  'internal traffic',
  '2 months',
  'Enhanced Measurement',
  'data redaction',
  'Preview output remains technically incapable',
  'Never send names, email addresses'
]) {
  assert.ok(measurementPlan.includes(phrase), `Measurement plan is missing: ${phrase}`);
}

console.log('GA4 validation passed: strict opt-in loading, sanitized measurement, PII-free events, withdrawal, article thresholds, admin exclusion, and development/Preview/production isolation verified.');
