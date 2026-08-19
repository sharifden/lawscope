import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadSiteSettings } from './site-settings.mjs';
import {
  AD_SLOT_DEFINITIONS,
  ADSENSE_PLACEHOLDER_PUBLISHER_ID,
  ADSENSE_PLACEHOLDER_SLOT_ID,
  createAdsTxt,
  createAdvertisingManifest,
  createAdvertisingRuntimeSource,
  resolveAdvertisingFeatureState,
  validateAdvertisingSettings
} from './advertising.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const generatedRoot = path.join(projectRoot, 'generated');
const execFileAsync = promisify(execFile);
const problems = [];

function check(condition, message) {
  if (!condition) problems.push(message);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function buildFixture(environment, variables) {
  const outputDirectory = await mkdtemp(path.join(projectRoot, '.module31-validation-'));
  try {
    await execFileAsync(process.execPath, ['scripts/build.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ...variables,
        VERCEL_ENV: environment,
        LAWSCOPE_OUTPUT_DIR: outputDirectory
      },
      maxBuffer: 10 * 1024 * 1024
    });
    const routes = [
      'index.html',
      'articles/index.html',
      'articles/page/2/index.html',
      'categories/index.html',
      'categories/legal-basics/index.html',
      'articles/what-happens-after-an-arrest/index.html',
      'about/index.html',
      'contact/index.html',
      'privacy-policy/index.html',
      'legal-disclaimer/index.html',
      'editorial-policy/index.html',
      '404.html',
      'admin/index.html'
    ];
    const html = Object.fromEntries(
      await Promise.all(
        routes.map(async (route) => [route, await readFile(path.join(outputDirectory, route), 'utf8')])
      )
    );
    return {
      html,
      config: await readFile(path.join(outputDirectory, 'js/adsense-config.js'), 'utf8'),
      manifest: JSON.parse(
        await readFile(path.join(outputDirectory, 'data/advertising-manifest.json'), 'utf8')
      ),
      adsTxt: (await exists(path.join(outputDirectory, 'ads.txt')))
        ? await readFile(path.join(outputDirectory, 'ads.txt'), 'utf8')
        : null
    };
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}

const settings = await loadSiteSettings(projectRoot);
const [
  adapterSource,
  slotControllerSource,
  sourceConfig,
  buildSource,
  componentCss,
  cmsConfig,
  environmentExample,
  privacyTemplate,
  runbook,
  generatedConfig,
  generatedManifestSource
] = await Promise.all([
  readFile(path.join(projectRoot, 'js/adsense.js'), 'utf8'),
  readFile(path.join(projectRoot, 'js/ad-slots.js'), 'utf8'),
  readFile(path.join(projectRoot, 'js/adsense-config.js'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'admin/config.yml'), 'utf8'),
  readFile(path.join(projectRoot, '.env.example'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/privacy-policy.html'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/module-31-google-adsense.md'), 'utf8'),
  readFile(path.join(generatedRoot, 'js/adsense-config.js'), 'utf8'),
  readFile(path.join(generatedRoot, 'data/advertising-manifest.json'), 'utf8')
]);
const generatedManifest = JSON.parse(generatedManifestSource);

check(settings.advertising.enabled === false, 'settings: AdSense must remain disabled by default');
check(settings.advertising.account_approved === false, 'settings: account approval must remain unattested');
check(settings.advertising.policy_reviewed === false, 'settings: policy review must remain unattested');
check(settings.advertising.certified_cmp_ready === false, 'settings: certified CMP readiness must remain unattested');
check(
  settings.advertising.publisher_id === ADSENSE_PLACEHOLDER_PUBLISHER_ID,
  'settings: publisher ID must remain the all-zero placeholder'
);
check(
  Object.keys(settings.advertising.slots).join('|') === AD_SLOT_DEFINITIONS.map(({ key }) => key).join('|'),
  'settings: slot registry must contain the seven controlled keys in canonical order'
);
check(
  Object.values(settings.advertising.slots).every((value) => value === ADSENSE_PLACEHOLDER_SLOT_ID),
  'settings: every inactive slot ID must remain the all-zero placeholder'
);

try {
  validateAdvertisingSettings(settings);
} catch (error) {
  problems.push(`settings: valid baseline rejected (${error.message})`);
}
try {
  validateAdvertisingSettings({
    advertising: { ...settings.advertising, publisher_id: 'pub-123' }
  });
  problems.push('settings: malformed publisher ID was accepted');
} catch {
  // Expected fail-closed result.
}
try {
  validateAdvertisingSettings({
    advertising: {
      ...settings.advertising,
      slots: { ...settings.advertising.slots, article_end: '123' }
    }
  });
  problems.push('settings: malformed slot ID was accepted');
} catch {
  // Expected fail-closed result.
}

const productionEnvironment = {
  ADSENSE_ENABLED: 'true',
  ADSENSE_ACCOUNT_APPROVED: 'true',
  ADSENSE_POLICY_REVIEWED: 'true',
  ADSENSE_CERTIFIED_CMP_READY: 'true',
  ADSENSE_PUBLISHER_ID: 'ca-pub-1234567890123456',
  ADSENSE_SLOT_HOME_BELOW_FEATURED: '1000000001',
  ADSENSE_SLOT_ARTICLES_IN_FEED: '1000000002',
  ADSENSE_SLOT_CATEGORIES_OVERVIEW: '1000000003',
  ADSENSE_SLOT_CATEGORY_IN_FEED: '1000000004',
  ADSENSE_SLOT_ARTICLE_MID: '1000000005',
  ADSENSE_SLOT_ARTICLE_SIDEBAR: '1000000006',
  ADSENSE_SLOT_ARTICLE_END: '1000000007'
};
const developmentState = resolveAdvertisingFeatureState(
  settings,
  'development',
  productionEnvironment
);
const previewState = resolveAdvertisingFeatureState(settings, 'preview', productionEnvironment);
const inactiveProductionState = resolveAdvertisingFeatureState(settings, 'production', {});
const activeProductionState = resolveAdvertisingFeatureState(
  settings,
  'production',
  productionEnvironment
);
check(!developmentState.enabled && developmentState.reason === 'environment-blocked', 'state: development did not block a complete activation request');
check(!previewState.enabled && previewState.reason === 'environment-blocked', 'state: Preview did not block a complete activation request');
check(
  developmentState.publisherId === ADSENSE_PLACEHOLDER_PUBLISHER_ID &&
    Object.values(developmentState.slotIds).every((value) => value === ADSENSE_PLACEHOLDER_SLOT_ID),
  'state: nonproduction output leaked real public identifiers'
);
check(!inactiveProductionState.enabled && inactiveProductionState.reason === 'not-requested', 'state: inactive production baseline is not fail-closed');
check(
  activeProductionState.enabled &&
    activeProductionState.provider === 'adsense' &&
    activeProductionState.initialState === 'awaiting-consent' &&
    activeProductionState.siteOrigin === 'https://getlawscope.com',
  'state: complete production approval did not resolve to consent-gated AdSense'
);
try {
  resolveAdvertisingFeatureState(settings, 'production', { ADSENSE_ENABLED: 'true' });
  problems.push('state: incomplete requested production configuration did not fail the build');
} catch (error) {
  check(/activation is blocked/.test(error.message), 'state: production failure did not explain readiness blockers');
}

const previewFixture = await buildFixture('preview', productionEnvironment);
const productionFixture = await buildFixture('production', productionEnvironment);
check(!previewFixture.manifest.enabled, 'Preview build: advertising unexpectedly enabled');
check(previewFixture.manifest.reason === 'environment-blocked', 'Preview build: environment block reason missing');
check(previewFixture.adsTxt === null, 'Preview build: ads.txt must not be emitted');
check(!previewFixture.config.includes('ca-pub-1234567890123456'), 'Preview build: publisher ID leaked');
check(
  !previewFixture.config.includes('1000000001') &&
    previewFixture.config.includes(ADSENSE_PLACEHOLDER_SLOT_ID),
  'Preview build: slot identifiers were not masked'
);
check(productionFixture.manifest.enabled, 'Production fixture: complete approved configuration did not enable');
check(productionFixture.manifest.provider === 'Google AdSense', 'Production fixture: provider missing');
check(productionFixture.manifest.adsTxtEmitted, 'Production fixture: manifest did not record ads.txt');
check(productionFixture.config.includes('ca-pub-1234567890123456'), 'Production fixture: publisher missing from generated config');
check(productionFixture.config.includes('1000000007'), 'Production fixture: controlled slot IDs missing');
check(
  productionFixture.adsTxt ===
    'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n',
  'Production fixture: ads.txt authorization is incorrect'
);
for (const route of [
  'about/index.html',
  'contact/index.html',
  'privacy-policy/index.html',
  'legal-disclaimer/index.html',
  'editorial-policy/index.html',
  '404.html',
  'admin/index.html'
]) {
  const html = productionFixture.html[route];
  check(!html.includes('/js/adsense.js'), `Production fixture ${route}: adapter must be excluded`);
  check(!html.includes('data-ad-slot='), `Production fixture ${route}: inventory must be excluded`);
  check(!html.includes('pagead2.googlesyndication.com'), `Production fixture ${route}: provider must be excluded`);
}
for (const route of [
  'index.html',
  'articles/index.html',
  'categories/index.html',
  'categories/legal-basics/index.html',
  'articles/what-happens-after-an-arrest/index.html'
]) {
  const html = productionFixture.html[route];
  check(html.includes('/js/adsense.js'), `Production fixture ${route}: local adapter missing`);
  check(!html.includes('pagead2.googlesyndication.com'), `Production fixture ${route}: provider loaded before consent`);
}
const productionSlots = Object.values(productionFixture.html)
  .join('\n')
  .match(/<aside\b[^>]*data-ad-slot=[\s\S]*?<\/aside>/g) || [];
for (const slot of productionSlots) {
  check(slot.includes('aria-label="Advertisement"'), 'Production fixture: enabled slot lacks Advertisement accessible name');
  check(slot.includes('>Advertisement</p>'), 'Production fixture: enabled slot lacks visible Advertisement label');
  check(slot.includes('data-ad-provider="adsense"'), 'Production fixture: enabled slot lacks controlled provider');
  check(slot.includes('data-ad-feature-enabled="true"'), 'Production fixture: enabled slot lacks feature state');
  check(slot.includes('data-ad-state="awaiting-consent"'), 'Production fixture: enabled slot did not await consent');
  check(!/\shidden\s*>/.test(slot), 'Production fixture: enabled slot is incorrectly hidden');
}

const activeRuntime = createAdvertisingRuntimeSource(activeProductionState);
const activeManifest = createAdvertisingManifest(activeProductionState);
check(activeRuntime.includes('ca-pub-1234567890123456'), 'runtime config: active publisher ID missing');
check(activeRuntime.includes('"provider":"adsense"'), 'runtime config: active provider missing');
check(activeManifest.slots.length === 7 && activeManifest.autoAds === false, 'manifest: controlled manual inventory contract missing');
check(activeManifest.canonicalHostRuntimeGate === true, 'manifest: canonical runtime gate missing');
check(activeManifest.excludedSurfaces.length === 7, 'manifest: launch exclusions incomplete');
check(
  createAdsTxt(activeProductionState) ===
    'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n',
  'ads.txt: active authorization line is incorrect'
);
check(createAdsTxt(inactiveProductionState) === '', 'ads.txt: inactive state emitted authorization');

for (const fragment of [
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=",
  "config.environment === 'production'",
  "config.siteOrigin === 'https://getlawscope.com'",
  "root.dataset.consentAdvertising === 'granted'",
  "config.provider !== 'adsense'",
  "data-ad-status",
  "status === 'unfilled' || status === 'unfill-optimized'",
  "window.adsbygoogle.push({})",
  "desktopSidebarMediaQuery",
  "slot.dataset.adDesktopOnly !== 'true'",
  "document.getElementById(loaderId)",
  "new CustomEvent('lawscope:ad-provider-ready')"
]) {
  check(adapterSource.includes(fragment), `adsense.js: missing ${fragment}`);
}
for (const fragment of [
  "const READY_EVENT = 'lawscope:ad-slot-ready'",
  "const STATUS_EVENT = 'lawscope:ad-status'",
  "new Set(['no-fill', 'error'])",
  "collapseSlot(slot, 'consent-blocked')"
]) {
  check(slotControllerSource.includes(fragment), `ad-slots.js: missing ${fragment}`);
}
for (const fragment of [
  'createAdvertisingRuntimeSource(adFeatureState)',
  "'data', 'advertising-manifest.json'",
  "path.join(outputDirectory, 'ads.txt')",
  "adFeatureState.enabled"
]) {
  check(buildSource.includes(fragment), `build.mjs: missing ${fragment}`);
}
for (const fragment of [
  '.ad-slot__unit',
  'max-inline-size: var(--size-full)',
  'overflow: hidden',
  '.ad-slot__unit[data-ad-status="unfilled"]',
  '.ad-slot__unit[data-ad-status="unfill-optimized"]'
]) {
  check(componentCss.includes(fragment), `components.css: missing ${fragment}`);
}
for (const fragment of [
  'label: Google AdSense',
  'name: account_approved',
  'name: policy_reviewed',
  'name: certified_cmp_ready',
  "'^ca-pub-[0-9]{16}$'",
  'name: home_below_featured',
  'name: articles_in_feed',
  'name: categories_overview',
  'name: category_in_feed',
  'name: article_mid',
  'name: article_sidebar',
  'name: article_end'
]) {
  check(cmsConfig.includes(fragment), `admin/config.yml: missing ${fragment}`);
}
for (const line of [
  'ADSENSE_ENABLED=false',
  'ADSENSE_ACCOUNT_APPROVED=false',
  'ADSENSE_POLICY_REVIEWED=false',
  'ADSENSE_CERTIFIED_CMP_READY=false',
  `ADSENSE_PUBLISHER_ID=${ADSENSE_PLACEHOLDER_PUBLISHER_ID}`,
  'ADSENSE_SLOT_HOME_BELOW_FEATURED=0000000000',
  'ADSENSE_SLOT_ARTICLES_IN_FEED=0000000000',
  'ADSENSE_SLOT_CATEGORIES_OVERVIEW=0000000000',
  'ADSENSE_SLOT_CATEGORY_IN_FEED=0000000000',
  'ADSENSE_SLOT_ARTICLE_MID=0000000000',
  'ADSENSE_SLOT_ARTICLE_SIDEBAR=0000000000',
  'ADSENSE_SLOT_ARTICLE_END=0000000000'
]) {
  check(environmentExample.includes(line), `.env.example: missing inert control ${line}`);
}
check(privacyTemplate.includes('<strong>Google AdSense</strong>'), 'privacy: provider disclosure missing');
check(privacyTemplate.includes('Google-certified CMP'), 'privacy: certified-CMP disclosure missing');
check(privacyTemplate.includes('My Ad Center'), 'privacy: provider control link missing');
for (const fragment of [
  'Policy review date:',
  'TCF v2.3',
  'Invalid traffic',
  'Immediate rollback',
  'ADSENSE_SLOT_ARTICLE_END',
  'click live ads'
]) {
  check(runbook.includes(fragment), `runbook: missing ${fragment}`);
}

check(generatedManifest.module === 31, 'generated manifest: module number missing');
check(generatedManifest.enabled === false, 'generated manifest: development advertising unexpectedly enabled');
check(generatedManifest.provider === 'Google AdSense', 'generated manifest: planned provider missing');
check(generatedManifest.adsTxtEmitted === false, 'generated manifest: inactive ads.txt state incorrect');
check(generatedConfig.includes('"enabled":false'), 'generated config: inactive state missing');
check(generatedConfig.includes(ADSENSE_PLACEHOLDER_PUBLISHER_ID), 'generated config: placeholder publisher missing');
check(!/ca-pub-(?!0{16})\d{16}/.test(generatedConfig), 'generated config: real publisher ID leaked');
check(!(await exists(path.join(generatedRoot, 'ads.txt'))), 'generated output: inactive build must not emit ads.txt');
check(sourceConfig.includes(ADSENSE_PLACEHOLDER_PUBLISHER_ID), 'source config: safe placeholder missing');

const eligibleRoutes = [
  ['home', 'index.html'],
  ['articles', 'articles/index.html'],
  ['categories', 'categories/index.html'],
  ['category', 'categories/legal-basics/index.html'],
  ['article', 'articles/what-happens-after-an-arrest/index.html']
];
for (const [name, relativePath] of eligibleRoutes) {
  const html = await readFile(path.join(generatedRoot, relativePath), 'utf8');
  for (const scriptPath of ['/js/adsense-config.js', '/js/ad-slots.js', '/js/adsense.js']) {
    const count = (html.match(new RegExp(scriptPath.replaceAll('/', '\\/'), 'g')) || []).length;
    check(count === 1, `generated ${name}: expected one ${scriptPath} reference, received ${count}`);
  }
  check(!html.includes('pagead2.googlesyndication.com'), `generated ${name}: external provider was statically loaded`);
}

const excludedRoutes = [
  ['about', 'about/index.html'],
  ['contact', 'contact/index.html'],
  ['privacy', 'privacy-policy/index.html'],
  ['legal disclaimer', 'legal-disclaimer/index.html'],
  ['editorial policy', 'editorial-policy/index.html'],
  ['404', '404.html'],
  ['admin', 'admin/index.html']
];
for (const [name, relativePath] of excludedRoutes) {
  const html = await readFile(path.join(generatedRoot, relativePath), 'utf8');
  check(!html.includes('/js/adsense-config.js'), `generated ${name}: advertising config must be excluded`);
  check(!html.includes('/js/ad-slots.js'), `generated ${name}: slot controller must be excluded`);
  check(!html.includes('/js/adsense.js'), `generated ${name}: AdSense adapter must be excluded`);
  check(!html.includes('data-ad-slot='), `generated ${name}: advertising inventory must be excluded`);
  check(!html.includes('pagead2.googlesyndication.com'), `generated ${name}: provider URL must be excluded`);
}

const [homeHtml, articlesHtml, articlesPageTwoHtml, categoriesHtml, articleHtml] = await Promise.all([
  readFile(path.join(generatedRoot, 'index.html'), 'utf8'),
  readFile(path.join(generatedRoot, 'articles/index.html'), 'utf8'),
  readFile(path.join(generatedRoot, 'articles/page/2/index.html'), 'utf8'),
  readFile(path.join(generatedRoot, 'categories/index.html'), 'utf8'),
  readFile(path.join(generatedRoot, 'articles/what-happens-after-an-arrest/index.html'), 'utf8')
]);
check((homeHtml.match(/data-ad-unit-key="home_below_featured"/g) || []).length === 1, 'placement: home unit missing or duplicated');
check((articlesHtml.match(/data-ad-unit-key="articles_in_feed"/g) || []).length === 1, 'placement: articles in-feed unit missing or duplicated');
check(!articlesPageTwoHtml.includes('data-ad-unit-key='), 'placement: later articles pagination page must not contain inventory');
check((categoriesHtml.match(/data-ad-unit-key="categories_overview"/g) || []).length === 1, 'placement: categories overview unit missing or duplicated');
for (const unitKey of ['article_sidebar', 'article_mid', 'article_end']) {
  check((articleHtml.match(new RegExp(`data-ad-unit-key="${unitKey}"`, 'g')) || []).length === 1, `placement: ${unitKey} missing or duplicated`);
}
check(articleHtml.includes('data-ad-unit-key="article_sidebar"\n  data-ad-desktop-only="true"'), 'density: article sidebar is not desktop-only');
check(articleHtml.indexOf('data-ad-unit-key="article_end"') < articleHtml.indexOf('class="article-related"'), 'placement: article end unit must precede related articles');

for (const html of [homeHtml, articlesHtml, categoriesHtml, articleHtml]) {
  const adSlots = html.match(/<aside\b[^>]*data-ad-slot=[\s\S]*?<\/aside>/g) || [];
  for (const slot of adSlots) {
    check(slot.includes('aria-label="Advertisement"'), 'labeling: slot lacks Advertisement accessible name');
    check(slot.includes('>Advertisement</p>'), 'labeling: slot lacks visible Advertisement label');
    check(slot.includes('data-ad-provider="none"'), 'development safety: generated slot provider is not none');
    check(slot.includes('data-ad-feature-enabled="false"'), 'development safety: generated slot feature is not disabled');
    check(/\shidden\s*>/.test(slot), 'development safety: generated inactive slot lacks hidden attribute');
  }
}

function createRuntimeHarness({ consent = 'pending', origin = 'https://getlawscope.com', desktop = true, desktopOnly = false } = {}) {
  const documentListeners = new Map();
  const statusEvents = [];
  const appendedScripts = [];
  const observers = [];
  const timeoutCallbacks = new Map();
  let nextTimeout = 1;

  class FakeElement {}
  class FakeAdElement extends FakeElement {
    constructor() {
      super();
      this.dataset = {};
      this.attributes = new Map();
      this.className = '';
    }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }
    getAttribute(name) {
      return this.attributes.get(name) || null;
    }
  }
  class FakeScript extends FakeElement {
    constructor() {
      super();
      this.listeners = new Map();
      this.id = '';
    }
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    }
    emit(type) {
      this.listeners.get(type)?.();
    }
  }
  const frame = {
    child: null,
    replaceChildren(child) {
      this.child = child;
    }
  };
  const slot = new FakeElement();
  slot.dataset = {
    adSlot: desktopOnly ? 'article-example-sidebar' : 'home-below-featured',
    adFeatureEnabled: 'true',
    adProvider: 'adsense',
    adUnitKey: desktopOnly ? 'article_sidebar' : 'home_below_featured',
    adDesktopOnly: String(desktopOnly)
  };
  slot.hidden = false;
  slot.querySelector = (selector) => {
    if (selector === '[data-ad-container]') return frame;
    if (selector === 'ins.adsbygoogle') return frame.child;
    return null;
  };

  const document = {
    documentElement: { dataset: { consentAdvertising: consent } },
    head: {
      append(script) {
        appendedScripts.push(script);
      }
    },
    querySelectorAll(selector) {
      return selector === '[data-ad-slot]' ? [slot] : [];
    },
    querySelector() {
      return null;
    },
    createElement(name) {
      return name === 'script' ? new FakeScript() : new FakeAdElement();
    },
    getElementById(id) {
      return appendedScripts.find((script) => script.id === id) || null;
    },
    addEventListener(type, handler) {
      const handlers = documentListeners.get(type) || [];
      handlers.push(handler);
      documentListeners.set(type, handlers);
    },
    dispatchEvent(event) {
      statusEvents.push(event);
      for (const handler of documentListeners.get(event.type) || []) handler(event);
      return true;
    }
  };
  class FakeCustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  }
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
  }
  const mediaQuery = {
    matches: desktop,
    addEventListener() {}
  };
  const window = {
    LawscopeAdvertisingConfig: {
      module: 31,
      enabled: true,
      environment: 'production',
      provider: 'adsense',
      publisherId: 'ca-pub-1234567890123456',
      slotIds: {
        home_below_featured: '1000000001',
        article_sidebar: '1000000006'
      },
      siteOrigin: 'https://getlawscope.com',
      loaderTimeoutMilliseconds: 12000,
      desktopSidebarMediaQuery: '(min-width: 64rem)'
    },
    location: { origin },
    matchMedia() {
      return mediaQuery;
    },
    setTimeout(callback) {
      const id = nextTimeout++;
      timeoutCallbacks.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timeoutCallbacks.delete(id);
    },
    dispatchEvent() {
      return true;
    }
  };

  vm.runInNewContext(adapterSource, {
    Array,
    CustomEvent: FakeCustomEvent,
    Element: FakeElement,
    Error,
    Map,
    MutationObserver: FakeMutationObserver,
    Number,
    Object,
    Promise,
    Set,
    String,
    document,
    encodeURIComponent,
    window
  });

  return {
    document,
    frame,
    slot,
    window,
    statusEvents,
    appendedScripts,
    observers,
    emitDocument(type, detail) {
      if (type === 'lawscope:consent-change' && detail?.categories) {
        document.documentElement.dataset.consentAdvertising =
          detail.categories.advertising === true ? 'granted' : 'denied';
      }
      for (const handler of documentListeners.get(type) || []) handler({ detail });
    }
  };
}

