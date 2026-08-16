import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolvePublicRobotsDirective } from './seo.mjs';
import {
  CONTACT_PAGE,
  CONTACT_SUBJECTS,
  canonicalContactPageUrl,
  createContactPageStructuredData,
  resolveContactFeatureState
} from './contact-page.mjs';

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

function renderSubjectOptions() {
  return CONTACT_SUBJECTS.map(
    ({ value, label }) =>
      `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`
  ).join('\n                    ');
}

function renderUnavailableNotice(enabled) {
  if (enabled) return '';
  return `<aside class="contact-form-section__unavailable" role="status" aria-labelledby="contact-unavailable-title">
              <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
              <div>
                <h3 id="contact-unavailable-title">Message sending is not available yet</h3>
                <p>Lawscope will enable this form after a monitored support channel is configured. Please return later rather than sending confidential or time-sensitive information.</p>
              </div>
            </aside>`;
}

export async function renderContactPage({
  rootDir,
  outputDir,
  environment,
  siteSettings,
  siteFooterHtml,
  consentManagerHtml,
  backToTopHtml
}) {
  const templatePath = path.join(rootDir, CONTACT_PAGE.sourceTemplate);
  const template = await readFile(templatePath, 'utf8');
  const feature = resolveContactFeatureState(siteSettings);
  const canonicalUrl = canonicalContactPageUrl();
  const socialImageUrl = new URL(CONTACT_PAGE.socialImage, canonicalUrl).href;
  const robotsDirective = resolvePublicRobotsDirective(environment);

  const html = replaceTemplateTokens(
    template,
    {
      DEPLOYMENT_ENV: escapeHtml(environment),
      ROBOTS_DIRECTIVE: robotsDirective,
      PAGE_DESCRIPTION: escapeHtml(CONTACT_PAGE.description),
      PAGE_TITLE: escapeHtml(CONTACT_PAGE.title),
      CANONICAL_URL: escapeHtml(canonicalUrl),
      SOCIAL_IMAGE_URL: escapeHtml(socialImageUrl),
      SOCIAL_IMAGE_ALT: escapeHtml(CONTACT_PAGE.socialImageAlt),
      PAGE_JSON_LD: serializeStructuredData(
        createContactPageStructuredData(siteSettings)
      ),
      CONTACT_INITIAL_STATE: escapeHtml(feature.initialState),
      CONTACT_UNAVAILABLE_NOTICE: renderUnavailableNotice(feature.enabled),
      CONTACT_FORM_ENDPOINT: escapeHtml(feature.endpoint),
      CONTACT_FORM_ENABLED: feature.enabled ? 'true' : 'false',
      CONTACT_FORM_PROVIDER: escapeHtml(feature.provider),
      CONTACT_FORM_DISABLED: feature.enabled ? '' : 'disabled',
      CONTACT_SUBJECT_OPTIONS: renderSubjectOptions(),
      SITE_FOOTER: siteFooterHtml,
      CONSENT_MANAGER: consentManagerHtml,
      BACK_TO_TOP: backToTopHtml
    },
    CONTACT_PAGE.sourceTemplate
  );

  const outputPath = path.join(outputDir, 'contact', 'index.html');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);

  return Object.freeze({
    key: CONTACT_PAGE.key,
    route: CONTACT_PAGE.route,
    outputPath,
    title: CONTACT_PAGE.title,
    description: CONTACT_PAGE.description,
    canonicalUrl,
    deploymentEnvironment: environment,
    robotsDirective,
    featureEnabled: feature.enabled
  });
}
