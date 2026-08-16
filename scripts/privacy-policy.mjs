import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  SEO_POLICY,
  canonicalSeoUrl,
  createOrganizationStructuredData
} from './seo.mjs';

const SITE_ORIGIN = SEO_POLICY.siteOrigin;
const REVIEW_STATUSES = new Set(['pending', 'approved']);
const SERVICE_STATUSES = new Set(['configured', 'inactive']);
const REQUIRED_SERVICE_KEYS = Object.freeze([
  'hosting',
  'fonts',
  'icons',
  'contact-delivery',
  'analytics',
  'advertising',
  'newsletter'
]);

export const PRIVACY_POLICY_PAGE = Object.freeze({
  key: 'privacy-policy',
  route: '/privacy-policy/',
  sourceTemplate: 'pages/privacy-policy.html',
  settingsSource: 'content/settings/privacy-policy.json',
  title: 'Privacy Policy | Lawscope',
  heading: 'Privacy Policy',
  description: 'Read how Lawscope collects, uses, protects, and shares data, including information about cookies, analytics, ads, and your choices.',
  socialImage: '/assets/images/social/lawscope-editorial-standards.jpg',
  socialImageAlt: 'Abstract layered paper forms and connecting lines representing careful information handling.'
});

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
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

function validateOperator(operator) {
  if (!operator || typeof operator !== 'object' || Array.isArray(operator)) {
    throw new Error('privacy-policy.json: operator must be an object.');
  }
  for (const field of ['public_name', 'legal_name', 'postal_address']) {
    if (typeof operator[field] !== 'string') {
      throw new Error(`privacy-policy.json: operator.${field} must be a string.`);
    }
  }
  if (!operator.public_name.trim()) {
    throw new Error('privacy-policy.json: operator.public_name is required.');
  }
  if (typeof operator.legal_identity_confirmed !== 'boolean') {
    throw new Error(
      'privacy-policy.json: operator.legal_identity_confirmed must be true or false.'
    );
  }
  if (
    operator.legal_identity_confirmed &&
    (!operator.legal_name.trim() || !operator.postal_address.trim())
  ) {
    throw new Error(
      'privacy-policy.json: confirmed legal identity requires a legal name and postal address.'
    );
  }
}

function validatePrivacyRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new Error('privacy-policy.json: privacy_request must be an object.');
  }
  if (typeof request.route !== 'string') {
    throw new Error('privacy-policy.json: privacy_request.route must be a string.');
  }
  let route;
  try {
    route = new URL(request.route, SITE_ORIGIN);
  } catch {
    throw new Error('privacy-policy.json: privacy_request.route must be a valid URL path.');
  }
  if (
    route.origin !== SITE_ORIGIN ||
    route.pathname !== '/contact/' ||
    route.search ||
    route.hash !== '#contact-subject'
  ) {
    throw new Error(
      'privacy-policy.json: privacy_request.route must be /contact/#contact-subject.'
    );
  }
  if (typeof request.monitored_channel_confirmed !== 'boolean') {
    throw new Error(
      'privacy-policy.json: privacy_request.monitored_channel_confirmed must be true or false.'
    );
  }
}

function validateServices(services) {
  if (!Array.isArray(services) || services.length !== REQUIRED_SERVICE_KEYS.length) {
    throw new Error(
      `privacy-policy.json: service_inventory must contain ${REQUIRED_SERVICE_KEYS.length} entries.`
    );
  }

  const seenKeys = new Set();
  for (const service of services) {
    if (!service || typeof service !== 'object' || Array.isArray(service)) {
      throw new Error('privacy-policy.json: each service inventory entry must be an object.');
    }
    for (const field of ['key', 'name', 'purpose', 'status', 'privacy_url', 'retention']) {
      if (typeof service[field] !== 'string') {
        throw new Error(`privacy-policy.json: service ${field} values must be strings.`);
      }
    }
    if (!REQUIRED_SERVICE_KEYS.includes(service.key) || seenKeys.has(service.key)) {
      throw new Error(`privacy-policy.json: unsupported or duplicate service key ${service.key}.`);
    }
    seenKeys.add(service.key);
    if (!service.name.trim() || !service.purpose.trim() || !service.retention.trim()) {
      throw new Error(`privacy-policy.json: ${service.key} requires a name, purpose, and retention statement.`);
    }
    if (!SERVICE_STATUSES.has(service.status)) {
      throw new Error(`privacy-policy.json: ${service.key} status must be configured or inactive.`);
    }
    if (service.privacy_url && !isHttpsUrl(service.privacy_url)) {
      throw new Error(`privacy-policy.json: ${service.key} privacy_url must use HTTPS.`);
    }
    if (service.status === 'configured' && !service.privacy_url) {
      throw new Error(`privacy-policy.json: configured service ${service.key} needs a privacy_url.`);
    }
    if (typeof service.details_confirmed !== 'boolean') {
      throw new Error(`privacy-policy.json: ${service.key}.details_confirmed must be boolean.`);
    }
  }

  for (const key of REQUIRED_SERVICE_KEYS) {
    if (!seenKeys.has(key)) {
      throw new Error(`privacy-policy.json: missing required service ${key}.`);
    }
  }
}

