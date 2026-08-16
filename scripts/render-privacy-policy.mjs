import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveContactFeatureState } from './contact-page.mjs';
import {
  resolveAdFeatureState,
  resolveNewsletterFeatureState
} from './site-settings.mjs';
import { resolveAnalyticsFeatureState } from './analytics.mjs';
import {
  PRIVACY_POLICY_PAGE,
  canonicalPrivacyPolicyUrl,
  createPrivacyPolicyStructuredData,
  formatPrivacyPolicyDate,
  loadPrivacyPolicySettings,
  resolvePrivacyPolicyState
} from './privacy-policy.mjs';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function serializeStructuredData(data) {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

function replaceTemplateTokens(template, replacements, templatePath) {
  const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (token, key) => {
    if (!Object.hasOwn(replacements, key)) {
      throw new Error(`${templatePath}: no replacement supplied for ${token}`);
    }
    return replacements[key];
  });
  const unresolved = rendered.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved) {
    throw new Error(`${templatePath}: unresolved template tokens: ${unresolved.join(', ')}`);
  }
  return rendered;
}

function renderReviewNotice(state) {
  if (state.approved) return '';
  return `<aside class="privacy-review-notice" aria-labelledby="privacy-review-title">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <div>
              <h2 id="privacy-review-title">Pre-launch review status</h2>
              <p>This notice describes the site’s implemented defaults, but it is not represented as counsel-approved final language. Production indexing remains blocked until Lawscope confirms its responsible legal entity and address, active providers and retention choices, a monitored privacy-request channel, and qualified legal review.</p>
            </div>
          </aside>`;
}

function renderOperatorDisclosure(settings, state) {
  if (!state.operatorConfirmed) {
    return `<p><strong>${escapeHtml(settings.operator.public_name)}</strong> is the public publication name used by this notice. The responsible legal operator and postal address have not been supplied or confirmed, so this pre-launch version is kept out of search indexes rather than inventing those facts.</p>`;
  }
  return `<div class="privacy-operator" aria-label="Responsible operator">
                <p>The responsible operator and controller for this notice is:</p>
                <address><strong>${escapeHtml(settings.operator.legal_name)}</strong><br>${escapeHtml(settings.operator.postal_address)}</address>
              </div>`;
}

function renderAdvertisingDisclosure(adFeature) {
  if (!adFeature.enabled) {
    return `<p><strong>Current status: inactive.</strong> Lawscope includes a local consent-aware Google AdSense adapter, but this build does not request Google’s advertising script, create an ad unit, or set an advertising cookie. Public identifiers remain inert placeholders, and advertising components are omitted from this legal page.</p>`;
  }
  return `<p><strong>Current status: available after opt-in.</strong> On the canonical production site, Lawscope may request responsive Google AdSense units only after a visitor affirmatively grants advertising permission. Google and its approved advertising partners may then process device, browser, network, approximate-location, consent, ad-interaction, and fraud-prevention information to select, deliver, measure, and protect personalized or non-personalized advertising, subject to the visitor’s choices and applicable law.</p>`;
}

function renderAnalyticsDisclosure(analyticsFeature) {
  if (!analyticsFeature.enabled) {
    return `<p><strong>Current status: inactive.</strong> Lawscope includes a local consent-aware GA4 integration, but this build will not request Google’s tag or send analytics data. Production activation remains off, and the all-X measurement ID is inert.</p>`;
  }
  return `<p><strong>Current status: available after opt-in.</strong> On the canonical production site, Google Analytics 4 is requested only after a visitor affirmatively grants analytics permission. With permission, Lawscope sends one sanitized page view and the limited newsletter, Contact, category, and article-reading events described below.</p>`;
}

