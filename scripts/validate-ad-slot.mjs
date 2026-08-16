import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadSiteSettings, resolveAdFeatureState } from './site-settings.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const problems = [];

const [partial, sourceIndex, buildSource, mainCss, componentCss, browserScript, generatedHtml] =
  await Promise.all([
    readFile(path.join(projectRoot, 'pages/partials/ad-slot-horizontal.html'), 'utf8'),
    readFile(path.join(projectRoot, 'index.html'), 'utf8'),
    readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
    readFile(path.join(projectRoot, 'css/main.css'), 'utf8'),
    readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
    readFile(path.join(projectRoot, 'js/ad-slots.js'), 'utf8'),
    readFile(path.join(projectRoot, 'generated/index.html'), 'utf8')
  ]);
const manifest = JSON.parse(
  await readFile(path.join(projectRoot, 'generated/data/home-selection.json'), 'utf8')
);
const settings = await loadSiteSettings(projectRoot);

const partialContracts = [
  '<aside',
  'class="ad-slot ad-slot--horizontal"',
  'aria-label="Advertisement"',
  'data-ad-slot="home-below-featured"',
  'data-ad-feature-enabled="{{AD_FEATURE_ENABLED}}"',
  'data-ad-consent="unknown"',
  'data-ad-provider="{{AD_PROVIDER}}"',
  'data-ad-unit-key="home_below_featured"',
  'data-ad-state="{{AD_INITIAL_STATE}}"',
  '{{AD_HIDDEN_ATTRIBUTE}}',
  '<p class="ad-slot__label" aria-hidden="true">Advertisement</p>',
  'class="ad-slot__frame" data-ad-container',
  'Reserved advertising space'
];
for (const fragment of partialContracts) {
  if (!partial.includes(fragment)) problems.push(`ad-slot-horizontal.html: missing ${fragment}`);
}
if (/article-card|featured-articles__grid/.test(partial)) {
  problems.push('ad-slot-horizontal.html: ad inventory must not inherit content-card/grid styling');
}

if (!sourceIndex.includes('{{HOME_AD_SLOT_1}}')) {
  problems.push('index.html: missing HOME_AD_SLOT_1 insertion point');
}
if (sourceIndex.indexOf('{{HOME_AD_SLOT_1}}') < sourceIndex.indexOf('{{HOME_FEATURED}}')) {
  problems.push('index.html: AdSense Slot 1 must follow the complete Featured Articles section');
}
if (!sourceIndex.includes('<script src="/js/ad-slots.js" defer></script>')) {
  problems.push('index.html: consent/no-fill enhancement must load with defer');
}

const buildContracts = [
  'loadSiteSettings(projectRoot)',
  'resolveAdFeatureState(',
  'process.env',
  "path.join(projectRoot, 'pages/partials/ad-slot-horizontal.html')",
  'AD_FEATURE_ENABLED: String(adFeatureState.enabled)',
  "AD_HIDDEN_ATTRIBUTE: adFeatureState.hidden ? 'hidden' : ''",
  "replace('{{HOME_AD_SLOT_1}}', adSlotHtml)"
];
for (const fragment of buildContracts) {
  if (!buildSource.includes(fragment)) problems.push(`build.mjs: missing ${fragment}`);
}

const cssContracts = [
  '--size-ad-horizontal-max: 60.625rem',
  '--size-ad-slot-mobile-min-block: 6.25rem',
  '--size-ad-slot-desktop-min-block: 5.625rem',
  '.ad-slot[hidden]',
  'display: none',
  'max-inline-size: var(--size-ad-horizontal-max)',
  'min-block-size: var(--size-ad-slot-mobile-min-block)',
  'min-block-size: var(--size-ad-slot-desktop-min-block)',
  'border: var(--size-hairline) solid var(--color-border)',
  'background-color: var(--color-surface-muted)',
  'text-transform: uppercase'
];
for (const fragment of cssContracts) {
  if (!(mainCss + componentCss).includes(fragment)) problems.push(`CSS: missing ${fragment}`);
}

