export const ADSENSE_SITE_ORIGIN = 'https://getlawscope.com';
export const ADSENSE_PROVIDER = 'Google AdSense';
export const ADSENSE_PLACEHOLDER_PUBLISHER_ID = 'ca-pub-0000000000000000';
export const ADSENSE_PLACEHOLDER_SLOT_ID = '0000000000';
export const ADSENSE_PUBLISHER_ID_PATTERN = /^ca-pub-\d{16}$/;
export const ADSENSE_SLOT_ID_PATTERN = /^\d{10}$/;
export const ADSENSE_ADS_TXT_AUTHORITY_ID = 'f08c47fec0942fa0';

export const AD_SLOT_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: 'home_below_featured',
    environmentVariable: 'ADSENSE_SLOT_HOME_BELOW_FEATURED',
    surface: 'Home',
    placement: 'Below Featured Articles',
    mobile: true
  }),
  Object.freeze({
    key: 'articles_in_feed',
    environmentVariable: 'ADSENSE_SLOT_ARTICLES_IN_FEED',
    surface: 'Articles library',
    placement: 'After six article cards when more than six results exist',
    mobile: true
  }),
  Object.freeze({
    key: 'categories_overview',
    environmentVariable: 'ADSENSE_SLOT_CATEGORIES_OVERVIEW',
    surface: 'Categories overview',
    placement: 'Below the complete category grid',
    mobile: true
  }),
  Object.freeze({
    key: 'category_in_feed',
    environmentVariable: 'ADSENSE_SLOT_CATEGORY_IN_FEED',
    surface: 'Category feed',
    placement: 'After six article cards when more than six results exist',
    mobile: true
  }),
  Object.freeze({
    key: 'article_mid',
    environmentVariable: 'ADSENSE_SLOT_ARTICLE_MID',
    surface: 'Article',
    placement: 'Approved H2 boundary after substantial editorial lead',
    mobile: true
  }),
  Object.freeze({
    key: 'article_sidebar',
    environmentVariable: 'ADSENSE_SLOT_ARTICLE_SIDEBAR',
    surface: 'Article',
    placement: 'Non-sticky desktop sidebar after trust content',
    mobile: false
  }),
  Object.freeze({
    key: 'article_end',
    environmentVariable: 'ADSENSE_SLOT_ARTICLE_END',
    surface: 'Article',
    placement: 'After sources and disclaimer, before related articles',
    mobile: true
  })
]);

function parseBooleanOverride(name, value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  if (String(value).trim() === 'true') return true;
  if (String(value).trim() === 'false') return false;
  throw new Error(`${name} must be true or false when supplied.`);
}

function requireBoolean(object, key) {
  if (typeof object[key] !== 'boolean') {
    throw new Error(`content/settings/site.json: advertising.${key} must be true or false`);
  }
}

export function isRealAdsensePublisherId(value) {
  return (
    typeof value === 'string' &&
    ADSENSE_PUBLISHER_ID_PATTERN.test(value) &&
    value !== ADSENSE_PLACEHOLDER_PUBLISHER_ID
  );
}

export function isRealAdsenseSlotId(value) {
  return (
    typeof value === 'string' &&
    ADSENSE_SLOT_ID_PATTERN.test(value) &&
    value !== ADSENSE_PLACEHOLDER_SLOT_ID
  );
}

