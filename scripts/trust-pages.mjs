import {
  SEO_POLICY,
  canonicalSeoUrl,
  createOrganizationStructuredData,
  resolvePublicRobotsDirective,
  serializeSeoStructuredData
} from './seo.mjs';

const SITE_ORIGIN = SEO_POLICY.siteOrigin;

export const TRUST_PAGE_PUBLICATION_DATE = '2026-08-16';
export const TRUST_PAGE_MODIFICATION_DATE = '2026-08-16';

export const ABOUT_PAGE = Object.freeze({
  key: 'about',
  route: '/about/',
  sourceTemplate: 'pages/about.html',
  title: 'About Our Editorial Mission | Lawscope',
  heading: 'About Lawscope',
  description: 'Learn how Lawscope researches, writes, sources, updates, and corrects plain-English educational information about U.S. law.',
  socialImage: '/assets/images/social/lawscope-editorial-standards.jpg',
  socialImageAlt: 'Abstract layered paper forms and connecting lines representing Lawscope’s research and editing process.'
});

export const EDITORIAL_POLICY_PAGE = Object.freeze({
  key: 'editorial-policy',
  route: '/editorial-policy/',
  sourceTemplate: 'pages/editorial-policy.html',
  title: 'Editorial Policy & Standards | Lawscope',
  heading: 'Editorial Policy',
  description: 'Review Lawscope’s standards for legal sourcing, plain-English editing, updates, corrections, AI tools, and advertising independence.',
  socialImage: '/assets/images/social/lawscope-editorial-standards.jpg',
  socialImageAlt: 'Abstract layered paper forms and connecting lines representing Lawscope’s editorial standards.'
});

export const TRUST_PAGES = Object.freeze([ABOUT_PAGE, EDITORIAL_POLICY_PAGE]);

export function canonicalTrustPageUrl(route) {
  return canonicalSeoUrl(route);
}

export function resolveRobotsDirective(deploymentEnvironment = 'development') {
  return resolvePublicRobotsDirective(deploymentEnvironment);
}

function organizationData(siteSettings) {
  return createOrganizationStructuredData(siteSettings);
}

function breadcrumbData(page) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalTrustPageUrl(page.route)}#breadcrumb`,
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
        name: page.heading,
        item: canonicalTrustPageUrl(page.route)
      }
    ]
  };
}

export function createAboutPageStructuredData(siteSettings) {
  const pageUrl = canonicalTrustPageUrl(ABOUT_PAGE.route);
  const organization = organizationData(siteSettings);
  const breadcrumb = breadcrumbData(ABOUT_PAGE);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${pageUrl}#webpage`,
        name: ABOUT_PAGE.heading,
        description: ABOUT_PAGE.description,
        url: pageUrl,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${SITE_ORIGIN}/#website`,
          name: siteSettings.site_title.trim(),
          url: `${SITE_ORIGIN}/`
        },
        mainEntity: { '@id': organization['@id'] },
        breadcrumb: { '@id': breadcrumb['@id'] },
        inLanguage: 'en-US'
      },
      organization,
      breadcrumb
    ]
  };
}

export function createEditorialPolicyStructuredData(siteSettings) {
  const pageUrl = canonicalTrustPageUrl(EDITORIAL_POLICY_PAGE.route);
  const organization = organizationData(siteSettings);
  const breadcrumb = breadcrumbData(EDITORIAL_POLICY_PAGE);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        name: EDITORIAL_POLICY_PAGE.heading,
        description: EDITORIAL_POLICY_PAGE.description,
        url: pageUrl,
        datePublished: TRUST_PAGE_PUBLICATION_DATE,
        dateModified: TRUST_PAGE_MODIFICATION_DATE,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${SITE_ORIGIN}/#website`,
          name: siteSettings.site_title.trim(),
          url: `${SITE_ORIGIN}/`
        },
        publisher: { '@id': organization['@id'] },
        breadcrumb: { '@id': breadcrumb['@id'] },
        inLanguage: 'en-US'
      },
      organization,
      breadcrumb
    ]
  };
}

export function serializeStructuredData(value) {
  return serializeSeoStructuredData(value);
}
