(() => {
  'use strict';

  window.LawscopeAdvertisingConfig = Object.freeze({
    module: 31,
    enabled: false,
    environment: 'development',
    provider: 'none',
    publisherId: 'ca-pub-0000000000000000',
    slotIds: Object.freeze({
      home_below_featured: '0000000000',
      articles_in_feed: '0000000000',
      categories_overview: '0000000000',
      category_in_feed: '0000000000',
      article_mid: '0000000000',
      article_sidebar: '0000000000',
      article_end: '0000000000'
    }),
    siteOrigin: 'https://getlawscope.com',
    consentCategory: 'advertising',
    loaderTimeoutMilliseconds: 12000,
    desktopSidebarMediaQuery: '(min-width: 64rem)'
  });
})();
