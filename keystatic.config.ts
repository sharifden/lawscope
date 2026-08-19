import { config, collection, fields, singleton } from '@keystatic/core';

// Modern Keystatic CMS for Lawscope — Git-based, same Markdown files as Decap.
// Storage: local for dev (zero-config). Switch to 'github' or 'cloud' for production team editing.
// Content lives in /content (articles, categories, settings) — no database, full Git audit.
export default config({
  storage: {
    kind: 'local',
    // To enable GitHub-backed editing in production, switch to:
    // kind: 'github',
    // repo: 'sharifden/lawscope',
    // branchPrefix: 'keystatic/'
  },
  ui: {
    brand: { name: 'The GetLawscope Team' },
    navigation: {
      Content: ['articles', 'categories'],
      Settings: ['siteSettings'],
    },
  },
  collections: {
    // ── Articles ── content/articles/*.md with frontmatter + markdown body
    articles: collection({
      label: 'Articles',
      slugField: 'slug',
      path: 'content/articles/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      columns: ['title', 'category', 'status', 'publish_date'],
      previewUrl: '/articles/{slug}/',
      schema: {
        title: fields.text({
          label: 'Article title',
          description: 'Clear, neutral title. 8–100 characters.',
          validation: { length: { min: 8, max: 100 }, isRequired: true },
        }),
        slug: fields.slug({
          name: {
            label: 'URL slug',
            description: 'Lowercase letters, numbers, single hyphens only. Changing after publish needs a redirect.',
            validation: { isRequired: true },
          },
          slug: {
            // generate from title by default
          },
        }),
        publish_date: fields.datetime({
          label: 'Publication date and time (UTC)',
          description: 'Stored in UTC. Do not use a future date when status is Published.',
          validation: { isRequired: true },
          defaultValue: { kind: 'now' },
        }),
        updated_date: fields.datetime({
          label: 'Last substantive update',
          description: 'Leave empty unless substantively updated. Cannot precede publish_date or be in future.',
        }),
        author: fields.text({
          label: 'Author name',
          description: 'Truthful byline. Default: The GetLawscope Team',
          defaultValue: 'The GetLawscope Team',
          validation: { isRequired: true },
        }),
        category: fields.relationship({
          label: 'Primary category',
          description: 'Choose one controlled category. Stored as its slug.',
          collection: 'categories',
          validation: { isRequired: true },
        }),
        tags: fields.array(
          fields.text({
            label: 'Tag',
            validation: { isRequired: true },
          }),
          {
            label: 'Topic tags',
            description: 'Distinct reader-facing phrases. 1+ required. Duplicates rejected by build.',
            validation: { length: { min: 1 } },
            itemLabel: props => props.value,
          }
        ),
        featured: fields.checkbox({
          label: 'Eligible for featured placement',
          description: 'Eligibility signal, not guarantee.',
          defaultValue: false,
        }),
        status: fields.select({
          label: 'Publication status',
          description: 'Editorial Workflow state + build eligibility',
          options: [
            { label: 'Draft — excluded from public output', value: 'draft' },
            { label: 'Published — must pass every build check', value: 'published' },
          ],
          defaultValue: 'draft',
        }),
        featured_image: fields.image({
          label: 'Featured image',
          description: 'Approved licensed JPEG under /assets/images/.',
          directory: 'assets/images',
          publicPath: '/assets/images/',
          validation: { isRequired: true },
        }),
        featured_image_alt: fields.text({
          label: 'Featured image alt text',
          description: 'Describe visual content. 12–300 chars, don’t start with “image of”.',
          multiline: true,
          validation: { length: { min: 12, max: 300 }, isRequired: true },
        }),
        social_image: fields.image({
          label: 'Social share image (1200×630)',
          description: 'Exact 1200×630 JPEG under /assets/images/social/. Build verifies dimensions.',
          directory: 'assets/images/social',
          publicPath: '/assets/images/social/',
          validation: { isRequired: true },
        }),
        excerpt: fields.text({
          label: 'Article excerpt',
          description: 'Plain-text summary for cards/deck. Max 160 chars, single line.',
          multiline: true,
          validation: { length: { max: 160 }, isRequired: true },
        }),
        seo_title: fields.text({
          label: 'Custom search title',
          description: 'Optional. Leave empty to use title. Max 70 chars.',
          validation: { length: { max: 70 } },
        }),
        meta_description: fields.text({
          label: 'Search description',
          description: 'Plain-text search summary. Max 155 chars.',
          multiline: true,
          validation: { length: { max: 155 }, isRequired: true },
        }),
        sources: fields.array(
          fields.object({
            label: fields.text({ label: 'Citation label', validation: { isRequired: true } }),
            url: fields.url({ label: 'Source URL', validation: { isRequired: true } }),
            publisher: fields.text({ label: 'Publisher' }),
            publication_date: fields.date({ label: 'Publication date' }),
            access_date: fields.date({ label: 'Access date' }),
          }),
          {
            label: 'Source citations',
            description: 'Drafts may omit, but Published requires 1+ HTTPS citation.',
            itemLabel: props => props.fields.label.value || 'Source',
          }
        ),
        body: fields.document({
          label: 'Article body',
          description: 'Begin headings at H2. H1 is auto-supplied. Legal disclaimer + reading time are build-controlled.',
          formatting: {
            inlineMarks: {
              bold: true,
              italic: true,
            },
            listTypes: {
              ordered: true,
              unordered: true,
            },
            headingLevels: [2, 3, 4],
            blockTypes: {
              blockquote: true,
            },
            softBreaks: true,
          },
          dividers: true,
          links: true,
          images: {
            directory: 'assets/images',
            publicPath: '/assets/images/',
          },
        }),
      },
    }),

    // ── Categories ── content/categories/*.md — controlled taxonomy (see APPROVED_CATEGORIES)
    categories: collection({
      label: 'Categories',
      slugField: 'slug',
      path: 'content/categories/*',
      format: { contentField: 'body' },
      entryLayout: 'form',
      previewUrl: '/categories/{slug}/',
      schema: {
        name: fields.text({
          label: 'Category name',
          description: 'Locked — controlled by approved taxonomy.',
          validation: { isRequired: true },
        }),
        slug: fields.slug({
          name: {
            label: 'Category slug',
            description: 'Locked — routes + relations depend on this.',
            validation: { isRequired: true },
          },
        }),
        description: fields.text({
          label: 'Category description',
          description: '100–260 chars. Aim 140–240.',
          multiline: true,
          validation: { length: { min: 100, max: 260 }, isRequired: true },
        }),
        icon: fields.text({
          label: 'Approved icon class',
          description: 'Locked to approved Font Awesome class.',
          validation: { isRequired: true },
        }),
        order: fields.integer({
          label: 'Navigation order',
          description: 'Locked unique navigation order.',
          validation: { isRequired: true },
        }),
        related_categories: fields.array(
          fields.relationship({
            label: 'Related category',
            collection: 'categories',
            validation: { isRequired: true },
          }),
          {
            label: 'Related categories',
            description: '1-3 distinct approved categories, not self.',
            validation: { length: { min: 1, max: 3 } },
            itemLabel: props => props.value ?? 'Category',
          }
        ),
        body: fields.text({
          label: 'Body (unused)',
          description: 'Categories have no body — leave empty.',
        }),
      },
    }),
  },
  singletons: {
    // ── Site Settings ── content/settings/site.json
    siteSettings: singleton({
      label: 'Site Settings',
      path: 'content/settings/site',
      format: { data: 'json' },
      schema: {
        site_title: fields.text({ label: 'Site title', validation: { isRequired: true } }),
        site_tagline: fields.text({ label: 'Site tagline', validation: { isRequired: true } }),
        social_profiles: fields.object({
          x: fields.url({ label: 'X profile URL', description: 'https://x.com/... or empty' }),
          facebook: fields.url({ label: 'Facebook profile URL' }),
          linkedin: fields.url({ label: 'LinkedIn profile URL' }),
        }),
        newsletter: fields.object({
          enabled: fields.checkbox({ label: 'Request newsletter activation', defaultValue: false }),
          endpoint: fields.text({ label: 'Newsletter endpoint', description: 'Root-relative or HTTPS, no fragment' }),
          provider: fields.select({
            label: 'Newsletter adapter',
            options: [
              { label: 'Generic form', value: 'generic-form' },
              { label: 'Generic JSON', value: 'generic-json' },
            ],
            defaultValue: 'generic-form',
          }),
          double_opt_in: fields.checkbox({ label: 'Double opt-in (locked on)', defaultValue: true }),
        }),
        contact: fields.object({
          enabled: fields.checkbox({ label: 'Request contact-form activation', defaultValue: false }),
          endpoint: fields.text({ label: 'Same-origin API endpoint', defaultValue: '/api/contact/' }),
          provider: fields.text({ label: 'Contact adapter (locked)', defaultValue: 'lawscope-serverless' }),
        }),
        consent: fields.object({
          mode: fields.text({ label: 'Consent mode (locked)', defaultValue: 'strict-opt-in' }),
          provider: fields.text({ label: 'Consent provider (locked)', defaultValue: 'local-preference-center' }),
          revision: fields.integer({ label: 'Consent revision', validation: { isRequired: true }, defaultValue: 1 }),
          google_certified_cmp: fields.checkbox({ label: 'Google-certified CMP (locked false)', defaultValue: false }),
        }),
        analytics: fields.object({
          enabled: fields.checkbox({ label: 'Request analytics activation' }),
          measurement_id: fields.text({ label: 'GA4 measurement ID', description: 'G-XXXXXXXXXX. Use G-XXXXXXXXXX placeholder until ready.' }),
        }),
        advertising: fields.object({
          enabled: fields.checkbox({ label: 'Request AdSense activation' }),
          account_approved: fields.checkbox({ label: 'AdSense account and site approved' }),
          policy_reviewed: fields.checkbox({ label: 'Current policy review complete' }),
          certified_cmp_ready: fields.checkbox({ label: 'Google-certified CMP ready' }),
          publisher_id: fields.text({ label: 'AdSense publisher ID', description: 'ca-pub-XXXXXXXXXXXXXXXX' }),
          slots: fields.object({
            home_below_featured: fields.text({ label: 'Home — below Featured (10 digits)' }),
            articles_in_feed: fields.text({ label: 'Articles — in feed' }),
            categories_overview: fields.text({ label: 'Categories — below grid' }),
            category_in_feed: fields.text({ label: 'Category — in feed' }),
            article_mid: fields.text({ label: 'Article — mid-body' }),
            article_sidebar: fields.text({ label: 'Article — desktop sidebar' }),
            article_end: fields.text({ label: 'Article — end' }),
          }),
        }),
      },
    }),
  },
});
