const SITE_ORIGIN = 'https://getlawscope.com';
const SITE_NAME = 'Lawscope';
const SITE_LANGUAGE = 'en-US';
const OPEN_GRAPH_LOCALE = 'en_US';
const TITLE_SUFFIX = ` | ${SITE_NAME}`;
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 155;

export const LEGACY_REDIRECT_POLICY = Object.freeze({
  status: 'empty-no-known-legacy-routes',
  redirects: Object.freeze([])
});

export const SEO_POLICY = Object.freeze({
  siteOrigin: SITE_ORIGIN,
  siteName: SITE_NAME,
  siteLanguage: SITE_LANGUAGE,
  openGraphLocale: OPEN_GRAPH_LOCALE,
  titleSuffix: TITLE_SUFFIX,
  maxTitleLength: MAX_TITLE_LENGTH,
  maxDescriptionLength: MAX_DESCRIPTION_LENGTH,
  defaultTitle: `Plain-English U.S. Legal Information${TITLE_SUFFIX}`,
  defaultDescription:
    'Understand U.S. law in plain English with carefully sourced guides on rights, legal processes, and everyday legal questions.',
  defaultSocialImage: '/assets/images/social/lawscope-editorial-standards.jpg',
  defaultSocialImageAlt:
    'Abstract layered paper forms and connecting lines representing Lawscope’s careful legal-information publishing process.',
  publisherLogo: '/assets/images/lawscope-publisher-logo.png',
  publisherLogoWidth: 512,
  publisherLogoHeight: 512
});

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function canonicalSeoUrl(route = '/') {
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) {
    throw new Error(`SEO canonical route must be root-relative: ${route}`);
  }

  const url = new URL(route, SITE_ORIGIN);
  if (url.origin !== SITE_ORIGIN || url.search || url.hash || url.protocol !== 'https:') {
    throw new Error(`SEO canonical route must resolve to a clean Lawscope HTTPS URL: ${route}`);
  }
  return url.href;
}

export function absoluteSeoImageUrl(image = SEO_POLICY.defaultSocialImage) {
  const selectedImage = firstNonEmpty(image, SEO_POLICY.defaultSocialImage);
  const url = new URL(selectedImage, `${SITE_ORIGIN}/`);
  if (url.protocol !== 'https:' || url.origin !== SITE_ORIGIN || url.search || url.hash) {
    throw new Error(`SEO social image must resolve to an absolute Lawscope HTTPS URL: ${selectedImage}`);
  }
  return url.href;
}

export function resolvePublicRobotsDirective(deploymentEnvironment = 'development') {
  return deploymentEnvironment === 'production'
    ? 'index, follow'
    : 'noindex, nofollow';
}

export function truncateSeoDescription(value, maximumLength = MAX_DESCRIPTION_LENGTH) {
  const description = String(value || '').trim().replace(/\s+/g, ' ');
  if (description.length <= maximumLength) return description;
  const clipped = description
    .slice(0, maximumLength - 1)
    .replace(/\s+\S*$/, '')
    .replace(/[,:;.!?\s]+$/, '');
  return `${clipped}…`;
}

export function createSeoMetadata({
  route,
  title,
  fallbackTitle = SEO_POLICY.defaultTitle,
  description,
  fallbackDescription = SEO_POLICY.defaultDescription,
  socialImage,
  socialImageAlt,
  fallbackSocialImageAlt = SEO_POLICY.defaultSocialImageAlt,
  type = 'website',
  deploymentEnvironment = 'development'
}) {
  const resolvedTitle = firstNonEmpty(title, fallbackTitle, SEO_POLICY.defaultTitle);
  const resolvedDescription = firstNonEmpty(
    description,
    fallbackDescription,
    SEO_POLICY.defaultDescription
  ).replace(/\s+/g, ' ');
  const resolvedImageAlt = firstNonEmpty(
    socialImageAlt,
    fallbackSocialImageAlt,
    SEO_POLICY.defaultSocialImageAlt
  );

  if (!resolvedTitle.endsWith(TITLE_SUFFIX)) {
    throw new Error(`SEO title must end with "${TITLE_SUFFIX}": ${resolvedTitle}`);
  }
  if (resolvedTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`SEO title exceeds ${MAX_TITLE_LENGTH} characters: ${resolvedTitle}`);
  }
  if (resolvedDescription.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `SEO description exceeds ${MAX_DESCRIPTION_LENGTH} characters: ${resolvedDescription}`
    );
  }
  if (!resolvedDescription || !resolvedImageAlt) {
    throw new Error('SEO descriptions and social-image alternatives must not be empty.');
  }
  if (!['website', 'article'].includes(type)) {
    throw new Error(`Unsupported Open Graph type: ${type}`);
  }

  const canonicalUrl = canonicalSeoUrl(route);
  const socialImageUrl = absoluteSeoImageUrl(socialImage);

  return Object.freeze({
    title: resolvedTitle,
    description: resolvedDescription,
    canonicalUrl,
    socialImageUrl,
    socialImageAlt: resolvedImageAlt,
    type,
    siteName: SITE_NAME,
    locale: OPEN_GRAPH_LOCALE,
    twitterCard: 'summary_large_image',
    robotsDirective: resolvePublicRobotsDirective(deploymentEnvironment)
  });
}

function activeOfficialProfiles(siteSettings) {
  const values = Object.values(siteSettings?.social_profiles || {});
  return values
    .map((value) => String(value || '').trim())
    .filter((value) => {
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    });
}

export function createOrganizationStructuredData(siteSettings = {}) {
  const name = firstNonEmpty(siteSettings.site_title, SITE_NAME);
  const description = firstNonEmpty(
    siteSettings.site_tagline,
    'U.S. law, explained with clarity and care.'
  );
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name,
    url: `${SITE_ORIGIN}/`,
    description,
    logo: {
      '@type': 'ImageObject',
      url: absoluteSeoImageUrl(SEO_POLICY.publisherLogo),
      width: SEO_POLICY.publisherLogoWidth,
      height: SEO_POLICY.publisherLogoHeight
    }
  };
  const sameAs = activeOfficialProfiles(siteSettings);
  if (sameAs.length > 0) organization.sameAs = sameAs;

  const publicEmail = String(siteSettings?.contact?.public_email || '').trim();
  if (publicEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(publicEmail)) {
      throw new Error(
        `content/settings/site.json: contact.public_email must be a valid address: ${publicEmail}`
      );
    }
    organization.contactPoint = {
      '@type': 'ContactPoint',
      email: publicEmail,
      contactType: 'editorial',
      url: `${SITE_ORIGIN}/contact/`
    };
  }
  return organization;
}

export function createHomeStructuredData(siteSettings = {}) {
  const organization = createOrganizationStructuredData(siteSettings);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        name: firstNonEmpty(siteSettings.site_title, SITE_NAME),
        url: `${SITE_ORIGIN}/`,
        description: SEO_POLICY.defaultDescription,
        publisher: { '@id': organization['@id'] },
        inLanguage: SITE_LANGUAGE
      },
      organization
    ]
  };
}

export function serializeSeoStructuredData(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}
