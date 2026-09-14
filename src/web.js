import {
  createIframeEl,
  createImageEl,
  createImgurGifEl,
  createPreviewEl,
  createVideoEl,
} from './shared/elements.js';
import { getTwitchEmbedUrl, getYoutubeEmbedUrl } from './shared/embed.js';
import { resolveAlbum, resolveUnknown } from './shared/imgur.js';
import { classifyMediaUrl } from './shared/media.js';

const links = document.querySelectorAll(
  ['a[href*="//imgur.com"]', 'a[href*="//i.imgur.com/"]', 'a[href*=".webp"]'].join(','),
);
function createDiv(...classes) {
  const div = document.createElement('div');
  div.classList.add(...classes);
  return div;
}

function insertPreview(anchor, el) {
  const div = createDiv('richcontent');
  div.appendChild(el);
  anchor.parentNode.insertBefore(div, anchor.nextSibling);
}

function createLazyImageEl(sources) {
  return createImageEl(sources, { loading: 'lazy' });
}

function fixBrokenImagePreview(anchor) {
  const next = anchor.nextElementSibling;
  if (next?.classList.contains('richcontent')) {
    next.firstChild.src = anchor.href;
  } else {
    insertPreview(anchor, createLazyImageEl(anchor.href));
  }
}

function createImgurMediaEl(link) {
  return createPreviewEl(classifyMediaUrl(link), { loading: 'lazy' });
}

const albums = [];
const unknownHashes = [];

for (const a of links) {
  const media = classifyMediaUrl(a.href);
  if (media?.kind === 'imgur-album') {
    albums.push([a, media.hash]);
  } else if (media?.kind === 'image') {
    fixBrokenImagePreview(a);
  } else if (media?.kind === 'imgur-gif') {
    const video = createImgurGifEl(media.src);
    const next = a.nextElementSibling;
    if (next?.classList.contains('richcontent')) {
      next.replaceChildren(video);
    } else {
      insertPreview(a, video);
    }
  } else if (media?.kind === 'imgur-unknown') {
    unknownHashes.push([a, media.hash]);
  }
}

albums.forEach(async ([a, hash]) => {
  const links = await resolveAlbum(hash).catch((error) => {
    console.error(error);
    return [];
  });
  for (const link of links.reverse()) {
    const preview = createImgurMediaEl(link);
    if (preview) {
      insertPreview(a, preview);
    }
  }
});

unknownHashes.forEach(async ([a, hash]) => {
  const { type, link } = await resolveUnknown(hash).catch((error) => {
    console.error(error);
    return { type: 'unknown' };
  });
  let el = null;
  if (type === 'image/gif') {
    el = createImgurMediaEl(link);
  } else if (type.startsWith('video/')) {
    el = createVideoEl(link);
  } else if (type.startsWith('image/')) {
    el = createLazyImageEl(link);
  }
  if (el) {
    insertPreview(a, el);
  }
});

for (const a of document.querySelectorAll('a[href^="https://meee.com.tw/"]')) {
  const media = classifyMediaUrl(a.href);
  if (media?.kind !== 'image') {
    continue;
  }
  insertPreview(a, createLazyImageEl(media.sources));
}

for (const a of document.querySelectorAll('a[href^="https://clips.twitch.tv"]')) {
  const media = classifyMediaUrl(a.href);
  if (media?.kind !== 'twitch') {
    continue;
  }
  const iframe = createIframeEl(getTwitchEmbedUrl(media.id, 'www.ptt.cc'), {
    classes: ['youtube-player'],
  });
  const contentDiv = createDiv('resize-content');
  contentDiv.appendChild(iframe);
  const container = createDiv('resize-container');
  container.appendChild(contentDiv);
  insertPreview(a, container);
}

for (const a of document.querySelectorAll(
  'a[href^="https://pbs.twimg.com/media/"][href*="?format="]',
)) {
  const media = classifyMediaUrl(a.href);
  if (media?.kind === 'image') {
    insertPreview(a, createLazyImageEl(media.sources));
  }
}

// fix youtube links with start time
for (const a of document.querySelectorAll('a[href^="https://youtu.be/"]')) {
  const media = classifyMediaUrl(a.href);
  if (media?.kind !== 'youtube' || !media.start) {
    continue;
  }
  const iframe = document.querySelector(`iframe.youtube-player[src*="/${media.id}"]`);
  if (iframe) {
    iframe.src = getYoutubeEmbedUrl(media);
  }
}
