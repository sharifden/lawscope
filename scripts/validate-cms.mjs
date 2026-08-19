import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { APPROVED_CATEGORIES } from './content-graph.mjs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseDocument, stringify } from 'yaml';
import { loadCategories, loadPublishedArticles } from './content-graph.mjs';
import { loadSiteSettings } from './site-settings.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relative = (filePath) => path.join(projectRoot, filePath);
const completedChecks = [];

function check(condition, message) {
  assert.ok(condition, message);
}

function record(label) {
  completedChecks.push(label);
}

function names(fields) {
  return fields.map((field) => field.name);
}

function fieldMap(fields) {
  return new Map(fields.map((field) => [field.name, field]));
}

function expectExactNames(actualFields, expectedNames, context) {
  assert.deepEqual(
    [...names(actualFields)].sort(),
    [...expectedNames].sort(),
    `${context} fields must match the build-compatible schema`
  );
}

function optionValues(field) {
  return (field.options || []).map((option) =>
    typeof option === 'string' ? option : option.value
  );
}

function validateBackend(config) {
  assert.equal(config.backend?.name, 'git-gateway', 'CMS backend must use Git Gateway');
  assert.equal(config.backend?.branch, 'main', 'CMS must target the protected main branch');
  assert.equal(config.publish_mode, 'editorial_workflow', 'Editorial Workflow must be enabled');
  check(config.open_authoring !== true, 'Open authoring must remain disabled');
  check(config.local_backend !== true, 'The production CMS must not expose the local backend');

  const identityUrl = new URL(config.backend.identity_url);
  const gatewayUrl = new URL(config.backend.gateway_url);
  for (const url of [identityUrl, gatewayUrl]) {
    assert.equal(url.protocol, 'https:', 'Companion placeholders must use HTTPS');
    check(url.hostname.endsWith('.invalid'), 'Unprovisioned companion endpoints must use .invalid');
    check(!url.username && !url.password, 'Companion URLs must not contain credentials');
  }
  assert.equal(identityUrl.pathname, '/.netlify/identity');
  assert.equal(gatewayUrl.pathname, '/.netlify/git/github');
  assert.deepEqual(Object.keys(config.backend.commit_messages), [
    'create',
    'update',
    'delete',
    'uploadMedia',
    'deleteMedia'
  ]);
  for (const message of Object.values(config.backend.commit_messages)) {
    check(message.startsWith('cms: '), 'CMS commits must use an auditable prefix');
  }
  record('Git Gateway, protected branch, safe placeholder endpoints, auditable commits, and Editorial Workflow');
}

function validateMediaAndRouting(config) {
  assert.equal(config.site_url, 'https://getlawscope.com');
  assert.equal(config.display_url, 'https://getlawscope.com');
  assert.equal(config.media_folder, 'assets/images');
  assert.equal(config.public_folder, '/assets/images');
  assert.deepEqual(config.slug, {
    encoding: 'ascii',
    clean_accents: true,
    sanitize_replacement: '-'
  });
  assert.equal(config.locale, 'en');
  assert.equal(config.show_preview_links, true);
  record('Approved media destinations, public URLs, ASCII slugs, and preview links');
}

