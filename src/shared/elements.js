export function createImageEl(sources, { classes = [], loading, onLoadFailure } = {}) {
  const [src, ...remainingSrcs] = typeof sources === 'string' ? [sources] : sources;
  const imgEl = document.createElement('img');
  imgEl.classList.add(...classes);
  if (!src.startsWith('https://i.verb.tw/')) {
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
  { autoplay = false, classes = [], controls = true, loop = false } = {},
) {
  const videoEl = document.createElement('video');
  videoEl.classList.add(...classes);
  videoEl.src = src;
  videoEl.autoplay = autoplay;
  videoEl.controls = controls;
  videoEl.loop = loop;
  return videoEl;
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
