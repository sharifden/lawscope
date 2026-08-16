import { marked, Renderer, TextRenderer } from 'marked';
import { compareArticles } from './content-graph.mjs';

export const ARTICLE_MID_AD_AFTER_SECTIONS = 3;
export const ARTICLE_RELATED_LIMIT = 3;
export const ARTICLE_DISCLAIMER =
  'The information on this page is for educational purposes only and does not constitute legal advice. Laws vary by state. Always consult a qualified attorney for advice specific to your situation.';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function headingText(markdownText) {
  return marked.parseInline(String(markdownText), {
    gfm: true,
    renderer: new TextRenderer()
  }).trim();
}

function slugifyHeading(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-') || 'section';
}

function safeMarkdownUrl(value, { image = false } = {}) {
  const candidate = String(value || '').trim();
  if (!candidate) return null;
  if (candidate.startsWith('#') && !image) return candidate;
  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    if (image && !candidate.startsWith('/assets/images/')) return null;
    return candidate;
  }

  try {
    const url = new URL(candidate);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function cloneTokenRange(tokens, start, end) {
  const tokenRange = tokens.slice(start, end);
  tokenRange.links = tokens.links;
  return tokenRange;
}

function markdownWordCount(markdown) {
  const text = String(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>*_~|]/g, ' ');
  return text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length || 0;
}