const pendingHarness = createRuntimeHarness();
check(pendingHarness.appendedScripts.length === 0, 'runtime: provider loaded before advertising consent');
pendingHarness.emitDocument('lawscope:consent-change', {
  categories: { advertising: true }
});
check(pendingHarness.appendedScripts.length === 1, 'runtime: eligible consent did not load provider once');
pendingHarness.emitDocument('lawscope:consent-change', {
  categories: { advertising: true }
});
check(pendingHarness.appendedScripts.length === 1, 'runtime: repeated grant duplicated provider loader');
check(
  pendingHarness.appendedScripts[0]?.src ===
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456',
  'runtime: provider loader URL or public client query is incorrect'
);
pendingHarness.appendedScripts[0]?.emit('load');
await new Promise((resolve) => setImmediate(resolve));
check(pendingHarness.frame.child?.className.includes('adsbygoogle'), 'runtime: responsive ad element was not created after provider readiness');
check(pendingHarness.frame.child?.dataset.adFormat === 'auto', 'runtime: responsive auto format missing');
check(pendingHarness.frame.child?.dataset.fullWidthResponsive === 'true', 'runtime: full-width responsive flag missing');
check(pendingHarness.window.adsbygoogle?.length === 1, 'runtime: eligible unit was not requested exactly once');
pendingHarness.frame.child?.setAttribute('data-ad-status', 'filled');
pendingHarness.observers[0]?.callback([{ attributeName: 'data-ad-status' }]);
check(
  pendingHarness.statusEvents.some((event) => event.type === 'lawscope:ad-status' && event.detail?.status === 'filled'),
  'runtime: filled provider status was not forwarded'
);
pendingHarness.frame.child?.setAttribute('data-ad-status', 'unfilled');
pendingHarness.observers[0]?.callback([{ attributeName: 'data-ad-status' }]);
check(
  pendingHarness.statusEvents.some((event) => event.type === 'lawscope:ad-status' && event.detail?.status === 'no-fill'),
  'runtime: unfilled provider status was not mapped to no-fill'
);

