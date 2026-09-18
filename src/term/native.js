import { requestUnknown } from './imgur-bridge.js';
import { classifyMediaUrl, requiresDocumentReferrer } from '../shared/media.js';
import { INLINE_OWNER_ATTRIBUTE } from './inline-ownership.js';

export function usesNativeImage(href) {
  return classifyMediaUrl(href)?.kind === 'image' && !requiresDocumentReferrer(href);
}

// Run in the page world: both native renderers call this plugin's resolver.
export function installNativeImages(
  app,
  { loadImage = probeImage, getUnknown = requestUnknown, redraw = true } = {},
) {
  const plugin = app?.pluginManager?.getPlugin?.('media_previewer');
  if (!plugin || typeof plugin.resolveImageUrl !== 'function') return null;
  const original = plugin.resolveImageUrl;
  function resolve(href, ...args) {
    const media = classifyMediaUrl(href);
    if (!this.enabled) return original.call(this, href, ...args);
    // Extension-owned media must not produce a competing native placeholder.
    if (
      requiresDocumentReferrer(href) ||
      media?.kind === 'imgur-album' ||
      media?.kind === 'imgur-gif'
    ) {
      return null;
    }
    if (!['image', 'imgur-unknown'].includes(media?.kind)) {
      return original.call(this, href, ...args);
    }
    // Extension-supported images use native UI without the native domain restriction.
    if (media.kind === 'image' && !Array.isArray(media.sources)) {
      return { src: media.sources };
    }
    if (media.kind === 'imgur-unknown') {
      return getUnknown(media.hash).then((result) => {
        const resolved = classifyMediaUrl(result.link);
        if (!result.type?.startsWith('image/') || resolved?.kind !== 'image') {
          throw new Error('Media requires extension preview');
        }
        return { src: resolved.sources };
      });
    }
    return (async () => {
      for (const src of media.sources) {
        try {
          return await loadImage(src);
        } catch {
          // Try the next supported extension.
        }
      }
      throw new Error('Unable to load image');
    })();
  }

  plugin.resolveImageUrl = resolve;
  if (redraw) plugin.view?.redraw?.(true);
  return {
    destroy() {
      if (plugin.resolveImageUrl === resolve) plugin.resolveImageUrl = original;
    },
  };
}

export function installInlineOwnership(app, doc = document, { redraw = true } = {}) {
  const plugin = app?.pluginManager?.getPlugin?.('media_previewer');
  if (!plugin || typeof plugin._createInlinePreview !== 'function') return null;

  const hadOwnMethod = Object.hasOwn(plugin, '_createInlinePreview');
  const original = plugin._createInlinePreview;
  const disableNativeInlinePreview = () => null;

  try {
    plugin._createInlinePreview = disableNativeInlinePreview;
  } catch {
    return null;
  }
  if (plugin._createInlinePreview !== disableNativeInlinePreview) return null;

  doc.documentElement.setAttribute(INLINE_OWNER_ATTRIBUTE, '');
  if (redraw) plugin.view?.redraw?.(true);

  return {
    destroy() {
      if (plugin._createInlinePreview === disableNativeInlinePreview) {
        if (hadOwnMethod) plugin._createInlinePreview = original;
        else delete plugin._createInlinePreview;
      }
      doc.documentElement.removeAttribute(INLINE_OWNER_ATTRIBUTE);
      if (redraw) plugin.view?.redraw?.(true);
    },
  };
}

export function installTermIntegration(app, options = {}) {
  const plugin = app?.pluginManager?.getPlugin?.('media_previewer');
  if (
    !plugin ||
    typeof plugin.resolveImageUrl !== 'function' ||
    typeof plugin._createInlinePreview !== 'function'
  ) {
    return null;
  }

  const nativeImages = installNativeImages(app, { ...options, redraw: false });
  if (!nativeImages) return null;

  const inlineOwnership = installInlineOwnership(app, options.document ?? document, {
    redraw: false,
  });
  if (!inlineOwnership) {
    nativeImages.destroy();
    return null;
  }
  plugin.view?.redraw?.(true);

  return {
    destroy() {
      inlineOwnership.destroy();
      nativeImages.destroy();
      plugin.view?.redraw?.(true);
    },
  };
}

function probeImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => finish(new Error('Image load timed out')), 10000);
    function finish(error) {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      if (error) {
        image.src = '';
        reject(error);
      } else {
        resolve({ src, width: image.naturalWidth, height: image.naturalHeight });
      }
    }
    image.referrerPolicy = 'no-referrer';
    image.onload = () => finish();
    image.onerror = () => finish(new Error('Image load failed'));
    image.src = src;
  });
}
