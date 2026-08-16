import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const APPROVED_CATEGORIES = Object.freeze([
  { slug: 'criminal-law', name: 'Criminal Law', icon: 'fa-scale-balanced' },
  { slug: 'family-law', name: 'Family Law', icon: 'fa-people-roof' },
  { slug: 'business-law', name: 'Business Law', icon: 'fa-briefcase' },
  { slug: 'employment-law', name: 'Employment Law', icon: 'fa-user-tie' },
  { slug: 'personal-injury', name: 'Personal Injury', icon: 'fa-kit-medical' },
  {
    slug: 'real-estate-property-law',
    name: 'Real Estate & Property Law',
    icon: 'fa-house'
  },
  { slug: 'immigration-law', name: 'Immigration Law', icon: 'fa-passport' },
  { slug: 'consumer-law', name: 'Consumer Law', icon: 'fa-receipt' },
  { slug: 'civil-rights', name: 'Civil Rights', icon: 'fa-handshake' },
  {
    slug: 'legal-news-updates',
    name: 'Legal News & Updates',
    icon: 'fa-newspaper'
  }
]);

export const CATEGORY_NAMES = new Map(
  APPROVED_CATEGORIES.map((category) => [category.slug, category.name])
);

function parseScalar(value) {
  const trimmedValue = value.trim();
  if (trimmedValue === 'true') return true;
  if (trimmedValue === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmedValue)) return Number(trimmedValue);
  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }
  if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
    return trimmedValue
      .slice(1, -1)
      .split(',')
      .map((item) => parseScalar(item))
      .filter(Boolean);
  }
  return trimmedValue;
}

function parseIndentedList(lines, startIndex, fieldName, fileName) {
  const records = [];
  let index = startIndex;
  let currentRecord = null;

  while (index < lines.length && (/^\s/.test(lines[index]) || !lines[index].trim())) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) {
      index += 1;
      continue;
    }

    const itemMatch = line.match(/^\s{2}-\s*(.*)$/);
    const propertyMatch = line.match(/^\s{4}([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (itemMatch) {
      const itemValue = itemMatch[1];
      const firstProperty = itemValue.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (firstProperty) {
        currentRecord = { [firstProperty[1]]: parseScalar(firstProperty[2]) };
        records.push(currentRecord);
      } else {
        currentRecord = null;
        records.push(parseScalar(itemValue));
      }
    } else if (propertyMatch && currentRecord) {
      if (Object.hasOwn(currentRecord, propertyMatch[1])) {
        throw new Error(
          `${fileName}: duplicate ${fieldName}.${propertyMatch[1]} property`
        );
      }
      currentRecord[propertyMatch[1]] = parseScalar(propertyMatch[2]);
    } else {
      throw new Error(`${fileName}: unsupported nested YAML in ${fieldName}`);
    }
    index += 1;
  }

  return { value: records, nextIndex: index };
}

export function parseArticleSource(source, fileName = 'article.md') {
  const normalizedSource = source.replaceAll('\r\n', '\n');
  const frontMatterMatch = normalizedSource.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!frontMatterMatch) throw new Error(`${fileName}: missing valid YAML front matter`);

  const frontMatter = {};
  const lines = frontMatterMatch[1].split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) {
      index += 1;
      continue;
    }
    if (/^\s/.test(line)) {
      throw new Error(`${fileName}: unexpected indented YAML at line ${index + 2}`);
    }

    const fieldMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!fieldMatch) {
      throw new Error(`${fileName}: invalid front-matter field at line ${index + 2}`);
    }
    const [, fieldName, fieldValue] = fieldMatch;
    if (Object.hasOwn(frontMatter, fieldName)) {
      throw new Error(`${fileName}: duplicate front-matter field ${fieldName}`);
    }

    if (fieldValue === '') {
      const nestedList = parseIndentedList(lines, index + 1, fieldName, fileName);
      frontMatter[fieldName] = nestedList.value;
      index = nestedList.nextIndex;
    } else {
      frontMatter[fieldName] = parseScalar(fieldValue);
      index += 1;
    }
  }

  return {
    ...frontMatter,
    body: frontMatterMatch[2].trim(),
    sourceFile: fileName
  };
}

