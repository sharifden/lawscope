import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ARTICLE_DISCLAIMER,
  LEGAL_DISCLAIMER_PAGE,
  canonicalLegalDisclaimerUrl,
  createLegalDisclaimerStructuredData,
  formatLegalDisclaimerDate,
  loadLegalDisclaimerSettings,
  resolveLegalDisclaimerState,
  validateArticleDisclaimerPartial
} from './legal-disclaimer.mjs';

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
  return `<aside class="legal-review-notice" aria-labelledby="legal-review-title">
            <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i>
            <div>
              <h2 id="legal-review-title">Pre-launch legal review status</h2>
              <p>The exact short article notice below is approved by the planning document. The expanded page language is a conservative planning draft and is not represented as qualified-counsel-approved final wording. Production indexing remains blocked until that review is recorded.</p>
            </div>
          </aside>`;
}

export async function renderLegalDisclaimerPage({
  rootDir,
  outputDir,
  environment,
  siteSettings,
  siteFooterHtml,
  consentManagerHtml,
  backToTopHtml,
  environmentVariables = process.env
}) {
  const settings = await loadLegalDisclaimerSettings(rootDir);
  const state = resolveLegalDisclaimerState({
    settings,
    environment,
    environmentVariables
  });
  const [template, articlePartial] = await Promise.all([
    readFile(path.join(rootDir, LEGAL_DISCLAIMER_PAGE.sourceTemplate), 'utf8'),
    readFile(path.join(rootDir, LEGAL_DISCLAIMER_PAGE.articlePartial), 'utf8')
  ]);
  validateArticleDisclaimerPartial(articlePartial);
  const canonicalUrl = canonicalLegalDisclaimerUrl();
  const socialImageUrl = new URL(LEGAL_DISCLAIMER_PAGE.socialImage, canonicalUrl).href;

  const html = replaceTemplateTokens(
    template,
    {
      DEPLOYMENT_ENV: escapeHtml(environment),
      ROBOTS_DIRECTIVE: state.robotsDirective,
      PAGE_DESCRIPTION: escapeHtml(LEGAL_DISCLAIMER_PAGE.description),
      PAGE_TITLE: escapeHtml(LEGAL_DISCLAIMER_PAGE.title),
      CANONICAL_URL: escapeHtml(canonicalUrl),
      SOCIAL_IMAGE_URL: escapeHtml(socialImageUrl),
      SOCIAL_IMAGE_ALT: escapeHtml(LEGAL_DISCLAIMER_PAGE.socialImageAlt),
      PAGE_JSON_LD: serializeStructuredData(
        createLegalDisclaimerStructuredData(siteSettings, settings)
      ),
      POLICY_PUBLICATION_DATE: escapeHtml(settings.effective_date),
      POLICY_PUBLICATION_DATE_DISPLAY: escapeHtml(
        formatLegalDisclaimerDate(settings.effective_date)
      ),
      POLICY_MODIFICATION_DATE: escapeHtml(settings.last_updated),
      POLICY_MODIFICATION_DATE_DISPLAY: escapeHtml(
        formatLegalDisclaimerDate(settings.last_updated)
      ),
      LEGAL_REVIEW_NOTICE: renderReviewNotice(state),
      ARTICLE_DISCLAIMER_TEXT: escapeHtml(ARTICLE_DISCLAIMER),
      SITE_FOOTER: siteFooterHtml,
      CONSENT_MANAGER: consentManagerHtml,
      BACK_TO_TOP: backToTopHtml
    },
    LEGAL_DISCLAIMER_PAGE.sourceTemplate
  );

  const outputPath = path.join(outputDir, 'legal-disclaimer', 'index.html');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);

  const manifest = {
    module: 25,
    route: LEGAL_DISCLAIMER_PAGE.route,
    sourceTemplate: LEGAL_DISCLAIMER_PAGE.sourceTemplate,
    settingsSource: LEGAL_DISCLAIMER_PAGE.settingsSource,
    articlePartial: LEGAL_DISCLAIMER_PAGE.articlePartial,
    effectiveDate: settings.effective_date,
    lastUpdated: settings.last_updated,
    reviewStatus: settings.review_status,
    approvalRequested: state.activationRequested,
    productionApproved: state.approved,
    indexable: state.indexable,
    robotsDirective: state.robotsDirective,
    blockers: [...state.blockers],
    fullPageSections: 10,
    articleDisclaimer: ARTICLE_DISCLAIMER,
    articleDisclaimerRequired: true,
    articleOptOutSupported: false,
    fullPageLink: LEGAL_DISCLAIMER_PAGE.route
  };
  const manifestPath = path.join(outputDir, 'data', 'legal-disclaimer-manifest.json');
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return Object.freeze({
    key: LEGAL_DISCLAIMER_PAGE.key,
    route: LEGAL_DISCLAIMER_PAGE.route,
    outputPath,
    manifestPath,
    title: LEGAL_DISCLAIMER_PAGE.title,
    description: LEGAL_DISCLAIMER_PAGE.description,
    canonicalUrl,
    settings,
    state
  });
}
