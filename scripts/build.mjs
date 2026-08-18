import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadCategories,
  loadPublishedArticles,
  readJpegDimensions,
  selectHomeContent,
  selectLatestArticles
} from './content-graph.mjs';
import {
  ARTICLES_AD_INSERT_AFTER,
  ARTICLES_PAGE_SIZE,
  createArticlesPagination
} from './articles-page.mjs';
import {
  CATEGORY_AD_INSERT_AFTER,
  CATEGORY_PAGE_SIZE,
  createAllCategoryPages,
  createCategoryFeedSequence,
  createCategoryRoute
} from './category-pages.mjs';
import {
  ARTICLE_DISCLAIMER,
  ARTICLE_MID_AD_AFTER_SECTIONS,
  ARTICLE_RELATED_LIMIT,
  createArticlePageModels,
  renderArticleMarkdown
} from './article-pages.mjs';
import {
  loadSiteSettings,
  resolveActiveSocialProfiles,
  resolveAdFeatureState,
  resolveConsentFeatureState,
  resolveNewsletterFeatureState
} from './site-settings.mjs';
import {
  createSearchIndex,
  SEARCH_INDEX_PUBLIC_PATH
} from './generate-search-index.mjs';
import {
  ABOUT_PAGE,
  EDITORIAL_POLICY_PAGE,
  TRUST_PAGES,
  TRUST_PAGE_MODIFICATION_DATE,
  TRUST_PAGE_PUBLICATION_DATE,
  canonicalTrustPageUrl,
  createAboutPageStructuredData,
  createEditorialPolicyStructuredData,
  resolveRobotsDirective,
  serializeStructuredData
} from './trust-pages.mjs';
import { renderContactPage } from './render-contact-page.mjs';
import { renderPrivacyPolicyPage } from './render-privacy-policy.mjs';
import { renderLegalDisclaimerPage } from './render-legal-disclaimer.mjs';
import { renderNotFoundPage } from './render-not-found-page.mjs';
import {
  createAnalyticsManifest,
  createAnalyticsRuntimeSource,
  resolveAnalyticsFeatureState
} from './analytics.mjs';
import {
  createAdsTxt,
  createAdvertisingManifest,
  createAdvertisingRuntimeSource
} from './advertising.mjs';
import {
  createCmsAuthManifest,
  renderCmsAdminShell,
  resolveBuildCmsCompanionOrigin
} from './cms-auth.mjs';
import { validateArticleDisclaimerPartial } from './legal-disclaimer.mjs';
import { CONTACT_SUBJECTS } from './contact-page.mjs';
import {
  LEGACY_REDIRECT_POLICY,
  SEO_POLICY,
  canonicalSeoUrl,
  createHomeStructuredData,
  createOrganizationStructuredData,
  createSeoMetadata,
  serializeSeoStructuredData,
  truncateSeoDescription
} from './seo.mjs';
import {
  PERMANENT_NOINDEX_ROBOTS_HEADER,
  PREVIEW_ROBOTS_HEADER,
  SITEMAP_POLICY,
  createSitemapDocument,
  renderRobotsTxt,
  resolveArticleSitemapLastmod
} from './sitemap-robots.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const outputDirectory = process.env.LAWSCOPE_OUTPUT_DIR
  ? path.resolve(process.env.LAWSCOPE_OUTPUT_DIR)
  : path.join(projectRoot, 'generated');
const deploymentEnvironment = process.env.VERCEL_ENV || 'development';

const publicPaths = [
  'admin',
  'assets',
  'css',
  'js',
  'pages'
];

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderTemplate(template, values, { rawKeys = [] } = {}) {
  const rawKeySet = new Set(rawKeys);
  const renderedTemplate = Object.entries(values).reduce(
    (rendered, [key, value]) =>
      rendered.replaceAll(
        `{{${key}}}`,
        rawKeySet.has(key) ? String(value) : escapeHtml(value)
      ),
    template
  );
  const unresolvedTokens = renderedTemplate.match(/{{[A-Z0-9_]+}}/g);
  if (unresolvedTokens) {
    throw new Error(`Unresolved template tokens: ${unresolvedTokens.join(', ')}`);
  }
  return renderedTemplate;
}

function formatPublishDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