export function calculateWordCount(markdown) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>*_~|]/g, ' ');
  return plainText.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length || 0;
}

export function calculateReadingTime(markdown) {
  return Math.max(1, Math.ceil(calculateWordCount(markdown) / 225));
}

export function compareArticles(articleA, articleB) {
  const dateDifference = Date.parse(articleB.publish_date) - Date.parse(articleA.publish_date);
  if (dateDifference !== 0) return dateDifference;
  const titleDifference = articleA.title.localeCompare(articleB.title, 'en-US');
  if (titleDifference !== 0) return titleDifference;
  return articleA.slug.localeCompare(articleB.slug, 'en-US');
}

export function selectHomeContent(articles) {
  const orderedArticles = [...articles].sort(compareArticles);
  const explicitlyFeatured = orderedArticles.filter((article) => article.featured === true);
  const hero = explicitlyFeatured.at(0) || orderedArticles.at(0) || null;

  return {
    hero,
    heroReason: hero
      ? explicitlyFeatured.length > 0
        ? 'explicit-featured'
        : 'newest-published-fallback'
      : 'no-eligible-article',
    featuredGridCandidates: hero
      ? explicitlyFeatured.filter((article) => article.slug !== hero.slug)
      : explicitlyFeatured,
    excludedFromFeaturedGrid: hero ? [hero.slug] : []
  };
}

export function selectLatestArticles(
  articles,
  { excludeSlugs = [], limit = 6 } = {}
) {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error('Latest article limit must be a non-negative integer.');
  }

  const orderedArticles = [...articles].sort(compareArticles);
  const exclusionSet = new Set(excludeSlugs);
  const preferredArticles = orderedArticles.filter(
    (article) => !exclusionSet.has(article.slug)
  );
  const fallbackArticles = orderedArticles.filter((article) =>
    exclusionSet.has(article.slug)
  );

  return [...preferredArticles, ...fallbackArticles].slice(0, limit);
}

