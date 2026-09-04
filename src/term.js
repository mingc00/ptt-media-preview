import { createIframeEl, createImageEl, createVideoEl } from './shared/elements.js';
import { getTwitchEmbedUrl, getYoutubeEmbedUrl } from './shared/embed.js';
import { resolveAlbum, resolveUnknown } from './shared/imgur.js';
import { classifyMediaUrl } from './shared/media.js';
import { createImageLinkPreviewer } from './shared/previewer.js';

function getConfig() {
  const raw = localStorage['pttchrome.pref.v1'];
  const config = {
    isEasyReadingEnabled: false,
    isPicPreviewEnabled: true,
  };
  if (!raw) {
    return config;
  }
  try {
    const pref = JSON.parse(raw);
    config.isEasyReadingEnabled = !!pref.values.enableEasyReading;
    config.isPicPreviewEnabled = !!pref.values.enablePicPreview;
  } catch (e) {
    console.error(e);
  }
  return config;
}

let { isEasyReadingEnabled, isPicPreviewEnabled } = getConfig();
let handleConfigChange = () => {};

new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.removedNodes) {
      if (node.role === 'dialog') {
        ({ isEasyReadingEnabled, isPicPreviewEnabled } = getConfig());
        handleConfigChange();
        return;
      }
    }
  }
}).observe(document.body, { childList: true });

