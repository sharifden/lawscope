export const NOT_FOUND_POPULAR_CATEGORY_LIMIT = 5;

// The 404 page lists every controlled category, capped at the layout limit, so the
// page stays correct whether the taxonomy holds two hubs or the full five-plus.
export function resolveNotFoundPopularCategoryCount(categories) {
  if (!Array.isArray(categories) || categories.length < 1) {
    throw new Error('404 popular categories require at least one controlled category');
  }
  return Math.min(NOT_FOUND_POPULAR_CATEGORY_LIMIT, categories.length);
}

export const NOT_FOUND_PAGE = Object.freeze({
  key: 'not-found',
  module: 26,
  sourceTemplate: 'pages/404.html',
  outputFile: '404.html',
  manifestFile: 'data/not-found-page.json',
  title: 'Page Not Found | Lawscope',
  description: 'The requested Lawscope page could not be found. Search legal topics or return to a trusted starting point.',
  robotsDirective: 'noindex, nofollow',
  eyebrow: 'Error 404',
  heading: 'This Page Is Out of Scope',
  copy: 'The address may be outdated, incomplete, or no longer available. Search Lawscope or return to a trusted starting point.',
  primaryAction: Object.freeze({ label: 'Return to Home', route: '/' }),
  secondaryAction: Object.freeze({ label: 'Browse Articles', route: '/articles/' }),
  search: Object.freeze({
    action: '/articles/',
    method: 'get',
    parameter: 'q',
    placeholder: 'Search legal topics'
  }),
  popularHeading: 'Popular categories',
  brokenLinkNote: 'Found this link on Lawscope? Please report it through our Contact page.',
  contactRoute: '/contact/#contact-subject'
});

function validateCategory(category, index) {
  if (!category || typeof category !== 'object') {
    throw new Error(`404 popular category ${index + 1} must be an object`);
  }
  for (const field of ['slug', 'name', 'route']) {
    if (typeof category[field] !== 'string' || !category[field].trim()) {
      throw new Error(`404 popular category ${index + 1} must have a non-empty ${field}`);
    }
  }
  const expectedRoute = `/categories/${category.slug}/`;
  if (category.route !== expectedRoute) {
    throw new Error(`404 popular category ${category.name} must use ${expectedRoute}`);
  }
}

export function selectNotFoundPopularCategories(categories) {
  if (!Array.isArray(categories)) {
    throw new Error('404 popular categories require the validated category collection');
  }
  const popularCategoryCount = resolveNotFoundPopularCategoryCount(categories);

  const selected = categories.slice(0, popularCategoryCount);
  selected.forEach(validateCategory);

  const uniqueSlugs = new Set(selected.map((category) => category.slug));
  if (uniqueSlugs.size !== popularCategoryCount) {
    throw new Error('404 popular category links must be unique');
  }

  return Object.freeze(selected.map((category) => Object.freeze({
    slug: category.slug,
    name: category.name,
    route: category.route
  })));
}