async function getLocalImageDimensions(article) {
  const imageRelativePath = article.featured_image.replace(/^\//, '');
  if (!imageRelativePath.startsWith('assets/images/')) {
    throw new Error(`${article.sourceFile}: featured_image must be stored in /assets/images/`);
  }
  return readJpegDimensions(path.join(projectRoot, imageRelativePath));
}

async function getLocalSocialImageDimensions(article) {
  const imageRelativePath = article.social_image.replace(/^\//, '');
  if (!imageRelativePath.startsWith('assets/images/')) {
    throw new Error(`${article.sourceFile}: social_image must be stored in /assets/images/`);
  }
  const dimensions = await readJpegDimensions(path.join(projectRoot, imageRelativePath));
  if (dimensions.width !== 1200 || dimensions.height !== 630) {
    throw new Error(`${article.sourceFile}: social_image must be exactly 1200 × 630 pixels`);
  }
  return dimensions;
}

function renderArticleTableOfContents(headings) {
  return headings
    .filter((heading) => heading.depth === 2 || heading.depth === 3)
    .map(
      (heading) => `<li class="article-toc__item article-toc__item--depth-${heading.depth}">
      <a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>
    </li>`
    )
    .join('\n');
}

function renderArticleSources(article) {
  return article.sources
    .map((source) => {
      const url = new URL(source.url);
      const sourceDetails = [
        source.publisher ? `<span>${escapeHtml(source.publisher)}</span>` : '',
        source.publication_date
          ? `<span>Published <time datetime="${escapeHtml(new Date(source.publication_date).toISOString())}">${escapeHtml(formatPublishDate(new Date(source.publication_date)))}</time></span>`
          : '',
        source.access_date
          ? `<span>Accessed <time datetime="${escapeHtml(new Date(source.access_date).toISOString())}">${escapeHtml(formatPublishDate(new Date(source.access_date)))}</time></span>`
          : ''
      ].filter(Boolean).join('<span aria-hidden="true"> · </span>');
      return `<li class="article-sources__item">
      <a
        href="${escapeHtml(url.href)}"
        rel="external noreferrer"
        referrerpolicy="strict-origin-when-cross-origin"
        aria-label="Visit ${escapeHtml(source.label)} on ${escapeHtml(url.hostname)} (external website)"
      >
        <span>${escapeHtml(source.label)}</span>
        <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
      </a>
      <span class="article-sources__destination">${escapeHtml(url.hostname)}</span>
      ${sourceDetails ? `<span class="article-sources__details">${sourceDetails}</span>` : ''}
    </li>`;
    })
    .join('\n');
}

function renderArticleTags(article) {
  return article.tags
    .map((tag) => {
      const route = `/articles/?q=${encodeURIComponent(tag)}`;
      return `<li><a href="${escapeHtml(route)}" rel="nofollow">${escapeHtml(tag)}</a></li>`;
    })
    .join('\n');
}

function renderArticleShareActions(article, articleUrl) {
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(article.title);
  return `<a class="article-share__action" href="https://x.com/intent/post?url=${encodedUrl}&amp;text=${encodedTitle}" target="_blank" rel="noopener noreferrer external">
    <i class="fa-brands fa-x-twitter" aria-hidden="true"></i>
    <span>Share on X</span>
  </a>
  <a class="article-share__action" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener noreferrer external">
    <i class="fa-brands fa-facebook-f" aria-hidden="true"></i>
    <span>Share on Facebook</span>
  </a>
  <a class="article-share__action" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener noreferrer external">
    <i class="fa-brands fa-linkedin-in" aria-hidden="true"></i>
    <span>Share on LinkedIn</span>
  </a>
  <button class="article-share__action" type="button" data-copy-link>
    <i class="fa-regular fa-copy" aria-hidden="true"></i>
    <span>Copy Link</span>
  </button>
  <button class="article-share__action" type="button" data-native-share hidden>
    <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
    <span>Share</span>
  </button>`;
}

function renderArticleOpenGraphTags(tags) {
  return tags
    .map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}">`)
    .join('\n    ');
}

function renderArticleStructuredData(model, articleSeo) {
  const { article, category } = model;
  const articleUrl = articleSeo.canonicalUrl;
  const publishedDate = new Date(article.publish_date).toISOString();
  const modifiedDate = article.updated_date
    ? new Date(article.updated_date).toISOString()
    : publishedDate;
  const publisher = createOrganizationStructuredData(siteSettings);

  return serializeSeoStructuredData({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${articleUrl}#article`,
        headline: article.title,
        description: articleSeo.description,
        url: articleUrl,
        mainEntityOfPage: articleUrl,
        image: {
          '@type': 'ImageObject',
          url: articleSeo.socialImageUrl,
          width: 1200,
          height: 630,
          caption: articleSeo.socialImageAlt
        },
        datePublished: publishedDate,
        dateModified: modifiedDate,
        wordCount: article.wordCount,
        author: {
          '@type': 'Organization',
          '@id': `${canonicalUrl('/about/')}#editorial-team`,
          name: article.author,
          url: canonicalUrl('/about/')
        },
        publisher: { '@id': publisher['@id'] },
        articleSection: category.name,
        keywords: article.tags,
        isAccessibleForFree: true,
        inLanguage: SEO_POLICY.siteLanguage
      },
      publisher,
      {
        '@type': 'BreadcrumbList',
        '@id': `${articleUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
          {
            '@type': 'ListItem',
            position: 2,
            name: category.name,
            item: canonicalUrl(category.route)
          },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl }
        ]
      }
    ]
  });
}

function renderArticleImageCaption(article) {
  const parts = [article.image_caption, article.image_credit].filter(Boolean);
  if (parts.length === 0) return '';
  return `<figcaption>${parts.map((part) => escapeHtml(part)).join(' · ')}</figcaption>`;
}

function renderArticleUpdatedMetadata(article) {
  if (!article.updated_date) return { meta: '', note: '' };
  const updatedDate = new Date(article.updated_date);
  const updatedIso = updatedDate.toISOString();
  const updatedDisplay = formatPublishDate(updatedDate);
  return {
    meta: `<span class="article-detail__meta-separator" aria-hidden="true">·</span>
              <span class="article-detail__meta-item">Last updated <time datetime="${escapeHtml(updatedIso)}">${escapeHtml(updatedDisplay)}</time></span>`,
    note: `<p class="article-detail__update-note">This article was reviewed and updated to reflect sources available on <time datetime="${escapeHtml(updatedIso)}">${escapeHtml(updatedDisplay)}</time>.</p>`
  };
}

function renderArticleAdSlot(template, article, position, adFeatureState) {
  const unitKey = `article_${position}`;
  return renderTemplate(template, {
    ARTICLE_SLUG: article.slug,
    ARTICLE_AD_POSITION: position,
    ARTICLE_AD_UNIT_KEY: unitKey,
    ARTICLE_AD_DESKTOP_ONLY: String(position === 'sidebar'),
    AD_FEATURE_ENABLED: String(adFeatureState.enabled),
    AD_PROVIDER: adFeatureState.provider,
    AD_INITIAL_STATE: adFeatureState.initialState,
    AD_HIDDEN_ATTRIBUTE: adFeatureState.hidden ? 'hidden' : ''
  });
}

async function renderArticleCard(articleCardTemplate, article) {
  const imageDimensions = await getLocalImageDimensions(article);
  const publishDate = new Date(article.publish_date);
  const updatedDate = article.updated_date ? new Date(article.updated_date) : null;
  if (updatedDate && !Number.isFinite(updatedDate.getTime())) {
    throw new Error(`${article.sourceFile}: updated_date must be a valid date when provided`);
  }
  return renderTemplate(articleCardTemplate, {
    ARTICLE_SLUG: article.slug,
    ARTICLE_TITLE: article.title,
    ARTICLE_EXCERPT: article.excerpt,
    ARTICLE_TAGS: Array.isArray(article.tags) ? article.tags.join(' ') : '',
    CATEGORY_SLUG: article.category,
    CATEGORY_NAME: article.categoryName,
    AUTHOR: article.author,
    READING_TIME: article.readingTime,
    PUBLISH_DATE_ISO: publishDate.toISOString(),
    PUBLISH_DATE_DISPLAY: formatPublishDate(publishDate),
    UPDATED_DATE_ISO: updatedDate ? updatedDate.toISOString() : '',
    IMAGE_SOURCE: article.featured_image,
    IMAGE_WIDTH: imageDimensions.width,
    IMAGE_HEIGHT: imageDimensions.height,
    IMAGE_ALT: article.featured_image_alt
  });
}

function renderCategoryTile(categoryTileTemplate, category) {
  return renderTemplate(categoryTileTemplate, {
    CATEGORY_SLUG: category.slug,
    CATEGORY_NAME: category.name,
    CATEGORY_DESCRIPTION: category.description,
    CATEGORY_ICON: category.icon
  });
}

function canonicalUrl(route) {
  return canonicalSeoUrl(route);
}

function renderArticlesBreadcrumb(pageNumber) {
  if (pageNumber === 1) {
    return '<li class="breadcrumb__item" aria-current="page">Articles</li>';
  }
  return `<li class="breadcrumb__item"><a href="/articles/">Articles</a></li>
            <li class="breadcrumb__item" aria-current="page">Page ${pageNumber}</li>`;
}

function renderArticlesCategoryOptions(categories) {
  return categories
    .map(
      (category) =>
        `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</option>`
    )
    .join('\n');
}

function renderArticlesEmptyState(categories) {
  const categoryLinks = categories
    .map(
      (category) =>
        `<li><a href="${escapeHtml(category.route)}">${escapeHtml(category.name)}</a></li>`
    )
    .join('\n');

  return `<section class="article-library__empty" aria-labelledby="article-empty-title" data-article-empty-state>
    <i class="article-library__empty-icon fa-regular fa-folder-open" aria-hidden="true"></i>
    <h3 id="article-empty-title" tabindex="-1">No articles match these filters</h3>
    <p>We could not find an article matching those filters. Try a broader phrase, clear the filters, or browse all categories.</p>
    <div class="article-library__empty-actions">
      <a class="button button--primary" href="/articles/" data-article-filter-reset>Reset and show all articles</a>
      <a class="button button--secondary" href="/categories/">Browse category overviews</a>
    </div>
    <nav class="article-library__empty-categories" aria-label="Browse legal categories">
      <ul role="list">${categoryLinks}</ul>
    </nav>
  </section>`;
}

function renderArticlesPagination(page) {
  const previousControl = page.previousRoute
    ? `<a class="article-pagination__control" href="${page.previousRoute}" rel="prev">
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
        <span>Previous page</span>
      </a>`
    : `<span class="article-pagination__control article-pagination__control--disabled" aria-disabled="true">
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
        <span>Previous page</span>
      </span>`;
  const nextControl = page.nextRoute
    ? `<a class="article-pagination__control" href="${page.nextRoute}" rel="next">
        <span>Next page</span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </a>`
    : `<span class="article-pagination__control article-pagination__control--disabled" aria-disabled="true">
        <span>Next page</span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </span>`;
  const pageLinks = Array.from({ length: page.totalPages }, (_, index) => {
    const pageNumber = index + 1;
    const route = pageNumber === 1 ? '/articles/' : `/articles/page/${pageNumber}/`;
    return pageNumber === page.pageNumber
      ? `<li><a href="${route}" aria-current="page" aria-label="Page ${pageNumber}, current page">${pageNumber}</a></li>`
      : `<li><a href="${route}" aria-label="Go to page ${pageNumber}">${pageNumber}</a></li>`;
  }).join('\n');

  return `<nav class="article-pagination" aria-label="Articles pagination">
    ${previousControl}
    <ol class="article-pagination__pages" role="list">${pageLinks}</ol>
    ${nextControl}
  </nav>`;
}

function renderPaginationHeadLinks(page) {
  return [
    page.previousRoute
      ? `<link rel="prev" href="${canonicalUrl(page.previousRoute)}">`
      : '',
    page.nextRoute
      ? `<link rel="next" href="${canonicalUrl(page.nextRoute)}">`
      : ''
  ].filter(Boolean).join('\n    ');
}

function renderCategoriesStructuredData(categories, pageSeo) {
  const pageUrl = pageSeo.canonicalUrl;
  const pageDescription = pageSeo.description;

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Explore Legal Topics',
    description: pageDescription,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Lawscope',
      url: canonicalUrl('/')
    },
    publisher: createOrganizationStructuredData(siteSettings),
    inLanguage: SEO_POLICY.siteLanguage,
    about: {
      '@type': 'Thing',
      name: 'United States law'
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Categories', item: pageUrl }
      ]
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: categories.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: categories.map((category, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: canonicalUrl(category.route),
        name: category.name,
        description: category.description
      }))
    }
  }).replaceAll('<', '\\u003c');
}

function createCategoryMetadataDescription(page) {
  const prefix = page.pageNumber === 1
    ? `Explore plain-English ${page.category.name} guides from Lawscope.`
    : `Browse page ${page.pageNumber} of Lawscope’s ${page.category.name} guides.`;
  return truncateSeoDescription(`${prefix} ${page.category.description}`);
}

function renderCategoryBreadcrumb(page) {
  const categoryName = escapeHtml(page.category.name);
  const categoryRoute = escapeHtml(page.category.route);
  if (page.pageNumber === 1) {
    return `<li class="breadcrumb__item" aria-current="page">${categoryName}</li>`;
  }
  return `<li class="breadcrumb__item"><a href="${categoryRoute}">${categoryName}</a></li>
            <li class="breadcrumb__item" aria-current="page">Page ${page.pageNumber}</li>`;
}

async function renderCategoryFeaturedArticle(featuredTemplate, article) {
  if (!article) return '';
  const imageDimensions = await getLocalImageDimensions(article);
  const publishDate = new Date(article.publish_date);
  return renderTemplate(featuredTemplate, {
    ARTICLE_SLUG: article.slug,
    ARTICLE_TITLE: article.title,
    ARTICLE_EXCERPT: article.excerpt,
    CATEGORY_NAME: article.categoryName,
    AUTHOR: article.author,
    READING_TIME: article.readingTime,
    PUBLISH_DATE_ISO: publishDate.toISOString(),
    PUBLISH_DATE_DISPLAY: formatPublishDate(publishDate),
    IMAGE_SOURCE: article.featured_image,
    IMAGE_WIDTH: imageDimensions.width,
    IMAGE_HEIGHT: imageDimensions.height,
    IMAGE_ALT: article.featured_image_alt
  });
}

async function renderCategoryFeed(page, articleCardTemplate, categoryAdSlotHtml, emptyStateHtml) {
  if (page.items.length === 0) return emptyStateHtml;
  const sequence = createCategoryFeedSequence(page.items);
  const entries = await Promise.all(
    sequence.map((entry) => entry.type === 'advertisement'
      ? categoryAdSlotHtml
      : renderArticleCard(articleCardTemplate, entry.article))
  );
  return entries.join('\n');
}

function renderCategoryRelated(relatedTemplate, page) {
  const links = page.relatedCategories
    .map(
      (category) => `<li class="category-related__item">
      <a class="category-related__link" href="${escapeHtml(category.route)}">
        <span class="category-related__icon" aria-hidden="true"><i class="fa-solid ${escapeHtml(category.icon)}"></i></span>
        <span>${escapeHtml(category.name)}</span>
      </a>
    </li>`
    )
    .join('\n');
  return renderTemplate(
    relatedTemplate,
    { RELATED_CATEGORY_LINKS: links },
    { rawKeys: ['RELATED_CATEGORY_LINKS'] }
  );
}

function renderCategoryPagination(page) {
  if (page.totalPages <= 1) return '';
  const categorySlug = page.category.slug;
  const categoryName = escapeHtml(page.category.name);
  const previousControl = page.previousRoute
    ? `<a class="article-pagination__control" href="${escapeHtml(page.previousRoute)}" rel="prev">
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
        <span>Previous page</span>
      </a>`
    : `<span class="article-pagination__control article-pagination__control--disabled" aria-disabled="true">
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
        <span>Previous page</span>
      </span>`;
  const nextControl = page.nextRoute
    ? `<a class="article-pagination__control" href="${escapeHtml(page.nextRoute)}" rel="next">
        <span>Next page</span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </a>`
    : `<span class="article-pagination__control article-pagination__control--disabled" aria-disabled="true">
        <span>Next page</span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </span>`;
  const pageLinks = Array.from({ length: page.totalPages }, (_, index) => {
    const pageNumber = index + 1;
    const route = createCategoryRoute(categorySlug, pageNumber);
    return pageNumber === page.pageNumber
      ? `<li><a href="${escapeHtml(route)}" aria-current="page" aria-label="Page ${pageNumber}, current page">${pageNumber}</a></li>`
      : `<li><a href="${escapeHtml(route)}" aria-label="Go to page ${pageNumber}">${pageNumber}</a></li>`;
  }).join('\n');

  return `<nav class="article-pagination category-library__pagination" aria-label="${categoryName} guides pagination">
    ${previousControl}
    <ol class="article-pagination__pages" role="list">${pageLinks}</ol>
    ${nextControl}
  </nav>`;
}

function renderCategoryStructuredData(page, pageDescription) {
  const pageUrl = canonicalUrl(page.route);
  const itemPositionOffset = (page.pageNumber - 1) * CATEGORY_PAGE_SIZE;
  const breadcrumbElements = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
    { '@type': 'ListItem', position: 2, name: 'Categories', item: canonicalUrl('/categories/') },
    {
      '@type': 'ListItem',
      position: 3,
      name: page.category.name,
      item: canonicalUrl(page.category.route)
    }
  ];
  if (page.pageNumber > 1) {
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 4,
      name: `Page ${page.pageNumber}`,
      item: pageUrl
    });
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.pageNumber === 1
      ? `${page.category.name} Articles & Guides`
      : `${page.category.name} Articles & Guides – Page ${page.pageNumber}`,
    description: pageDescription,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Lawscope',
      url: canonicalUrl('/')
    },
    publisher: createOrganizationStructuredData(siteSettings),
    inLanguage: SEO_POLICY.siteLanguage,
    about: {
      '@type': 'Thing',
      name: page.category.name,
      description: page.category.description
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbElements
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: page.visibleArticles.length,
      itemListOrder: page.featuredArticle
        ? 'https://schema.org/ItemListUnordered'
        : 'https://schema.org/ItemListOrderDescending',
      itemListElement: page.visibleArticles.map((article, index) => ({
        '@type': 'ListItem',
        position: itemPositionOffset + index + 1,
        item: {
          '@type': 'Article',
          headline: article.title,
          url: canonicalUrl(`/articles/${article.slug}/`),
          datePublished: new Date(article.publish_date).toISOString(),
          author: {
            '@type': 'Person',
            name: article.author
          }
        }
      }))
    }
  }).replaceAll('<', '\\u003c');
}

function renderCategoryNewsletter(newsletterHtml, category) {
  return newsletterHtml
    .replace(
      'Understand the Law, One Clear Guide at a Time',
      `Keep Up with ${escapeHtml(category.name)}`
    )
    .replace(
      'Get new Lawscope explainers and important editorial updates in your inbox. No case advice, no daily noise, and you can unsubscribe at any time.',
      `Get new Lawscope explainers about ${escapeHtml(category.name)} and important editorial updates in your inbox. No case advice, no daily noise, and you can unsubscribe at any time.`
    );
}

function renderArticlesStructuredData(page, pageSeo) {
  const pageUrl = pageSeo.canonicalUrl;
  const itemListElements = page.items.map((article, index) => ({
    '@type': 'ListItem',
    position: page.firstItemNumber + index,
    url: canonicalUrl(`/articles/${article.slug}/`),
    name: article.title
  }));
  const breadcrumbElements = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
    { '@type': 'ListItem', position: 2, name: 'Articles', item: canonicalUrl('/articles/') }
  ];
  if (page.pageNumber > 1) {
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 3,
      name: `Page ${page.pageNumber}`,
      item: pageUrl
    });
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.pageNumber === 1 ? 'Law Articles' : `Law Articles – Page ${page.pageNumber}`,
    description: pageSeo.description,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${canonicalUrl('/')}#website`,
      name: 'Lawscope',
      url: canonicalUrl('/')
    },
    publisher: createOrganizationStructuredData(siteSettings),
    inLanguage: SEO_POLICY.siteLanguage,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbElements
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: page.items.length,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: itemListElements
    }
  }).replaceAll('<', '\\u003c');
}

