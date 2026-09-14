import { createPreviewEl } from './elements.js';

const PREVIEW_MARGIN = 20;

export function createMediaLinkPreviewer(container, { isEnabled, resolveMedia }) {
  const mediaCache = new WeakMap();
  const elementCache = new WeakMap();
  const nativePreviewBlocker = document.createElement('style');
  container.dataset.pttMediaPreviewContainer = '';
  nativePreviewBlocker.textContent = `
    [data-ptt-media-preview-container] > img:not([data-ptt-media-preview-fallback]) {
      display: none !important;
    }
  `;
  document.head.appendChild(nativePreviewBlocker);

  let activeAnchor = null;
  let activeElement = null;
  let requestId = 0;
  let renderFrame = null;
  let clientX = -1;
  let clientY = -1;

  function hide() {
    requestId += 1;
    activeAnchor = null;
    activeElement?.remove();
    activeElement = null;
  }

  function render() {
    const element = activeElement;
    if (!element?.isConnected) {
      return;
    }

    // Position from the rendered rectangle rather than intrinsic image dimensions.
    // A second pass accounts for viewport changes when scrollbars disappear.
    for (let pass = 0; pass < 2; pass += 1) {
      const rect = element.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const maxLeft = Math.max(PREVIEW_MARGIN, viewportWidth - PREVIEW_MARGIN - rect.width);
      const maxTop = Math.max(PREVIEW_MARGIN, viewportHeight - PREVIEW_MARGIN - rect.height);
      const targetLeft = Math.min(Math.max(PREVIEW_MARGIN, clientX + PREVIEW_MARGIN), maxLeft);
      const targetTop = Math.min(Math.max(PREVIEW_MARGIN, clientY - rect.height / 2), maxTop);
      const scaleX = element.offsetWidth ? rect.width / element.offsetWidth : 1;
      const scaleY = element.offsetHeight ? rect.height / element.offsetHeight : 1;

      element.style.left = `${element.offsetLeft + (targetLeft - rect.left) / scaleX}px`;
      element.style.top = `${element.offsetTop + (targetTop - rect.top) / scaleY}px`;
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

  function getMedia(anchor) {
    const cached = mediaCache.get(anchor);
    if (cached?.href === anchor.href) {
      return cached.media;
    }

    const media = Promise.resolve(resolveMedia(anchor));
    mediaCache.set(anchor, { href: anchor.href, media });
    return media;
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
    const media = await getMedia(anchor);
    if (!media || !canShow(anchor, currentRequestId)) {
      return;
    }

    const cachedElement = elementCache.get(anchor);
    let element = cachedElement?.element;
    if (!element || cachedElement.media !== media) {
      element = createPreviewEl(media, {
        onLoadFailure() {
          if (elementCache.get(anchor)?.element === element) {
            elementCache.delete(anchor);
          }
          if (activeElement === element) {
            hide();
          }
        },
      });
      if (!element) {
        return;
      }
      if (element instanceof HTMLImageElement) {
        element.alt = '';
      }
      element.dataset.pttMediaPreviewFallback = '';
      Object.assign(element.style, {
        display: 'block',
        maxHeight: '80%',
        maxWidth: '90%',
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: '2',
      });
      elementCache.set(anchor, { element, media });
      element.addEventListener(
        element instanceof HTMLVideoElement ? 'loadedmetadata' : 'load',
        scheduleRender,
      );
      if (element instanceof HTMLVideoElement) {
        element.addEventListener('error', () => {
          if (elementCache.get(anchor)?.element === element) {
            elementCache.delete(anchor);
          }
          if (activeElement === element) {
            hide();
          }
        });
      }
    }

    activeElement = element;
    container.appendChild(element);
    if (element instanceof HTMLVideoElement) {
      element.play().catch(() => {});
    }
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
