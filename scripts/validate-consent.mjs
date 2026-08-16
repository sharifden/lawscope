import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  loadSiteSettings,
  resolveConsentFeatureState
} from './site-settings.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const problems = [];

const [
  partial,
  footerPartial,
  sourceIndex,
  buildSource,
  settingsSource,
  consentScript,
  adScript,
  mainCss,
  componentCss,
  documentation,
  generatedHtml,
  manifestSource
] = await Promise.all([
  readFile(path.join(projectRoot, 'pages/partials/consent-manager.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/site-footer.html'), 'utf8'),
  readFile(path.join(projectRoot, 'index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts/site-settings.mjs'), 'utf8'),
  readFile(path.join(projectRoot, 'js/consent.js'), 'utf8'),
  readFile(path.join(projectRoot, 'js/ad-slots.js'), 'utf8'),
  readFile(path.join(projectRoot, 'css/main.css'), 'utf8'),
  readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
  readFile(path.join(projectRoot, 'docs/consent-management.md'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/index.html'), 'utf8'),
  readFile(path.join(projectRoot, 'generated/data/home-selection.json'), 'utf8')
]);
const manifest = JSON.parse(manifestSource);
const settings = await loadSiteSettings(projectRoot);
const consentFeatureState = resolveConsentFeatureState(settings);

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) problems.push(`${label}: missing ${fragment}`);
  }
}

const partialContracts = [
  'class="consent-banner"',
  'data-consent-banner',
  'data-consent-mode="{{CONSENT_MODE}}"',
  'data-consent-provider="{{CONSENT_PROVIDER}}"',
  'data-consent-revision="{{CONSENT_REVISION}}"',
  'data-consent-certified-cmp="{{CONSENT_GOOGLE_CERTIFIED_CMP}}"',
  'aria-labelledby="consent-banner-title"',
  'hidden',
  '>Reject Non-Essential</button>',
  '>Manage Choices</button>',
  '>Accept All</button>',
  '<dialog',
  'data-consent-dialog',
  'aria-labelledby="consent-dialog-title"',
  'aria-describedby="consent-dialog-description"',
  'Essential storage',
  'Always active',
  'Essential storage does not authorize analytics or advertising.',
  'data-consent-analytics',
  'data-consent-advertising',
  'data-consent-gpc-notice',
  'Global Privacy Control',
  'data-consent-form',
  '>Save Choices</button>',
  'data-consent-storage-error',
  'role="status" aria-live="polite" aria-atomic="true" data-consent-status'
];
requireFragments('consent-manager.html', partial, partialContracts);

const consentButtons = partial.match(/<button class="consent-button"/g) || [];
if (consentButtons.length !== 6) {
  problems.push(`consent-manager.html: expected 6 equally classed consent actions, received ${consentButtons.length}`);
}
if (/consent-button--|button--primary|button--secondary/.test(partial)) {
  problems.push('consent-manager.html: consent actions must not use visually ranked modifiers');
}
if (!/data-consent-accept[\s\S]*data-consent-reject|data-consent-reject[\s\S]*data-consent-accept/.test(partial)) {
  problems.push('consent-manager.html: accept and reject controls are not both present');
}

const footerContracts = [
  'class="site-footer__privacy-button"',
  'data-open-consent-preferences',
  'Privacy choices',
  'hidden'
];
requireFragments('site-footer.html', footerPartial, footerContracts);

const indexContracts = [
  '{{CONSENT_MANAGER}}',
  '<script src="/js/consent.js" defer></script>',
  '<script src="/js/ad-slots.js" defer></script>'
];
requireFragments('index.html', sourceIndex, indexContracts);
if (sourceIndex.indexOf('{{CONSENT_MANAGER}}') < sourceIndex.indexOf('{{SITE_FOOTER}}')) {
  problems.push('index.html: shared consent manager must follow the shared footer');
}
if (sourceIndex.indexOf('/js/consent.js') > sourceIndex.indexOf('/js/ad-slots.js')) {
  problems.push('index.html: consent state must initialize before the advertising adapter');
}