function validateArticles(collection) {
  assert.equal(collection.folder, 'content/articles');
  assert.equal(collection.create, true);
  assert.equal(collection.delete, true);
  assert.equal(collection.extension, 'md');
  assert.equal(collection.format, 'frontmatter');
  assert.equal(collection.slug, '{{fields.slug}}');
  assert.equal(collection.preview_path, 'articles/{{fields.slug}}/');

  const expectedNames = [
    'title',
    'slug',
    'publish_date',
    'updated_date',
    'author',
    'category',
    'tags',
    'featured',
    'status',
    'featured_image',
    'featured_image_alt',
    'social_image',
    'excerpt',
    'seo_title',
    'meta_description',
    'sources',
    'body'
  ];
  expectExactNames(collection.fields, expectedNames, 'Article');
  const fields = fieldMap(collection.fields);

  check(
    String(fields.get('slug').pattern?.[0]).includes('[a-z0-9]'),
    'Article slugs must validate lowercase ASCII hyphenation'
  );
  assert.equal(fields.get('category').widget, 'relation');
  assert.equal(fields.get('category').collection, 'categories');
  assert.equal(fields.get('category').value_field, 'slug');
  assert.equal(fields.get('tags').widget, 'list');
  assert.equal(fields.get('tags').min, 1);
  assert.equal(fields.get('featured').widget, 'boolean');
  assert.deepEqual(optionValues(fields.get('status')), ['draft', 'published']);
  assert.equal(fields.get('status').default, 'draft');

  for (const fieldName of ['featured_image', 'social_image']) {
    const field = fields.get(fieldName);
    assert.equal(field.widget, 'image');
    assert.equal(field.choose_url, false);
    assert.equal(field.allow_multiple, false);
    check(
      String(field.pattern?.[0]).startsWith('^/assets/images/'),
      `${fieldName} must enforce approved local image values`
    );
  }
  assert.equal(fields.get('featured_image').media_folder, '/assets/images');
  assert.equal(fields.get('social_image').media_folder, '/assets/images/social');
  assert.equal(fields.get('social_image').public_folder, '/assets/images/social');

  assert.equal(fields.get('excerpt').widget, 'character-counted');
  assert.equal(fields.get('excerpt').max, 160);
  assert.equal(fields.get('meta_description').widget, 'character-counted');
  assert.equal(fields.get('meta_description').max, 155);

  const sources = fields.get('sources');
  assert.equal(sources.widget, 'list');
  assert.equal(sources.required, false, 'Drafts must remain saveable before sources are complete');
  assert.equal(sources.min, 1);
  expectExactNames(
    sources.fields,
    ['label', 'url', 'publisher', 'publication_date', 'access_date'],
    'Article source'
  );
  const sourceFields = fieldMap(sources.fields);
  check(
    String(sourceFields.get('url').pattern?.[0]).startsWith('^https://'),
    'Source citations must require HTTPS'
  );

  const body = fields.get('body');
  assert.equal(body.widget, 'richtext');
  assert.equal(body.sanitize_preview, true);
  assert.deepEqual(body.modes, ['rich_text'], 'Raw body editing must remain unavailable');
  check(body.buttons.includes('heading-two'), 'Article body must offer H2');
  check(body.buttons.includes('heading-three'), 'Article body must offer H3');
  check(!body.buttons.includes('heading-one'), 'Article body must not offer H1');
  assert.deepEqual(body.editor_components, []);
  check(!fields.has('reading_time'), 'Reading time must remain build-controlled');
  check(!fields.has('legal_disclaimer'), 'The exact article disclaimer must remain build-controlled');
  record('Article front matter, required fields, controlled relations, local images, citations, and H2-first body');
}

function validateCategories(collection) {
  assert.equal(collection.folder, 'content/categories');
  assert.equal(collection.create, false);
  assert.equal(collection.delete, false);
  assert.equal(collection.extension, 'md');
  assert.equal(collection.format, 'frontmatter');
  assert.equal(collection.slug, '{{fields.slug}}');
  assert.equal(collection.preview_path, 'categories/{{fields.slug}}/');
  expectExactNames(
    collection.fields,
    ['name', 'slug', 'description', 'icon', 'order', 'related_categories'],
    'Category'
  );

  const fields = fieldMap(collection.fields);
  for (const controlledField of ['name', 'slug', 'icon', 'order']) {
    assert.equal(
      fields.get(controlledField).widget,
      'locked',
      `${controlledField} must be read-only in the controlled category collection`
    );
  }
  assert.equal(fields.get('description').widget, 'character-counted');
  assert.equal(fields.get('description').min, 100);
  assert.equal(fields.get('description').max, 260);

  const related = fields.get('related_categories');
  assert.equal(related.widget, 'relation');
  assert.equal(related.collection, 'categories');
  assert.equal(related.value_field, 'slug');
  assert.equal(related.multiple, true);
  assert.equal(related.min, 1);
  assert.equal(related.max, 3);
  record('Non-creatable controlled categories with locked taxonomy and 1-3 relations');
}