async function renderArticlesFeed(page, articleCardTemplate, articlesAdSlotHtml, categories) {
  if (page.items.length === 0) return renderArticlesEmptyState(categories);

  const cardHtml = await Promise.all(
    page.items.map((article) => renderArticleCard(articleCardTemplate, article))
  );
  if (cardHtml.length > ARTICLES_AD_INSERT_AFTER) {
    cardHtml.splice(ARTICLES_AD_INSERT_AFTER, 0, articlesAdSlotHtml);
  }
  return cardHtml.join('\n');
}

function outputPathForRoute(route) {
  return path.join(outputDirectory, route.replace(/^\//, ''), 'index.html');
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const publicPath of publicPaths) {
  const source = path.join(projectRoot, publicPath);
  const destination = path.join(outputDirectory, publicPath);

  if (await exists(source)) {
    await cp(source, destination, { recursive: true });
  }
}

const cmsCompanionOrigin = resolveBuildCmsCompanionOrigin(process.env);
const generatedAdminPath = path.join(outputDirectory, 'admin/index.html');
const generatedAdminSource = await readFile(generatedAdminPath, 'utf8');
await writeFile(
  generatedAdminPath,
  renderCmsAdminShell(generatedAdminSource, cmsCompanionOrigin),
  'utf8'
);

const buildDate = new Date();
const [publishedArticles, categories, siteSettings] = await Promise.all([
  loadPublishedArticles(projectRoot, buildDate),
  loadCategories(projectRoot),
  loadSiteSettings(projectRoot)
]);
const searchIndex = createSearchIndex(publishedArticles, { buildDate });
const homeContent = selectHomeContent(publishedArticles);
const activeSocialProfiles = resolveActiveSocialProfiles(siteSettings);
const adFeatureState = resolveAdFeatureState(
  siteSettings,
  deploymentEnvironment,
  process.env
);
const consentFeatureState = resolveConsentFeatureState(siteSettings);
const newsletterFeatureState = resolveNewsletterFeatureState(siteSettings);
const analyticsFeatureState = resolveAnalyticsFeatureState(
  siteSettings,
  deploymentEnvironment,
  process.env
);
await mkdir(path.join(outputDirectory, 'data'), { recursive: true });
await writeFile(
  path.join(outputDirectory, 'data', 'cms-auth-manifest.json'),
  `${JSON.stringify(
    createCmsAuthManifest({
      deploymentEnvironment,
      companionOrigin: cmsCompanionOrigin
    }),
    null,
    2
  )}\n`,
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'js', 'analytics-config.js'),
  createAnalyticsRuntimeSource(analyticsFeatureState),
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'data', 'analytics-manifest.json'),
  `${JSON.stringify(createAnalyticsManifest(analyticsFeatureState), null, 2)}\n`,
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'js', 'adsense-config.js'),
  createAdvertisingRuntimeSource(adFeatureState),
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'data', 'advertising-manifest.json'),
  `${JSON.stringify(createAdvertisingManifest(adFeatureState), null, 2)}\n`,
  'utf8'
);
if (adFeatureState.enabled) {
  await writeFile(path.join(outputDirectory, 'ads.txt'), createAdsTxt(adFeatureState), 'utf8');
}
if (!homeContent.hero) throw new Error('No eligible published article is available for the home hero.');

const hero = homeContent.hero;
const heroImageDimensions = await getLocalImageDimensions(hero);
const heroTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/home-hero.html'),
  'utf8'
);
const heroPublishDate = new Date(hero.publish_date);
const heroHtml = renderTemplate(heroTemplate, {
  HERO_SLUG: hero.slug,
  CATEGORY_SLUG: hero.category,
  CATEGORY_NAME: hero.categoryName,
  HERO_TITLE: hero.title,
  HERO_EXCERPT: hero.excerpt,
  READING_TIME: hero.readingTime,
  PUBLISH_DATE_ISO: heroPublishDate.toISOString(),
  PUBLISH_DATE_DISPLAY: formatPublishDate(heroPublishDate),
  IMAGE_SOURCE: hero.featured_image,
  IMAGE_WIDTH: heroImageDimensions.width,
  IMAGE_HEIGHT: heroImageDimensions.height,
  IMAGE_ALT: hero.featured_image_alt
});

const featuredArticles = homeContent.featuredGridCandidates.slice(0, 3);
const latestExclusionSlugs = [
  hero.slug,
  ...featuredArticles.map((article) => article.slug)
];
const latestArticles = selectLatestArticles(publishedArticles, {
  excludeSlugs: latestExclusionSlugs,
  limit: 6
});
const latestRepeatedSlugs = latestArticles
  .filter((article) => latestExclusionSlugs.includes(article.slug))
  .map((article) => article.slug);
const articleCardTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/article-card.html'),
  'utf8'
);
const featuredCardHtml = await Promise.all(
  featuredArticles.map((article) => renderArticleCard(articleCardTemplate, article))
);
const featuredCardsMarkup = featuredCardHtml.length > 0
  ? featuredCardHtml.join('\n')
  : '<p class="featured-articles__empty">New featured guides are being prepared. Browse all articles for the latest published information.</p>';
const featuredSectionTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/home-featured.html'),
  'utf8'
);
const featuredSectionHtml = renderTemplate(
  featuredSectionTemplate,
  {
    FEATURED_COUNT: featuredArticles.length,
    FEATURED_CARDS: featuredCardsMarkup
  },
  { rawKeys: ['FEATURED_CARDS'] }
);

const adSlotTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/ad-slot-horizontal.html'),
  'utf8'
);
const adSlotHtml = renderTemplate(adSlotTemplate, {
  AD_FEATURE_ENABLED: String(adFeatureState.enabled),
  AD_PROVIDER: adFeatureState.provider,
  AD_INITIAL_STATE: adFeatureState.initialState,
  AD_HIDDEN_ATTRIBUTE: adFeatureState.hidden ? 'hidden' : ''
});

const latestCardHtml = await Promise.all(
  latestArticles.map((article) => renderArticleCard(articleCardTemplate, article))
);
const latestCardsMarkup = latestCardHtml.length > 0
  ? latestCardHtml.join('\n')
  : '<p class="latest-articles__empty">No legal guides are currently available. Please check back after new articles are published.</p>';
const latestSectionTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/home-latest.html'),
  'utf8'
);
const latestSectionHtml = renderTemplate(
  latestSectionTemplate,
  {
    LATEST_COUNT: latestArticles.length,
    LATEST_CARDS: latestCardsMarkup
  },
  { rawKeys: ['LATEST_CARDS'] }
);

const categoryTileTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/category-tile.html'),
  'utf8'
);
const categoryTilesMarkup = categories
  .map((category) => renderCategoryTile(categoryTileTemplate, category))
  .join('\n');
const categoriesSectionTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/home-categories.html'),
  'utf8'
);
const categoriesSectionHtml = renderTemplate(
  categoriesSectionTemplate,
  {
    CATEGORY_COUNT: categories.length,
    CATEGORY_TILES: categoryTilesMarkup
  },
  { rawKeys: ['CATEGORY_TILES'] }
);

const newsletterSectionTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/home-newsletter.html'),
  'utf8'
);
const newsletterEnabled = newsletterFeatureState.enabled;
const newsletterSectionHtml = renderTemplate(
  newsletterSectionTemplate,
  {
    NEWSLETTER_INITIAL_STATE: newsletterFeatureState.initialState,
    NEWSLETTER_ENABLED: String(newsletterEnabled),
    NEWSLETTER_PROVIDER: newsletterFeatureState.provider,
    NEWSLETTER_ACTION_ATTRIBUTE: newsletterEnabled
      ? `action="${escapeHtml(newsletterFeatureState.endpoint)}"`
      : '',
    NEWSLETTER_NAME_ATTRIBUTE: newsletterEnabled ? 'name="email" required' : '',
    NEWSLETTER_DISABLED_ATTRIBUTE: newsletterEnabled ? '' : 'disabled',
    NEWSLETTER_STATUS_HIDDEN_ATTRIBUTE: newsletterEnabled ? 'hidden' : '',
    NEWSLETTER_INITIAL_STATUS: newsletterEnabled
      ? ''
      : 'Newsletter signup is not available yet. No email address will be sent or stored.'
  },
  {
    rawKeys: [
      'NEWSLETTER_ACTION_ATTRIBUTE',
      'NEWSLETTER_NAME_ATTRIBUTE',
      'NEWSLETTER_DISABLED_ATTRIBUTE',
      'NEWSLETTER_STATUS_HIDDEN_ATTRIBUTE'
    ]
  }
);

const footerCategoryLinksMarkup = categories
  .map(
    (category) =>
      `<li><a href="/categories/${escapeHtml(category.slug)}/">${escapeHtml(category.name)}</a></li>`
  )
  .join('\n');
const footerSocialSectionMarkup = activeSocialProfiles.length > 0
  ? `<nav class="site-footer__social" aria-labelledby="footer-social-title">
      <h2 class="site-footer__heading" id="footer-social-title">Follow Lawscope</h2>
      <ul class="site-footer__social-links" role="list">
        ${activeSocialProfiles
          .map(
            (profile) =>
              `<li>
            <a href="${escapeHtml(profile.url)}" rel="me noreferrer" aria-label="${escapeHtml(profile.label)}">
              <i class="${escapeHtml(profile.icon)}" aria-hidden="true"></i>
              <span class="visually-hidden">${escapeHtml(profile.label)}</span>
            </a>
          </li>`
          )
          .join('\n')}
      </ul>
    </nav>`
  : '';
const footerTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/site-footer.html'),
  'utf8'
);
const footerYear = new Date().getUTCFullYear();
const footerHtml = renderTemplate(
  footerTemplate,
  {
    SITE_TITLE: siteSettings.site_title.trim(),
    SITE_TAGLINE: siteSettings.site_tagline.trim(),
    FOOTER_CATEGORY_LINKS: footerCategoryLinksMarkup,
    FOOTER_SOCIAL_SECTION: footerSocialSectionMarkup,
    CURRENT_YEAR: footerYear
  },
  { rawKeys: ['FOOTER_CATEGORY_LINKS', 'FOOTER_SOCIAL_SECTION'] }
);

const consentTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/consent-manager.html'),
  'utf8'
);
const consentHtml = renderTemplate(consentTemplate, {
  CONSENT_MODE: consentFeatureState.mode,
  CONSENT_PROVIDER: consentFeatureState.provider,
  CONSENT_REVISION: consentFeatureState.revision,
  CONSENT_GOOGLE_CERTIFIED_CMP: String(consentFeatureState.googleCertifiedCmp)
});

const backToTopHtml = await readFile(
  path.join(projectRoot, 'pages/partials/back-to-top.html'),
  'utf8'
);

const trustPageStructuredData = new Map([
  [ABOUT_PAGE.key, createAboutPageStructuredData(siteSettings)],
  [EDITORIAL_POLICY_PAGE.key, createEditorialPolicyStructuredData(siteSettings)]
]);
const robotsDirective = resolveRobotsDirective(deploymentEnvironment);
const homeSeo = createSeoMetadata({
  route: '/',
  title: SEO_POLICY.defaultTitle,
  description: SEO_POLICY.defaultDescription,
  socialImageAlt:
    'Abstract layered paper forms and connecting lines representing Lawscope’s plain-English legal-information guides.',
  deploymentEnvironment
});
const categoriesSeo = createSeoMetadata({
  route: '/categories/',
  title: 'Legal Topics & Categories | Lawscope',
  description:
    'Explore U.S. legal information by category, from criminal and family law to employment, consumer rights, and legal news.',
  socialImageAlt:
    'Abstract layered paper forms and connecting lines representing Lawscope’s legal topic library.',
  deploymentEnvironment
});
const homeStructuredData = serializeSeoStructuredData(createHomeStructuredData(siteSettings));
const renderedTrustPages = await Promise.all(
  TRUST_PAGES.map(async (page) => {
    const pageSeo = createSeoMetadata({
      route: page.route,
      title: page.title,
      description: page.description,
      socialImage: page.socialImage,
      socialImageAlt: page.socialImageAlt,
      deploymentEnvironment
    });
    const sourceHtml = await readFile(
      path.join(projectRoot, page.sourceTemplate),
      'utf8'
    );
    const renderedHtml = renderTemplate(
      sourceHtml,
      {
        DEPLOYMENT_ENV: deploymentEnvironment,
        ROBOTS_DIRECTIVE: pageSeo.robotsDirective,
        PAGE_TITLE: pageSeo.title,
        PAGE_DESCRIPTION: pageSeo.description,
        CANONICAL_URL: pageSeo.canonicalUrl,
        SOCIAL_IMAGE_URL: pageSeo.socialImageUrl,
        SOCIAL_IMAGE_ALT: pageSeo.socialImageAlt,
        PAGE_JSON_LD: serializeStructuredData(trustPageStructuredData.get(page.key)),
        POLICY_PUBLICATION_DATE: TRUST_PAGE_PUBLICATION_DATE,
        POLICY_PUBLICATION_DATE_DISPLAY: formatPublishDate(
          new Date(`${TRUST_PAGE_PUBLICATION_DATE}T00:00:00Z`)
        ),
        POLICY_MODIFICATION_DATE: TRUST_PAGE_MODIFICATION_DATE,
        POLICY_MODIFICATION_DATE_DISPLAY: formatPublishDate(
          new Date(`${TRUST_PAGE_MODIFICATION_DATE}T00:00:00Z`)
        ),
        ABOUT_NEWSLETTER: page.key === ABOUT_PAGE.key ? newsletterSectionHtml : '',
        SITE_FOOTER: footerHtml,
        CONSENT_MANAGER: consentHtml,
        BACK_TO_TOP: backToTopHtml
      },
      {
        rawKeys: [
          'PAGE_JSON_LD',
          'ABOUT_NEWSLETTER',
          'SITE_FOOTER',
          'CONSENT_MANAGER',
          'BACK_TO_TOP'
        ]
      }
    );

    return { page, seo: pageSeo, renderedHtml };
  })
);

const renderedContactPage = await renderContactPage({
  rootDir: projectRoot,
  outputDir: outputDirectory,
  environment: deploymentEnvironment,
  siteSettings,
  siteFooterHtml: footerHtml,
  consentManagerHtml: consentHtml,
  backToTopHtml
});