const buildContracts = [
  'resolveConsentFeatureState',
  'const consentFeatureState = resolveConsentFeatureState(siteSettings)',
  "path.join(projectRoot, 'pages/partials/consent-manager.html')",
  'CONSENT_MODE: consentFeatureState.mode',
  'CONSENT_PROVIDER: consentFeatureState.provider',
  'CONSENT_REVISION: consentFeatureState.revision',
  'CONSENT_GOOGLE_CERTIFIED_CMP: String(consentFeatureState.googleCertifiedCmp)',
  ".replace('{{CONSENT_MANAGER}}', consentHtml)",
  'storageContainsVisitorChoice: false'
];
requireFragments('build.mjs', buildSource, buildContracts);

const settingsContracts = [
  "const CONSENT_MODES = new Set(['strict-opt-in'])",
  "const CONSENT_PROVIDERS = new Set(['local-preference-center'])",
  'function validateConsentSettings(settings)',
  'consent.google_certified_cmp',
  'The local preference center must not be represented as a Google-certified CMP.',
  'export function resolveConsentFeatureState(settings)'
];
requireFragments('site-settings.mjs', settingsSource, settingsContracts);

if (
  consentFeatureState.mode !== 'strict-opt-in' ||
  consentFeatureState.provider !== 'local-preference-center' ||
  consentFeatureState.revision !== 1 ||
  consentFeatureState.googleCertifiedCmp !== false
) {
  problems.push('settings: current consent provider state is not the truthful strict opt-in Module 13 baseline');
}

const invalidSettingsFixtures = [
  { consent: { mode: 'implicit', provider: 'local-preference-center', revision: 1, google_certified_cmp: false } },
  { consent: { mode: 'strict-opt-in', provider: 'unknown', revision: 1, google_certified_cmp: false } },
  { consent: { mode: 'strict-opt-in', provider: 'local-preference-center', revision: 0, google_certified_cmp: false } },
  { consent: { mode: 'strict-opt-in', provider: 'local-preference-center', revision: 1, google_certified_cmp: true } }
];
for (const fixture of invalidSettingsFixtures) {
  try {
    resolveConsentFeatureState(fixture);
    problems.push(`settings: invalid fixture unexpectedly passed: ${JSON.stringify(fixture.consent)}`);
  } catch {
    // Expected.
  }
}

