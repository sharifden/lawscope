export const GA4_PLACEHOLDER_MEASUREMENT_ID = 'G-XXXXXXXXXX';
export const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{10}$/;
export const ANALYTICS_SITE_ORIGIN = 'https://getlawscope.com';

export const ANALYTICS_EVENTS = Object.freeze([
  Object.freeze({
    name: 'page_view',
    trigger: 'Once after analytics consent on an eligible public page',
    parameters: Object.freeze(['page_title', 'page_location', 'page_referrer']),
    consentCategory: 'analytics'
  }),
  Object.freeze({
    name: 'newsletter_signup',
    trigger: 'After a provider confirms a new newsletter subscription request',
    parameters: Object.freeze([]),
    consentCategory: 'analytics'
  }),
  Object.freeze({
    name: 'contact_form_submit',
    trigger: 'After the same-origin Contact API confirms delivery',
    parameters: Object.freeze([]),
    consentCategory: 'analytics'
  }),
  Object.freeze({
    name: 'category_click',
    trigger: 'A visitor activates an internal category link',
    parameters: Object.freeze(['category_slug']),
    consentCategory: 'analytics'
  }),
  Object.freeze({
    name: 'article_read',
    trigger: 'One article reaches 30 foreground seconds and 75% prose depth',
    parameters: Object.freeze(['article_slug', 'category_slug']),
    consentCategory: 'analytics'
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

export function isRealGa4MeasurementId(value) {
  return (
    typeof value === 'string' &&
    GA4_MEASUREMENT_ID_PATTERN.test(value) &&
    value !== GA4_PLACEHOLDER_MEASUREMENT_ID
  );
}

export function validateAnalyticsSettings(settings) {
  const analytics = settings?.analytics;
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) {
    throw new Error('content/settings/site.json: analytics settings are required');
  }
  if (typeof analytics.enabled !== 'boolean') {
    throw new Error('content/settings/site.json: analytics.enabled must be true or false');
  }
  if (
    typeof analytics.measurement_id !== 'string' ||
    !GA4_MEASUREMENT_ID_PATTERN.test(analytics.measurement_id)
  ) {
    throw new Error(
      'content/settings/site.json: analytics.measurement_id must use the G-XXXXXXXXXX format'
    );
  }
}

export function resolveAnalyticsFeatureState(
  settings,
  deploymentEnvironment,
  environmentVariables = process.env
) {
  validateAnalyticsSettings(settings);

  const requested = parseBooleanOverride(
    'GA4_ENABLED',
    environmentVariables.GA4_ENABLED,
    settings.analytics.enabled
  );
  const debugRequested = parseBooleanOverride(
    'GA4_DEBUG_MODE',
    environmentVariables.GA4_DEBUG_MODE,
    false
  );
  const configuredMeasurementId = String(
    environmentVariables.GA4_MEASUREMENT_ID || settings.analytics.measurement_id
  ).trim();

  if (!GA4_MEASUREMENT_ID_PATTERN.test(configuredMeasurementId)) {
    throw new Error('GA4_MEASUREMENT_ID must use the G-XXXXXXXXXX format.');
  }

  const environmentAllowed = deploymentEnvironment === 'production';
  const measurementConfigured = isRealGa4MeasurementId(configuredMeasurementId);

  if (requested && environmentAllowed && !measurementConfigured) {
    throw new Error(
      'GA4 analytics is enabled for production but a real GA4_MEASUREMENT_ID is not configured.'
    );
  }

  const enabled = requested && environmentAllowed && measurementConfigured;
  const reason = enabled
    ? 'enabled'
    : !requested
      ? 'not-requested'
      : !environmentAllowed
        ? 'environment-blocked'
        : 'measurement-id-missing';

  return Object.freeze({
    requested,
    environment: deploymentEnvironment,
    environmentAllowed,
    measurementConfigured,
    enabled,
    reason,
    measurementId: enabled ? configuredMeasurementId : GA4_PLACEHOLDER_MEASUREMENT_ID,
    debugMode: enabled && debugRequested,
    siteOrigin: ANALYTICS_SITE_ORIGIN,
    consentCategory: 'analytics',
    initialState: enabled ? 'awaiting-consent' : 'disabled'
  });
}

export function createAnalyticsRuntimeSource(featureState) {
  const publicConfiguration = {
    module: 30,
    enabled: featureState.enabled,
    environment: featureState.environment,
    measurementId: featureState.measurementId,
    debugMode: featureState.debugMode,
    siteOrigin: featureState.siteOrigin,
    consentCategory: featureState.consentCategory
  };
  const serialized = JSON.stringify(publicConfiguration).replaceAll('<', '\\u003c');
  return `(() => {\n  'use strict';\n  window.LawscopeAnalyticsConfig = Object.freeze(${serialized});\n})();\n`;
}

export function createAnalyticsManifest(featureState) {
  return {
    module: 30,
    provider: 'Google Analytics 4',
    enabled: featureState.enabled,
    requested: featureState.requested,
    environment: featureState.environment,
    environmentAllowed: featureState.environmentAllowed,
    measurementConfigured: featureState.measurementConfigured,
    measurementId: featureState.measurementId,
    debugMode: featureState.debugMode,
    siteOrigin: featureState.siteOrigin,
    consentMode: 'strict-opt-in',
    consentCategory: featureState.consentCategory,
    automaticPageViews: false,
    advertisingSignals: false,
    preConsentNetworkRequests: false,
    events: ANALYTICS_EVENTS.map((event) => ({
      ...event,
      parameters: [...event.parameters]
    }))
  };
}
