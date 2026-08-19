import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  NOT_FOUND_PAGE,
  resolveNotFoundPopularCategoryCount,
  selectNotFoundPopularCategories
} from './not-found-page.mjs';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function renderPopularCategoryLinks(categories) {
  return categories
    .map(
      (category) => `<li class="not-found__category-item">
                <a href="${escapeHtml(category.route)}">${escapeHtml(category.name)}</a>
              </li>`
    )
    .join('\n');
}

function createCompactFooter(siteFooterHtml) {
  const sharedOpeningTag = '<footer class="site-footer" data-site-footer>';
  const compactOpeningTag = '<footer class="site-footer site-footer--compact" data-site-footer>';
  const openingTagCount = siteFooterHtml.split(sharedOpeningTag).length - 1;
  if (openingTagCount !== 1) {
    throw new Error('404 compact footer requires exactly one rendered shared footer opening tag');
  }
  return siteFooterHtml.replace(sharedOpeningTag, compactOpeningTag);
}

export async function renderNotFoundPage({
  rootDir,
  outputDir,
  environment,
  categories,
  siteFooterHtml,
  consentManagerHtml,
  backToTopHtml
}) {
  const templatePath = path.join(rootDir, NOT_FOUND_PAGE.sourceTemplate);
  const template = await readFile(templatePath, 'utf8');
  const popularCategories = selectNotFoundPopularCategories(categories);
  const compactFooterHtml = createCompactFooter(siteFooterHtml);

  const html = replaceTemplateTokens(
    template,
    {
      DEPLOYMENT_ENV: escapeHtml(environment),
      ROBOTS_DIRECTIVE: escapeHtml(NOT_FOUND_PAGE.robotsDirective),
      PAGE_DESCRIPTION: escapeHtml(NOT_FOUND_PAGE.description),
      PAGE_TITLE: escapeHtml(NOT_FOUND_PAGE.title),
      ERROR_EYEBROW: escapeHtml(NOT_FOUND_PAGE.eyebrow),
      ERROR_HEADING: escapeHtml(NOT_FOUND_PAGE.heading),
      ERROR_COPY: escapeHtml(NOT_FOUND_PAGE.copy),
      PRIMARY_ACTION_ROUTE: escapeHtml(NOT_FOUND_PAGE.primaryAction.route),
      PRIMARY_ACTION_LABEL: escapeHtml(NOT_FOUND_PAGE.primaryAction.label),
      SECONDARY_ACTION_ROUTE: escapeHtml(NOT_FOUND_PAGE.secondaryAction.route),
      SECONDARY_ACTION_LABEL: escapeHtml(NOT_FOUND_PAGE.secondaryAction.label),
      SEARCH_ACTION: escapeHtml(NOT_FOUND_PAGE.search.action),
      SEARCH_METHOD: escapeHtml(NOT_FOUND_PAGE.search.method),
      SEARCH_PARAMETER: escapeHtml(NOT_FOUND_PAGE.search.parameter),
      SEARCH_PLACEHOLDER: escapeHtml(NOT_FOUND_PAGE.search.placeholder),
      POPULAR_HEADING: escapeHtml(NOT_FOUND_PAGE.popularHeading),
      POPULAR_CATEGORY_LINKS: renderPopularCategoryLinks(popularCategories),
      CONTACT_ROUTE: escapeHtml(NOT_FOUND_PAGE.contactRoute),
      SITE_FOOTER: compactFooterHtml,
      CONSENT_MANAGER: consentManagerHtml,
      BACK_TO_TOP: backToTopHtml
    },
    NOT_FOUND_PAGE.sourceTemplate
  );

  const outputPath = path.join(outputDir, NOT_FOUND_PAGE.outputFile);
  await writeFile(outputPath, html);

  const manifest = {
    module: NOT_FOUND_PAGE.module,
    routeType: 'host-level-error-document',
    outputFile: NOT_FOUND_PAGE.outputFile,
    sourceTemplate: NOT_FOUND_PAGE.sourceTemplate,
    httpStatusForUnknownRoutes: 404,
    directDocumentStatus: 200,
    robotsDirective: NOT_FOUND_PAGE.robotsDirective,
    canonicalUrl: null,
    sitemapEligible: false,
    structuredDataIncluded: false,
    socialMetadataIncluded: false,
    advertisingPolicy: 'omitted',
    search: { ...NOT_FOUND_PAGE.search },
    contactRoute: NOT_FOUND_PAGE.contactRoute,
    popularCategoryCount: resolveNotFoundPopularCategoryCount(categories),
    popularCategories: popularCategories.map((category) => ({ ...category })),
    compactSharedFooter: true,
    activeNavigationItem: null
  };
  const manifestPath = path.join(outputDir, NOT_FOUND_PAGE.manifestFile);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return Object.freeze({
    key: NOT_FOUND_PAGE.key,
    outputPath,
    manifestPath,
    title: NOT_FOUND_PAGE.title,
    popularCategories,
    httpStatusForUnknownRoutes: 404
  });
}
