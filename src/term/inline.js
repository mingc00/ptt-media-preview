import { usesNativeImage } from './native.js';
import { INLINE_OWNER_ATTRIBUTE, ownsAllInlineImages } from './inline-ownership.js';
import { createIframeEl, createPreviewEl } from '../shared/elements.js';
import { getTwitchEmbedUrl, getYoutubeEmbedUrl } from '../shared/embed.js';
import { classifyMediaUrl, classifyResolvedMedia } from '../shared/media.js';
import { resolveAlbum, resolveUnknown } from '../shared/imgur.js';

function createEmbed(media) {
  const src =
    media.kind === 'youtube'
      ? getYoutubeEmbedUrl(media)
      : getTwitchEmbedUrl(media.id, location.hostname);
  const iframe = createIframeEl(src, { referrerPolicy: 'origin-when-cross-origin' });
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, { margin: '0.5em auto', maxWidth: '800px', height: '450px' });
  Object.assign(iframe.style, { width: '100%', height: '100%' });
  wrapper.append(iframe);
  return wrapper;
}

export function createInlinePreviewer(
  content,
  { isEnabled, getAlbum = resolveAlbum, getUnknown = resolveUnknown },
) {
  const entries = new Map();
  let destroyed = false;
  let timer;

  function remove(entry) {
    clearTimeout(entry.retryTimer);
    entry.element?.remove();
  }

  function shouldHandle(anchor) {
    return ownsAllInlineImages() || !usesNativeImage(anchor.href);
  }

  function isCurrent(anchor, entry) {
    return (
      !destroyed &&
      isEnabled() &&
      shouldHandle(anchor) &&
      content.contains(anchor) &&
      anchor.href === entry.href &&
      entries.get(anchor) === entry &&
      anchor.closest('[data-type="termline"]') === entry.line
    );
  }

  async function render(anchor, entry, media) {
    try {
      let previews;
      if (media.kind === 'imgur-album') {
        previews = (await getAlbum(media.hash)).map(classifyResolvedMedia);
      } else if (media.kind === 'imgur-unknown') {
        const result = await getUnknown(media.hash);
        const resolved = classifyResolvedMedia(result.link);
        previews =
          (result.type?.startsWith('image/') || result.type?.startsWith('video/')) &&
          resolved &&
          (ownsAllInlineImages() || resolved.kind === 'imgur-gif')
            ? [resolved]
            : [];
      } else {
        previews = [media];
      }
      if (!isCurrent(anchor, entry)) return;
      const element = document.createElement('div');
      element.dataset.pttInlinePreview = '';
      for (const preview of previews) {
        const child =
          preview?.kind === 'youtube' || preview?.kind === 'twitch'
            ? createEmbed(preview)
            : createPreviewEl(preview, {
                classes: ['easyReadingImg', 'hyperLinkPreview'],
                loading: 'lazy',
              });
        if (child) element.append(child);
      }
      if (!element.childNodes.length) return;
      entry.element = element;
      // Keep extension children outside the native renderer's preview container.
      entry.line.parentElement.append(element);
    } catch (error) {
      if (destroyed || entries.get(anchor) !== entry) return;
      if (++entry.failures < 3) {
        entry.retryTimer = setTimeout(() => {
          if (isCurrent(anchor, entry)) void render(anchor, entry, media);
        }, 1000 * entry.failures);
      } else {
        console.error('Unable to resolve Term media preview', error);
      }
    }
  }

  function refresh() {
    if (destroyed) return;
    for (const [anchor, entry] of entries) {
      if (!isCurrent(anchor, entry) || (entry.element && !entry.element.isConnected)) {
        remove(entry);
        entries.delete(anchor);
      }
    }
    if (!isEnabled()) return;
    for (const anchor of content.querySelectorAll('[data-type="termline"] a[href]')) {
      if (!shouldHandle(anchor)) continue;
      const existing = entries.get(anchor);
      if (existing) continue;
      const media = classifyMediaUrl(anchor.href);
      if (!media) continue;
      const entry = {
        href: anchor.href,
        line: anchor.closest('[data-type="termline"]'),
        element: null,
        failures: 0,
        retryTimer: null,
      };
      entries.set(anchor, entry);
      void render(anchor, entry, media);
    }
  }

  function schedule() {
    if (destroyed || timer) return;
    timer = setTimeout(() => {
      timer = null;
      refresh();
    }, 50);
  }
  const observer = new MutationObserver(schedule);
  observer.observe(content, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href'],
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [INLINE_OWNER_ATTRIBUTE],
  });
  schedule();
  return {
    refresh: schedule,
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      observer.disconnect();
      for (const entry of entries.values()) remove(entry);
      entries.clear();
    },
  };
}