const scriptContracts = [
  "const storageKey = 'lawscope:consent'",
  "hasExactKeys(record, ['version', 'categories'])",
  "hasExactKeys(record.categories, ['essential', 'analytics', 'advertising'])",
  'record.version === revision',
  'record.categories.essential === true',
  'navigator.globalPrivacyControl === true',
  'advertising: globalPrivacyControl ? false',
  'localStorage.getItem(storageKey)',
  'localStorage.setItem(',
  'localStorage.removeItem(storageKey)',
  "new CustomEvent('lawscope:consent-change'",
  "root.dataset.consentStatus = status",
  'root.dataset.consentAnalytics',
  'root.dataset.consentAdvertising',
  "window.addEventListener('storage'",
  "root.classList.add('consent-enabled')",
  "document.body.classList.toggle('consent-banner-visible', visible)",
  "root.style.setProperty('--consent-safe-block-offset'",
  "publishConsentState('storage-error')",
  'Optional analytics and advertising remain off.',
  "typeof dialog.showModal === 'function'",
  "event.key === 'Escape'",
  "event.key !== 'Tab'"
];
requireFragments('consent.js', consentScript, scriptContracts);
if (/Date\(|Date\.|timestamp|visitorId|userId|fingerprint/i.test(consentScript)) {
  problems.push('consent.js: stored consent must not gain timestamps or visitor identifiers');
}

const adContracts = [
  "const CONSENT_EVENT = 'lawscope:consent-change'",
  'document.documentElement.dataset.consentAdvertising',
  "detail?.status === 'pending'",
  "reserveSlot(slot, 'awaiting-consent')",
  "collapseSlot(slot, 'consent-blocked')",
  "const READY_EVENT = 'lawscope:ad-slot-ready'"
];
requireFragments('ad-slots.js', adScript, adContracts);

const cssContracts = [
  '--size-consent-dialog: 44rem',
  '--consent-safe-block-offset: var(--space-0)',
  'body.consent-banner-visible',
  'padding-block-end: var(--consent-safe-block-offset)',
  '.consent-banner-visible .site-header__navigation:not([hidden])',
  '.consent-banner',
  'z-index: var(--z-index-overlay)',
  'max-block-size: calc(var(--size-viewport-block) - var(--space-8))',
  '.consent-button',
  'min-block-size: var(--size-touch-target)',
  '.consent-dialog::backdrop',
  '.consent-switch',
  'inline-size: var(--size-touch-target)',
  'block-size: var(--size-touch-target)',
  '.consent-switch__input:focus-visible + .consent-switch__control',
  '@media (prefers-reduced-motion: reduce)',
  '.site-footer__privacy-button'
];
requireFragments('CSS', `${mainCss}\n${componentCss}`, cssContracts);

const documentationContracts = [
  'strict opt-in',
  'No geolocation service',
  'not represented as a Google-certified',
  'EEA, United Kingdom, and Switzerland',
  'lawscope:consent',
  'No visitor identifier, timestamp, region, IP address',
  'Global Privacy Control',
  'lawscope:consent-change',
  'data-consent-analytics="granted"',
  'data-consent-advertising="granted"',
  '--consent-safe-block-offset',
  'Without JavaScript',
  'never written into `content/`'
];
requireFragments('consent-management.md', documentation, documentationContracts);

class FakeClassList {
  constructor() {
    this.values = new Set();
  }
  add(...names) {
    names.forEach((name) => this.values.add(name));
  }
  toggle(name, force) {
    if (force === true) this.values.add(name);
    else if (force === false) this.values.delete(name);
    else if (this.values.has(name)) this.values.delete(name);
    else this.values.add(name);
    return this.values.has(name);
  }
  contains(name) {
    return this.values.has(name);
  }
}

class FakeStyle {
  constructor() {
    this.values = new Map();
  }
  setProperty(name, value) {
    this.values.set(name, value);
  }
  removeProperty(name) {
    this.values.delete(name);
  }
  getPropertyValue(name) {
    return this.values.get(name) || '';
  }
}

function exerciseConsentScript({ storedValue = null, gpc = false, storageThrows = false } = {}) {
  let document;

  class FakeHTMLElement {
    constructor(name) {
      this.name = name;
      this.dataset = {};
      this.hidden = false;
      this.checked = false;
      this.disabled = false;
      this.textContent = '';
      this.open = false;
      this.parent = null;
      this.classList = new FakeClassList();
      this.style = new FakeStyle();
      this.attributes = new Map();
      this.listeners = new Map();
      this.selectorMap = new Map();
      this.selectorAllMap = new Map();
    }
    addEventListener(type, handler) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(handler);
    }
    emit(type, values = {}) {
      const event = {
        type,
        currentTarget: this,
        target: this,
        key: values.key,
        shiftKey: values.shiftKey === true,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...values
      };
      for (const handler of this.listeners.get(type) || []) handler(event);
      return event;
    }
    querySelector(selector) {
      return this.selectorMap.get(selector) || null;
    }
    querySelectorAll(selector) {
      return this.selectorAllMap.get(selector) || [];
    }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === 'open') this.open = true;
    }
    removeAttribute(name) {
      this.attributes.delete(name);
      if (name === 'open') this.open = false;
    }
    hasAttribute(name) {
      if (name === 'open') return this.open;
      return this.attributes.has(name);
    }
    contains(candidate) {
      let current = candidate;
      while (current) {
        if (current === this) return true;
        current = current.parent;
      }
      return false;
    }
    focus() {
      document.activeElement = this;
    }
    getBoundingClientRect() {
      return { height: 220 };
    }
  }

  const root = new FakeHTMLElement('root');
  const body = new FakeHTMLElement('body');
  const main = new FakeHTMLElement('main');
  const banner = new FakeHTMLElement('banner');
  banner.hidden = true;
  banner.dataset.consentRevision = '1';
  banner.dataset.consentMode = 'strict-opt-in';
  banner.dataset.consentProvider = 'local-preference-center';
  const dialog = new FakeHTMLElement('dialog');
  dialog.showModal = function showModal() {
    this.open = true;
    this.attributes.set('open', '');
  };
  dialog.close = function close() {
    this.open = false;
    this.attributes.delete('open');
  };
  const form = new FakeHTMLElement('form');
  const analyticsInput = new FakeHTMLElement('analytics-input');
  const advertisingInput = new FakeHTMLElement('advertising-input');
  const analyticsState = new FakeHTMLElement('analytics-state');
  const advertisingState = new FakeHTMLElement('advertising-state');
  const gpcNotice = new FakeHTMLElement('gpc-notice');
  gpcNotice.hidden = true;
  const status = new FakeHTMLElement('status');
  const footerOpener = new FakeHTMLElement('footer-opener');
  footerOpener.hidden = true;
  const accept = new FakeHTMLElement('accept');
  const reject = new FakeHTMLElement('reject');
  const manage = new FakeHTMLElement('manage');
  const close = new FakeHTMLElement('close');
  const dialogAccept = new FakeHTMLElement('dialog-accept');
  const dialogReject = new FakeHTMLElement('dialog-reject');
  const bannerError = new FakeHTMLElement('banner-error');
  const dialogError = new FakeHTMLElement('dialog-error');
  bannerError.hidden = true;
  dialogError.hidden = true;

  for (const element of [accept, reject, manage, bannerError]) element.parent = banner;
  for (const element of [
    form,
    analyticsInput,
    advertisingInput,
    analyticsState,
    advertisingState,
    gpcNotice,
    close,
    dialogAccept,
    dialogReject,
    dialogError
  ]) element.parent = dialog;

  banner.selectorMap.set('[data-consent-accept]', accept);
  banner.selectorMap.set('[data-consent-reject]', reject);
  banner.selectorMap.set('[data-consent-manage]', manage);
  dialog.selectorMap.set('[data-consent-form]', form);
  dialog.selectorMap.set('[data-consent-analytics]', analyticsInput);
  dialog.selectorMap.set('[data-consent-advertising]', advertisingInput);
  dialog.selectorMap.set('[data-consent-analytics-state]', analyticsState);
  dialog.selectorMap.set('[data-consent-advertising-state]', advertisingState);
  dialog.selectorMap.set('[data-consent-gpc-notice]', gpcNotice);
  dialog.selectorMap.set('[data-consent-close]', close);
  dialog.selectorMap.set('[data-consent-dialog-accept]', dialogAccept);
  dialog.selectorMap.set('[data-consent-dialog-reject]', dialogReject);
  dialog.selectorMap.set('button, input', close);
  dialog.selectorAllMap.set('button:not([disabled]), input:not([disabled])', [
    close,
    analyticsInput,
    advertisingInput,
    dialogReject,
    dialogAccept
  ]);

  const documentListeners = new Map();
  const documentEvents = [];
  document = {
    documentElement: root,
    body,
    activeElement: body,
    readyState: 'complete',
    querySelector(selector) {
      return new Map([
        ['[data-consent-banner]', banner],
        ['[data-consent-dialog]', dialog],
        ['[data-consent-status]', status],
        ['main', main]
      ]).get(selector) || null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-open-consent-preferences]') return [footerOpener];
      if (selector === '[data-consent-storage-error]') return [bannerError, dialogError];
      return [];
    },
    addEventListener(type, handler) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(handler);
    },
    dispatchEvent(event) {
      documentEvents.push(event);
      for (const handler of documentListeners.get(event.type) || []) handler(event);
      return true;
    }
  };

  const storedValues = new Map();
  if (storedValue !== null) storedValues.set('lawscope:consent', storedValue);
  const localStorage = {
    getItem(key) {
      if (storageThrows) throw new Error('Storage blocked');
      return storedValues.has(key) ? storedValues.get(key) : null;
    },
    setItem(key, value) {
      if (storageThrows) throw new Error('Storage blocked');
      storedValues.set(key, String(value));
    },
    removeItem(key) {
      if (storageThrows) throw new Error('Storage blocked');
      storedValues.delete(key);
    }
  };

  const windowListeners = new Map();
  const fakeWindow = {
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    addEventListener(type, handler) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(handler);
    },
    ResizeObserver: class {}
  };

  class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback();
    }
  }

  class FakeCustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
      this.bubbles = options.bubbles;
    }
  }

  vm.runInNewContext(consentScript, {
    Array,
    CustomEvent: FakeCustomEvent,
    HTMLElement: FakeHTMLElement,
    JSON,
    Map,
    Number,
    Object,
    ResizeObserver: FakeResizeObserver,
    Set,
    document,
    localStorage,
    navigator: { globalPrivacyControl: gpc },
    window: fakeWindow
  });

  return {
    elements: {
      root,
      body,
      main,
      banner,
      dialog,
      form,
      analyticsInput,
      advertisingInput,
      gpcNotice,
      status,
      footerOpener,
      accept,
      reject,
      manage,
      close,
      dialogAccept,
      dialogReject,
      bannerError,
      dialogError
    },
    events: documentEvents,
    storedValues,
    setStored(value) {
      if (value === null) storedValues.delete('lawscope:consent');
      else storedValues.set('lawscope:consent', value);
    },
    emitStorage() {
      for (const handler of windowListeners.get('storage') || []) {
        handler({ key: 'lawscope:consent' });
      }
    }
  };
}