export async function loadCategories(projectRoot) {
  const categoryDirectory = path.join(projectRoot, 'content/categories');
  const fileNames = (await readdir(categoryDirectory))
    .filter((fileName) => fileName.endsWith('.md'))
    .sort();
  const approvedCategoryMap = new Map(
    APPROVED_CATEGORIES.map((category, index) => [
      category.slug,
      { ...category, order: index + 1 }
    ])
  );
  const categories = [];
  const validationProblems = [];

  if (fileNames.length !== APPROVED_CATEGORIES.length) {
    validationProblems.push(
      `expected exactly ${APPROVED_CATEGORIES.length} category files, found ${fileNames.length}`
    );
  }

  for (const fileName of fileNames) {
    const source = await readFile(path.join(categoryDirectory, fileName), 'utf8');
    const category = parseArticleSource(source, fileName);
    const approvedCategory = approvedCategoryMap.get(category.slug);

    for (const field of [
      'name',
      'slug',
      'description',
      'icon',
      'order',
      'related_categories'
    ]) {
      if (category[field] === undefined || category[field] === '') {
        validationProblems.push(`${fileName}: missing ${field}`);
      }
    }
    if (category.slug && fileName !== `${category.slug}.md`) {
      validationProblems.push(`${fileName}: file name must match the locked category slug`);
    }
    if (category.slug && !approvedCategory) {
      validationProblems.push(`${fileName}: unapproved category slug ${category.slug}`);
    }
    if (approvedCategory && category.name !== approvedCategory.name) {
      validationProblems.push(
        `${fileName}: category name must remain ${approvedCategory.name}`
      );
    }
    if (approvedCategory && category.icon !== approvedCategory.icon) {
      validationProblems.push(
        `${fileName}: icon must be the approved ${approvedCategory.icon}`
      );
    }
    if (
      typeof category.description === 'string' &&
      (category.description.length < 100 || category.description.length > 260)
    ) {
      validationProblems.push(
        `${fileName}: description must be approximately 140–240 characters`
      );
    }
    if (
      approvedCategory &&
      (!Number.isInteger(category.order) || category.order !== approvedCategory.order)
    ) {
      validationProblems.push(
        `${fileName}: order must be the locked value ${approvedCategory.order}`
      );
    }

    categories.push({
      ...category,
      route: category.slug ? `/categories/${category.slug}/` : ''
    });
  }

  const categorySlugs = categories.map((category) => category.slug).filter(Boolean);
  const categoryNames = categories.map((category) => category.name).filter(Boolean);
  const categoryOrders = categories.map((category) => category.order);
  if (new Set(categorySlugs).size !== categorySlugs.length) {
    validationProblems.push('category slugs must be unique');
  }
  if (new Set(categoryNames).size !== categoryNames.length) {
    validationProblems.push('category names must be unique');
  }
  if (new Set(categoryOrders).size !== categoryOrders.length) {
    validationProblems.push('category order values must be unique');
  }
  for (const approvedCategory of APPROVED_CATEGORIES) {
    if (!categorySlugs.includes(approvedCategory.slug)) {
      validationProblems.push(`missing approved category ${approvedCategory.slug}`);
    }
  }
  for (const category of categories) {
    if (!Array.isArray(category.related_categories)) {
      validationProblems.push(`${category.sourceFile}: related_categories must be an array`);
      continue;
    }
    if (category.related_categories.length !== 3) {
      validationProblems.push(
        `${category.sourceFile}: exactly three editorially related categories are required`
      );
    }
    if (new Set(category.related_categories).size !== category.related_categories.length) {
      validationProblems.push(`${category.sourceFile}: related categories must be unique`);
    }
    for (const relatedSlug of category.related_categories) {
      if (!approvedCategoryMap.has(relatedSlug)) {
        validationProblems.push(
          `${category.sourceFile}: unknown related category ${relatedSlug}`
        );
      }
      if (relatedSlug === category.slug) {
        validationProblems.push(`${category.sourceFile}: a category cannot relate to itself`);
      }
    }
  }

  if (validationProblems.length > 0) {
    throw new Error(
      `Category validation failed:\n- ${validationProblems.join('\n- ')}`
    );
  }

  return categories.sort(
    (categoryA, categoryB) =>
      categoryA.order - categoryB.order ||
      categoryA.slug.localeCompare(categoryB.slug, 'en-US')
  );
}