function validateSettings(collection) {
  assert.equal(collection.delete, false);
  assert.equal(collection.files.length, 1, 'Settings must expose one singleton only');
  const file = collection.files[0];
  assert.equal(file.name, 'site');
  assert.equal(file.file, 'content/settings/site.json');
  assert.equal(file.format, 'json');
  expectExactNames(
    file.fields,
    ['site_title', 'site_tagline', 'social_profiles', 'newsletter', 'contact', 'consent', 'analytics', 'advertising'],
    'Site settings'
  );

  const root = fieldMap(file.fields);
  expectExactNames(root.get('social_profiles').fields, ['x', 'facebook', 'linkedin'], 'Social profiles');
  expectExactNames(
    root.get('newsletter').fields,
    ['enabled', 'endpoint', 'provider', 'double_opt_in'],
    'Newsletter settings'
  );
  expectExactNames(root.get('contact').fields, ['enabled', 'endpoint', 'provider'], 'Contact settings');
  expectExactNames(
    root.get('consent').fields,
    ['mode', 'provider', 'revision', 'google_certified_cmp'],
    'Consent settings'
  );
  expectExactNames(root.get('analytics').fields, ['enabled', 'measurement_id'], 'Analytics settings');
  expectExactNames(
    root.get('advertising').fields,
    ['enabled', 'account_approved', 'policy_reviewed', 'certified_cmp_ready', 'publisher_id', 'slots'],
    'Advertising settings'
  );

  const newsletter = fieldMap(root.get('newsletter').fields);
  assert.deepEqual(optionValues(newsletter.get('provider')), ['generic-form', 'generic-json']);
  assert.equal(newsletter.get('double_opt_in').widget, 'locked');

  const contact = fieldMap(root.get('contact').fields);
  assert.equal(contact.get('provider').widget, 'locked');
  check(
    String(contact.get('endpoint').pattern?.[0]).startsWith('^/api/'),
    'Contact endpoint must remain same-origin under /api/'
  );

  const consent = fieldMap(root.get('consent').fields);
  for (const lockedField of ['mode', 'provider', 'google_certified_cmp']) {
    assert.equal(consent.get(lockedField).widget, 'locked');
  }
  assert.equal(consent.get('revision').value_type, 'int');
  assert.equal(consent.get('revision').min, 1);

  const analytics = fieldMap(root.get('analytics').fields);
  assert.equal(analytics.get('enabled').widget, 'boolean');
  assert.equal(analytics.get('measurement_id').widget, 'string');
  assert.equal(analytics.get('measurement_id').pattern?.[0], '^G-[A-Z0-9]{10}$');

  const advertising = fieldMap(root.get('advertising').fields);
  for (const readinessField of [
    'enabled',
    'account_approved',
    'policy_reviewed',
    'certified_cmp_ready'
  ]) {
    assert.equal(advertising.get(readinessField).widget, 'boolean');
    assert.equal(advertising.get(readinessField).required, true);
  }
  assert.equal(advertising.get('publisher_id').widget, 'string');
  assert.equal(advertising.get('publisher_id').pattern?.[0], '^ca-pub-[0-9]{16}$');
  expectExactNames(
    advertising.get('slots').fields,
    [
      'home_below_featured',
      'articles_in_feed',
      'categories_overview',
      'category_in_feed',
      'article_mid',
      'article_sidebar',
      'article_end'
    ],
    'Advertising slots'
  );
  for (const slot of advertising.get('slots').fields) {
    assert.equal(slot.widget, 'string');
    assert.equal(slot.required, true);
    assert.equal(slot.pattern?.[0], '^[0-9]{10}$');
  }
  check(
    String(advertising.get('certified_cmp_ready').hint).includes('local preference center alone is not a certified CMP'),
    'Advertising CMP readiness must not imply that the local preference center is certified'
  );

  const serialized = JSON.stringify(collection);
  check(!serialized.includes('privacy-policy.json'), 'Privacy Policy settings must retain their review gate');
  check(!serialized.includes('legal-disclaimer.json'), 'Legal Disclaimer settings must retain their review gate');
  record('Singleton JSON site settings with guarded providers, consent, analytics, contact, and legal-file exclusions');
}