function latestConsentEvent(result) {
  return [...result.events].reverse().find((event) => event.type === 'lawscope:consent-change');
}

const undecided = exerciseConsentScript();
if (
  undecided.elements.banner.hidden ||
  !undecided.elements.body.classList.contains('consent-banner-visible') ||
  undecided.elements.root.dataset.consentStatus !== 'pending' ||
  undecided.elements.root.dataset.consentAnalytics !== 'pending' ||
  undecided.elements.root.dataset.consentAdvertising !== 'pending' ||
  undecided.elements.footerOpener.hidden ||
  !undecided.elements.root.classList.contains('consent-enabled')
) {
  problems.push('behavior: undecided initialization did not show the enhanced banner and publish pending state');
}
const undecidedEvent = latestConsentEvent(undecided)?.detail;
if (
  undecidedEvent?.source !== 'default' ||
  undecidedEvent?.status !== 'pending' ||
  undecidedEvent?.categories?.essential !== true ||
  undecidedEvent?.categories?.analytics !== false ||
  undecidedEvent?.categories?.advertising !== false
) {
  problems.push('behavior: initial deny-by-default consent event is incomplete');
}
if (!undecided.elements.root.style.getPropertyValue('--consent-safe-block-offset')) {
  problems.push('behavior: visible banner did not reserve its measured safe offset');
}