function citationUrlIsValid(value) {
  try {
    const url = new URL(value);
    return (
      value === value.trim() &&
      url.protocol === 'https:' &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function validateArticle(article, buildDate) {
  const problems = [];
  if (!article.status) problems.push('missing status');
  if (article.status !== 'published') return { eligible: false, problems };
  for (const field of [
    'title',
    'slug',
    'publish_date',
    'author',
    'category',
    'tags',
    'featured_image',
    'featured_image_alt',
    'social_image',
    'excerpt',
    'meta_description',
    'sources'
  ]) {
    if (!article[field] || (Array.isArray(article[field]) && article[field].length === 0)) {
      problems.push(`missing ${field}`);
    }
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || '')) {
    problems.push('slug must use lowercase ASCII words separated by hyphens');
  }
  if (article.slug && article.sourceFile !== `${article.slug}.md`) {
    problems.push('file name must match the article slug');
  }
  if (!CATEGORY_NAMES.has(article.category)) problems.push(`invalid category ${article.category}`);

  const publishedTime = Date.parse(article.publish_date);
  if (!Number.isFinite(publishedTime)) problems.push('invalid publish_date');
  if (publishedTime > buildDate.getTime()) return { eligible: false, problems };

  if (article.updated_date) {
    const updatedTime = Date.parse(article.updated_date);
    if (!Number.isFinite(updatedTime)) problems.push('invalid updated_date');
    if (Number.isFinite(updatedTime) && updatedTime < publishedTime) {
      problems.push('updated_date cannot precede publish_date');
    }
    if (Number.isFinite(updatedTime) && updatedTime > buildDate.getTime()) {
      problems.push('updated_date cannot be in the future');
    }
  }
  if (article.excerpt?.length > 160) problems.push('excerpt exceeds 160 characters');
  if (article.meta_description?.length > 155) {
    problems.push('meta_description exceeds 155 characters');
  }
  if (article.featured_image_alt?.trim().length < 12) problems.push('image alt text is too short');
  for (const imageField of ['featured_image', 'social_image']) {
    if (
      article[imageField] &&
      !/^\/assets\/images\/[a-zA-Z0-9/_-]+\.jpg$/.test(article[imageField])
    ) {
      problems.push(`${imageField} must reference a local JPEG in /assets/images/`);
    }
  }

  if (!Array.isArray(article.tags)) {
    problems.push('tags must be an array');
  } else {
    const normalizedTags = article.tags.map((tag) => String(tag).trim().toLocaleLowerCase('en-US'));
    if (article.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) {
      problems.push('tags must contain non-empty text values');
    }
    if (new Set(normalizedTags).size !== article.tags.length) {
      problems.push('tags must be unique');
    }
  }

  if (!Array.isArray(article.sources)) {
    problems.push('sources must be a structured list');
  } else {
    article.sources.forEach((source, index) => {
      const sourceNumber = index + 1;
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        problems.push(`source ${sourceNumber} must be a structured citation`);
        return;
      }
      if (typeof source.label !== 'string' || !source.label.trim()) {
        problems.push(`source ${sourceNumber} is missing label`);
      }
      if (typeof source.url !== 'string' || !citationUrlIsValid(source.url)) {
        problems.push(`source ${sourceNumber} has a malformed HTTPS URL`);
      }
      for (const dateField of ['publication_date', 'access_date']) {
        if (source[dateField] && !Number.isFinite(Date.parse(source[dateField]))) {
          problems.push(`source ${sourceNumber} has an invalid ${dateField}`);
        }
      }
    });
  }

  if (!article.body) problems.push('missing article body');
  if (/^ {0,3}#(?:\s|$)/m.test(article.body || '')) {
    problems.push('article body must not contain an H1');
  }
  return { eligible: problems.length === 0, problems };
}

export async function loadPublishedArticles(projectRoot, buildDate = new Date()) {
  const articleDirectory = path.join(projectRoot, 'content/articles');
  const fileNames = (await readdir(articleDirectory))
    .filter((fileName) => fileName.endsWith('.md'))
    .sort();
  const articles = [];
  const validationProblems = [];

  for (const fileName of fileNames) {
    const source = await readFile(path.join(articleDirectory, fileName), 'utf8');
    const article = parseArticleSource(source, fileName);
    article.categoryName = CATEGORY_NAMES.get(article.category);
    article.wordCount = calculateWordCount(article.body);
    article.readingTime = calculateReadingTime(article.body);
    article.route = article.slug ? `/articles/${article.slug}/` : '';
    const validation = validateArticle(article, buildDate);
    if (validation.eligible) articles.push(article);
    if (validation.problems.length > 0) {
      validationProblems.push(
        ...validation.problems.map((problem) => `${fileName}: ${problem}`)
      );
    }
  }

  const eligibleSlugs = articles.map((article) => article.slug);
  if (new Set(eligibleSlugs).size !== eligibleSlugs.length) {
    validationProblems.push('published article slugs must be unique');
  }

  if (validationProblems.length > 0) {
    throw new Error(`Article validation failed:\n- ${validationProblems.join('\n- ')}`);
  }

  return articles.sort(compareArticles);
}

export async function readJpegDimensions(filePath) {
  const image = await readFile(filePath);
  if (image[0] !== 0xff || image[1] !== 0xd8) throw new Error(`${filePath}: not a JPEG image`);
  let offset = 2;

  while (offset < image.length) {
    if (image[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = image[offset + 1];
    const segmentLength = image.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        width: image.readUInt16BE(offset + 7),
        height: image.readUInt16BE(offset + 5)
      };
    }
    if (!segmentLength) break;
    offset += segmentLength + 2;
  }

  throw new Error(`${filePath}: JPEG dimensions could not be read`);
}