function renderNewsletterContactDisclosure(newsletterFeature, contactFeature) {
  const newsletterText = newsletterFeature.enabled
    ? 'Newsletter signup is configured with double opt-in; an address is sent only after a visitor submits the enabled form.'
    : 'Newsletter signup is inactive, so Lawscope does not currently transmit or retain subscriber email addresses.';
  const contactText = contactFeature.enabled
    ? 'The Contact form is connected to a monitored server-side delivery destination and accepts messages under the documented safeguards.'
    : 'The Contact form is visibly unavailable until a monitored server-side delivery destination and credential are configured; it does not accept messages in this state.';
  return `<div class="privacy-status-list" role="list" aria-label="Newsletter and Contact status">
                <p role="listitem"><strong>Newsletter:</strong> ${escapeHtml(newsletterText)}</p>
                <p role="listitem"><strong>Contact:</strong> ${escapeHtml(contactText)}</p>
              </div>`;
}

function renderServiceInventory(services) {
  const entries = services.map((service) => {
    const statusLabel = service.status === 'configured' ? 'Configured dependency' : 'Inactive';
    const confirmation = service.details_confirmed
      ? ''
      : '<span class="privacy-service__review">Owner confirmation pending</span>';
    const provider = service.privacy_url
      ? `<a href="${escapeHtml(service.privacy_url)}">${escapeHtml(service.name)} privacy information</a>`
      : `<span>${escapeHtml(service.name)}</span>`;
    return `<li class="privacy-service">
                    <div class="privacy-service__heading">
                      <h4>${escapeHtml(service.name)}</h4>
                      <span class="privacy-service__status" data-service-status="${escapeHtml(service.status)}">${statusLabel}</span>
                      ${confirmation}
                    </div>
                    <p><strong>Purpose:</strong> ${escapeHtml(service.purpose)}</p>
                    <p><strong>Retention:</strong> ${escapeHtml(service.retention)}</p>
                    <p><strong>Provider notice:</strong> ${provider}</p>
                  </li>`;
  });
  return `<ul class="privacy-service-list" role="list">${entries.join('')}</ul>`;
}

function renderRightsCallout(settings, state) {
  const route = escapeHtml(settings.privacy_request.route);
  if (state.requestChannelReady) {
    return `<aside class="privacy-request-callout" aria-labelledby="privacy-request-title">
                <div>
                  <h3 id="privacy-request-title">Make a privacy request</h3>
                  <p>The linked form opens at the subject field. Choose “Privacy request” before sending.</p>
                </div>
                <a class="button button--primary" href="${route}">
                  <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
                  <span>Start a privacy request</span>
                </a>
              </aside>`;
  }
  return `<aside class="privacy-request-callout privacy-request-callout--pending" aria-labelledby="privacy-request-title">
              <div>
                <h3 id="privacy-request-title">Privacy request channel is not active yet</h3>
                <p>Lawscope will not invite personal information into an unmonitored inbox. The Contact page shows the current availability state and will offer “Privacy request” after monitored delivery is configured.</p>
              </div>
              <a class="button button--secondary" href="${route}">
                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                <span>Review Contact status</span>
              </a>
            </aside>`;
}