const renderedPrivacyPolicyPage = await renderPrivacyPolicyPage({
  rootDir: projectRoot,
  outputDir: outputDirectory,
  environment: deploymentEnvironment,
  siteSettings,
  siteFooterHtml: footerHtml,
  consentManagerHtml: consentHtml,
  backToTopHtml
});

const renderedLegalDisclaimerPage = await renderLegalDisclaimerPage({
  rootDir: projectRoot,
  outputDir: outputDirectory,
  environment: deploymentEnvironment,
  siteSettings,
  siteFooterHtml: footerHtml,
  consentManagerHtml: consentHtml,
  backToTopHtml
});

const renderedNotFoundPage = await renderNotFoundPage({
  rootDir: projectRoot,
  outputDir: outputDirectory,
  environment: deploymentEnvironment,
  categories,
  siteFooterHtml: footerHtml,
  consentManagerHtml: consentHtml,
  backToTopHtml
});

const categoriesSourceHtml = await readFile(
  path.join(projectRoot, 'pages/categories.html'),
  'utf8'
);
const categoryOverviewTileTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/category-overview-tile.html'),
  'utf8'
);
const categoryOverviewTilesHtml = categories
  .map((category) => renderCategoryTile(categoryOverviewTileTemplate, category))
  .join('\n');
const categoriesAdSlotTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/ad-slot-categories-overview.html'),
  'utf8'
);
const categoriesAdSlotHtml = renderTemplate(categoriesAdSlotTemplate, {
  AD_FEATURE_ENABLED: String(adFeatureState.enabled),
  AD_PROVIDER: adFeatureState.provider,
  AD_INITIAL_STATE: adFeatureState.initialState,
  AD_HIDDEN_ATTRIBUTE: adFeatureState.hidden ? 'hidden' : ''
});
const renderedCategoriesHtml = renderTemplate(
  categoriesSourceHtml,
  {
    DEPLOYMENT_ENV: deploymentEnvironment,
    ROBOTS_DIRECTIVE: categoriesSeo.robotsDirective,
    PAGE_TITLE: categoriesSeo.title,
    PAGE_DESCRIPTION: categoriesSeo.description,
    CANONICAL_URL: categoriesSeo.canonicalUrl,
    SOCIAL_IMAGE_URL: categoriesSeo.socialImageUrl,
    SOCIAL_IMAGE_ALT: categoriesSeo.socialImageAlt,
    CATEGORIES_JSON_LD: renderCategoriesStructuredData(categories, categoriesSeo),
    CATEGORY_COUNT: categories.length,
    CATEGORY_TILES: categoryOverviewTilesHtml,
    CATEGORIES_AD_SLOT: categoriesAdSlotHtml,
    CATEGORIES_NEWSLETTER: newsletterSectionHtml,
    SITE_FOOTER: footerHtml,
    CONSENT_MANAGER: consentHtml,
    BACK_TO_TOP: backToTopHtml
  },
  {
    rawKeys: [
      'CATEGORIES_JSON_LD',
      'CATEGORY_TILES',
      'CATEGORIES_AD_SLOT',
      'CATEGORIES_NEWSLETTER',
      'SITE_FOOTER',
      'CONSENT_MANAGER',
      'BACK_TO_TOP'
    ]
  }
);

const articlesSourceHtml = await readFile(
  path.join(projectRoot, 'pages/articles.html'),
  'utf8'
);
const articlesAdSlotTemplate = await readFile(
  path.join(projectRoot, 'pages/partials/ad-slot-articles-in-feed.html'),
  'utf8'
);
const articlesAdSlotHtml = renderTemplate(articlesAdSlotTemplate, {
  AD_FEATURE_ENABLED: String(adFeatureState.enabled),
  AD_PROVIDER: adFeatureState.provider,
  AD_INITIAL_STATE: adFeatureState.initialState,
  AD_HIDDEN_ATTRIBUTE: adFeatureState.hidden ? 'hidden' : ''
});
const articlesCategoryOptions = renderArticlesCategoryOptions(categories);
const articleListingPages = createArticlesPagination(publishedArticles, {
  pageSize: ARTICLES_PAGE_SIZE
});
const renderedArticleListingPages = await Promise.all(
  articleListingPages.map(async (page) => {
    const isFirstPage = page.pageNumber === 1;
    const pageTitle = isFirstPage
      ? 'U.S. Law Articles & Legal Guides | Lawscope'
      : `U.S. Law Articles & Legal Guides – Page ${page.pageNumber} | Lawscope`;
    const pageDescription = isFirstPage
      ? 'Browse clear, educational U.S. law articles by topic, with visible dates, sources, disclaimers, and practical context.'
      : `Browse page ${page.pageNumber} of Lawscope’s clear U.S. law articles, with visible dates, sources, disclaimers, and practical context.`;
    const pageSeo = createSeoMetadata({
      route: page.route,
      title: pageTitle,
      description: pageDescription,
      socialImageAlt:
        'Abstract layered paper forms and connecting lines representing Lawscope’s U.S. law article library.',
      deploymentEnvironment
    });
    const pageRangeSummary = page.firstItemNumber === page.lastItemNumber
      ? `Page ${page.pageNumber} displays article ${page.firstItemNumber}.`
      : `Page ${page.pageNumber} displays articles ${page.firstItemNumber}–${page.lastItemNumber}.`;
    const resultSummary = page.totalItems === 0
      ? 'Showing 0 articles.'
      : `Showing ${page.totalItems} articles. ${pageRangeSummary}`;
    const articleFeedHtml = await renderArticlesFeed(
      page,
      articleCardTemplate,
      articlesAdSlotHtml,
      categories
    );
    const pageArticleSlugs = new Set(page.items.map((article) => article.slug));
    const filterSupplementHtml = (
      await Promise.all(
        publishedArticles
          .filter((article) => !pageArticleSlugs.has(article.slug))
          .map((article) => renderArticleCard(articleCardTemplate, article))
      )
    ).join('\n');
    const articleEmptyStateHtml = renderArticlesEmptyState(categories);
    const renderedHtml = renderTemplate(
      articlesSourceHtml,
      {
        DEPLOYMENT_ENV: deploymentEnvironment,
        ROBOTS_DIRECTIVE: pageSeo.robotsDirective,
        PAGE_TITLE: pageSeo.title,
        PAGE_DESCRIPTION: pageSeo.description,
        CANONICAL_URL: pageSeo.canonicalUrl,
        SOCIAL_IMAGE_URL: pageSeo.socialImageUrl,
        SOCIAL_IMAGE_ALT: pageSeo.socialImageAlt,
        PAGINATION_HEAD_LINKS: renderPaginationHeadLinks(page),
        ARTICLES_JSON_LD: renderArticlesStructuredData(page, pageSeo),
        ARTICLES_BREADCRUMB_ITEMS: renderArticlesBreadcrumb(page.pageNumber),
        ARTICLE_TOTAL_COUNT: page.totalItems,
        CURRENT_PAGE_NUMBER: page.pageNumber,
        TOTAL_PAGE_COUNT: page.totalPages,
        ARTICLE_RESULT_SUMMARY: resultSummary,
        ARTICLE_CATEGORY_OPTIONS: articlesCategoryOptions,
        ARTICLE_FEED: articleFeedHtml,
        ARTICLE_FILTER_SUPPLEMENT: filterSupplementHtml,
        ARTICLE_EMPTY_STATE: articleEmptyStateHtml,
        ARTICLE_PAGINATION: renderArticlesPagination(page),
        ARTICLES_NEWSLETTER: newsletterSectionHtml,
        SITE_FOOTER: footerHtml,
        CONSENT_MANAGER: consentHtml,
        BACK_TO_TOP: backToTopHtml
      },
      {
        rawKeys: [
          'PAGINATION_HEAD_LINKS',
          'ARTICLES_JSON_LD',
          'ARTICLES_BREADCRUMB_ITEMS',
          'ARTICLE_CATEGORY_OPTIONS',
          'ARTICLE_FEED',
          'ARTICLE_FILTER_SUPPLEMENT',
          'ARTICLE_EMPTY_STATE',
          'ARTICLE_PAGINATION',
          'ARTICLES_NEWSLETTER',
          'SITE_FOOTER',
          'CONSENT_MANAGER',
          'BACK_TO_TOP'
        ]
      }
    );

    return { page, seo: pageSeo, renderedHtml };
  })
);