export function validatePrivacyPolicySettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('privacy-policy.json: root value must be an object.');
  }
  if (!isIsoDate(settings.effective_date) || !isIsoDate(settings.last_updated)) {
    throw new Error('privacy-policy.json: effective_date and last_updated must be real ISO dates.');
  }
  if (settings.last_updated < settings.effective_date) {
    throw new Error('privacy-policy.json: last_updated cannot precede effective_date.');
  }
  if (!REVIEW_STATUSES.has(settings.review_status)) {
    throw new Error('privacy-policy.json: review_status must be pending or approved.');
  }
  validateOperator(settings.operator);
  validatePrivacyRequest(settings.privacy_request);
  validateServices(settings.service_inventory);
  return settings;
}

export async function loadPrivacyPolicySettings(projectRoot) {
  const settingsPath = path.join(projectRoot, PRIVACY_POLICY_PAGE.settingsSource);
  let settings;
  try {
    settings = JSON.parse(await readFile(settingsPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${PRIVACY_POLICY_PAGE.settingsSource}: ${error.message}`);
  }
  return validatePrivacyPolicySettings(settings);
}

export function resolvePrivacyPolicyState({
  settings,
  siteSettings,
  environment,
  contactFeature,
  environmentVariables = process.env
}) {
  validatePrivacyPolicySettings(settings);
  const approvalToggle = environmentVariables.PRIVACY_POLICY_APPROVED;
  if (approvalToggle && !['true', 'false'].includes(approvalToggle)) {
    throw new Error('PRIVACY_POLICY_APPROVED must be true or false when provided.');
  }

  const activationRequested = approvalToggle === 'true';
  const configuredServices = settings.service_inventory.filter(
    ({ status }) => status === 'configured'
  );
  const serviceDetailsConfirmed = configuredServices.every(
    ({ details_confirmed: confirmed }) => confirmed
  );
  const contactService = settings.service_inventory.find(
    ({ key }) => key === 'contact-delivery'
  );
  const legalReviewComplete = settings.review_status === 'approved';
  const operatorConfirmed =
    settings.operator.legal_identity_confirmed &&
    Boolean(settings.operator.legal_name.trim()) &&
    Boolean(settings.operator.postal_address.trim());
  const requestChannelReady =
    settings.privacy_request.monitored_channel_confirmed &&
    contactFeature?.enabled === true &&
    contactService?.status === 'configured' &&
    contactService?.name !== 'Not selected' &&
    contactService?.details_confirmed === true;
  const providerByKey = new Map(
    settings.service_inventory.map((service) => [service.key, service])
  );
  const newsletterDisclosureMatches =
    siteSettings?.newsletter?.enabled !== true ||
    providerByKey.get('newsletter')?.status === 'configured';
  const advertisingDisclosureMatches =
    siteSettings?.advertising?.enabled !== true ||
    providerByKey.get('advertising')?.status === 'configured';
  const activeFeaturesDisclosed =
    newsletterDisclosureMatches && advertisingDisclosureMatches;

  const blockers = [];
  if (!activationRequested) blockers.push('production approval toggle');
  if (!legalReviewComplete) blockers.push('qualified legal review');
  if (!operatorConfirmed) blockers.push('confirmed legal operator and postal address');
  if (!serviceDetailsConfirmed) blockers.push('confirmed active-provider and retention details');
  if (!activeFeaturesDisclosed) blockers.push('provider records for active public features');
  if (!requestChannelReady) blockers.push('monitored privacy-request delivery channel');

  const approved = blockers.length === 0;
  const indexable = environment === 'production' && approved;
  return Object.freeze({
    activationRequested,
    approved,
    indexable,
    legalReviewComplete,
    operatorConfirmed,
    serviceDetailsConfirmed,
    activeFeaturesDisclosed,
    requestChannelReady,
    blockers: Object.freeze(blockers),
    robotsDirective: indexable ? 'index, follow' : 'noindex, nofollow'
  });
}

export function formatPrivacyPolicyDate(isoDate) {
  if (!isIsoDate(isoDate)) throw new Error(`Invalid privacy policy date: ${isoDate}`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function canonicalPrivacyPolicyUrl(route = PRIVACY_POLICY_PAGE.route) {
  return canonicalSeoUrl(route);
}

export function createPrivacyPolicyStructuredData(siteSettings, policySettings) {
  validatePrivacyPolicySettings(policySettings);
  const pageUrl = canonicalPrivacyPolicyUrl();
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        name: PRIVACY_POLICY_PAGE.heading,
        description: PRIVACY_POLICY_PAGE.description,
        url: pageUrl,
        datePublished: policySettings.effective_date,
        dateModified: policySettings.last_updated,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${SITE_ORIGIN}/#website`,
          name: siteSettings.site_title.trim(),
          url: `${SITE_ORIGIN}/`
        },
        publisher: { '@id': organizationId },
        breadcrumb: { '@id': breadcrumbId },
        inLanguage: 'en-US'
      },
      createOrganizationStructuredData(siteSettings),
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_ORIGIN}/`
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: PRIVACY_POLICY_PAGE.heading,
            item: pageUrl
          }
        ]
      }
    ]
  };
}