undecided.elements.accept.emit('click');
const acceptedRecord = JSON.parse(undecided.storedValues.get('lawscope:consent') || 'null');
if (
  !undecided.elements.banner.hidden ||
  undecided.elements.root.dataset.consentStatus !== 'decided' ||
  undecided.elements.root.dataset.consentAnalytics !== 'granted' ||
  undecided.elements.root.dataset.consentAdvertising !== 'granted' ||
  acceptedRecord?.version !== 1 ||
  acceptedRecord?.categories?.essential !== true ||
  acceptedRecord?.categories?.analytics !== true ||
  acceptedRecord?.categories?.advertising !== true ||
  Object.keys(acceptedRecord || {}).length !== 2
) {
  problems.push('behavior: Accept All did not persist the exact revisioned grant and hide the banner');
}

const rejected = exerciseConsentScript();
rejected.elements.reject.emit('click');
const rejectedRecord = JSON.parse(rejected.storedValues.get('lawscope:consent') || 'null');
if (
  rejected.elements.root.dataset.consentAnalytics !== 'denied' ||
  rejected.elements.root.dataset.consentAdvertising !== 'denied' ||
  rejectedRecord?.categories?.analytics !== false ||
  rejectedRecord?.categories?.advertising !== false
) {
  problems.push('behavior: Reject Non-Essential did not persist both optional denials');
}