function executeCmsClient(client, companionOrigin, currentIdentityUser = null, pageOrigin = '') {
  const registrations = {
    widgets: new Map(),
    templates: new Map(),
    styles: []
  };
  const initCalls = [];
  const identityCalls = [];
  const identityEvents = new Map();
  let logoutCalls = 0;
  const boundaryText = { textContent: '' };
  const boundary = {
    hidden: null,
    classList: { add() {} },
    querySelector(selector) {
      return selector === '.cms-boundary__title' || selector === '.cms-boundary__copy'
        ? boundaryText
        : null;
    }
  };
  const CMS = {
    registerWidget(name, control, preview, schema) {
      registrations.widgets.set(name, { control, preview, schema });
    },
    registerPreviewTemplate(name, template) {
      registrations.templates.set(name, template);
    },
    registerPreviewStyle(style) {
      registrations.styles.push(style);
    }
  };
  const window = {
    CMS,
    createClass: (definition) => definition,
    h: (element, props, ...children) => ({ element, props, children }),
    initCMS: (options) => initCalls.push(options),
    location: {
      origin: pageOrigin,
      hash: ''
    },
    netlifyIdentity: {
      init: (options) => identityCalls.push(options),
      on: (event, handler) => identityEvents.set(event, handler),
      currentUser: () => currentIdentityUser,
      logout: () => {
        logoutCalls += 1;
        return Promise.resolve();
      }
    }
  };
  const document = {
    querySelector(selector) {
      if (selector === 'meta[name="cms-companion-origin"]') {
        return { content: companionOrigin };
      }
      if (selector === '[data-cms-auth-boundary]') return boundary;
      return null;
    }
  };
  vm.runInNewContext(client, {
    window,
    document,
    URL,
    Intl,
    Date,
    console: { log() {}, warn() {}, error() {} }
  });
  return {
    registrations,
    initCalls,
    identityCalls,
    identityEvents,
    get logoutCalls() { return logoutCalls; },
    boundary,
    boundaryText
  };
}

