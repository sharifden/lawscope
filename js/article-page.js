(() => {
  'use strict';

  const article = document.querySelector('[data-article-page]');
  if (!article) return;

  const copyControl = article.querySelector('[data-copy-link]');
  const nativeShareControl = article.querySelector('[data-native-share]');
  const status = article.querySelector('[data-share-status]');
  const canonicalUrl = article.dataset.canonicalUrl || window.location.href;
  let statusTimer = null;

  function announce(message) {
    if (!status) return;
    window.clearTimeout(statusTimer);
    status.textContent = message;
    statusTimer = window.setTimeout(() => {
      status.textContent = '';
    }, 5000);
  }

  async function copyWithFallback(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.className = 'article-share__copy-fallback';
    document.body.append(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    textArea.remove();
    if (!copied) throw new Error('Copy command was not available.');
  }

  copyControl?.addEventListener('click', async () => {
    try {
      await copyWithFallback(canonicalUrl);
      announce('Article link copied to the clipboard.');
    } catch {
      announce('The link could not be copied automatically. Copy it from the browser address bar.');
    }
  });

  if (nativeShareControl && typeof navigator.share === 'function') {
    nativeShareControl.hidden = false;
    nativeShareControl.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: document.title,
          text: article.querySelector('.article-detail__deck')?.textContent.trim() || '',
          url: canonicalUrl
        });
        announce('Sharing options opened.');
      } catch (error) {
        if (error?.name !== 'AbortError') {
          announce('Sharing is not available right now.');
        }
      }
    });
  }
})();