const scriptContracts = [
  "const CONSENT_EVENT = 'lawscope:consent-change'",
  "const STATUS_EVENT = 'lawscope:ad-status'",
  "const READY_EVENT = 'lawscope:ad-slot-ready'",
  "new Set(['no-fill', 'error'])",
  "new Set(['loading', 'filled'])",
  "slot.dataset.adFeatureEnabled === 'true'",
  "collapseSlot(slot, 'disabled')",
  "collapseSlot(slot, 'consent-blocked')",
  'document.documentElement.dataset.consentAdvertising',
  "detail?.status === 'pending'",
  'slot.hidden = true',
  'slot.hidden = false',
  "slot.dataset.adConsent !== 'granted'"
];
for (const fragment of scriptContracts) {
  if (!browserScript.includes(fragment)) problems.push(`ad-slots.js: missing ${fragment}`);
}

const developmentOn = resolveAdFeatureState(settings, 'development', {
  ADSENSE_ENABLED: 'true'
});
const previewOn = resolveAdFeatureState(settings, 'preview', { ADSENSE_ENABLED: 'true' });
const productionOff = resolveAdFeatureState(settings, 'production', {});
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
const productionOn = resolveAdFeatureState(settings, 'production', productionEnvironment);
if (developmentOn.enabled || previewOn.enabled) {
  problems.push('feature state: advertising must remain disabled outside production');
}
if (productionOff.enabled || !productionOff.hidden || productionOff.initialState !== 'disabled') {
  problems.push('feature state: a disabled production flag must collapse the slot');
}
if (!productionOn.enabled || productionOn.hidden || productionOn.initialState !== 'awaiting-consent') {
  problems.push('feature state: fully approved production inventory must reserve space while awaiting consent');
}
if (settings.advertising.enabled !== false) {
  problems.push('settings: live advertising must remain explicitly disabled by default');
}
if (
  settings.advertising.publisher_id !== 'ca-pub-0000000000000000' ||
  Object.values(settings.advertising.slots).some((value) => value !== '0000000000')
) {
  problems.push('settings: inactive advertising must retain only the controlled all-zero identifiers');
}

function exerciseBrowserScript(featureEnabled, initialConsent = 'pending') {
  const placeholder = { hidden: false };
  const attributes = new Map();
  const container = {
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    removeAttribute(name) {
      attributes.delete(name);
    }
  };
  const emitted = [];
  const listeners = new Map();
  const slot = {
    dataset: {
      adSlot: 'home-below-featured',
      adFeatureEnabled: String(featureEnabled),
      adConsent: 'unknown',
      adState: featureEnabled ? 'awaiting-consent' : 'disabled'
    },
    hidden: !featureEnabled,
    querySelector(selector) {
      if (selector === '.ad-slot__placeholder') return placeholder;
      if (selector === '[data-ad-container]') return container;
      return null;
    },
    dispatchEvent(event) {
      emitted.push(event);
      return true;
    }
  };
  const document = {
    documentElement: { dataset: { consentAdvertising: initialConsent } },
    readyState: 'complete',
    querySelectorAll(selector) {
      return selector === '[data-ad-slot]' ? [slot] : [];
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    }
  };
  class FakeCustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = options.bubbles;
      this.detail = options.detail;
    }
  }

  vm.runInNewContext(browserScript, {
    Array,
    CustomEvent: FakeCustomEvent,
    Set,
    document
  });

  return {
    slot,
    placeholder,
    attributes,
    emitted,
    emit(type, detail) {
      listeners.get(type)?.({ detail });
    }
  };
}

const disabledBehavior = exerciseBrowserScript(false);
disabledBehavior.emit('lawscope:consent-change', { categories: { advertising: true } });
if (!disabledBehavior.slot.hidden || disabledBehavior.slot.dataset.adState !== 'disabled') {
  problems.push('behavior: consent must never override a disabled feature flag');
}