export function validateAdvertisingSettings(settings) {
  const advertising = settings?.advertising;
  if (!advertising || typeof advertising !== 'object' || Array.isArray(advertising)) {
    throw new Error('content/settings/site.json: advertising settings are required');
  }

  for (const key of ['enabled', 'account_approved', 'policy_reviewed', 'certified_cmp_ready']) {
    requireBoolean(advertising, key);
  }

  if (
    typeof advertising.publisher_id !== 'string' ||
    !ADSENSE_PUBLISHER_ID_PATTERN.test(advertising.publisher_id)
  ) {
    throw new Error(
      'content/settings/site.json: advertising.publisher_id must use the ca-pub-0000000000000000 format'
    );
  }

  if (
    !advertising.slots ||
    typeof advertising.slots !== 'object' ||
    Array.isArray(advertising.slots)
  ) {
    throw new Error('content/settings/site.json: advertising.slots must be an object');
  }

  const expectedKeys = AD_SLOT_DEFINITIONS.map(({ key }) => key);
  const suppliedKeys = Object.keys(advertising.slots);
  const missingKeys = expectedKeys.filter((key) => !suppliedKeys.includes(key));
  const unknownKeys = suppliedKeys.filter((key) => !expectedKeys.includes(key));
  if (missingKeys.length > 0 || unknownKeys.length > 0) {
    throw new Error(
      `content/settings/site.json: advertising.slots must contain exactly ${expectedKeys.join(', ')}`
    );
  }

  for (const { key } of AD_SLOT_DEFINITIONS) {
    if (
      typeof advertising.slots[key] !== 'string' ||
      !ADSENSE_SLOT_ID_PATTERN.test(advertising.slots[key])
    ) {
      throw new Error(
        `content/settings/site.json: advertising.slots.${key} must be a 10-digit AdSense ad-unit ID`
      );
    }
  }
}

export function resolveAdvertisingFeatureState(
  settings,
  deploymentEnvironment,
  environmentVariables = process.env
) {
  validateAdvertisingSettings(settings);
  const advertising = settings.advertising;
  const requested = parseBooleanOverride(
    'ADSENSE_ENABLED',
    environmentVariables.ADSENSE_ENABLED,
    advertising.enabled
  );
  const accountApproved = parseBooleanOverride(
    'ADSENSE_ACCOUNT_APPROVED',
    environmentVariables.ADSENSE_ACCOUNT_APPROVED,
    advertising.account_approved
  );
  const policyReviewed = parseBooleanOverride(
    'ADSENSE_POLICY_REVIEWED',
    environmentVariables.ADSENSE_POLICY_REVIEWED,
    advertising.policy_reviewed
  );
  const certifiedCmpReady = parseBooleanOverride(
    'ADSENSE_CERTIFIED_CMP_READY',
    environmentVariables.ADSENSE_CERTIFIED_CMP_READY,
    advertising.certified_cmp_ready
  );
  const configuredPublisherId = String(
    environmentVariables.ADSENSE_PUBLISHER_ID || advertising.publisher_id
  ).trim();

  if (!ADSENSE_PUBLISHER_ID_PATTERN.test(configuredPublisherId)) {
    throw new Error('ADSENSE_PUBLISHER_ID must use the ca-pub-0000000000000000 format.');
  }

  const configuredSlotIds = {};
  for (const definition of AD_SLOT_DEFINITIONS) {
    const configuredValue = String(
      environmentVariables[definition.environmentVariable] || advertising.slots[definition.key]
    ).trim();
    if (!ADSENSE_SLOT_ID_PATTERN.test(configuredValue)) {
      throw new Error(`${definition.environmentVariable} must be a 10-digit AdSense ad-unit ID.`);
    }
    configuredSlotIds[definition.key] = configuredValue;
  }

  const environmentAllowed = deploymentEnvironment === 'production';
  const publisherConfigured = isRealAdsensePublisherId(configuredPublisherId);
  const missingSlotKeys = AD_SLOT_DEFINITIONS
    .filter(({ key }) => !isRealAdsenseSlotId(configuredSlotIds[key]))
    .map(({ key }) => key);
  const slotsConfigured = missingSlotKeys.length === 0;
  const readinessComplete =
    accountApproved && policyReviewed && certifiedCmpReady && publisherConfigured && slotsConfigured;

  if (requested && environmentAllowed && !readinessComplete) {
    const blockers = [
      !accountApproved ? 'approved AdSense account' : '',
      !policyReviewed ? 'owner policy review' : '',
      !certifiedCmpReady ? 'Google-certified CMP readiness' : '',
      !publisherConfigured ? 'real publisher ID' : '',
      !slotsConfigured ? `real slot IDs (${missingSlotKeys.join(', ')})` : ''
    ].filter(Boolean);
    throw new Error(
      `AdSense is enabled for production but activation is blocked by: ${blockers.join('; ')}.`
    );
  }

  const enabled = requested && environmentAllowed && readinessComplete;
  const reason = enabled
    ? 'enabled'
    : !requested
      ? 'not-requested'
      : !environmentAllowed
        ? 'environment-blocked'
        : !accountApproved
          ? 'account-approval-pending'
          : !policyReviewed
            ? 'policy-review-pending'
            : !certifiedCmpReady
              ? 'certified-cmp-pending'
              : !publisherConfigured
                ? 'publisher-id-missing'
                : 'slot-ids-missing';
  const publicSlotIds = Object.fromEntries(
    AD_SLOT_DEFINITIONS.map(({ key }) => [
      key,
      enabled ? configuredSlotIds[key] : ADSENSE_PLACEHOLDER_SLOT_ID
    ])
  );

  return Object.freeze({
    requested,
    environment: deploymentEnvironment,
    environmentAllowed,
    accountApproved,
    policyReviewed,
    certifiedCmpReady,
    publisherConfigured,
    slotsConfigured,
    missingSlotKeys: Object.freeze([...missingSlotKeys]),
    readinessComplete,
    enabled,
    reason,
    provider: enabled ? 'adsense' : 'none',
    publisherId: enabled ? configuredPublisherId : ADSENSE_PLACEHOLDER_PUBLISHER_ID,
    slotIds: Object.freeze(publicSlotIds),
    siteOrigin: ADSENSE_SITE_ORIGIN,
    consentCategory: 'advertising',
    consentMode: 'strict-opt-in',
    initialState: enabled ? 'awaiting-consent' : 'disabled',
    hidden: !enabled,
    mobileDensityRule: 'article-sidebar-desktop-only',
    preConsentNetworkRequests: false
  });
}