const managed = exerciseConsentScript();
managed.elements.manage.emit('click');
if (!managed.elements.dialog.open) {
  problems.push('behavior: Manage Choices did not open the native preference dialog');
}
managed.elements.analyticsInput.checked = true;
managed.elements.analyticsInput.emit('change');
managed.elements.advertisingInput.checked = false;
managed.elements.form.emit('submit');
if (
  managed.elements.dialog.open ||
  managed.elements.root.dataset.consentAnalytics !== 'granted' ||
  managed.elements.root.dataset.consentAdvertising !== 'denied'
) {
  problems.push('behavior: custom Save Choices did not apply and close correctly');
}
managed.elements.footerOpener.emit('click');
if (!managed.elements.dialog.open || !managed.elements.analyticsInput.checked) {
  problems.push('behavior: footer re-entry did not reopen and synchronize the preference center');
}

const validStoredValue = JSON.stringify({
  version: 1,
  categories: { essential: true, analytics: true, advertising: false }
});
const stored = exerciseConsentScript({ storedValue: validStoredValue });
if (
  !stored.elements.banner.hidden ||
  stored.elements.root.dataset.consentAnalytics !== 'granted' ||
  stored.elements.root.dataset.consentAdvertising !== 'denied' ||
  latestConsentEvent(stored)?.detail?.source !== 'stored'
) {
  problems.push('behavior: valid stored consent was not restored and published');
}

const invalid = exerciseConsentScript({
  storedValue: JSON.stringify({
    version: 1,
    categories: { essential: true, analytics: true, advertising: true },
    visitor: 'not-allowed'
  })
});
if (
  invalid.elements.banner.hidden ||
  invalid.elements.root.dataset.consentStatus !== 'pending' ||
  invalid.storedValues.has('lawscope:consent')
) {
  problems.push('behavior: an extra-key consent record did not fail exact-schema validation');
}

const obsolete = exerciseConsentScript({
  storedValue: JSON.stringify({
    version: 0,
    categories: { essential: true, analytics: true, advertising: true }
  })
});
if (obsolete.elements.banner.hidden || obsolete.storedValues.has('lawscope:consent')) {
  problems.push('behavior: an obsolete consent revision did not reset to pending');
}

const gpc = exerciseConsentScript({ gpc: true });
gpc.elements.accept.emit('click');
const gpcRecord = JSON.parse(gpc.storedValues.get('lawscope:consent') || 'null');
if (
  gpc.elements.root.dataset.consentAnalytics !== 'granted' ||
  gpc.elements.root.dataset.consentAdvertising !== 'denied' ||
  gpcRecord?.categories?.advertising !== false ||
  !gpc.elements.advertisingInput.disabled ||
  gpc.elements.gpcNotice.hidden ||
  latestConsentEvent(gpc)?.detail?.globalPrivacyControl !== true
) {
  problems.push('behavior: GPC did not force, explain, persist, and publish advertising denial');
}

const blockedStorage = exerciseConsentScript({ storageThrows: true });
blockedStorage.elements.accept.emit('click');
const blockedEvent = latestConsentEvent(blockedStorage)?.detail;
if (
  blockedStorage.elements.banner.hidden ||
  blockedStorage.elements.root.dataset.consentStatus !== 'pending' ||
  blockedEvent?.source !== 'storage-error' ||
  blockedEvent?.categories?.analytics !== false ||
  blockedEvent?.categories?.advertising !== false ||
  blockedStorage.elements.bannerError.hidden ||
  !blockedStorage.elements.dialogError.hidden
) {
  problems.push('behavior: storage failure did not fail closed with a visible error and both optional categories blocked');
}
const blockedDialogStorage = exerciseConsentScript({ storageThrows: true });
blockedDialogStorage.elements.manage.emit('click');
blockedDialogStorage.elements.dialogAccept.emit('click');
if (
  !blockedDialogStorage.elements.dialog.open ||
  blockedDialogStorage.elements.dialogError.hidden ||
  !blockedDialogStorage.elements.bannerError.hidden ||
  blockedDialogStorage.elements.root.dataset.consentAdvertising !== 'pending'
) {
  problems.push('behavior: dialog storage failure did not stay open with one contextual error and blocked advertising');
}