const wrongOriginHarness = createRuntimeHarness({ consent: 'granted', origin: 'https://preview.example' });
check(wrongOriginHarness.appendedScripts.length === 0, 'runtime: noncanonical origin loaded provider');
check(wrongOriginHarness.slot.hidden, 'runtime: noncanonical production artifact did not collapse inventory');
check(wrongOriginHarness.slot.dataset.adFeatureEnabled === 'false', 'runtime: canonical block was not persistent across later consent events');
wrongOriginHarness.emitDocument('lawscope:consent-change', { categories: { advertising: true } });
check(wrongOriginHarness.appendedScripts.length === 0, 'runtime: later consent bypassed canonical-origin block');

const mobileSidebarHarness = createRuntimeHarness({ consent: 'granted', desktop: false, desktopOnly: true });
check(mobileSidebarHarness.appendedScripts.length === 0, 'runtime: mobile requested desktop-only article sidebar unit');

if (problems.length > 0) {
  console.error('Module 31 AdSense validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('Module 31 AdSense validation passed.');
console.log(
  'Seven controlled responsive units, strict opt-in, once-only loading, canonical/nonproduction gates, no-fill collapse, exclusions, mobile density, placeholders, ads.txt, CMS fields, privacy disclosure, and activation runbook passed.'
);
