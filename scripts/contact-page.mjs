import {
  SEO_POLICY,
  canonicalSeoUrl,
  createOrganizationStructuredData
} from './seo.mjs';

const SITE_ORIGIN = SEO_POLICY.siteOrigin;
const CONTACT_PROVIDERS = new Set(['lawscope-serverless']);

export const CONTACT_PAGE = Object.freeze({
  key: 'contact',
  route: '/contact/',
  sourceTemplate: 'pages/contact.html',
  title: 'Contact | Lawscope',
  heading: 'Contact Lawscope',
  description: 'Contact Lawscope about corrections, accessibility, privacy, advertising, topic suggestions, or general website questions.',
  socialImage: '/assets/images/social/lawscope-editorial-standards.jpg',
  socialImageAlt: 'Abstract layered paper forms and connecting lines representing careful editorial communication.'
});

export const CONTACT_SUBJECTS = Object.freeze([
  Object.freeze({ value: 'correction', label: 'Report a correction' }),
  Object.freeze({ value: 'topic-suggestion', label: 'Suggest a topic' }),
  Object.freeze({ value: 'accessibility', label: 'Accessibility issue' }),
  Object.freeze({ value: 'privacy', label: 'Privacy request' }),
  Object.freeze({ value: 'advertising', label: 'Advertising inquiry' }),
  Object.freeze({ value: 'technical', label: 'Technical problem' }),
  Object.freeze({ value: 'editorial-other', label: 'Other editorial inquiry' })
]);

export const CONTACT_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  messageMin: 20,
  messageMax: 5000,
  articleUrlMax: 2048,
  requestBytesMax: 32768
});

export function contactEndpointIsValid(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.startsWith('//')) {
    return false;
  }

  try {
    const baseUrl = new URL('https://lawscope.invalid');
    const url = new URL(endpoint, baseUrl);
    return (
      url.origin === baseUrl.origin &&
      url.pathname.startsWith('/api/') &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function validateContactSettings(settings) {
  const contact = settings?.contact;
  if (!contact || typeof contact !== 'object' || Array.isArray(contact)) {
    throw new Error('content/settings/site.json: contact settings are required');
  }
  if (typeof contact.enabled !== 'boolean') {
    throw new Error('content/settings/site.json: contact.enabled must be true or false');
  }
  if (typeof contact.endpoint !== 'string' || !contactEndpointIsValid(contact.endpoint)) {
    throw new Error(
      'content/settings/site.json: contact.endpoint must be a root-relative /api/ route without query or hash values'
    );
  }
  if (!CONTACT_PROVIDERS.has(contact.provider)) {
    throw new Error('content/settings/site.json: contact.provider is not approved');
  }
  if (contact.public_email !== undefined) {
    if (typeof contact.public_email !== 'string') {
      throw new Error('content/settings/site.json: contact.public_email must be a string');
    }
    const publicEmail = contact.public_email.trim();
    if (publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(publicEmail)) {
      throw new Error(
        'content/settings/site.json: contact.public_email must be empty or a valid address'
      );
    }
  }
}

export function resolveContactFeatureState(settings, environmentVariables = process.env) {
  validateContactSettings(settings);

  const environmentToggle = environmentVariables.CONTACT_FORM_ENABLED;
  if (environmentToggle && !['true', 'false'].includes(environmentToggle)) {
    throw new Error('CONTACT_FORM_ENABLED must be true or false when provided.');
  }

  const requested = environmentToggle
    ? environmentToggle === 'true'
    : settings.contact.enabled;
  const endpoint = String(
    environmentVariables.CONTACT_FORM_ENDPOINT || settings.contact.endpoint
  ).trim();
  const provider = settings.contact.provider;
  const deliveryWebhook = String(
    environmentVariables.CONTACT_DELIVERY_WEBHOOK_URL || ''
  ).trim();
  const deliveryToken = String(
    environmentVariables.CONTACT_DELIVERY_WEBHOOK_TOKEN || ''
  ).trim();
  let deliveryWebhookIsHttps = false;
  try {
    deliveryWebhookIsHttps = new URL(deliveryWebhook).protocol === 'https:';
  } catch {
    deliveryWebhookIsHttps = false;
  }
  const deliveryConfigured = deliveryWebhookIsHttps && Boolean(deliveryToken);
  const enabled = requested && deliveryConfigured;

  if (!contactEndpointIsValid(endpoint)) {
    throw new Error('Contact form endpoint must remain a root-relative /api/ route.');
  }

  return Object.freeze({
    requested,
    enabled,
    endpoint,
    endpointConfigured: Boolean(endpoint),
    deliveryConfigured,
    provider,
    initialState: enabled ? 'idle' : 'unavailable'
  });
}

export function canonicalContactPageUrl(route = CONTACT_PAGE.route) {
  return canonicalSeoUrl(route);
}

export function createContactPageStructuredData(siteSettings) {
  const pageUrl = canonicalContactPageUrl();
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': `${pageUrl}#webpage`,
        name: CONTACT_PAGE.heading,
        description: CONTACT_PAGE.description,
        url: pageUrl,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${SITE_ORIGIN}/#website`,
          name: siteSettings.site_title.trim(),
          url: `${SITE_ORIGIN}/`
        },
        about: { '@id': organizationId },
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
            name: CONTACT_PAGE.heading,
            item: pageUrl
          }
        ]
      }
    ]
  };
}
