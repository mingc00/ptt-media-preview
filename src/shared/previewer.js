import { createImageEl } from './elements.js';

const PREVIEW_MARGIN = 20;

export function createImageLinkPreviewer(container, { isEnabled, resolveSources }) {
  const sourcesCache = new WeakMap();
  const imageCache = new WeakMap();
  const nativePreviewBlocker = document.createElement('style');
  container.dataset.pttMediaPreviewContainer = '';
  nativePreviewBlocker.textContent = `
    [data-ptt-media-preview-container] > img:not([data-ptt-media-preview-fallback]) {
      display: none !important;
    }
  `;
  document.head.appendChild(nativePreviewBlocker);

  let activeAnchor = null;
  let activeImage = null;
  let requestId = 0;
  let renderFrame = null;
  let clientX = -1;
  let clientY = -1;

  function hide() {
    requestId += 1;
    activeAnchor = null;
    activeImage?.remove();
    activeImage = null;
  }

  function render() {
    const image = activeImage;
    if (!image?.isConnected) {
      return;
    }

    // Position from the rendered rectangle rather than intrinsic image dimensions.
    // A second pass accounts for viewport changes when scrollbars disappear.
    for (let pass = 0; pass < 2; pass += 1) {
      const rect = image.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const maxLeft = Math.max(PREVIEW_MARGIN, viewportWidth - PREVIEW_MARGIN - rect.width);
      const maxTop = Math.max(PREVIEW_MARGIN, viewportHeight - PREVIEW_MARGIN - rect.height);
      const targetLeft = Math.min(Math.max(PREVIEW_MARGIN, clientX + PREVIEW_MARGIN), maxLeft);
      const targetTop = Math.min(Math.max(PREVIEW_MARGIN, clientY - rect.height / 2), maxTop);
      const scaleX = image.offsetWidth ? rect.width / image.offsetWidth : 1;
      const scaleY = image.offsetHeight ? rect.height / image.offsetHeight : 1;

      image.style.left = `${image.offsetLeft + (targetLeft - rect.left) / scaleX}px`;
      image.style.top = `${image.offsetTop + (targetTop - rect.top) / scaleY}px`;
    }
  }

  function scheduleRender() {
    if (renderFrame !== null) {
      return;
    }
    renderFrame = requestAnimationFrame(() => {
      renderFrame = null;
      render();
    });
  }

  function getSources(anchor) {
    const cached = sourcesCache.get(anchor);
    if (cached?.href === anchor.href) {
      return cached.sources;
    }

    const sources = Promise.resolve(resolveSources(anchor));
    sourcesCache.set(anchor, { href: anchor.href, sources });
    return sources;
  }

  function canShow(anchor, currentRequestId) {
    return (
      currentRequestId === requestId && activeAnchor === anchor && anchor.isConnected && isEnabled()
    );
  }

  async function show(anchor) {
    if (!isEnabled()) {
      return;
    }

    const currentRequestId = ++requestId;
    activeAnchor = anchor;
    const sources = await getSources(anchor);
    if (!sources?.length || !canShow(anchor, currentRequestId)) {
      return;
    }

    const cachedImage = imageCache.get(anchor);
    let image = cachedImage?.image;
    if (!image || cachedImage.sources !== sources) {
      image = createImageEl(sources, {
        onLoadFailure() {
          if (imageCache.get(anchor)?.image === image) {
            imageCache.delete(anchor);
          }
          if (activeImage === image) {
            hide();
          }
        },
      });
      image.alt = '';
      image.dataset.pttMediaPreviewFallback = '';
      Object.assign(image.style, {
        display: 'block',
        maxHeight: '80%',
        maxWidth: '90%',
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: '2',
      });
      imageCache.set(anchor, { image, sources });
      image.addEventListener('load', scheduleRender);
    }

    activeImage = image;
    container.appendChild(image);
    render();
  }

  function getAnchor(target) {
    if (!(target instanceof Element)) {
      return null;
    }
    const anchor = target.closest('a');
    return anchor && container.contains(anchor) ? anchor : null;
  }

  container.addEventListener('mouseover', (event) => {
    const anchor = getAnchor(event.target);
    if (!anchor || (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget))) {
      return;
    }
    ({ clientX, clientY } = event);
    show(anchor);
  });

  container.addEventListener('mouseout', (event) => {
    const anchor = getAnchor(event.target);
    if (
      !anchor ||
      anchor !== activeAnchor ||
      (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget))
    ) {
      return;
    }
    hide();
  });

  document.addEventListener(
    'mousemove',
    (event) => {
      ({ clientX, clientY } = event);
      scheduleRender();
    },
    { passive: true },
  );

  window.addEventListener('blur', hide);

  new MutationObserver(() => {
    if (activeAnchor && !activeAnchor.isConnected) {
      hide();
    }
  }).observe(container, { childList: true, subtree: true });

  function refresh() {
    nativePreviewBlocker.disabled = !isEnabled();
    if (!isEnabled()) {
      hide();
    }
  }
  refresh();

  return { refresh };
}
