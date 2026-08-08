import { createImageEl, resolveAlbum } from './shared/imgur.js';
import { classifyMediaUrl } from './shared/media.js';

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

let { isEasyReadingEnabled } = getConfig();

new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.removedNodes) {
      if (node.role === 'dialog') {
        ({ isEasyReadingEnabled } = getConfig());
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

  function createImage(url) {
    const img = createImageEl(url);
    img.classList.add('easyReadingImg', 'hyperLinkPreview');
    return img;
  }

  function createImgurGif(url) {
    const video = document.createElement('video');
    video.classList.add('easyReadingImg', 'hyperLinkPreview');
    video.src = url.replace(/\.gif$/, '.mp4');
    video.loop = true;
    video.autoplay = true;
    video.controls = false;
    return video;
  }

  function createIframe(src) {
    const container = document.createElement('div');
    container.style.margin = '0.5em auto';
    container.style.maxWidth = '800px';
    container.style.height = '450px';

    const iframe = document.createElement('iframe');
    iframe.type = 'text/html';
    iframe.src = src;
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'origin-when-cross-origin';
    container.appendChild(iframe);
    return container;
  }

  const processed = new WeakSet();

  function getNewElements(elements) {
    const results = [];
    for (const e of elements) {
      if (!processed.has(e)) {
        processed.add(e);
        results.push(e);
      }
    }
    return results;
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

    const as = getNewElements(mainContainer.querySelectorAll('a'));
    const mediaAnchors = as
      .map((a) => [a, classifyMediaUrl(a.href)])
      .filter(([, media]) => media);
    const imageAnchors = mediaAnchors
      .filter(([, media]) => media.kind === 'image')
      .filter(([a]) => {
        const container = getPreviewContainer(a);
        return container && !container.firstChild;
      });
    const albumAnchors = mediaAnchors
      .filter(([, media]) => media.kind === 'imgur-album');

    const videoImgs = getNewElements(
      mainContainer.querySelectorAll('img.hyperLinkPreview[src$=".mp4"]'),
    );

    const ytAnchors = mediaAnchors
      .filter(([, media]) => media.kind === 'youtube');

    const twitchAnchors = mediaAnchors
      .filter(([, media]) => media.kind === 'twitch');

    if (
      imageAnchors.length === 0
      && albumAnchors.length === 0
      && videoImgs.length === 0
      && ytAnchors.length === 0
      && twitchAnchors.length === 0
    ) {
      return;
    }

    observer.disconnect();
    try {
      imageAnchors.forEach(([a, media]) => {
        const div = getPreviewContainer(a);
        if (div) {
          div.appendChild(createImage(media.src));
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
        for (const link of links) {
          div.appendChild(
            link.endsWith('.gif') ? createImgurGif(link) : createImage(link),
          );
        }
      });

      videoImgs.forEach((img) => {
        const videoEl = document.createElement('video');
        videoEl.src = img.src;
        videoEl.classList.add('easyReadingImg', 'hyperLinkPreview');
        videoEl.controls = true;
        img.parentNode?.replaceChild(videoEl, img);
      });

      ytAnchors.forEach(([a, media]) => {
        const div = getPreviewContainer(a);
        if (!div || div.childNodes.length !== 0) {
          return;
        }
        let src = `https://www.youtube.com/embed/${media.id}`;
        if (media.start) {
          src += `?start=${media.start}`;
        }
        const container = document.createElement('div');
        container.style.margin = '0.5em auto';
        container.style.maxWidth = '800px';
        container.style.height = '450px';
        const iframe = document.createElement('iframe');
        iframe.type = 'text/html';
        iframe.src = src;
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'origin-when-cross-origin';
        container.appendChild(iframe);
        div.appendChild(container);
      });

      twitchAnchors.forEach(([a, media]) => {
        const div = getPreviewContainer(a);
        if (!div || div.childNodes.length !== 0) {
          return;
        }
        const container = createIframe(
          `https://clips.twitch.tv/embed?clip=${media.id}&parent=term.ptt.cc`,
        );
        div.appendChild(container);
      });
    } finally {
      observer.observe(mainContainer, observerOptions);
    }
  }

  let timer = null;
  const observer = new MutationObserver(function() {
    if (!timer) {
      timer = setTimeout(() => {
        onUpdate();
        timer = null;
      }, 50);
    }
  });
  observer.observe(mainContainer, observerOptions);
})();
