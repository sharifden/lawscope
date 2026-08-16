(() => {
  'use strict';

  const config = window.LawscopeAnalyticsConfig;
  const root = document.documentElement;
  const measurementIdPattern = /^G-[A-Z0-9]{10}$/;
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const articleReadSeconds = 30;
  const articleReadDepth = 75;
  const deniedConsent = Object.freeze({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  function setStatus(status) {
    root.dataset.analyticsStatus = status;
  }

  function validConfig(value) {
    return Boolean(
      value &&
      value.module === 30 &&
      value.enabled === true &&
      value.environment === 'production' &&
      measurementIdPattern.test(value.measurementId) &&
      value.measurementId !== 'G-XXXXXXXXXX' &&
      value.siteOrigin === 'https://getlawscope.com' &&
      value.consentCategory === 'analytics'
    );
  }

  if (!validConfig(config)) {
    setStatus('disabled');
    return;
  }

  let siteOrigin;
  try {
    siteOrigin = new URL(config.siteOrigin).origin;
  } catch {
    setStatus('disabled');
    return;
  }

  if (window.location.origin !== siteOrigin) {
    setStatus('blocked-host');
    return;
  }

  const disableKey = `ga-disable-${config.measurementId}`;
  let collectionAllowed = false;
  let tagRequested = false;
  let tagLoadFailed = false;
  let pageViewSent = false;
  let articleReadSent = false;
  let engagementSession = null;

  window[disableKey] = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function lawscopeGtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', deniedConsent);
  window.gtag('set', 'ads_data_redaction', true);
  window.gtag('set', 'url_passthrough', false);
  setStatus('awaiting-consent');

  function cleanPathname(pathname) {
    const value = typeof pathname === 'string' && pathname.startsWith('/')
      ? pathname
      : '/';
    return value.replace(/\/{2,}/g, '/');
  }

  function pageLocation() {
    return `${siteOrigin}${cleanPathname(window.location.pathname)}`;
  }

  function pageReferrer() {
    if (!document.referrer) return '';
    try {
      const referrer = new URL(document.referrer);
      if (!/^https?:$/.test(referrer.protocol)) return '';
      return referrer.origin === siteOrigin
        ? `${siteOrigin}${cleanPathname(referrer.pathname)}`
        : `${referrer.origin}/`;
    } catch {
      return '';
    }
  }

  function commonParameters() {
    const parameters = {
      send_to: config.measurementId,
      page_location: pageLocation()
    };
    if (config.debugMode === true) parameters.debug_mode = true;
    return parameters;
  }

  function canSend() {
    return collectionAllowed && !tagLoadFailed && root.dataset.consentAnalytics === 'granted';
  }

  function sendEvent(name, parameters = {}) {
    if (!canSend()) return false;
    window.gtag('event', name, {
      ...commonParameters(),
      ...parameters
    });
    return true;
  }

  function sendPageView() {
    if (pageViewSent || !canSend()) return;
    const parameters = {
      ...commonParameters(),
      page_title: String(document.title || 'Lawscope').slice(0, 150)
    };
    const referrer = pageReferrer();
    if (referrer) parameters.page_referrer = referrer;
    window.gtag('event', 'page_view', parameters);
    pageViewSent = true;
  }

  function requestGoogleTag() {
    if (tagRequested) return;
    tagRequested = true;

    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.measurementId)}`;
    tag.dataset.lawscopeAnalyticsTag = 'ga4';
    tag.addEventListener('load', () => setStatus(canSend() ? 'active' : 'consent-denied'));
    tag.addEventListener('error', () => {
      tagLoadFailed = true;
      collectionAllowed = false;
      window[disableKey] = true;
      setStatus('load-error');
    });
    document.head.append(tag);
  }

  function updateVisibleTime(session) {
    if (!session || session.visibleSince === null) return;
    session.visibleMilliseconds += Math.max(0, Date.now() - session.visibleSince);
    session.visibleSince = Date.now();
  }

  function clearEngagementTimer(session) {
    if (session?.timer) {
      window.clearTimeout(session.timer);
      session.timer = 0;
    }
  }

  function stopEngagement({ reset = false } = {}) {
    const session = engagementSession;
    if (!session) return;
    updateVisibleTime(session);
    clearEngagementTimer(session);
    document.removeEventListener('visibilitychange', session.onVisibilityChange);
    window.removeEventListener('scroll', session.onDepthChange);
    window.removeEventListener('resize', session.onDepthChange);
    window.removeEventListener('pagehide', session.onPageHide);
    engagementSession = null;
    if (reset) articleReadSent = false;
  }

  function maybeSendArticleRead(session) {
    if (!session || engagementSession !== session || articleReadSent) return;
    updateVisibleTime(session);
    const reachedTime = session.visibleMilliseconds >= articleReadSeconds * 1000;
    if (reachedTime && session.maximumDepth >= articleReadDepth) {
      if (sendEvent('article_read', {
        article_slug: session.articleSlug,
        category_slug: session.categorySlug
      })) {
        articleReadSent = true;
        stopEngagement();
      }
    }
  }

  function scheduleEngagementTimer(session) {
    clearEngagementTimer(session);
    updateVisibleTime(session);
    if (session.visibleSince === null || session.visibleMilliseconds >= articleReadSeconds * 1000) {
      maybeSendArticleRead(session);
      return;
    }
    const remaining = articleReadSeconds * 1000 - session.visibleMilliseconds;
    session.timer = window.setTimeout(() => {
      session.timer = 0;
      maybeSendArticleRead(session);
    }, remaining);
  }

  function startArticleEngagement() {
    if (articleReadSent || engagementSession || !canSend()) return;
    const article = document.querySelector('[data-analytics-article]');
    const prose = article?.querySelector('[data-article-prose]');
    const articleSlug = article?.dataset.analyticsArticleSlug || '';
    const categorySlug = article?.dataset.analyticsCategorySlug || '';
    if (!prose || !slugPattern.test(articleSlug) || !slugPattern.test(categorySlug)) return;

    const session = {
      articleSlug,
      categorySlug,
      prose,
      visibleMilliseconds: 0,
      visibleSince: document.visibilityState === 'visible' ? Date.now() : null,
      maximumDepth: 0,
      timer: 0,
      onVisibilityChange: null,
      onDepthChange: null,
      onPageHide: null
    };

    session.onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        session.visibleSince = Date.now();
        scheduleEngagementTimer(session);
      } else {
        updateVisibleTime(session);
        session.visibleSince = null;
        clearEngagementTimer(session);
      }
      maybeSendArticleRead(session);
    };
    session.onDepthChange = () => {
      const rectangle = session.prose.getBoundingClientRect();
      if (rectangle.height <= 0) return;
      const depth = ((window.innerHeight - rectangle.top) / rectangle.height) * 100;
      session.maximumDepth = Math.max(session.maximumDepth, Math.min(100, Math.max(0, depth)));
      maybeSendArticleRead(session);
    };
    session.onPageHide = () => stopEngagement();

    engagementSession = session;
    document.addEventListener('visibilitychange', session.onVisibilityChange);
    window.addEventListener('scroll', session.onDepthChange, { passive: true });
    window.addEventListener('resize', session.onDepthChange);
    window.addEventListener('pagehide', session.onPageHide, { once: true });
    scheduleEngagementTimer(session);
  }

  function configureCollection() {
    window.gtag('js', new Date());
    window.gtag('set', {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: pageLocation(),
      page_referrer: pageReferrer()
    });
    const configuration = {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: 'SameSite=Lax;Secure'
    };
    if (config.debugMode === true) configuration.debug_mode = true;
    window.gtag('config', config.measurementId, configuration);
  }

  function grantAnalyticsConsent() {
    if (collectionAllowed) return;
    window[disableKey] = false;
    collectionAllowed = true;
    window.gtag('consent', 'update', {
      ...deniedConsent,
      analytics_storage: 'granted'
    });
    if (!tagRequested) {
      requestGoogleTag();
      configureCollection();
    }
    setStatus('active');
    sendPageView();
    startArticleEngagement();
  }

  function denyAnalyticsConsent() {
    window.gtag('consent', 'update', deniedConsent);
    window[disableKey] = true;
    collectionAllowed = false;
    stopEngagement({ reset: true });
    setStatus('consent-denied');
  }

  function synchronizeConsent() {
    if (root.dataset.consentAnalytics === 'granted') {
      grantAnalyticsConsent();
    } else if (root.dataset.consentAnalytics === 'denied') {
      denyAnalyticsConsent();
    } else {
      window[disableKey] = true;
      collectionAllowed = false;
      stopEngagement({ reset: true });
      setStatus('awaiting-consent');
    }
  }

  document.addEventListener('lawscope:consent-change', synchronizeConsent);
  document.addEventListener('lawscope:newsletter-success', () => {
    sendEvent('newsletter_signup');
  });
  document.addEventListener('lawscope:contact-success', () => {
    sendEvent('contact_form_submit');
  });
  document.addEventListener('click', (event) => {
    if (!canSend() || event.defaultPrevented || (event.button !== undefined && event.button !== 0)) {
      return;
    }
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    let url;
    try {
      url = new URL(link.href, siteOrigin);
    } catch {
      return;
    }
    if (url.origin !== siteOrigin) return;
    const match = url.pathname.match(/^\/categories\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/);
    if (!match) return;
    sendEvent('category_click', { category_slug: match[1] });
  });

  synchronizeConsent();
})();