async function validateAdminShell() {
  const [html, manualInit, client, shellCss, previewCss, vercelSource] = await Promise.all([
    readFile(relative('admin/index.html'), 'utf8'),
    readFile(relative('admin/cms-manual-init.js'), 'utf8'),
    readFile(relative('admin/cms.js'), 'utf8'),
    readFile(relative('admin/cms-shell.css'), 'utf8'),
    readFile(relative('admin/cms-preview.css'), 'utf8'),
    readFile(relative('vercel.json'), 'utf8')
  ]);

  check(/<meta\s+name="robots"\s+content="noindex, nofollow, noarchive">/.test(html), 'Admin must be noindex');
  check(html.includes('content="{{CMS_ADMIN_CSP}}"'), 'Admin source must contain the build-controlled CSP token');
  check(/<script src="\/admin\/cms-manual-init\.js" defer><\/script>/.test(html), 'Admin must load the local manual-initialization guard');
  check(/window\.CMS_MANUAL_INIT\s*=\s*true/.test(manualInit), 'Manual CMS initialization must be enabled externally');
  check(html.indexOf('cms-manual-init.js') < html.indexOf('decap-cms@3.15.1'), 'Manual initialization guard must precede the CMS bundle');
  check(/<script src="\/admin\/cms-identity-init\.js" defer><\/script>/.test(html), 'Admin must initialize Identity before Decap CMS loads');
  check(html.indexOf('netlify-identity-widget@2.0.3') < html.indexOf('cms-identity-init.js'), 'Identity init must run after the pinned widget');
  check(html.indexOf('cms-identity-init.js') < html.indexOf('decap-cms@3.15.1'), 'Identity must be initialized before Decap can call init() without an APIUrl');
  check(/netlify-identity-widget@2\.0\.3/.test(html), 'Identity widget must be pinned to 2.0.3');
  check(/decap-cms@3\.15\.1/.test(html), 'Decap CMS must be pinned to 3.15.1');
  check(
    html.includes('sha384-MDUpeNysRoXS3J89jBylG2fdrQQ0dwDBTXhXGt3XQCgsFF92tnRKZS5vCKNs3XhD'),
    'Identity widget integrity must match the pinned asset'
  );
  check(
    html.includes('sha384-in6eHztHveqQ7uMZ1fDaKlDmacQLFuLH2wWrFTiymyuS8zQ5bixwL8U3AeRi8h/L'),
    'Decap CMS integrity must match the pinned asset'
  );
  assert.equal((html.match(/\sintegrity="sha384-[^"]+"/g) || []).length, 2, 'Both pinned CDN scripts need SHA-384 integrity');
  assert.equal((html.match(/\scrossorigin="anonymous"/g) || []).length, 2);
  assert.equal((html.match(/\sreferrerpolicy="no-referrer"/g) || []).length, 2);
  check(/<script src="\/admin\/cms\.js" defer><\/script>/.test(html), 'Local CMS client must be deferred');
  check(
    /name="cms-companion-origin"[\s\S]*?content="\{\{CMS_COMPANION_ORIGIN\}\}"/.test(html),
    'Admin source must use the build-controlled Module 32 companion-origin token'
  );
  check(!/<(?:nav|footer)\b/i.test(html), 'Admin must not include public navigation or footer landmarks');
  check(!/(data-ad-slot|googletag|adsbygoogle|google-analytics|gtag\s*\()/i.test(html), 'Admin must not include advertising or analytics');

  const vercel = JSON.parse(vercelSource);
  const adminHeaderRule = vercel.headers.find((rule) => rule.source === '/admin/(.*)');
  check(adminHeaderRule, 'Vercel must define defense-in-depth headers for /admin/');
  const adminHeaders = new Map(adminHeaderRule.headers.map((header) => [header.key, header.value]));
  assert.equal(adminHeaders.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
  assert.equal(adminHeaders.get('Cache-Control'), 'private, no-store');
  assert.equal(adminHeaders.get('Referrer-Policy'), 'no-referrer');
  assert.equal(adminHeaders.get('X-Frame-Options'), 'DENY');
  check(
    adminHeaders.get('Content-Security-Policy').includes("frame-ancestors 'none'"),
    'Admin response headers must prevent framing'
  );

  for (const requiredRegistration of [
    "registerWidget(\n      'character-counted'",
    "registerWidget('locked'",
    "registerPreviewTemplate('articles'",
    "registerPreviewTemplate('categories'",
    "registerPreviewTemplate('site'",
    "registerPreviewStyle('/admin/cms-preview.css')"
  ]) {
    check(client.includes(requiredRegistration), `Missing CMS extension: ${requiredRegistration}`);
  }
  check(client.includes("const UNPROVISIONED_SUFFIX = '.invalid'"), 'Runtime companion overrides must reject placeholder origins');
  check(client.includes("const REQUIRED_EDITOR_ROLE = 'lawscope-editor'"), 'CMS client must enforce the account-level editor role in depth');
  check(client.includes("identity.on('login', denyUnauthorizedUser)"), 'CMS client must reject signed-in users without the editor role');
  check(client.includes('window.initCMS({'), 'Provisioned companions must override configuration during manual initialization');
  check(client.includes('window.initCMS();'), 'Unprovisioned admin must still initialize the editor schema safely');
  check(client.includes('Line breaks are not supported in this field.'), 'Character-counted fields must reject parser-incompatible line breaks');
  check(client.includes('LEGAL_DISCLAIMER'), 'Article preview must include the build-controlled legal-information notice');

  const unprovisioned = executeCmsClient(client, '');
  assert.equal(unprovisioned.initCalls.length, 1);
  assert.equal(unprovisioned.initCalls[0], undefined, 'Unprovisioned CMS must use the safe static placeholder');
  assert.equal(unprovisioned.identityCalls.length, 0);
  assert.equal(unprovisioned.boundary.hidden, false);
  assert.deepEqual([...unprovisioned.registrations.widgets.keys()], ['character-counted', 'locked']);
  assert.deepEqual([...unprovisioned.registrations.templates.keys()], ['articles', 'categories', 'site']);
  assert.deepEqual(unprovisioned.registrations.styles, ['/admin/cms-preview.css']);

  const countedControl = unprovisioned.registrations.widgets.get('character-counted').control;
  const countedField = {
    get(key) {
      return { max: 10, min: 3, required: true }[key];
    }
  };
  assert.equal(countedControl.isValid.call({ props: { value: 'Valid', field: countedField } }), true);
  const multilineResult = countedControl.isValid.call({ props: { value: 'Bad\nline', field: countedField } });
  assert.equal(multilineResult.error.message, 'Line breaks are not supported in this field.');
  const longResult = countedControl.isValid.call({ props: { value: '12345678901', field: countedField } });
  assert.equal(longResult.error.message, 'Use no more than 10 characters.');

  const invalidOrigin = executeCmsClient(client, 'https://lawscope-cms-companion.invalid');
  assert.equal(invalidOrigin.initCalls[0], undefined, 'Reserved .invalid origins must never override the backend');
  assert.equal(invalidOrigin.identityCalls.length, 0);

  const provisioned = executeCmsClient(client, 'https://example.com');
  assert.equal(provisioned.boundary.hidden, true);
  assert.equal(provisioned.identityCalls[0].APIUrl, 'https://example.com/.netlify/identity');
  assert.equal(
    provisioned.initCalls[0].config.backend.identity_url,
    'https://example.com/.netlify/identity'
  );
  assert.equal(
    provisioned.initCalls[0].config.backend.gateway_url,
    'https://example.com/.netlify/git/github'
  );
  check(provisioned.identityEvents.has('login'), 'Provisioned CMS must register a login role boundary');

  const production = executeCmsClient(
    client,
    'https://getlawscope.com',
    null,
    'https://getlawscope.com'
  );
  assert.equal(
    production.identityCalls[0].APIUrl,
    'https://getlawscope.com/.netlify/identity'
  );
  assert.equal(
    production.initCalls[0].config.backend.identity_url,
    'https://getlawscope.com/.netlify/identity'
  );
  assert.equal(
    production.initCalls[0].config.backend.gateway_url,
    'https://getlawscope.com/.netlify/git/github'
  );

  const unauthorized = executeCmsClient(client, 'https://example.com', {
    app_metadata: { roles: ['unrelated-role'] }
  });
  assert.equal(unauthorized.initCalls.length, 0, 'A signed-in user without lawscope-editor must not enter the CMS');
  assert.equal(unauthorized.logoutCalls, 1, 'A signed-in user without the editor role must be logged out');
  assert.equal(unauthorized.boundary.hidden, false);

  const authorized = executeCmsClient(client, 'https://example.com', {
    app_metadata: { roles: ['lawscope-editor'] }
  });
  assert.equal(authorized.initCalls.length, 1, 'The individually assigned editor role may initialize the CMS');
  assert.equal(authorized.logoutCalls, 0);

  for (const css of [shellCss, previewCss]) {
    check(css.includes(':root'), 'CMS styles must define reusable custom properties');
    check(css.includes(':focus-visible'), 'CMS styles must preserve visible focus');
    check(css.includes('prefers-reduced-motion: reduce'), 'CMS styles must respect reduced motion');
  }
  record('Restricted noindex admin shell with pinned CDN assets, no ads/analytics/navigation, and accessible local styles');
  record('Custom counted/locked widgets, article/category/settings previews, and safe Module 32 runtime override');
}

async function validateBuildCompatibility() {
  const [categories, articles, settings] = await Promise.all([
    loadCategories(projectRoot),
    loadPublishedArticles(projectRoot, new Date()),
    loadSiteSettings(projectRoot)
  ]);
  assert.equal(
    categories.length,
    APPROVED_CATEGORIES.length,
    'Controlled category content must remain build-valid'
  );
  check(articles.length >= 1, 'Existing article content must remain build-valid');
  check(settings.site_title && settings.consent, 'Existing singleton settings must remain build-valid');

  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'lawscope-cms-'));
  try {
    const fixtureDirectory = path.join(fixtureRoot, 'content/articles');
    await mkdir(fixtureDirectory, { recursive: true });
    const article = {
      title: 'CMS Workflow Compatibility Fixture',
      slug: 'cms-workflow-compatibility-fixture',
      publish_date: '2026-08-16T12:00:00Z',
      updated_date: '2026-08-16T14:00:00Z',
      author: 'The GetLawscope Team',
      category: 'legal-basics',
      tags: ['CMS validation', 'Editorial workflow'],
      featured: false,
      status: 'published',
      featured_image: '/assets/images/what-happens-after-an-arrest-hero.jpg',
      featured_image_alt: 'Organized legal documents used for a CMS compatibility validation.',
      social_image: '/assets/images/social/what-happens-after-an-arrest.jpg',
      excerpt: 'A parser-compatible fixture that exercises every CMS article field before authentication is provisioned.',
      seo_title: 'CMS Workflow Compatibility Fixture | Lawscope',
      meta_description: 'A deterministic fixture confirms that Decap CMS fields serialize into Lawscope’s existing static article build schema.',
      sources: [
        {
          label: 'United States Courts',
          url: 'https://www.uscourts.gov/',
          publisher: 'Administrative Office of the U.S. Courts',
          publication_date: '2026-08-01',
          access_date: '2026-08-16'
        }
      ]
    };
    const frontMatter = stringify(article, { lineWidth: 0 }).trimEnd();
    const source = `---\n${frontMatter}\n---\n\n## Fixture scope\n\nThis neutral fixture confirms that structured citations, dates, tags, local images, and H2-first Markdown pass the existing build parser.\n`;
    await writeFile(path.join(fixtureDirectory, `${article.slug}.md`), source, 'utf8');
    await writeFile(path.join(fixtureDirectory, 'incomplete-draft.md'), '---\nstatus: draft\n---\n', 'utf8');

    const fixtureArticles = await loadPublishedArticles(fixtureRoot, new Date('2026-08-17T00:00:00Z'));
    assert.equal(fixtureArticles.length, 1, 'Published CMS fixture must enter the content graph');
    assert.equal(fixtureArticles[0].slug, article.slug);
    assert.equal(fixtureArticles[0].sources[0].url, article.sources[0].url);
    check(fixtureArticles[0].readingTime >= 1, 'Reading time must still be derived by the build');
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
  record('Existing content and a CMS-shaped published/draft fixture pass build validation');
}

const configSource = await readFile(relative('admin/config.yml'), 'utf8');
const document = parseDocument(configSource, {
  prettyErrors: true,
  strict: true,
  uniqueKeys: true
});
assert.deepEqual(document.errors, [], `admin/config.yml YAML errors: ${document.errors.join('; ')}`);
assert.deepEqual(document.warnings, [], `admin/config.yml YAML warnings: ${document.warnings.join('; ')}`);
const config = document.toJS();
record('Strict YAML parsing with unique keys');

validateBackend(config);
validateMediaAndRouting(config);
assert.deepEqual(
  config.collections.map((collection) => collection.name),
  ['articles', 'categories', 'settings'],
  'Only approved Articles, Categories, and Settings collections may be exposed'
);
const collections = new Map(config.collections.map((collection) => [collection.name, collection]));
validateArticles(collections.get('articles'));
validateCategories(collections.get('categories'));
validateSettings(collections.get('settings'));
await validateAdminShell();
await validateBuildCompatibility();

console.log(`CMS validation passed (${completedChecks.length} groups):`);
for (const label of completedChecks) console.log(`- ${label}`);
