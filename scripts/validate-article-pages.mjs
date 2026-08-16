import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  ARTICLE_DISCLAIMER,
  ARTICLE_MID_AD_AFTER_SECTIONS,
  ARTICLE_RELATED_LIMIT,
  createArticlePageModels,
  renderArticleMarkdown
} from './article-pages.mjs';
import {
  loadCategories,
  loadPublishedArticles,
  readJpegDimensions
} from './content-graph.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDate = new Date('2026-08-16T12:00:00.000Z');

function escapePattern(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function occurrences(source, expression) {
  return source.match(expression)?.length || 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function articleProse(html) {
  const match = html.match(
    /<div\b(?=[^>]*\bclass="article-prose")(?=[^>]*\bdata-article-prose\b)[^>]*>([\s\S]*?)<\/div>\s*<aside class="article-disclaimer"/
  );
  assert.ok(match, 'Generated page must contain a prose region followed by the disclaimer.');
  return match[1];
}

function jsonLdGraph(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'Each article must expose one consolidated JSON-LD block.');
  return JSON.parse(blocks[0][1])['@graph'];
}

function executeShareEnhancement(source, { clipboard = true, nativeShare = true } = {}) {
  const copyHandlers = new Map();
  const nativeHandlers = new Map();
  const status = { textContent: '' };
  const copyControl = {
    addEventListener(type, handler) {
      copyHandlers.set(type, handler);
    }
  };
  const nativeControl = {
    hidden: true,
    addEventListener(type, handler) {
      nativeHandlers.set(type, handler);
    }
  };
  const article = {
    dataset: { canonicalUrl: 'https://getlawscope.com/articles/fixture/' },
    querySelector(selector) {
      if (selector === '[data-copy-link]') return copyControl;
      if (selector === '[data-native-share]') return nativeControl;
      if (selector === '[data-share-status]') return status;
      if (selector === '.article-detail__deck') {
        return { textContent: 'A fixture article summary.' };
      }
      return null;
    }
  };
  const clipboardWrites = [];
  const nativeShares = [];
  let fallbackCopyCalls = 0;
  const temporaryControls = [];
  const document = {
    title: 'Fixture article | Lawscope',
    body: {
      append(control) {
        temporaryControls.push(control);
      }
    },
    querySelector(selector) {
      return selector === '[data-article-page]' ? article : null;
    },
    createElement() {
      return {
        value: '',
        className: '',
        setAttribute() {},
        select() {},
        remove() {}
      };
    },
    execCommand(command) {
      fallbackCopyCalls += command === 'copy' ? 1 : 0;
      return command === 'copy';
    }
  };
  const navigator = {};
  if (clipboard) {
    navigator.clipboard = {
      async writeText(value) {
        clipboardWrites.push(value);
      }
    };
  }
  if (nativeShare) {
    navigator.share = async (payload) => {
      nativeShares.push(payload);
    };
  }
  const window = {
    isSecureContext: clipboard,
    location: { href: 'https://getlawscope.com/articles/fallback/' },
    clearTimeout() {},
    setTimeout() {
      return 1;
    }
  };

  vm.runInNewContext(source, { document, navigator, window });
  return {
    copyHandler: copyHandlers.get('click'),
    nativeHandler: nativeHandlers.get('click'),
    nativeControl,
    status,
    clipboardWrites,
    nativeShares,
    get fallbackCopyCalls() {
      return fallbackCopyCalls;
    },
    temporaryControls
  };
}

const [categories, articles, template, disclaimerPartial, articleScript, componentsCss, darkCss] =
  await Promise.all([
    loadCategories(projectRoot),
    loadPublishedArticles(projectRoot, buildDate),
    readFile(path.join(projectRoot, 'pages/article.html'), 'utf8'),
    readFile(path.join(projectRoot, 'pages/partials/article-disclaimer.html'), 'utf8'),
    readFile(path.join(projectRoot, 'js/article-page.js'), 'utf8'),
    readFile(path.join(projectRoot, 'css/components.css'), 'utf8'),
    readFile(path.join(projectRoot, 'css/dark-mode.css'), 'utf8')
  ]);
const manifest = JSON.parse(
  await readFile(path.join(projectRoot, 'generated/data/article-pages.json'), 'utf8')
);
const models = createArticlePageModels(articles, categories);

assert.equal(models.length, articles.length, 'Every eligible published article needs a page model.');
assert.equal(manifest.totalGeneratedRoutes, articles.length);
assert.equal(manifest.bodyH1Allowed, false);
assert.equal(manifest.disclaimerText, ARTICLE_DISCLAIMER);
assert.equal(manifest.relatedArticleLimit, ARTICLE_RELATED_LIMIT);
assert.equal(manifest.midArticleAdAfterSections, ARTICLE_MID_AD_AFTER_SECTIONS);
assert.match(template, /<main class="article-page" id="main-content" tabindex="-1">/);
assert.match(template, /<article[\s\S]*?class="article-detail"[\s\S]*?data-article-page/);
assert.match(
  template,
  /<div\b(?=[^>]*\bclass="article-prose")(?=[^>]*\bdata-article-prose\b)[^>]*>\s*{{ARTICLE_BODY}}/
);
assert.match(template, /{{ARTICLE_DISCLAIMER}}/);
assert.match(template, /{{ARTICLE_SOURCES}}/);
assert.match(template, /{{ARTICLE_TAGS}}/);
assert.match(template, /{{ARTICLE_SHARE_ACTIONS}}/);
assert.match(template, /{{RELATED_ARTICLES}}/);
assert.match(template, /<script src="\/js\/article-page\.js" defer><\/script>/);
assert.match(template, /{{BACK_TO_TOP}}/);
assert.match(disclaimerPartial, new RegExp(escapePattern(ARTICLE_DISCLAIMER)));
assert.equal(occurrences(disclaimerPartial, new RegExp(escapePattern(ARTICLE_DISCLAIMER), 'g')), 1);

const articleManifestBySlug = new Map(
  manifest.articles.map((article) => [article.slug, article])
);

for (const model of models) {
  const { article, category, relatedArticles, route } = model;
  const generatedPath = path.join(projectRoot, 'generated', route, 'index.html');
  const html = await readFile(generatedPath, 'utf8');
  const prose = articleProse(html);
  const record = articleManifestBySlug.get(article.slug);
  assert.ok(record, `${article.slug}: manifest record is required.`);

  const canonical = `https://getlawscope.com${route}`;
  const publishIso = new Date(article.publish_date).toISOString();
  const modifiedIso = article.updated_date
    ? new Date(article.updated_date).toISOString()
    : publishIso;
  const expectedModifiedLabel = article.updated_date ? 'Updated' : '';

  assert.doesNotMatch(html, /{{[A-Z][A-Z0-9_]*}}/, `${article.slug}: no build token may remain.`);
  assert.equal(occurrences(html, /<h1\b/g), 1, `${article.slug}: exactly one H1 is required.`);
  assert.doesNotMatch(prose, /<h1\b/i, `${article.slug}: Markdown must not create another H1.`);
  assert.match(html, new RegExp(`<link rel="canonical" href="${escapePattern(canonical)}">`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${escapePattern(canonical)}">`));
  assert.match(html, /<meta property="og:type" content="article">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta property="og:image:width" content="1200">/);
  assert.match(html, /<meta property="og:image:height" content="630">/);
  assert.equal(occurrences(html, /<meta property="article:tag"/g), article.tags.length);
  assert.match(html, new RegExp(`<meta property="article:published_time" content="${escapePattern(publishIso)}">`));
  assert.match(html, new RegExp(`<meta property="article:modified_time" content="${escapePattern(modifiedIso)}">`));

  assert.match(html, new RegExp(`<h1>${escapePattern(article.title)}</h1>`));
  assert.match(html, new RegExp(`By ${escapePattern(article.author)}`));
  assert.match(
    html,
    new RegExp(
      `href="/categories/${escapePattern(category.slug)}/">${escapePattern(escapeHtml(category.name))}</a>`
    )
  );
  assert.match(html, new RegExp(`<time datetime="${escapePattern(publishIso)}">`));
  assert.match(html, new RegExp(`${article.readingTime} min read`));
  if (article.updated_date) {
    assert.match(html, new RegExp(`${expectedModifiedLabel} <time datetime="${escapePattern(modifiedIso)}">`));
  } else {
    assert.doesNotMatch(html, /article-detail__update-note/);
  }

  assert.equal(
    occurrences(html, new RegExp(escapePattern(ARTICLE_DISCLAIMER), 'g')),
    1,
    `${article.slug}: exact disclaimer must appear once.`
  );
  assert.ok(
    html.indexOf(ARTICLE_DISCLAIMER) > html.indexOf('class="article-prose"'),
    `${article.slug}: disclaimer must follow editorial prose.`
  );
  assert.match(html, /href="\/legal-disclaimer\/">Read the full Legal Disclaimer<\/a>/);

  assert.equal(occurrences(html, /class="article-sources__item"/g), article.sources.length);
  for (const source of article.sources) {
    assert.match(html, new RegExp(`href="${escapePattern(source.url.replaceAll('&', '&amp;'))}"`));
    assert.match(html, new RegExp(escapePattern(source.label)));
  }
  for (const tag of article.tags) {
    assert.match(
      html,
      new RegExp(`href="/articles/\\?q=${escapePattern(encodeURIComponent(tag))}"`)
    );
  }

  assert.match(html, /href="https:\/\/x\.com\/intent\/post\?/);
  assert.match(html, /href="https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?/);
  assert.match(html, /<button class="article-share__action" type="button" data-copy-link>/);
  assert.match(html, /<button class="article-share__action" type="button" data-native-share hidden>/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true" data-share-status/);

  assert.equal(relatedArticles.length, ARTICLE_RELATED_LIMIT);
  const relatedRegion = html.match(/<section class="article-related"[\s\S]*?<\/section>/)?.[0] || '';
  assert.equal(occurrences(relatedRegion, /<article class="article-card"/g), ARTICLE_RELATED_LIMIT);
  assert.doesNotMatch(
    relatedRegion,
    new RegExp(`data-article-slug="${escapePattern(article.slug)}"`),
    `${article.slug}: related cards must exclude the current article.`
  );
  assert.deepEqual(record.relatedArticleSlugs, relatedArticles.map((candidate) => candidate.slug));
  for (const relatedArticle of relatedArticles) {
    assert.match(relatedRegion, new RegExp(`data-article-slug="${escapePattern(relatedArticle.slug)}"`));
  }

  assert.equal(record.wordCount, article.wordCount);
  assert.equal(record.readingTimeMinutes, article.readingTime);
  assert.equal(record.sourceCount, article.sources.length);
  assert.deepEqual(record.tags, article.tags);
  assert.equal(record.route, route);
  assert.equal(record.canonicalUrl, canonical);
  assert.match(html, /<details class="article-toc" open>/);
  assert.equal(occurrences(html, /class="article-toc__item/g), record.headingIds.length);
  for (const headingId of record.headingIds) {
    assert.match(prose, new RegExp(`id="${escapePattern(headingId)}"`));
    assert.match(html, new RegExp(`href="#${escapePattern(headingId)}"`));
  }

  const adCount = occurrences(html, /class="ad-slot article-ad article-ad--/g);
  assert.equal(adCount, record.midArticleAdInserted ? 3 : 2);
  assert.equal(occurrences(html, /aria-label="Advertisement"/g) >= adCount, true);
  assert.equal(occurrences(html, /data-ad-feature-enabled="false"/g) >= adCount, true);
  assert.equal(occurrences(html, /data-ad-state="disabled"/g) >= adCount, true);
  assert.match(html, /class="ad-slot article-ad article-ad--sidebar"[\s\S]*?hidden/);
  assert.match(html, /class="ad-slot article-ad article-ad--end"[\s\S]*?hidden/);
  if (record.midArticleAdInserted) {
    const topLevelHeadingsBeforeAd = occurrences(
      prose.slice(0, prose.indexOf('article-ad--mid')),
      /<h2\b/g
    );
    assert.equal(topLevelHeadingsBeforeAd, ARTICLE_MID_AD_AFTER_SECTIONS);
  }

  assert.doesNotMatch(prose, /<(?:script|iframe|object|embed|style|base|form)\b/i);
  assert.doesNotMatch(prose, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(prose, /(?:href|src)="(?:javascript|data):/i);
  assert.match(html, /class="back-to-top"/);

  const graph = jsonLdGraph(html);
  const articleSchema = graph.find((item) => item['@type'] === 'Article');
  const breadcrumbSchema = graph.find((item) => item['@type'] === 'BreadcrumbList');
  assert.ok(articleSchema, `${article.slug}: Article schema is required.`);
  assert.ok(breadcrumbSchema, `${article.slug}: BreadcrumbList schema is required.`);
  assert.equal(articleSchema.headline, article.title);
  assert.equal(articleSchema.url, canonical);
  assert.equal(articleSchema.datePublished, publishIso);
  assert.equal(articleSchema.dateModified, modifiedIso);
  assert.equal(articleSchema.wordCount, article.wordCount);
  assert.equal(articleSchema.author.name, article.author);
  assert.equal(articleSchema.articleSection, category.name);
  assert.deepEqual(articleSchema.keywords, article.tags);
  assert.equal(articleSchema.image.width, 1200);
  assert.equal(articleSchema.image.height, 630);
  assert.equal(breadcrumbSchema.itemListElement.at(-1).item, canonical);

  const dimensions = await readJpegDimensions(
    path.join(projectRoot, article.social_image.replace(/^\//, ''))
  );
  assert.deepEqual(dimensions, { width: 1200, height: 630 });
}

const fixtureParagraph = `${'word '.repeat(55).trim()}`;
const eligibleMidAdFixture = [
  '## First', fixtureParagraph,
  '## Second', fixtureParagraph,
  '## Third', fixtureParagraph,
  '## Fourth', 'Final words.'
].join('\n\n');
const guardedFixture = renderArticleMarkdown(eligibleMidAdFixture, {
  midArticleHtml: '<aside class="article-ad--mid">Advertisement</aside>'
});
assert.equal(guardedFixture.midArticleAdInserted, true);
assert.equal(occurrences(guardedFixture.html, /article-ad--mid/g), 1);
assert.equal(occurrences(guardedFixture.html.slice(0, guardedFixture.html.indexOf('article-ad--mid')), /<h2\b/g), 3);

const insufficientLeadFixture = renderArticleMarkdown(
  '## First\nShort.\n\n## Second\nShort.\n\n## Third\nShort.\n\n## Fourth\nShort.',
  { midArticleHtml: '<aside class="article-ad--mid">Advertisement</aside>' }
);
assert.equal(insufficientLeadFixture.midArticleAdInserted, false);
assert.doesNotMatch(insufficientLeadFixture.html, /article-ad--mid/);

const sanitizedFixture = renderArticleMarkdown(
  '## Safe heading\n\n[unsafe](javascript:alert(1)) <script>alert(2)</script>\n\n## Safe heading\n\nText.'
);
assert.deepEqual(sanitizedFixture.headings.map(({ id }) => id), ['safe-heading', 'safe-heading-2']);
assert.doesNotMatch(sanitizedFixture.html, /href="javascript:/i);
assert.match(sanitizedFixture.html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
await assert.rejects(
  async () => renderArticleMarkdown('# Forbidden title\n\n## Section\nText.'),
  /must not contain an H1/
);
await assert.rejects(
  async () => renderArticleMarkdown('## Section\n\n#### Skipped\nText.'),
  /must not be skipped/
);

assert.match(articleScript, /navigator\.clipboard\?\.writeText/);
assert.match(articleScript, /document\.execCommand\('copy'\)/);
assert.match(articleScript, /typeof navigator\.share === 'function'/);
assert.match(articleScript, /error\?\.name !== 'AbortError'/);
const modernShareFixture = executeShareEnhancement(articleScript);
assert.equal(modernShareFixture.nativeControl.hidden, false);
assert.equal(typeof modernShareFixture.copyHandler, 'function');
assert.equal(typeof modernShareFixture.nativeHandler, 'function');
await modernShareFixture.copyHandler();
assert.deepEqual(modernShareFixture.clipboardWrites, [
  'https://getlawscope.com/articles/fixture/'
]);
assert.equal(modernShareFixture.status.textContent, 'Article link copied to the clipboard.');
await modernShareFixture.nativeHandler();
assert.equal(modernShareFixture.nativeShares.length, 1);
assert.equal(
  modernShareFixture.nativeShares[0].url,
  'https://getlawscope.com/articles/fixture/'
);
const fallbackShareFixture = executeShareEnhancement(articleScript, {
  clipboard: false,
  nativeShare: false
});
assert.equal(fallbackShareFixture.nativeControl.hidden, true);
assert.equal(fallbackShareFixture.nativeHandler, undefined);
await fallbackShareFixture.copyHandler();
assert.equal(fallbackShareFixture.fallbackCopyCalls, 1);
assert.equal(fallbackShareFixture.temporaryControls.length, 1);
assert.equal(fallbackShareFixture.status.textContent, 'Article link copied to the clipboard.');
assert.match(componentsCss, /\/\* Module 21: generated individual article pages/);
assert.match(componentsCss, /\.article-layout\s*{/);
assert.match(componentsCss, /\.article-prose\s*{/);
assert.match(componentsCss, /\.article-sidebar > \.article-ad--sidebar\s*{\s*display: none;/);
assert.match(componentsCss, /@media \(min-width: 64rem\)[\s\S]*\.article-sidebar > \.article-ad--sidebar:not\(\[hidden\]\)/);
assert.match(componentsCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.article-toc summary i/);
assert.doesNotMatch(
  componentsCss.slice(componentsCss.indexOf('/* Module 21: generated individual article pages')),
  /#[0-9a-f]{3,8}\b/i,
  'Module 21 styles must consume semantic color tokens rather than raw hex values.'
);
assert.match(darkCss, /--color-disclaimer-surface: var\(--palette-dark-disclaimer-surface\)/);
assert.match(darkCss, /--color-surface-muted: var\(--palette-dark-alternate\)/);

console.log(
  `Article-page validation passed for ${articles.length} routes, exact disclaimer enforcement, guarded ad placement, sanitized Markdown, metadata/schema parity, responsive styling, and progressive sharing.`
);
