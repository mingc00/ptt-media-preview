import { requiresDocumentReferrer } from './media.js';

export function createImageEl(sources, { classes = [], loading, onLoadFailure } = {}) {
  const [src, ...remainingSrcs] = typeof sources === 'string' ? [sources] : sources;
  const imgEl = document.createElement('img');
  imgEl.classList.add(...classes);
  if (!requiresDocumentReferrer(src)) {
    imgEl.referrerPolicy = 'no-referrer';
  }
  if (loading) {
    imgEl.loading = loading;
  }
  imgEl.addEventListener('error', (event) => {
    const fallbackSrc = remainingSrcs.shift();
    if (fallbackSrc) {
      imgEl.src = fallbackSrc;
      return;
    }
    onLoadFailure?.(event);
  });
  imgEl.src = src;
  return imgEl;
}

export function createVideoEl(
  src,
  {
    autoplay = false,
    classes = [],
    controls = true,
    loop = false,
    muted = false,
    playsInline = false,
  } = {},
) {
  const videoEl = document.createElement('video');
  videoEl.classList.add(...classes);
  videoEl.autoplay = autoplay;
  videoEl.controls = controls;
  videoEl.loop = loop;
  videoEl.muted = muted;
  videoEl.defaultMuted = muted;
  videoEl.playsInline = playsInline;
  videoEl.src = src;
  return videoEl;
}

export function createImgurGifEl(src, { classes = [] } = {}) {
  return createVideoEl(src, {
    autoplay: true,
    classes,
    controls: false,
    loop: true,
    muted: true,
    playsInline: true,
  });
}

export function createPreviewEl(media, options) {
  if (media?.kind === 'image') {
    return createImageEl(media.sources, options);
  }
  if (media?.kind === 'imgur-gif') {
    return createImgurGifEl(media.src, options);
  }
  return null;
}

export function createIframeEl(src, { classes = [], referrerPolicy } = {}) {
  const iframe = document.createElement('iframe');
  iframe.classList.add(...classes);
  iframe.type = 'text/html';
  iframe.loading = 'lazy';
  iframe.src = src;
  iframe.allowFullscreen = true;
  iframe.style.border = 'none';
  if (referrerPolicy) {
    iframe.referrerPolicy = referrerPolicy;
  }
  return iframe;
}