(function registerObserver() {
  const mainContainer = document.getElementById('mainContainer');
  if (!mainContainer) {
    setTimeout(registerObserver, 1000);
    return;
  }

  function isMail() {
    return mainContainer.lastChild?.querySelector('.q0.b7')?.textContent === '回信 ';
  }

  const observerOptions = {
    childList: true,
    subtree: true,
  };

  function isLinkPreviewEnabled() {
    return !isEasyReadingEnabled && isPicPreviewEnabled;
  }

  let linkPreviewer = null;
  function syncLinkPreviewer() {
    if (linkPreviewer) {
      linkPreviewer.refresh();
      return;
    }
    if (!isLinkPreviewEnabled()) {
      return;
    }
    linkPreviewer = createImageLinkPreviewer(mainContainer, {
      isEnabled: isLinkPreviewEnabled,
      async resolveSources(anchor) {
        const media = classifyMediaUrl(anchor.href);
        if (media?.kind === 'image') {
          return media.sources;
        }
        if (media?.kind === 'imgur-album') {
          const src = (await resolveAlbum(media.hash))[0];
          return src;
        }
        if (media?.kind === 'imgur-unknown') {
          const { type, link } = await resolveUnknown(media.hash);
          return type.startsWith('image/') ? link : null;
        }
        return null;
      },
    });
  }
  syncLinkPreviewer();

  function createImage(sources) {
    return createImageEl(sources, {
      classes: ['easyReadingImg', 'hyperLinkPreview'],
    });
  }

  function createImgurGif(url) {
    return createVideoEl(url.replace(/\.gif$/, '.mp4'), {
      autoplay: true,
      classes: ['easyReadingImg', 'hyperLinkPreview'],
      controls: false,
      loop: true,
    });
  }

  function createEmbedContainer(iframe) {
    const container = document.createElement('div');
    container.style.margin = '0.5em auto';
    container.style.maxWidth = '800px';
    container.style.height = '450px';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    container.appendChild(iframe);
    return container;
  }

  const processed = new WeakSet();
  const pendingAnchors = new Set();
  const pendingVideoImgs = new Set();

  function getNewElements(elements) {
    const results = [];
    for (const e of elements) {
      if (mainContainer.contains(e) && !processed.has(e)) {
        processed.add(e);
        results.push(e);
      }
    }
    return results;
  }

  function addMatchingElements(root, selector, elements) {
    if (!(root instanceof Element)) {
      return;
    }
    if (root.matches(selector)) {
      elements.add(root);
    }
    for (const element of root.querySelectorAll(selector)) {
      elements.add(element);
    }
  }

  function collectCandidates(root) {
    addMatchingElements(root, 'a', pendingAnchors);
    addMatchingElements(root, 'img.hyperLinkPreview[src$=".mp4"]', pendingVideoImgs);

    // The preview container may be inserted after its preceding anchor wrapper.
    if (root instanceof Element && root.previousElementSibling) {
      const sibling = root.previousElementSibling;
      if (sibling.matches('a')) {
        processed.delete(sibling);
        pendingAnchors.add(sibling);
      }
      for (const anchor of sibling.querySelectorAll('a')) {
        processed.delete(anchor);
        pendingAnchors.add(anchor);
      }
    }
  }

  function getPreviewContainer(a) {
    const container = a.parentElement?.nextElementSibling;
    return container instanceof HTMLElement ? container : null;
  }

  function onUpdate() {
    if (!isEasyReadingEnabled) {
      return;
    }

    if (!mainContainer.querySelector('.q4.b7') || isMail()) {
      return;
    }

    const as = getNewElements(pendingAnchors);
    pendingAnchors.clear();
    const mediaAnchors = as.map((a) => [a, classifyMediaUrl(a.href)]).filter(([, media]) => media);
    const imageAnchors = mediaAnchors
      .filter(([, media]) => media.kind === 'image')
      .filter(([a]) => {
        const container = getPreviewContainer(a);
        return container && !container.firstChild;
      });
    const albumAnchors = mediaAnchors.filter(([, media]) => media.kind === 'imgur-album');

    const videoImgs = getNewElements(pendingVideoImgs);
    pendingVideoImgs.clear();

    const ytAnchors = mediaAnchors.filter(([, media]) => media.kind === 'youtube');

    const twitchAnchors = mediaAnchors.filter(([, media]) => media.kind === 'twitch');

    if (
      imageAnchors.length === 0 &&
      albumAnchors.length === 0 &&
      videoImgs.length === 0 &&
      ytAnchors.length === 0 &&
      twitchAnchors.length === 0
    ) {
      return;
    }

    observer.disconnect();
    try {
      imageAnchors.forEach(([a, media]) => {
        const div = getPreviewContainer(a);
        if (div) {
          div.appendChild(createImage(media.sources));
        }
      });

      albumAnchors.forEach(async ([a, media]) => {
        const div = getPreviewContainer(a);
        if (!div) {
          return;
        }
        while (div.firstChild) {
          div.removeChild(div.lastChild);
        }
        const links = await resolveAlbum(media.hash);
        const fragment = document.createDocumentFragment();
        for (const link of links) {
          fragment.appendChild(link.endsWith('.gif') ? createImgurGif(link) : createImage(link));
        }
        div.appendChild(fragment);
      });

      videoImgs.forEach((img) => {
        const videoEl = createVideoEl(img.src, {
          classes: ['easyReadingImg', 'hyperLinkPreview'],
        });
        img.parentNode?.replaceChild(videoEl, img);
      });

      ytAnchors.forEach(([a, media]) => {
        const div = getPreviewContainer(a);
        if (!div || div.childNodes.length !== 0) {
          return;
        }
        const iframe = createIframeEl(getYoutubeEmbedUrl(media), {
          referrerPolicy: 'origin-when-cross-origin',
        });
        div.appendChild(createEmbedContainer(iframe));
      });

      twitchAnchors.forEach(([a, media]) => {
        const div = getPreviewContainer(a);
        if (!div || div.childNodes.length !== 0) {
          return;
        }
        const iframe = createIframeEl(getTwitchEmbedUrl(media.id, 'term.ptt.cc'), {
          referrerPolicy: 'origin-when-cross-origin',
        });
        div.appendChild(createEmbedContainer(iframe));
      });
    } finally {
      observer.observe(mainContainer, observerOptions);
    }
  }

  let timer = null;
  function scheduleUpdate() {
    if (!timer) {
      timer = setTimeout(() => {
        onUpdate();
        timer = null;
      }, 50);
    }
  }

  handleConfigChange = () => {
    syncLinkPreviewer();
    collectCandidates(mainContainer);
    scheduleUpdate();
  };

  const observer = new MutationObserver(function (records) {
    for (const record of records) {
      for (const node of record.addedNodes) {
        collectCandidates(node);
      }
    }
    if (pendingAnchors.size || pendingVideoImgs.size) {
      scheduleUpdate();
    }
  });
  observer.observe(mainContainer, observerOptions);
  collectCandidates(mainContainer);
  scheduleUpdate();
})();
