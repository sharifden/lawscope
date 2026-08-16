import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ARTICLE_DISCLAIMER } from './article-pages.mjs';
import {
  SEO_POLICY,
  canonicalSeoUrl,
  createOrganizationStructuredData
} from './seo.mjs';

const SITE_ORIGIN = SEO_POLICY.siteOrigin;
const REVIEW_STATUSES = new Set(['pending', 'approved']);

export const LEGAL_DISCLAIMER_PAGE = Object.freeze({
  key: 'legal-disclaimer',
  route: '/legal-disclaimer/',
  sourceTemplate: 'pages/legal-disclaimer.html',
  settingsSource: 'content/settings/legal-disclaimer.json',
  articlePartial: 'pages/partials/article-disclaimer.html',
  title: 'Legal Disclaimer | Lawscope',
  heading: 'Legal Disclaimer',
  description: 'Understand the limits of Lawscope’s educational legal information, including no legal advice or attorney-client relationship.',
  socialImage: '/assets/images/social/lawscope-editorial-standards.jpg',
  socialImageAlt: 'Abstract layered paper forms and connecting lines representing clear boundaries for educational legal information.'
});

export { ARTICLE_DISCLAIMER };

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateLegalDisclaimerSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('legal-disclaimer.json: root value must be an object.');
  }
  if (!isIsoDate(settings.effective_date) || !isIsoDate(settings.last_updated)) {
    throw new Error(
      'legal-disclaimer.json: effective_date and last_updated must be real ISO dates.'
    );
  }
  if (settings.last_updated < settings.effective_date) {
    throw new Error('legal-disclaimer.json: last_updated cannot precede effective_date.');
  }
  if (!REVIEW_STATUSES.has(settings.review_status)) {
    throw new Error('legal-disclaimer.json: review_status must be pending or approved.');
  }
  const supportedKeys = new Set(['effective_date', 'last_updated', 'review_status']);
  for (const key of Object.keys(settings)) {
    if (!supportedKeys.has(key)) {
      throw new Error(`legal-disclaimer.json: unsupported field ${key}.`);
    }
  }
  return settings;
}

export async function loadLegalDisclaimerSettings(projectRoot) {
  const settingsPath = path.join(projectRoot, LEGAL_DISCLAIMER_PAGE.settingsSource);
  let settings;
  try {
    settings = JSON.parse(await readFile(settingsPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${LEGAL_DISCLAIMER_PAGE.settingsSource}: ${error.message}`);
  }
  return validateLegalDisclaimerSettings(settings);
}

export function validateArticleDisclaimerPartial(partialHtml) {
  if (typeof partialHtml !== 'string' || !partialHtml.trim()) {
    throw new Error('The build-controlled article disclaimer partial is required.');
  }
  const exactParagraph = `<p>${ARTICLE_DISCLAIMER}</p>`;
  if (!partialHtml.includes(exactParagraph)) {
    throw new Error('The required article disclaimer text is missing or has been changed.');
  }
  if (partialHtml.split(ARTICLE_DISCLAIMER).length - 1 !== 1) {
    throw new Error('The required article disclaimer must appear exactly once in its partial.');
  }
  if (!partialHtml.includes(`href="${LEGAL_DISCLAIMER_PAGE.route}"`)) {
    throw new Error('The article disclaimer must link to the full Legal Disclaimer route.');
  }
  if (!partialHtml.includes('class="article-disclaimer"')) {
    throw new Error('The article disclaimer must retain its required build-controlled component.');
  }
  if (/\{\{|\shidden(?:\s|=|>)|display\s*:\s*none/i.test(partialHtml)) {
    throw new Error('The article disclaimer cannot be conditional or hidden.');
  }
  return true;
}

export function resolveLegalDisclaimerState({
  settings,
  environment,
  environmentVariables = process.env
}) {
  validateLegalDisclaimerSettings(settings);
  const approvalToggle = environmentVariables.LEGAL_DISCLAIMER_APPROVED;
  if (approvalToggle && !['true', 'false'].includes(approvalToggle)) {
    throw new Error('LEGAL_DISCLAIMER_APPROVED must be true or false when provided.');
  }
  const activationRequested = approvalToggle === 'true';
  const legalReviewComplete = settings.review_status === 'approved';
  const approved = activationRequested && legalReviewComplete;
  const indexable = environment === 'production' && approved;
  const blockers = [];
  if (!activationRequested) blockers.push('production approval toggle');
  if (!legalReviewComplete) blockers.push('qualified legal review');
  return Object.freeze({
    activationRequested,
    legalReviewComplete,
    approved,
    indexable,
    blockers: Object.freeze(blockers),
    robotsDirective: indexable ? 'index, follow' : 'noindex, nofollow'
  });
}

export function formatLegalDisclaimerDate(isoDate) {
  if (!isIsoDate(isoDate)) throw new Error(`Invalid Legal Disclaimer date: ${isoDate}`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function canonicalLegalDisclaimerUrl(route = LEGAL_DISCLAIMER_PAGE.route) {
  return canonicalSeoUrl(route);
}

export function createLegalDisclaimerStructuredData(siteSettings, disclaimerSettings) {
  validateLegalDisclaimerSettings(disclaimerSettings);
  const pageUrl = canonicalLegalDisclaimerUrl();
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        name: LEGAL_DISCLAIMER_PAGE.heading,
        description: LEGAL_DISCLAIMER_PAGE.description,
        url: pageUrl,
        datePublished: disclaimerSettings.effective_date,
        dateModified: disclaimerSettings.last_updated,
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
            name: LEGAL_DISCLAIMER_PAGE.heading,
            item: pageUrl
          }
        ]
      }
    ]
  };
}