export function createAdvertisingRuntimeSource(featureState) {
  const publicConfiguration = {
    module: 31,
    enabled: featureState.enabled,
    environment: featureState.environment,
    provider: featureState.provider,
    publisherId: featureState.publisherId,
    slotIds: featureState.slotIds,
    siteOrigin: featureState.siteOrigin,
    consentCategory: featureState.consentCategory,
    loaderTimeoutMilliseconds: 12000,
    desktopSidebarMediaQuery: '(min-width: 64rem)'
  };
  const serialized = JSON.stringify(publicConfiguration).replaceAll('<', '\\u003c');
  return `(() => {\n  'use strict';\n  window.LawscopeAdvertisingConfig = Object.freeze(${serialized});\n})();\n`;
}

export function createAdvertisingManifest(featureState) {
  return {
    module: 31,
    provider: ADSENSE_PROVIDER,
    enabled: featureState.enabled,
    requested: featureState.requested,
    reason: featureState.reason,
    environment: featureState.environment,
    environmentAllowed: featureState.environmentAllowed,
    accountApproved: featureState.accountApproved,
    policyReviewed: featureState.policyReviewed,
    certifiedCmpReady: featureState.certifiedCmpReady,
    publisherConfigured: featureState.publisherConfigured,
    slotsConfigured: featureState.slotsConfigured,
    missingSlotKeys: [...featureState.missingSlotKeys],
    publisherId: featureState.publisherId,
    siteOrigin: featureState.siteOrigin,
    canonicalHostRuntimeGate: true,
    consentMode: featureState.consentMode,
    consentCategory: featureState.consentCategory,
    preConsentNetworkRequests: featureState.preConsentNetworkRequests,
    autoAds: false,
    responsiveUnits: true,
    mobileDensityRule: featureState.mobileDensityRule,
    adsTxtEmitted: featureState.enabled,
    slots: AD_SLOT_DEFINITIONS.map((definition) => ({
      ...definition,
      slotId: featureState.slotIds[definition.key]
    })),
    excludedSurfaces: [
      'About',
      'Contact',
      'Privacy Policy',
      'Legal Disclaimer',
      'Editorial Policy',
      '404',
      'Admin'
    ]
  };
}

export function createAdsTxt(featureState) {
  if (!featureState.enabled) return '';
  const publisherAccountId = featureState.publisherId.replace(/^ca-/, '');
  return `google.com, ${publisherAccountId}, DIRECT, ${ADSENSE_ADS_TXT_AUTHORITY_ID}\n`;
}
