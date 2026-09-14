import { createIframeEl, createPreviewEl } from '../shared/elements.js';
import { getTwitchEmbedUrl, getYoutubeEmbedUrl } from '../shared/embed.js';
import { classifyMediaUrl } from '../shared/media.js';
import { resolveAlbum, resolveUnknown } from '../shared/imgur.js';

function imageKey(raw) {
  try {
    const url = new URL(raw);
    if (/^(?:[im]\.)?imgur\.com$/i.test(url.hostname)) {
      return `imgur:${url.pathname.match(/^\/(?:a\/|gallery\/)?(\w+)/)?.[1]}`;
    }
    return url.href.replace(/^http:/, 'https:');
  } catch {
    return raw;
  }
}

function resolvedMedia(link) {
  if (typeof link === 'string' && /^https?:\/\/i\.imgur\.com\/\w+\.mp4(?:[?#]|$)/i.test(link)) {
    return { kind: 'imgur-gif', src: link };
  }
  return classifyMediaUrl(link);
}

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
    entry.element?.remove();
    for (const [image, display] of entry.hidden) image.style.display = display;
    entry.hidden.clear();
  }

  function nativeImages(anchor) {
    const line = anchor.closest('[data-type="termline"]');
    const container = line?.nextElementSibling;
    if (!container) return [];
    return [...container.querySelectorAll('img')].filter(
      (image) =>
        !image.closest('[data-ptt-inline-preview]') &&
        imageKey(image.src) === imageKey(anchor.href),
    );
  }

  function hideNative(entry, images) {
    for (const image of images) {
      if (!entry.hidden.has(image)) entry.hidden.set(image, image.style.display);
      if (image.style.display !== 'none') image.style.display = 'none';
    }
  }

  async function render(anchor, entry, media) {
    try {
      let previews;
      if (media.kind === 'imgur-album') {
        previews = (await getAlbum(media.hash)).map(resolvedMedia);
      } else if (media.kind === 'imgur-unknown') {
        const result = await getUnknown(media.hash);
        previews =
          result.type?.startsWith('image/') || result.type?.startsWith('video/')
            ? [resolvedMedia(result.link)]
            : [];
      } else {
        previews = [media];
      }
      if (
        destroyed ||
        !isEnabled() ||
        !content.contains(anchor) ||
        anchor.href !== entry.href ||
        entries.get(anchor) !== entry ||
        anchor.closest('[data-type="termline"]') !== entry.line
      )
        return;
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
      hideNative(entry, nativeImages(anchor));
    } catch (error) {
      console.error('Unable to resolve Term media preview', error);
    }
  }

  function refresh() {
    if (destroyed) return;
    for (const [anchor, entry] of entries) {
      if (
        !isEnabled() ||
        !content.contains(anchor) ||
        anchor.href !== entry.href ||
        anchor.closest('[data-type="termline"]') !== entry.line ||
        (entry.element && !entry.element.isConnected)
      ) {
        remove(entry);
        entries.delete(anchor);
      }
    }
    if (!isEnabled()) return;
    for (const anchor of content.querySelectorAll('[data-type="termline"] a[href]')) {
      const existing = entries.get(anchor);
      const images = nativeImages(anchor);
      if (existing) {
        if (existing.element) hideNative(existing, images);
        continue;
      }
      const media = classifyMediaUrl(anchor.href);
      if (!media) continue;
      // Preserve native images, including lazy images that have not failed.
      // Album and extensionless Imgur URLs require our resolver: Term guesses .jpg.
      if (
        (media.kind === 'image' || media.kind === 'imgur-gif') &&
        images.some(
          (image) =>
            !/\.mp4(?:[?#]|$)/i.test(image.src) && (!image.complete || image.naturalWidth > 0),
        )
      )
        continue;
      const entry = {
        href: anchor.href,
        line: anchor.closest('[data-type="termline"]'),
        hidden: new Map(),
        element: null,
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
    attributeFilter: ['href', 'src'],
  });
  content.addEventListener('load', schedule, true);
  content.addEventListener('error', schedule, true);
  schedule();
  return {
    refresh: schedule,
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      observer.disconnect();
      content.removeEventListener('load', schedule, true);
      content.removeEventListener('error', schedule, true);
      for (const entry of entries.values()) remove(entry);
      entries.clear();
    },
  };
}
