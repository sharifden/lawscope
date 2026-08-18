(() => {
  'use strict';

  const COMPANION_META_NAME = 'cms-companion-origin';
  const UNPROVISIONED_SUFFIX = '.invalid';
  const REQUIRED_EDITOR_ROLE = 'lawscope-editor';
  const PRODUCTION_PUBLIC_ORIGIN = 'https://getlawscope.com';
  const LEGAL_DISCLAIMER =
    'The information on this page is for educational purposes only and does not constitute legal advice. Laws vary by state. Always consult a qualified attorney for advice specific to your situation.';

  function valueFromField(field, key, fallback) {
    if (!field || typeof field.get !== 'function') return fallback;
    const value = field.get(key);
    return value === undefined || value === null ? fallback : value;
  }

  function normalizeSingleLine(value) {
    return String(value || '').replace(/[\r\n]+/g, ' ');
  }

  function asPlainValue(value, fallback) {
    if (value === undefined || value === null) return fallback;
    if (typeof value.toJS === 'function') return value.toJS();
    return value;
  }

  function entryValue(entry, path, fallback = '') {
    const keys = Array.isArray(path) ? path : [path];
    const value = entry.getIn(['data', ...keys]);
    return asPlainValue(value, fallback);
  }

  function assetUrl(getAsset, source) {
    if (!source) return '';
    const asset = getAsset(source);
    return asset && typeof asset.toString === 'function' ? asset.toString() : String(asset || source);
  }

  function textList(value) {
    const result = asPlainValue(value, []);
    return Array.isArray(result) ? result.filter(Boolean).map(String) : [];
  }

  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch {
      return '';
    }
  }

  function readableDate(value) {
    if (!value) return 'Not set';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(parsed);
  }

  function registerCustomWidgets(CMS, createClass, h) {
    const CharacterCountControl = createClass({
      isValid() {
        const rawValue = String(this.props.value || '');
        const maximum = Number(valueFromField(this.props.field, 'max', 160));
        const minimum = Number(valueFromField(this.props.field, 'min', 0));
        if (/[\r\n]/.test(rawValue)) {
          return { error: { message: 'Line breaks are not supported in this field.' } };
        }
        if (rawValue.length > maximum) {
          return { error: { message: `Use no more than ${maximum} characters.` } };
        }
        if (rawValue.length < minimum) {
          return { error: { message: `Use at least ${minimum} characters.` } };
        }
        return true;
      },
      handleChange(event) {
        const maximum = Number(valueFromField(this.props.field, 'max', 160));
        const normalized = normalizeSingleLine(event.target.value);
        this.props.onChange(normalized.slice(0, maximum));
      },
      render() {
        const current = normalizeSingleLine(this.props.value);
        const maximum = Number(valueFromField(this.props.field, 'max', 160));
        const minimum = Number(valueFromField(this.props.field, 'min', 0));
        const rows = Number(valueFromField(this.props.field, 'rows', 3));
        const counterId = `${this.props.forID}-character-count`;
        const requirement = minimum > 0 ? `${minimum}–${maximum}` : `up to ${maximum}`;

        return h(
          'div',
          { className: 'cms-counted-control' },
          h('textarea', {
            id: this.props.forID,
            className: this.props.classNameWrapper,
            value: current,
            rows,
            minLength: minimum || undefined,
            maxLength: maximum,
            required: Boolean(valueFromField(this.props.field, 'required', true)),
            'aria-describedby': counterId,
            onChange: this.handleChange
          }),
          h(
            'p',
            {
              className: 'cms-field-count',
              id: counterId,
              'aria-live': 'polite'
            },
            `${current.length} of ${maximum} characters (${requirement})`
          )
        );
      }
    });

    const CharacterCountPreview = createClass({
      render() {
        return h('p', { className: 'cms-preview__summary' }, normalizeSingleLine(this.props.value));
      }
    });

    const LockedControl = createClass({
      render() {
        const value = asPlainValue(this.props.value, '');
        const displayValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
        return h('input', {
          id: this.props.forID,
          className: this.props.classNameWrapper,
          type: 'text',
          value: displayValue,
          readOnly: true,
          'aria-readonly': 'true',
          'data-cms-locked-field': 'true'
        });
      }
    });

    const LockedPreview = createClass({
      render() {
        return h('span', null, String(asPlainValue(this.props.value, '')));
      }
    });

    const characterCountSchema = {
      properties: {
        min: { type: 'integer' },
        max: { type: 'integer' },
        rows: { type: 'integer' }
      }
    };

    CMS.registerWidget(
      'character-counted',
      CharacterCountControl,
      CharacterCountPreview,
      characterCountSchema
    );
    CMS.registerWidget('locked', LockedControl, LockedPreview);
  }

  function registerPreviewTemplates(CMS, createClass, h) {
    const ArticlePreview = createClass({
      render() {
        const { entry, getAsset, widgetFor } = this.props;
        const title = entryValue(entry, 'title', 'Untitled article');
        const excerpt = entryValue(entry, 'excerpt', 'Add a concise article excerpt.');
        const author = entryValue(entry, 'author', 'Lawscope Editorial');
        const category = entryValue(entry, 'category', 'Category not selected');
        const status = entryValue(entry, 'status', 'draft');
        const publishDate = entryValue(entry, 'publish_date');
        const updatedDate = entryValue(entry, 'updated_date');
        const featuredImage = assetUrl(getAsset, entryValue(entry, 'featured_image'));
        const featuredImageAlt = entryValue(entry, 'featured_image_alt', '');
        const tags = textList(entryValue(entry, 'tags', []));
        const sources = asPlainValue(entryValue(entry, 'sources', []), []);
        const sourceList = Array.isArray(sources) ? sources : [];

        return h(
          'article',
          { className: 'cms-preview cms-preview--article' },
          h(
            'header',
            { className: 'cms-preview__header' },
            h('p', { className: 'cms-preview__eyebrow' }, `${category} · ${status}`),
            h('h1', { className: 'cms-preview__title' }, title),
            h('p', { className: 'cms-preview__deck' }, excerpt),
            h(
              'p',
              { className: 'cms-preview__meta' },
              `By ${author} · Published ${readableDate(publishDate)}`,
              updatedDate ? ` · Updated ${readableDate(updatedDate)}` : '',
              ' · Reading time is calculated at build'
            )
          ),
          featuredImage
            ? h('figure', { className: 'cms-preview__figure' }, h('img', {
                className: 'cms-preview__image',
                src: featuredImage,
                alt: featuredImageAlt
              }))
            : null,
          h('div', { className: 'cms-preview__body' }, widgetFor('body')),
          h(
            'aside',
            { className: 'cms-preview__notice', 'aria-label': 'Legal information notice' },
            h('strong', null, 'Legal information, not legal advice'),
            h('p', null, LEGAL_DISCLAIMER)
          ),
          h(
            'section',
            { className: 'cms-preview__sources', 'aria-labelledby': 'cms-preview-sources' },
            h('h2', { id: 'cms-preview-sources' }, 'Sources'),
            sourceList.length
              ? h(
                  'ol',
                  null,
                  sourceList.map((source, index) => {
                    const safeSourceUrl = safeHttpsUrl(source.url);
                    return h(
                      'li',
                      { key: `${safeSourceUrl || 'source'}-${index}` },
                      safeSourceUrl
                        ? h(
                            'a',
                            {
                              href: safeSourceUrl,
                              target: '_blank',
                              rel: 'noopener noreferrer'
                            },
                            String(source.label || safeSourceUrl)
                          )
                        : String(source.label || 'Incomplete source')
                    );
                  })
                )
              : h('p', { className: 'cms-preview__empty' }, 'Add sources before changing status to Published.')
          ),
          tags.length
            ? h(
                'ul',
                { className: 'cms-preview__tags', 'aria-label': 'Article tags' },
                tags.map((tag) => h('li', { key: tag }, tag))
              )
            : null
        );
      }
    });

    const CategoryPreview = createClass({
      render() {
        const { entry } = this.props;
        const related = textList(entryValue(entry, 'related_categories', []));
        return h(
          'article',
          { className: 'cms-preview cms-preview--category' },
          h('p', { className: 'cms-preview__eyebrow' }, `Category ${entryValue(entry, 'order', '—')}`),
          h('h1', { className: 'cms-preview__title' }, entryValue(entry, 'name', 'Category')),
          h('p', { className: 'cms-preview__deck' }, entryValue(entry, 'description', 'Add a category description.')),
          h('p', { className: 'cms-preview__meta' }, `Route: /categories/${entryValue(entry, 'slug', 'slug')}/`),
          h('p', { className: 'cms-preview__meta' }, `Approved icon: ${entryValue(entry, 'icon', 'Not set')}`),
          h('h2', null, 'Related categories'),
          related.length
            ? h('ul', null, related.map((slug) => h('li', { key: slug }, slug)))
            : h('p', { className: 'cms-preview__empty' }, 'Select exactly three related categories.')
        );
      }
    });

    const SettingsPreview = createClass({
      render() {
        const { entry } = this.props;
        const socialProfiles = asPlainValue(entryValue(entry, 'social_profiles', {}), {});
        const enabledProfiles = Object.entries(socialProfiles || {}).filter(([, url]) => Boolean(url));
        const newsletterEnabled = Boolean(entryValue(entry, ['newsletter', 'enabled'], false));
        const contactEnabled = Boolean(entryValue(entry, ['contact', 'enabled'], false));
        const advertisingEnabled = Boolean(entryValue(entry, ['advertising', 'enabled'], false));

        return h(
          'article',
          { className: 'cms-preview cms-preview--settings' },
          h('p', { className: 'cms-preview__eyebrow' }, 'Singleton site settings'),
          h('h1', { className: 'cms-preview__title' }, entryValue(entry, 'site_title', 'Lawscope')),
          h('p', { className: 'cms-preview__deck' }, entryValue(entry, 'site_tagline', 'Add the site tagline.')),
          h('h2', null, 'Requested feature states'),
          h(
            'dl',
            { className: 'cms-preview__settings-list' },
            h('div', null, h('dt', null, 'Newsletter'), h('dd', null, newsletterEnabled ? 'Activation requested' : 'Disabled')),
            h('div', null, h('dt', null, 'Contact form'), h('dd', null, contactEnabled ? 'Activation requested' : 'Disabled')),
            h('div', null, h('dt', null, 'Advertising'), h('dd', null, advertisingEnabled ? 'Activation requested' : 'Disabled')),
            h('div', null, h('dt', null, 'Social profiles'), h('dd', null, enabledProfiles.length ? enabledProfiles.map(([name]) => name).join(', ') : 'None configured'))
          ),
          h(
            'p',
            { className: 'cms-preview__notice' },
            'Requested states do not bypass environment, credential, policy, consent, or production gates. Legal-policy settings are reviewed outside this collection.'
          )
        );
      }
    });

    CMS.registerPreviewTemplate('articles', ArticlePreview);
    CMS.registerPreviewTemplate('categories', CategoryPreview);
    CMS.registerPreviewTemplate('site', SettingsPreview);
  }

  function resolveCompanionOrigin() {
    const meta = document.querySelector(`meta[name="${COMPANION_META_NAME}"]`);
    const rawValue = meta ? meta.content.trim() : '';
    if (!rawValue) return null;

    try {
      const url = new URL(rawValue);
      const hostname = url.hostname.toLowerCase();
      const safeOrigin =
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        url.origin === rawValue.replace(/\/$/, '') &&
        !hostname.endsWith(UNPROVISIONED_SUFFIX);
      return safeOrigin ? url.origin : null;
    } catch {
      return null;
    }
  }

  function resolveBrowserServiceOrigin(companionOrigin) {
    try {
      const pageOrigin = window.location && window.location.origin;
      if (pageOrigin === PRODUCTION_PUBLIC_ORIGIN) return pageOrigin;
      if (typeof pageOrigin === 'string' && pageOrigin.startsWith('https://')) {
        return pageOrigin;
      }
    } catch {
      // Fall back to the build-injected companion origin.
    }
    return companionOrigin;
  }

  function markAuthenticationState(isProvisioned) {
    const boundary = document.querySelector('[data-cms-auth-boundary]');
    if (boundary) boundary.hidden = isProvisioned;
  }

  function userHasEditorRole(user) {
    const roles = user && user.app_metadata && user.app_metadata.roles;
    return Array.isArray(roles) && roles.includes(REQUIRED_EDITOR_ROLE);
  }

  function installEditorRoleBoundary(identity) {
    const denyUnauthorizedUser = (user) => {
      if (!user || userHasEditorRole(user)) return true;

      showFatal(
        'This individually invited account is not assigned the required Lawscope editor role. Access has been denied; contact the site owner.'
      );
      if (typeof identity.logout === 'function') {
        Promise.resolve(identity.logout()).catch(() => {});
      }
      return false;
    };

    if (typeof identity.on !== 'function') {
      showFatal('The authentication client could not enforce the required editor role. Access remains disabled.');
      return false;
    }

    identity.on('login', denyUnauthorizedUser);
    const currentUser = typeof identity.currentUser === 'function'
      ? identity.currentUser()
      : null;
    return denyUnauthorizedUser(currentUser);
  }

  function showFatal(message) {
    const boundary = document.querySelector('[data-cms-auth-boundary]');
    if (boundary) {
      boundary.hidden = false;
      boundary.classList.add('cms-fatal');
      const title = boundary.querySelector('.cms-boundary__title');
      const copy = boundary.querySelector('.cms-boundary__copy');
      if (title) title.textContent = 'CMS could not start';
      if (copy) copy.textContent = message;
    }
  }

  if (!window.CMS || !window.createClass || !window.h || !window.initCMS) {
    showFatal('A pinned CMS asset did not load. Retry on a trusted connection or contact the site administrator.');
    return;
  }

  const CMS = window.CMS;
  registerCustomWidgets(CMS, window.createClass, window.h);
  registerPreviewTemplates(CMS, window.createClass, window.h);
  CMS.registerPreviewStyle('/admin/cms-preview.css');

  const companionOrigin = resolveCompanionOrigin();
  markAuthenticationState(Boolean(companionOrigin));

  if (companionOrigin) {
    const serviceOrigin = resolveBrowserServiceOrigin(companionOrigin);
    const identityUrl = `${serviceOrigin}/.netlify/identity`;
    const identity = window.netlifyIdentity;
    if (!identity || typeof identity.init !== 'function') {
      showFatal('The pinned authentication client did not load. Access remains disabled.');
      return;
    }

    identity.init({ APIUrl: identityUrl });
    if (!installEditorRoleBoundary(identity)) return;

    const signedInUser = typeof identity.currentUser === 'function' ? identity.currentUser() : null;
    const authHash = String((window.location && window.location.hash) || '');
    const hasPendingAuthToken = /(invite_token|recovery_token|confirmation_token|email_change_token)=/.test(
      authHash
    );
    if (!signedInUser && !hasPendingAuthToken && typeof identity.open === 'function') {
      identity.open('login');
    }

    window.initCMS({
      config: {
        backend: {
          name: 'git-gateway',
          branch: 'main',
          identity_url: identityUrl,
          gateway_url: `${serviceOrigin}/.netlify/git/github`
        }
      }
    });
    return;
  }

  window.initCMS();
})();