const crossTab = exerciseConsentScript();
crossTab.setStored(validStoredValue);
crossTab.emitStorage();
if (
  !crossTab.elements.banner.hidden ||
  crossTab.elements.root.dataset.consentAnalytics !== 'granted' ||
  latestConsentEvent(crossTab)?.detail?.source !== 'storage'
) {
  problems.push('behavior: valid cross-tab consent did not synchronize');
}
crossTab.setStored(null);
crossTab.emitStorage();
if (
  crossTab.elements.banner.hidden ||
  crossTab.elements.root.dataset.consentStatus !== 'pending' ||
  crossTab.elements.root.dataset.consentAdvertising !== 'pending'
) {
  problems.push('behavior: cross-tab withdrawal did not restore the pending banner');
}

const generatedContracts = [
  'data-consent-mode="strict-opt-in"',
  'data-consent-provider="local-preference-center"',
  'data-consent-revision="1"',
  'data-consent-certified-cmp="false"',
  '<script src="/js/consent.js" defer></script>',
  'data-open-consent-preferences',
  'Essential storage',
  'data-consent-analytics',
  'data-consent-advertising'
];
requireFragments('generated home', generatedHtml, generatedContracts);
if ((generatedHtml.match(/data-consent-banner/g) || []).length !== 1) {
  problems.push('generated home: expected exactly one consent banner');
}
if ((generatedHtml.match(/<dialog\b/g) || []).length !== 1) {
  problems.push('generated home: expected exactly one consent preference dialog');
}
if (/{{[A-Z0-9_]+}}/.test(generatedHtml)) {
  problems.push('generated home: unresolved template token detected');
}

if (
  manifest.consent?.mode !== 'strict-opt-in' ||
  manifest.consent?.provider !== 'local-preference-center' ||
  manifest.consent?.revision !== 1 ||
  manifest.consent?.googleCertifiedCmp !== false ||
  manifest.consent?.storageContainsVisitorChoice !== false
) {
  problems.push('manifest: consent configuration is incomplete or contains a visitor-choice claim');
}
if (/lawscope:consent|"categories"\s*:\s*\{\s*"essential"/i.test(manifestSource)) {
  problems.push('manifest: browser-local consent choice leaked into generated build data');
}

const providerSurface = `${sourceIndex}\n${partial}\n${consentScript}\n${generatedHtml}`;
for (const pattern of [
  /adsbygoogle/i,
  /ca-pub-/i,
  /googlesyndication\.com/i,
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /gtag\s*\(/i,
  /__tcfapi/i
]) {
  if (pattern.test(providerSurface)) {
    problems.push(`provider safety: unapproved provider/tracking surface detected (${pattern})`);
  }
}

if (problems.length > 0) {
  console.error('Cookie Consent Banner validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const sourceContractCount =
  partialContracts.length +
  footerContracts.length +
  indexContracts.length +
  buildContracts.length +
  settingsContracts.length +
  scriptContracts.length +
  adContracts.length +
  cssContracts.length +
  documentationContracts.length +
  generatedContracts.length;
console.log(`Cookie Consent Banner validation passed (${sourceContractCount} source contracts checked).`);
console.log(
  'Strict opt-in defaults, exact-schema persistence, accept/reject/manage flows, GPC, storage failure, cross-tab withdrawal, footer re-entry, layout safety, and advertising consent integration passed.'
);