const [
  categorySourceHtml,
  categoryFeaturedTemplate,
  categoryAdSlotTemplate,
  categoryRelatedTemplate,
  categoryEmptyStateHtml
] = await Promise.all([
  readFile(path.join(projectRoot, 'pages/category.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/category-featured-article.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/ad-slot-category-in-feed.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/category-related.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/category-empty-state.html'), 'utf8')
]);
const categoryPageModels = createAllCategoryPages(categories, publishedArticles, {
  pageSize: CATEGORY_PAGE_SIZE
});
const renderedCategoryPages = await Promise.all(
  categoryPageModels.map(async (page) => {
    const isFirstPage = page.pageNumber === 1;
    const pageTitle = isFirstPage
      ? `${page.category.name} Articles & Guides | Lawscope`
      : `${page.category.name} Articles & Guides – Page ${page.pageNumber} | Lawscope`;
    const pageDescription = createCategoryMetadataDescription(page);
    const pageSeo = createSeoMetadata({
      route: page.route,
      title: pageTitle,
      description: pageDescription,
      socialImageAlt:
        `Abstract layered paper forms and connecting lines representing Lawscope’s ${page.category.name} guides.`,
      deploymentEnvironment
    });
    const pageIndicator = isFirstPage
      ? ''
      : `<p class="category-page__page-number">Page ${page.pageNumber} of ${page.totalPages}</p>`;
    const articleCountLabel = page.totalItems === 1
      ? '1 published guide'
      : `${page.totalItems} published guides`;
    const rangeLabel = page.firstItemNumber === page.lastItemNumber
      ? `guide ${page.firstItemNumber}`
      : `guides ${page.firstItemNumber}–${page.lastItemNumber}`;
    const resultSummary = page.totalItems === 0
      ? 'No published guides yet.'
      : page.totalPages === 1
        ? `Showing ${articleCountLabel}.`
        : `Showing ${rangeLabel} of ${page.totalItems}.`;
    const categoryAdSlotHtml = renderTemplate(categoryAdSlotTemplate, {
      CATEGORY_SLUG: page.category.slug,
      AD_FEATURE_ENABLED: String(adFeatureState.enabled),
      AD_PROVIDER: adFeatureState.provider,
      AD_INITIAL_STATE: adFeatureState.initialState,
      AD_HIDDEN_ATTRIBUTE: adFeatureState.hidden ? 'hidden' : ''
    });
    const [featuredHtml, articleFeedHtml] = await Promise.all([
      renderCategoryFeaturedArticle(categoryFeaturedTemplate, page.featuredArticle),
      renderCategoryFeed(
        page,
        articleCardTemplate,
        categoryAdSlotHtml,
        categoryEmptyStateHtml
      )
    ]);
    const relatedHtml = renderCategoryRelated(categoryRelatedTemplate, page);
    const categoryNewsletterHtml = renderCategoryNewsletter(
      newsletterSectionHtml,
      page.category
    );
    const renderedHtml = renderTemplate(
      categorySourceHtml,
      {
        DEPLOYMENT_ENV: deploymentEnvironment,
        ROBOTS_DIRECTIVE: pageSeo.robotsDirective,
        PAGE_TITLE: pageSeo.title,
        PAGE_DESCRIPTION: pageSeo.description,
        CANONICAL_URL: pageSeo.canonicalUrl,
        SOCIAL_IMAGE_URL: pageSeo.socialImageUrl,
        SOCIAL_IMAGE_ALT: pageSeo.socialImageAlt,
        PAGINATION_HEAD_LINKS: renderPaginationHeadLinks(page),
        CATEGORY_JSON_LD: renderCategoryStructuredData(page, pageDescription),
        CATEGORY_BREADCRUMB_ITEMS: renderCategoryBreadcrumb(page),
        CATEGORY_SLUG: page.category.slug,
        CATEGORY_ICON: page.category.icon,
        CATEGORY_NAME: page.category.name,
        CATEGORY_PAGE_KICKER: pageIndicator,
        CATEGORY_DESCRIPTION: page.category.description,
        CATEGORY_ARTICLE_COUNT: articleCountLabel,
        CATEGORY_TOTAL_ARTICLES: page.totalItems,
        CURRENT_PAGE_NUMBER: page.pageNumber,
        TOTAL_PAGE_COUNT: page.totalPages,
        CATEGORY_FEATURED: featuredHtml,
        CATEGORY_RESULT_SUMMARY: resultSummary,
        CATEGORY_ARTICLE_FEED: articleFeedHtml,
        CATEGORY_PAGINATION: renderCategoryPagination(page),
        RELATED_CATEGORIES: relatedHtml,
        CATEGORY_NEWSLETTER: categoryNewsletterHtml,
        SITE_FOOTER: footerHtml,
        CONSENT_MANAGER: consentHtml,
        BACK_TO_TOP: backToTopHtml
      },
      {
        rawKeys: [
          'PAGINATION_HEAD_LINKS',
          'CATEGORY_JSON_LD',
          'CATEGORY_BREADCRUMB_ITEMS',
          'CATEGORY_PAGE_KICKER',
          'CATEGORY_FEATURED',
          'CATEGORY_ARTICLE_FEED',
          'CATEGORY_PAGINATION',
          'RELATED_CATEGORIES',
          'CATEGORY_NEWSLETTER',
          'SITE_FOOTER',
          'CONSENT_MANAGER',
          'BACK_TO_TOP'
        ]
      }
    );

    return { page, seo: pageSeo, renderedHtml };
  })
);

const [
  articleSourceHtml,
  articleAdSlotTemplate,
  articleDisclaimerHtml
] = await Promise.all([
  readFile(path.join(projectRoot, 'pages/article.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/ad-slot-article.html'), 'utf8'),
  readFile(path.join(projectRoot, 'pages/partials/article-disclaimer.html'), 'utf8')
]);
validateArticleDisclaimerPartial(articleDisclaimerHtml);
const articlePageModels = createArticlePageModels(publishedArticles, categories);
const renderedArticlePages = await Promise.all(
  articlePageModels.map(async (model) => {
    const { article, category, route, relatedArticles } = model;
    const articleSeo = createSeoMetadata({
      route,
      title: `${article.seo_title || article.title} | Lawscope`,
      fallbackTitle: `${article.title} | Lawscope`,
      description: article.meta_description,
      fallbackDescription: article.excerpt,
      socialImage: article.social_image,
      socialImageAlt: article.featured_image_alt,
      type: 'article',
      deploymentEnvironment
    });
    const articleUrl = articleSeo.canonicalUrl;
    const publishDate = new Date(article.publish_date);
    const publishedIso = publishDate.toISOString();
    const modifiedIso = article.updated_date
      ? new Date(article.updated_date).toISOString()
      : publishedIso;
    const [imageDimensions] = await Promise.all([
      getLocalImageDimensions(article),
      getLocalSocialImageDimensions(article)
    ]);
    const sidebarAdHtml = renderArticleAdSlot(
      articleAdSlotTemplate,
      article,
      'sidebar',
      adFeatureState
    );
    const midArticleAdHtml = renderArticleAdSlot(
      articleAdSlotTemplate,
      article,
      'mid',
      adFeatureState
    );
    const endAdHtml = renderArticleAdSlot(
      articleAdSlotTemplate,
      article,
      'end',
      adFeatureState
    );
    const markdownResult = renderArticleMarkdown(article.body, {
      midArticleHtml: midArticleAdHtml
    });
    const relatedArticlesHtml = (
      await Promise.all(
        relatedArticles.map((relatedArticle) =>
          renderArticleCard(articleCardTemplate, relatedArticle)
        )
      )
    ).join('\n');
    const updatedMetadata = renderArticleUpdatedMetadata(article);
    const renderedHtml = renderTemplate(
      articleSourceHtml,
      {
        DEPLOYMENT_ENV: deploymentEnvironment,
        ROBOTS_DIRECTIVE: articleSeo.robotsDirective,
        PAGE_TITLE: articleSeo.title,
        PAGE_DESCRIPTION: articleSeo.description,
        CANONICAL_URL: articleSeo.canonicalUrl,
        SOCIAL_IMAGE_URL: articleSeo.socialImageUrl,
        IMAGE_ALT: articleSeo.socialImageAlt,
        PUBLISH_DATE_ISO: publishedIso,
        PUBLISH_DATE_DISPLAY: formatPublishDate(publishDate),
        MODIFIED_DATE_ISO: modifiedIso,
        ARTICLE_OPEN_GRAPH_TAGS: renderArticleOpenGraphTags(article.tags),
        ARTICLE_JSON_LD: renderArticleStructuredData(model, articleSeo),
        CATEGORY_SLUG: category.slug,
        CATEGORY_NAME: category.name,
        ARTICLE_SLUG: article.slug,
        ARTICLE_TITLE: article.title,
        ARTICLE_EXCERPT: article.excerpt,
        AUTHOR: article.author,
        UPDATED_DATE_META: updatedMetadata.meta,
        READING_TIME: article.readingTime,
        ARTICLE_UPDATE_NOTE: updatedMetadata.note,
        IMAGE_SOURCE: article.featured_image,
        IMAGE_WIDTH: imageDimensions.width,
        IMAGE_HEIGHT: imageDimensions.height,
        IMAGE_CAPTION: renderArticleImageCaption(article),
        TABLE_OF_CONTENTS: renderArticleTableOfContents(markdownResult.headings),
        ARTICLE_SIDEBAR_AD: sidebarAdHtml,
        ARTICLE_BODY: markdownResult.html,
        ARTICLE_DISCLAIMER: articleDisclaimerHtml,
        ARTICLE_SOURCES: renderArticleSources(article),
        ARTICLE_TAGS: renderArticleTags(article),
        ARTICLE_SHARE_ACTIONS: renderArticleShareActions(article, articleUrl),
        ARTICLE_END_AD: endAdHtml,
        RELATED_ARTICLES: relatedArticlesHtml,
        SITE_FOOTER: footerHtml,
        CONSENT_MANAGER: consentHtml,
        BACK_TO_TOP: backToTopHtml
      },
      {
        rawKeys: [
          'ARTICLE_OPEN_GRAPH_TAGS',
          'ARTICLE_JSON_LD',
          'UPDATED_DATE_META',
          'ARTICLE_UPDATE_NOTE',
          'IMAGE_CAPTION',
          'TABLE_OF_CONTENTS',
          'ARTICLE_SIDEBAR_AD',
          'ARTICLE_BODY',
          'ARTICLE_DISCLAIMER',
          'ARTICLE_SOURCES',
          'ARTICLE_TAGS',
          'ARTICLE_SHARE_ACTIONS',
          'ARTICLE_END_AD',
          'RELATED_ARTICLES',
          'SITE_FOOTER',
          'CONSENT_MANAGER',
          'BACK_TO_TOP'
        ]
      }
    );

    return { model, seo: articleSeo, markdownResult, renderedHtml };
  })
);

