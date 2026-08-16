import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  resolveAdvertisingFeatureState,
  validateAdvertisingSettings
} from './advertising.mjs';
import { validateContactSettings } from './contact-page.mjs';
import { validateAnalyticsSettings } from './analytics.mjs';

const NEWSLETTER_PROVIDERS = new Set(['generic-form', 'generic-json']);
const CONSENT_MODES = new Set(['strict-opt-in']);
const CONSENT_PROVIDERS = new Set(['local-preference-center']);
const SOCIAL_PROFILE_DEFINITIONS = Object.freeze([
  {
    key: 'x',
    name: 'X',
    label: 'Follow Lawscope on X',
    icon: 'fa-brands fa-x-twitter',
    domains: ['x.com', 'twitter.com']
  },
  {
    key: 'facebook',
    name: 'Facebook',
    label: 'Follow Lawscope on Facebook',
    icon: 'fa-brands fa-facebook-f',
    domains: ['facebook.com']
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    label: 'Follow Lawscope on LinkedIn',
    icon: 'fa-brands fa-linkedin-in',
    domains: ['linkedin.com']
  }
]);

function socialProfileUrlIsValid(profile, value) {
  try {
    const url = new URL(value);
    const onApprovedDomain = profile.domains.some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
    return (
      value === value.trim() &&
      url.protocol === 'https:' &&
      onApprovedDomain &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname !== '/'
    );
  } catch {
    return false;
  }
}

function validateSocialProfileSettings(settings) {
  if (!settings.social_profiles || typeof settings.social_profiles !== 'object') {
    throw new Error('content/settings/site.json: social_profiles settings are required');
  }

  const approvedKeys = new Set(SOCIAL_PROFILE_DEFINITIONS.map(({ key }) => key));
  const configuredKeys = Object.keys(settings.social_profiles);
  for (const key of configuredKeys) {
    if (!approvedKeys.has(key)) {
      throw new Error(`content/settings/site.json: unsupported social profile: ${key}`);
    }
  }

  for (const profile of SOCIAL_PROFILE_DEFINITIONS) {
    const value = settings.social_profiles[profile.key];
    if (typeof value !== 'string') {
      throw new Error(
        `content/settings/site.json: social_profiles.${profile.key} must be a string`
      );
    }
    if (value && !socialProfileUrlIsValid(profile, value)) {
      throw new Error(
        `content/settings/site.json: social_profiles.${profile.key} must be an approved HTTPS profile URL without query or hash values`
      );
    }
  }
}

function validateConsentSettings(settings) {
  const consent = settings.consent;
  if (!consent || typeof consent !== 'object' || Array.isArray(consent)) {
    throw new Error('content/settings/site.json: consent settings are required');
  }
  if (!CONSENT_MODES.has(consent.mode)) {
    throw new Error('content/settings/site.json: consent.mode must be strict-opt-in');
  }
  if (!CONSENT_PROVIDERS.has(consent.provider)) {
    throw new Error(
      'content/settings/site.json: consent.provider is not an approved Module 13 provider'
    );
  }
  if (!Number.isInteger(consent.revision) || consent.revision < 1) {
    throw new Error(
      'content/settings/site.json: consent.revision must be a positive integer'
    );
  }
  if (typeof consent.google_certified_cmp !== 'boolean') {
    throw new Error(
      'content/settings/site.json: consent.google_certified_cmp must be true or false'
    );
  }
  if (
    consent.provider === 'local-preference-center' &&
    consent.google_certified_cmp !== false
  ) {
    throw new Error(
      'The local preference center must not be represented as a Google-certified CMP.'
    );
  }
}