export async function renderPrivacyPolicyPage({
  rootDir,
  outputDir,
  environment,
  siteSettings,
  siteFooterHtml,
  consentManagerHtml,
  backToTopHtml,
  environmentVariables = process.env
}) {
  const policySettings = await loadPrivacyPolicySettings(rootDir);
  const contactFeature = resolveContactFeatureState(siteSettings, environmentVariables);
  const newsletterFeature = resolveNewsletterFeatureState(siteSettings, environmentVariables);
  const adFeature = resolveAdFeatureState(siteSettings, environment, environmentVariables);
  const analyticsFeature = resolveAnalyticsFeatureState(
    siteSettings,
    environment,
    environmentVariables
  );
  const serviceInventory = policySettings.service_inventory.map((service) => {
    if (service.key === 'analytics') {
      return { ...service, status: analyticsFeature.enabled ? 'configured' : 'inactive' };
    }
    if (service.key === 'advertising') {
      return { ...service, status: adFeature.enabled ? 'configured' : 'inactive' };
    }
    return service;
  });
  const state = resolvePrivacyPolicyState({
    settings: policySettings,
    siteSettings,
    environment,
    contactFeature,
    environmentVariables
  });
  const templatePath = path.join(rootDir, PRIVACY_POLICY_PAGE.sourceTemplate);
  const template = await readFile(templatePath, 'utf8');
  const canonicalUrl = canonicalPrivacyPolicyUrl();
  const socialImageUrl = new URL(PRIVACY_POLICY_PAGE.socialImage, canonicalUrl).href;

  const html = replaceTemplateTokens(
    template,
    {
      DEPLOYMENT_ENV: escapeHtml(environment),
      ROBOTS_DIRECTIVE: state.robotsDirective,
      PAGE_DESCRIPTION: escapeHtml(PRIVACY_POLICY_PAGE.description),
      PAGE_TITLE: escapeHtml(PRIVACY_POLICY_PAGE.title),
      CANONICAL_URL: escapeHtml(canonicalUrl),
      SOCIAL_IMAGE_URL: escapeHtml(socialImageUrl),
      SOCIAL_IMAGE_ALT: escapeHtml(PRIVACY_POLICY_PAGE.socialImageAlt),
      PAGE_JSON_LD: serializeStructuredData(
        createPrivacyPolicyStructuredData(siteSettings, policySettings)
      ),
      POLICY_PUBLICATION_DATE: escapeHtml(policySettings.effective_date),
      POLICY_PUBLICATION_DATE_DISPLAY: escapeHtml(
        formatPrivacyPolicyDate(policySettings.effective_date)
      ),
      POLICY_MODIFICATION_DATE: escapeHtml(policySettings.last_updated),
      POLICY_MODIFICATION_DATE_DISPLAY: escapeHtml(
        formatPrivacyPolicyDate(policySettings.last_updated)
      ),
      PRIVACY_REVIEW_NOTICE: renderReviewNotice(state),
      OPERATOR_DISCLOSURE: renderOperatorDisclosure(policySettings, state),
      ADVERTISING_DISCLOSURE: renderAdvertisingDisclosure(adFeature),
      ANALYTICS_DISCLOSURE: renderAnalyticsDisclosure(analyticsFeature),
      NEWSLETTER_CONTACT_DISCLOSURE: renderNewsletterContactDisclosure(
        newsletterFeature,
        contactFeature
      ),
      SERVICE_INVENTORY: renderServiceInventory(serviceInventory),
      RIGHTS_REQUEST_CALLOUT: renderRightsCallout(policySettings, state),
      SITE_FOOTER: siteFooterHtml,
      CONSENT_MANAGER: consentManagerHtml,
      BACK_TO_TOP: backToTopHtml
    },
    PRIVACY_POLICY_PAGE.sourceTemplate
  );

  const outputPath = path.join(outputDir, 'privacy-policy', 'index.html');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);

  const manifest = {
    module: 24,
    route: PRIVACY_POLICY_PAGE.route,
    sourceTemplate: PRIVACY_POLICY_PAGE.sourceTemplate,
    settingsSource: PRIVACY_POLICY_PAGE.settingsSource,
    effectiveDate: policySettings.effective_date,
    lastUpdated: policySettings.last_updated,
    reviewStatus: policySettings.review_status,
    legalIdentityConfirmed: policySettings.operator.legal_identity_confirmed,
    contactChannelReady: state.requestChannelReady,
    approvalRequested: state.activationRequested,
    productionApproved: state.approved,
    indexable: state.indexable,
    robotsDirective: state.robotsDirective,
    blockers: [...state.blockers],
    tocSections: 20,
    consentPreferenceController: 'data-open-consent-preferences',
    analytics: {
      enabled: analyticsFeature.enabled,
      consentCategory: analyticsFeature.consentCategory,
      automaticPageViews: false
    },
    serviceInventory: serviceInventory.map((service) => ({
      key: service.key,
      name: service.name,
      status: service.status,
      detailsConfirmed: service.details_confirmed
    }))
  };
  const manifestPath = path.join(outputDir, 'data', 'privacy-policy-manifest.json');
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return Object.freeze({
    key: PRIVACY_POLICY_PAGE.key,
    route: PRIVACY_POLICY_PAGE.route,
    outputPath,
    manifestPath,
    title: PRIVACY_POLICY_PAGE.title,
    description: PRIVACY_POLICY_PAGE.description,
    canonicalUrl,
    policySettings,
    state
  });
}