const sourceIndex = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
const renderedIndex = sourceIndex
  .replaceAll('{{DEPLOYMENT_ENV}}', deploymentEnvironment)
  .replace('{{ROBOTS_DIRECTIVE}}', homeSeo.robotsDirective)
  .replaceAll('{{PAGE_DESCRIPTION}}', escapeHtml(homeSeo.description))
  .replaceAll('{{PAGE_TITLE}}', escapeHtml(homeSeo.title))
  .replaceAll('{{CANONICAL_URL}}', escapeHtml(homeSeo.canonicalUrl))
  .replaceAll('{{SOCIAL_IMAGE_URL}}', escapeHtml(homeSeo.socialImageUrl))
  .replaceAll('{{SOCIAL_IMAGE_ALT}}', escapeHtml(homeSeo.socialImageAlt))
  .replace('{{HOME_JSON_LD}}', homeStructuredData)
  .replace('{{HOME_HERO}}', heroHtml)
  .replace('{{HOME_FEATURED}}', featuredSectionHtml)
  .replace('{{HOME_AD_SLOT_1}}', adSlotHtml)
  .replace('{{HOME_LATEST}}', latestSectionHtml)
  .replace('{{HOME_CATEGORIES}}', categoriesSectionHtml)
  .replace('{{HOME_NEWSLETTER}}', newsletterSectionHtml)
  .replace('{{SITE_FOOTER}}', footerHtml)
  .replace('{{CONSENT_MANAGER}}', consentHtml)
  .replace('{{BACK_TO_TOP}}', backToTopHtml);
if (/{{[A-Z0-9_]+}}/.test(renderedIndex)) {
  throw new Error('The generated home page contains an unresolved build placeholder.');
}