function newsletterEndpointIsValid(endpoint) {
  try {
    if (endpoint.startsWith('/') && !endpoint.startsWith('//')) {
      const baseUrl = new URL('https://lawscope.invalid');
      const url = new URL(endpoint, baseUrl);
      return url.origin === baseUrl.origin && !url.hash;
    }

    const url = new URL(endpoint);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export async function loadSiteSettings(projectRoot) {
  const settingsPath = path.join(projectRoot, 'content/settings/site.json');
  let settings;

  try {
    settings = JSON.parse(await readFile(settingsPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read content/settings/site.json: ${error.message}`);
  }

  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('content/settings/site.json: settings must be a JSON object');
  }
  if (typeof settings.site_title !== 'string' || !settings.site_title.trim()) {
    throw new Error('content/settings/site.json: site_title must be a non-empty string');
  }
  if (typeof settings.site_tagline !== 'string' || !settings.site_tagline.trim()) {
    throw new Error('content/settings/site.json: site_tagline must be a non-empty string');
  }
  validateSocialProfileSettings(settings);
  if (!settings.newsletter || typeof settings.newsletter !== 'object') {
    throw new Error('content/settings/site.json: newsletter settings are required');
  }
  if (typeof settings.newsletter.enabled !== 'boolean') {
    throw new Error('content/settings/site.json: newsletter.enabled must be true or false');
  }
  if (typeof settings.newsletter.endpoint !== 'string') {
    throw new Error('content/settings/site.json: newsletter.endpoint must be a string');
  }
  if (!NEWSLETTER_PROVIDERS.has(settings.newsletter.provider)) {
    throw new Error('content/settings/site.json: newsletter.provider is not approved');
  }
  if (settings.newsletter.double_opt_in !== true) {
    throw new Error('content/settings/site.json: newsletter.double_opt_in must remain true');
  }
  if (
    settings.newsletter.endpoint &&
    !newsletterEndpointIsValid(settings.newsletter.endpoint)
  ) {
    throw new Error(
      'content/settings/site.json: newsletter.endpoint must be root-relative or use HTTPS'
    );
  }
  validateContactSettings(settings);
  validateConsentSettings(settings);
  validateAnalyticsSettings(settings);
  validateAdvertisingSettings(settings);

  return settings;
}

export function resolveActiveSocialProfiles(settings) {
  validateSocialProfileSettings(settings);
  return SOCIAL_PROFILE_DEFINITIONS
    .filter(({ key }) => Boolean(settings.social_profiles[key]))
    .map(({ key, name, label, icon }) => ({
      key,
      name,
      label,
      icon,
      url: settings.social_profiles[key]
    }));
}

export function resolveNewsletterFeatureState(
  settings,
  environmentVariables = process.env
) {
  const newsletterSettings = settings?.newsletter || {};
  const requested = newsletterSettings.enabled === true;
  const configuredEndpoint = String(
    environmentVariables.NEWSLETTER_FORM_ENDPOINT || newsletterSettings.endpoint || ''
  ).trim();
  const provider = String(
    environmentVariables.NEWSLETTER_PROVIDER ||
      newsletterSettings.provider ||
      'generic-form'
  ).trim();

  if (newsletterSettings.double_opt_in !== true) {
    throw new Error('Newsletter double opt in must remain enabled.');
  }
  if (!NEWSLETTER_PROVIDERS.has(provider)) {
    throw new Error(`Newsletter provider is not approved: ${provider || '(empty)'}`);
  }
  if (configuredEndpoint && !newsletterEndpointIsValid(configuredEndpoint)) {
    throw new Error('Newsletter endpoint must be root-relative or use HTTPS.');
  }
  if (requested && !configuredEndpoint) {
    throw new Error(
      'Newsletter is enabled but NEWSLETTER_FORM_ENDPOINT/site endpoint is not configured.'
    );
  }

  const enabled = requested && Boolean(configuredEndpoint);
  return {
    requested,
    enabled,
    endpoint: enabled ? configuredEndpoint : '',
    endpointConfigured: Boolean(configuredEndpoint),
    provider,
    doubleOptIn: newsletterSettings.double_opt_in === true,
    initialState: enabled ? 'idle' : 'unavailable'
  };
}

export function resolveConsentFeatureState(settings) {
  validateConsentSettings(settings);
  return {
    mode: settings.consent.mode,
    provider: settings.consent.provider,
    revision: settings.consent.revision,
    googleCertifiedCmp: settings.consent.google_certified_cmp
  };
}

export function resolveAdFeatureState(
  settings,
  deploymentEnvironment,
  environmentVariables = process.env
) {
  return resolveAdvertisingFeatureState(settings, deploymentEnvironment, environmentVariables);
}