const enabledBehavior = exerciseBrowserScript(true);
if (enabledBehavior.slot.hidden || enabledBehavior.slot.dataset.adState !== 'awaiting-consent') {
  problems.push('behavior: enabled inventory did not reserve its initial responsive area');
}
enabledBehavior.emit('lawscope:consent-change', {
  status: 'pending',
  categories: { advertising: false }
});
if (enabledBehavior.slot.hidden || enabledBehavior.slot.dataset.adState !== 'awaiting-consent') {
  problems.push('behavior: pending consent must block requests without collapsing reserved inventory');
}
enabledBehavior.emit('lawscope:consent-change', { categories: { advertising: true } });
if (
  enabledBehavior.slot.hidden ||
  enabledBehavior.slot.dataset.adState !== 'ready' ||
  enabledBehavior.slot.dataset.adConsent !== 'granted' ||
  enabledBehavior.emitted[0]?.type !== 'lawscope:ad-slot-ready'
) {
  problems.push('behavior: granted advertising consent did not produce a provider-ready hook');
}
enabledBehavior.emit('lawscope:ad-status', {
  slot: 'home-below-featured',
  status: 'loading'
});
if (enabledBehavior.slot.hidden || enabledBehavior.attributes.get('aria-busy') !== 'true') {
  problems.push('behavior: loading status did not retain reserved space and busy state');
}
enabledBehavior.emit('lawscope:ad-status', {
  slot: 'home-below-featured',
  status: 'filled'
});
if (
  enabledBehavior.slot.hidden ||
  enabledBehavior.slot.dataset.adState !== 'filled' ||
  !enabledBehavior.placeholder.hidden ||
  enabledBehavior.attributes.has('aria-busy')
) {
  problems.push('behavior: filled status did not preserve the slot and remove its placeholder');
}
enabledBehavior.emit('lawscope:ad-status', {
  slot: 'home-below-featured',
  status: 'no-fill'
});
if (!enabledBehavior.slot.hidden || enabledBehavior.slot.dataset.adState !== 'no-fill') {
  problems.push('behavior: no-fill status did not collapse the entire slot cleanly');
}

const storedGrantBehavior = exerciseBrowserScript(true, 'granted');
if (
  storedGrantBehavior.slot.hidden ||
  storedGrantBehavior.slot.dataset.adState !== 'ready' ||
  storedGrantBehavior.emitted[0]?.type !== 'lawscope:ad-slot-ready'
) {
  problems.push('behavior: root-level stored advertising grant was not replayed to the provider-ready hook');
}
const storedDenialBehavior = exerciseBrowserScript(true, 'denied');
if (
  !storedDenialBehavior.slot.hidden ||
  storedDenialBehavior.slot.dataset.adState !== 'consent-blocked' ||
  storedDenialBehavior.slot.dataset.adConsent !== 'denied'
) {
  problems.push('behavior: root-level stored advertising denial did not collapse inventory');
}

const generatedSlots = generatedHtml.match(/<aside\b[^>]*class="ad-slot[\s\S]*?<\/aside>/g) || [];
if (generatedSlots.length !== 1) {
  problems.push(`generated home: expected one ad inventory region, received ${generatedSlots.length}`);
}
const generatedSlot = generatedSlots[0] || '';
for (const fragment of [
  'aria-label="Advertisement"',
  'data-ad-slot="home-below-featured"',
  'data-ad-feature-enabled="false"',
  'data-ad-provider="none"',
  'data-ad-state="disabled"',
  ' hidden',
  '>Advertisement</p>'
]) {
  if (!generatedSlot.includes(fragment)) problems.push(`generated home: ad slot missing ${fragment}`);
}
const featuredSection = generatedHtml.match(
  /<section\s+class="featured-articles"[\s\S]*?<\/section>/
)?.[0];
if (!featuredSection || featuredSection.includes('data-ad-slot=')) {
  problems.push('generated home: advertising inventory must be outside the Featured Articles section');
}
if (generatedHtml.indexOf('data-ad-slot="home-below-featured"') < generatedHtml.indexOf('featured-articles__grid')) {
  problems.push('generated home: advertising inventory appears before featured content');
}
if (!generatedHtml.includes('<script src="/js/ad-slots.js" defer></script>')) {
  problems.push('generated home: deferred ad-slot state controller is missing');
}
if (
  manifest.advertising?.enabled !== false ||
  manifest.advertising?.homeBelowFeaturedState !== 'disabled'
) {
  problems.push('manifest: current development advertising state must be disabled');
}

const forbiddenProviderPatterns = [
  /adsbygoogle/i,
  /ca-pub-/i,
  /doubleclick\.net/i,
  /googlesyndication\.com/i,
  /google_ad_client/i
];
const providerSurface = `${partial}\n${sourceIndex}\n${browserScript}\n${generatedHtml}`;
for (const pattern of forbiddenProviderPatterns) {
  if (pattern.test(providerSurface)) {
    problems.push(`provider safety: live advertising pattern detected (${pattern})`);
  }
}

if (problems.length > 0) {
  console.error('AdSense Slot 1 validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `AdSense Slot 1 validation passed (${partialContracts.length + buildContracts.length + cssContracts.length + scriptContracts.length} source contracts checked).`
);
console.log(
  'Feature/environment gating, consent-ready signaling, reserved dimensions, disabled state, and no-fill collapse behavior passed without loading an ad provider.'
);