await writeFile(path.join(outputDirectory, 'index.html'), renderedIndex, 'utf8');
const categoriesOutputPath = outputPathForRoute('/categories/');
await mkdir(path.dirname(categoriesOutputPath), { recursive: true });
await writeFile(categoriesOutputPath, renderedCategoriesHtml, 'utf8');
await Promise.all(
  renderedArticleListingPages.map(async ({ page, renderedHtml }) => {
    const pageOutputPath = outputPathForRoute(page.route);
    await mkdir(path.dirname(pageOutputPath), { recursive: true });
    await writeFile(pageOutputPath, renderedHtml, 'utf8');
  })
);
await Promise.all(
  renderedCategoryPages.map(async ({ page, renderedHtml }) => {
    const pageOutputPath = outputPathForRoute(page.route);
    await mkdir(path.dirname(pageOutputPath), { recursive: true });
    await writeFile(pageOutputPath, renderedHtml, 'utf8');
  })
);
await Promise.all(
  renderedArticlePages.map(async ({ model, renderedHtml }) => {
    const pageOutputPath = outputPathForRoute(model.route);
    await mkdir(path.dirname(pageOutputPath), { recursive: true });
    await writeFile(pageOutputPath, renderedHtml, 'utf8');
  })
);
await Promise.all(
  renderedTrustPages.map(async ({ page, renderedHtml }) => {
    const pageOutputPath = outputPathForRoute(page.route);
    await mkdir(path.dirname(pageOutputPath), { recursive: true });
    await writeFile(pageOutputPath, renderedHtml, 'utf8');
  })
);
await mkdir(path.join(outputDirectory, 'data'), { recursive: true });
await writeFile(
  path.join(outputDirectory, 'data/trust-pages.json'),
  `${JSON.stringify(
    {
      module: 22,
      generatedAt: buildDate.toISOString(),
      deploymentEnvironment,
      robotsDirective,
      advertisingPolicy: 'omitted',
      routes: TRUST_PAGES.map((page) => ({
        key: page.key,
        route: page.route,
        canonicalUrl: canonicalTrustPageUrl(page.route),
        title: page.title,
        description: page.description,
        socialImage: canonicalTrustPageUrl(page.socialImage),
        template: page.sourceTemplate,
        dated: page.key === EDITORIAL_POLICY_PAGE.key
      }))
    },
    null,
    2
  )}\n`,
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'data/contact-page.json'),
  `${JSON.stringify(
    {
      module: 23,
      generatedAt: buildDate.toISOString(),
      deploymentEnvironment,
      route: renderedContactPage.route,
      canonicalUrl: renderedContactPage.canonicalUrl,
      title: renderedContactPage.title,
      description: renderedContactPage.description,
      deploymentEnvironment: renderedContactPage.deploymentEnvironment,
      robotsDirective: renderedContactPage.robotsDirective,
      form: {
        enabled: renderedContactPage.featureEnabled,
        endpoint: siteSettings.contact.endpoint,
        provider: siteSettings.contact.provider,
        subjects: CONTACT_SUBJECTS.map(({ value, label }) => ({ value, label })),
        clientValidation: true,
        serverValidation: true,
        privacyConsentRequired: true,
        honeypotEnabled: true,
        analyticsAllowsPii: false
      },
      advertisingPolicy: 'omitted'
    },
    null,
    2
  )}\n`,
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'data/articles-pagination.json'),
  `${JSON.stringify(
    {
      pageSize: ARTICLES_PAGE_SIZE,
      adInsertAfter: ARTICLES_AD_INSERT_AFTER,
      totalArticles: publishedArticles.length,
      totalPages: articleListingPages.length,
      canonicalStrategy: 'clean-page-routes',
      pages: articleListingPages.map((page) => ({
        pageNumber: page.pageNumber,
        route: page.route,
        canonicalUrl: canonicalUrl(page.route),
        previousRoute: page.previousRoute,
        nextRoute: page.nextRoute,
        firstItemNumber: page.firstItemNumber,
        lastItemNumber: page.lastItemNumber,
        articleSlugs: page.items.map((article) => article.slug),
        containsInFeedAdInsertion: page.items.length > ARTICLES_AD_INSERT_AFTER
      }))
    },
    null,
    2
  )}\n`,
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'data/category-pages.json'),
  `${JSON.stringify(
    {
      categoryCount: categories.length,
      pageSize: CATEGORY_PAGE_SIZE,
      adInsertAfter: CATEGORY_AD_INSERT_AFTER,
      canonicalStrategy: 'clean-category-page-routes',
      totalGeneratedRoutes: categoryPageModels.length,
      categories: categories.map((category) => {
        const pages = categoryPageModels.filter(
          (page) => page.category.slug === category.slug
        );
        return {
          slug: category.slug,
          name: category.name,
          route: category.route,
          totalArticles: pages[0]?.totalItems ?? 0,
          totalPages: pages.length,
          relatedCategorySlugs: category.related_categories,
          pages: pages.map((page) => ({
            pageNumber: page.pageNumber,
            route: page.route,
            canonicalUrl: canonicalUrl(page.route),
            previousRoute: page.previousRoute,
            nextRoute: page.nextRoute,
            firstItemNumber: page.firstItemNumber,
            lastItemNumber: page.lastItemNumber,
            featuredArticleSlug: page.featuredArticle?.slug ?? null,
            feedArticleSlugs: page.items.map((article) => article.slug),
            visibleArticleSlugs: page.visibleArticles.map((article) => article.slug),
            containsInFeedAdInsertion: page.items.length > CATEGORY_AD_INSERT_AFTER
          }))
        };
      })
    },
    null,
    2
  )}\n`,
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'data/article-pages.json'),
  `${JSON.stringify(
    {
      totalGeneratedRoutes: renderedArticlePages.length,
      canonicalStrategy: 'clean-article-routes',
      markdownRenderer: 'marked',
      markdownSanitizer: 'custom-allowlist-renderer',
      bodyH1Allowed: false,
      disclaimerSource: 'build-controlled-partial',
      disclaimerText: ARTICLE_DISCLAIMER,
      midArticleAdAfterSections: ARTICLE_MID_AD_AFTER_SECTIONS,
      relatedArticleLimit: ARTICLE_RELATED_LIMIT,
      articles: renderedArticlePages.map(({ model, markdownResult }) => ({
        slug: model.article.slug,
        route: model.route,
        canonicalUrl: canonicalUrl(model.route),
        categorySlug: model.category.slug,
        author: model.article.author,
        publishDate: new Date(model.article.publish_date).toISOString(),
        updatedDate: model.article.updated_date
          ? new Date(model.article.updated_date).toISOString()
          : null,
        wordCount: model.article.wordCount,
        readingTimeMinutes: model.article.readingTime,
        sourceCount: model.article.sources.length,
        tags: model.article.tags,
        headingIds: markdownResult.headings.map((heading) => heading.id),
        midArticleAdInserted: markdownResult.midArticleAdInserted,
        relatedArticleSlugs: model.relatedArticles.map((article) => article.slug),
        socialImage: model.article.social_image
      }))
    },
    null,
    2
  )}\n`,
  'utf8'
);
await writeFile(
  path.join(outputDirectory, SEARCH_INDEX_PUBLIC_PATH.replace(/^\//, '')),
  `${JSON.stringify(searchIndex)}\n`,
  'utf8'
);
await writeFile(
  path.join(outputDirectory, 'data/home-selection.json'),
  `${JSON.stringify(
    {
      heroSlug: hero.slug,
      heroReason: homeContent.heroReason,
      excludedFromFeaturedGrid: homeContent.excludedFromFeaturedGrid,
      featuredGridCandidateSlugs: homeContent.featuredGridCandidates.map(
        (article) => article.slug
      ),
      displayedFeaturedSlugs: featuredArticles.map((article) => article.slug),
      latestArticleSlugs: latestArticles.map((article) => article.slug),
      latestPreferredExclusionSlugs: latestExclusionSlugs,
      latestRepeatedSlugs,
      homeCategorySlugs: categories.map((category) => category.slug),
      homeCategoryCount: categories.length,
      search: {
        indexVersion: searchIndex.version,
        indexPath: SEARCH_INDEX_PUBLIC_PATH,
        indexedArticleCount: searchIndex.count,
        indexedArticleRoutes: searchIndex.entries.map((entry) => entry.url)
      },
      footer: {
        copyrightYear: footerYear,
        primaryRoutes: ['/', '/articles/', '/categories/', '/about/', '/contact/'],
        categorySlugs: categories.map((category) => category.slug),
        policyRoutes: [
          '/privacy-policy/',
          '/legal-disclaimer/',
          '/editorial-policy/',
          '/contact/'
        ],
        activeSocialProfiles: activeSocialProfiles.map(({ key }) => key)
      },
      newsletter: {
        requested: newsletterFeatureState.requested,
        endpointConfigured: newsletterFeatureState.endpointConfigured,
        enabled: newsletterFeatureState.enabled,
        provider: newsletterFeatureState.provider,
        doubleOptIn: newsletterFeatureState.doubleOptIn,
        initialState: newsletterFeatureState.initialState
      },
      consent: {
        mode: consentFeatureState.mode,
        provider: consentFeatureState.provider,
        revision: consentFeatureState.revision,
        googleCertifiedCmp: consentFeatureState.googleCertifiedCmp,
        storageContainsVisitorChoice: false
      },
      advertising: {
        requested: adFeatureState.requested,
        environmentAllowed: adFeatureState.environmentAllowed,
        enabled: adFeatureState.enabled,
        homeBelowFeaturedState: adFeatureState.initialState
      }
    },
    null,
    2
  )}\n`,
  'utf8'
);
const seoRouteRecords = [
  {
    route: '/',
    seo: homeSeo,
    robotsDirective: homeSeo.robotsDirective,
    sitemapType: 'primary'
  },
  {
    route: '/categories/',
    seo: categoriesSeo,
    robotsDirective: categoriesSeo.robotsDirective,
    sitemapType: 'primary'
  },
  ...renderedArticleListingPages.map(({ page, seo }) => ({
    route: page.route,
    seo,
    robotsDirective: seo.robotsDirective,
    sitemapType: page.pageNumber === 1
      ? 'primary'
      : 'article-listing-pagination'
  })),
  ...renderedCategoryPages.map(({ page, seo }) => ({
    route: page.route,
    seo,
    robotsDirective: seo.robotsDirective,
    sitemapType: page.pageNumber === 1 ? 'category' : 'category-pagination'
  })),
  ...renderedArticlePages.map(({ model, seo }) => ({
    route: model.route,
    seo,
    robotsDirective: seo.robotsDirective,
    sitemapType: 'article',
    lastmod: resolveArticleSitemapLastmod(model.article)
  })),
  ...renderedTrustPages.map(({ page, seo }) => ({
    route: page.route,
    seo,
    robotsDirective: seo.robotsDirective,
    sitemapType: page.key === EDITORIAL_POLICY_PAGE.key
      ? 'editorial-policy'
      : 'primary',
    lastmod: page.key === EDITORIAL_POLICY_PAGE.key
      ? TRUST_PAGE_MODIFICATION_DATE
      : null
  })),
  {
    route: renderedContactPage.route,
    seo: {
      title: renderedContactPage.title,
      description: renderedContactPage.description,
      canonicalUrl: renderedContactPage.canonicalUrl
    },
    robotsDirective: renderedContactPage.robotsDirective,
    sitemapType: 'primary'
  },
  {
    route: renderedPrivacyPolicyPage.route,
    seo: {
      title: renderedPrivacyPolicyPage.title,
      description: renderedPrivacyPolicyPage.description,
      canonicalUrl: renderedPrivacyPolicyPage.canonicalUrl
    },
    robotsDirective: renderedPrivacyPolicyPage.state.robotsDirective,
    sitemapType: 'primary',
    lastmod: renderedPrivacyPolicyPage.policySettings.last_updated
  },
  {
    route: renderedLegalDisclaimerPage.route,
    seo: {
      title: renderedLegalDisclaimerPage.title,
      description: renderedLegalDisclaimerPage.description,
      canonicalUrl: renderedLegalDisclaimerPage.canonicalUrl
    },
    robotsDirective: renderedLegalDisclaimerPage.state.robotsDirective,
    sitemapType: 'primary',
    lastmod: renderedLegalDisclaimerPage.settings.last_updated
  }
].sort((left, right) => left.route.localeCompare(right.route));
await writeFile(
  path.join(outputDirectory, 'data/seo-policy.json'),
  `${JSON.stringify(
    {
      module: 28,
      deploymentEnvironment,
      canonicalOrigin: SEO_POLICY.siteOrigin,
      titleSuffix: SEO_POLICY.titleSuffix,
      maximumTitleLength: SEO_POLICY.maxTitleLength,
      maximumDescriptionLength: SEO_POLICY.maxDescriptionLength,
      defaultSocialImage: canonicalUrl(SEO_POLICY.defaultSocialImage),
      publisherLogo: canonicalUrl(SEO_POLICY.publisherLogo),
      publicRobotsDirective: robotsDirective,
      gatedRoutes: [renderedPrivacyPolicyPage.route, renderedLegalDisclaimerPage.route],
      legacyRedirectPolicy: LEGACY_REDIRECT_POLICY,
      routeCount: seoRouteRecords.length,
      routes: seoRouteRecords.map(({ route, seo }) => ({
        route,
        canonicalUrl: seo.canonicalUrl,
        title: seo.title,
        description: seo.description
      }))
    },
    null,
    2
  )}\n`,
  'utf8'
);

const sitemap = createSitemapDocument(
  seoRouteRecords.map(({
    route,
    seo,
    robotsDirective: routeRobotsDirective,
    sitemapType,
    lastmod
  }) => ({
    route,
    canonicalUrl: seo.canonicalUrl,
    robotsDirective: routeRobotsDirective,
    type: sitemapType,
    lastmod
  }))
);
const generatedRobotsTxt = renderRobotsTxt(deploymentEnvironment);
await Promise.all([
  writeFile(path.join(outputDirectory, SITEMAP_POLICY.publicPath.slice(1)), sitemap.xml, 'utf8'),
  writeFile(path.join(outputDirectory, 'robots.txt'), generatedRobotsTxt, 'utf8'),
  writeFile(
    path.join(outputDirectory, 'data/sitemap-robots.json'),
    `${JSON.stringify(
      {
        module: SITEMAP_POLICY.module,
        generatedAt: buildDate.toISOString(),
        deploymentEnvironment,
        canonicalOrigin: SITEMAP_POLICY.canonicalOrigin,
        sitemap: {
          publicPath: SITEMAP_POLICY.publicPath,
          canonicalUrl: SITEMAP_POLICY.canonicalUrl,
          namespace: SITEMAP_POLICY.namespace,
          candidateCount: seoRouteRecords.length,
          entryCount: sitemap.entries.length,
          exclusionCount: sitemap.excluded.length,
          maximumUrlsPerFile: SITEMAP_POLICY.maximumUrlsPerFile,
          maximumUncompressedBytes: SITEMAP_POLICY.maximumUncompressedBytes,
          articleLastmodSource: SITEMAP_POLICY.articleLastmodSource,
          deploymentTimestampAllowedAsLastmod:
            SITEMAP_POLICY.deploymentTimestampAllowedAsLastmod,
          entries: sitemap.entries,
          exclusions: sitemap.excluded
        },
        robots: {
          policy: deploymentEnvironment === 'production'
            ? 'approved-production-guidance'
            : 'nonproduction-block-all-defense-in-depth',
          adminDisallowedInProduction: true,
          sitemapDeclared: deploymentEnvironment === 'production',
          accessControl: false
        },
        responseHeaders: {
          nonproductionSitewide: PREVIEW_ROBOTS_HEADER,
          permanentAdminAndNotFound: PERMANENT_NOINDEX_ROBOTS_HEADER,
          productionPublicSitewide: null
        }
      },
      null,
      2
    )}\n`,
    'utf8'
  )
]);

const buildInformation = {
  deploymentEnvironment,
  generatedAt: new Date().toISOString(),
  sourceCommit: process.env.VERCEL_GIT_COMMIT_SHA || null
};

await writeFile(
  path.join(outputDirectory, 'build-info.json'),
  `${JSON.stringify(buildInformation, null, 2)}\n`,
  'utf8'
);

console.log(`Lawscope static shell built for ${deploymentEnvironment}.`);
console.log(
  `Articles library: ${publishedArticles.length} articles across ${articleListingPages.length} static page routes.`
);
console.log(
  `Category pages: ${categories.length} controlled categories across ${categoryPageModels.length} static page routes.`
);
console.log(
  `Article pages: ${renderedArticlePages.length} static detail routes with sanitized Markdown and related content.`
);
console.log(
  `Trust pages: ${renderedTrustPages.length} ad-free routes with environment-aware indexing metadata.`
);
console.log(
  `Contact page: ${renderedContactPage.route} with the form ${renderedContactPage.featureEnabled ? 'enabled' : 'safely unavailable'}.`
);
console.log(
  `Privacy Policy: ${renderedPrivacyPolicyPage.route} is ${renderedPrivacyPolicyPage.state.approved ? 'approved and launch-ready' : 'safely noindex pending required confirmations'}.`
);
console.log(
  `Legal Disclaimer: ${renderedLegalDisclaimerPage.route} is ${renderedLegalDisclaimerPage.state.approved ? 'approved and launch-ready' : 'safely noindex pending qualified legal review'}.`
);
console.log(
  `404 Error Page: ${path.relative(projectRoot, renderedNotFoundPage.outputPath)} serves branded HTML for unresolved routes with HTTP ${renderedNotFoundPage.httpStatusForUnknownRoutes}.`
);
console.log(
  `Sitemap and robots: ${sitemap.entries.length} indexable canonical URLs; ${deploymentEnvironment === 'production' ? 'production crawler guidance' : 'nonproduction crawl blocking'} emitted.`
);
console.log(
  `CMS authentication: ${cmsCompanionOrigin ? 'approved companion origin injected; account acceptance still required' : 'fail-closed until CMS_COMPANION_ORIGIN is provisioned'}.`
);
console.log(`Output: ${path.relative(projectRoot, outputDirectory)}/`);