function createSanitizedRenderer() {
  const renderer = new Renderer();
  const defaultTableRenderer = renderer.table;

  renderer.heading = function renderHeading(token) {
    if (token.depth === 1) {
      throw new Error('Article Markdown must not contain an H1.');
    }
    const id = escapeHtml(token.headingId || slugifyHeading(headingText(token.text)));
    return `<h${token.depth} id="${id}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
  };

  renderer.link = function renderLink(token) {
    const label = this.parser.parseInline(token.tokens);
    const href = safeMarkdownUrl(token.href);
    if (!href) return label;
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    const external = /^https?:\/\//i.test(href);
    const externalAttributes = external
      ? ' class="article-prose__external-link" rel="external noreferrer"'
      : '';
    const externalIndicator = external
      ? '<span class="visually-hidden"> (external website)</span><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>'
      : '';
    return `<a href="${escapeHtml(href)}"${title}${externalAttributes}>${label}${externalIndicator}</a>`;
  };

  renderer.image = function renderImage(token) {
    const source = safeMarkdownUrl(token.href, { image: true });
    if (!source) return `<span>${escapeHtml(token.text || '')}</span>`;
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    return `<img src="${escapeHtml(source)}" alt="${escapeHtml(token.text || '')}" loading="lazy" decoding="async"${title}>`;
  };

  renderer.html = function renderRawHtml(token) {
    const escaped = escapeHtml(token.text);
    return token.block
      ? `<p class="article-prose__escaped-html">${escaped}</p>\n`
      : escaped;
  };

  renderer.table = function renderTable(token) {
    return `<div class="article-prose__table-scroll" role="region" aria-label="Scrollable data table" tabindex="0">${defaultTableRenderer.call(this, token)}</div>\n`;
  };

  return renderer;
}

function renderTokenRange(tokens) {
  return marked.parser(tokens, {
    gfm: true,
    breaks: false,
    pedantic: false,
    renderer: createSanitizedRenderer()
  });
}

function validateRenderedMarkdown(html) {
  const forbiddenOutput = /<(?:script|iframe|object|embed|style|base|form)\b|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']\s*(?:javascript|data):/i;
  if (forbiddenOutput.test(html)) {
    throw new Error('Sanitized article Markdown produced forbidden HTML.');
  }
}

export function renderArticleMarkdown(markdown, { midArticleHtml = '' } = {}) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    throw new Error('Article Markdown must be a non-empty string.');
  }

  const tokens = marked.lexer(markdown, {
    gfm: true,
    breaks: false,
    pedantic: false
  });
  const headings = [];
  const headingIds = new Map();
  let previousDepth = 1;

  marked.walkTokens(tokens, (token) => {
    if (token.type !== 'heading') return;
    if (token.depth === 1) {
      throw new Error('Article Markdown must not contain an H1.');
    }
    if (token.depth < 2 || token.depth > 4) {
      throw new Error('Article Markdown headings must use H2, H3, or H4.');
    }
    if (headings.length === 0 && token.depth !== 2) {
      throw new Error('Article Markdown must begin its heading structure at H2.');
    }
    if (token.depth > previousDepth + 1) {
      throw new Error('Article Markdown heading levels must not be skipped.');
    }

    const text = headingText(token.text);
    const baseId = slugifyHeading(text);
    const occurrence = (headingIds.get(baseId) || 0) + 1;
    headingIds.set(baseId, occurrence);
    token.headingId = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
    headings.push(Object.freeze({
      depth: token.depth,
      id: token.headingId,
      text
    }));
    previousDepth = token.depth;
  });

  if (headings.length === 0 || !headings.some((heading) => heading.depth === 2)) {
    throw new Error('Article Markdown must include at least one descriptive H2 section.');
  }

  const topLevelH2Indexes = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.type === 'heading' && token.depth === 2)
    .map(({ index }) => index);
  const boundaryIndex = topLevelH2Indexes[ARTICLE_MID_AD_AFTER_SECTIONS] ?? -1;
  const sufficientEditorialLead = boundaryIndex > 0 && markdownWordCount(
    cloneTokenRange(tokens, 0, boundaryIndex).map((token) => token.raw || '').join('\n')
  ) >= 150;
  const shouldInsertMidArticleAd = Boolean(midArticleHtml) && sufficientEditorialLead;

  let html;
  if (shouldInsertMidArticleAd) {
    const beforeAd = renderTokenRange(cloneTokenRange(tokens, 0, boundaryIndex));
    const afterAd = renderTokenRange(cloneTokenRange(tokens, boundaryIndex));
    html = `${beforeAd}\n${midArticleHtml}\n${afterAd}`;
  } else {
    html = renderTokenRange(tokens);
  }

  validateRenderedMarkdown(html);
  return Object.freeze({
    html,
    headings: Object.freeze(headings),
    midArticleAdInserted: shouldInsertMidArticleAd,
    sanitizer: 'marked-custom-allowlist-renderer'
  });
}

function tagOverlapCount(article, currentArticle) {
  const currentTags = new Set(
    (currentArticle.tags || []).map((tag) => String(tag).toLocaleLowerCase('en-US'))
  );
  return (article.tags || []).filter(
    (tag) => currentTags.has(String(tag).toLocaleLowerCase('en-US'))
  ).length;
}

export function selectRelatedArticles(
  currentArticle,
  publishedArticles,
  categories,
  { limit = ARTICLE_RELATED_LIMIT } = {}
) {
  if (!currentArticle || !Array.isArray(publishedArticles) || !Array.isArray(categories)) {
    throw new Error('Related-article selection requires an article, articles, and categories.');
  }
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error('Related-article limit must be a non-negative integer.');
  }

  const category = categories.find((candidate) => candidate.slug === currentArticle.category);
  if (!category) throw new Error(`${currentArticle.slug}: controlled category was not found.`);
  const relatedCategoryRanks = new Map(
    category.related_categories.map((slug, index) => [slug, index + 1])
  );
  const candidates = publishedArticles.filter(
    (article) => article.slug !== currentArticle.slug
  );
  const rankedCandidates = candidates.sort((left, right) => {
    const leftRank = left.category === currentArticle.category
      ? 0
      : relatedCategoryRanks.get(left.category) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.category === currentArticle.category
      ? 0
      : relatedCategoryRanks.get(right.category) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;

    const overlapDifference =
      tagOverlapCount(right, currentArticle) - tagOverlapCount(left, currentArticle);
    if (overlapDifference !== 0) return overlapDifference;
    return compareArticles(left, right);
  });

  return Object.freeze(rankedCandidates.slice(0, limit));
}

export function createArticlePageModels(publishedArticles, categories) {
  if (!Array.isArray(publishedArticles) || !Array.isArray(categories)) {
    throw new Error('Article-page generation requires published articles and categories.');
  }
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

  return Object.freeze(
    publishedArticles.map((article) => {
      const category = categoryBySlug.get(article.category);
      if (!category) throw new Error(`${article.slug}: controlled category was not found.`);
      return Object.freeze({
        article,
        category,
        route: `/articles/${article.slug}/`,
        relatedArticles: selectRelatedArticles(article, publishedArticles, categories)
      });
    })
  );
}
