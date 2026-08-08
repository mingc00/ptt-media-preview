import {
  createImageEl,
  createVideoEl,
  resolveAlbum,
  resolveUnknown,
} from './shared/imgur.js';
import { classifyMediaUrl } from './shared/media.js';

const links = document.querySelectorAll([
  'a[href*="//imgur.com"]',
  'a[href*="//i.imgur.com/"]',
  'a[href*=".webp"]',
].join(','));
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

function createLazyImageEl(src) {
  const imgEl = createImageEl(src);
  imgEl.loading = 'lazy';
  return imgEl;
}

function fixBrokenPreview(anchor) {
  const next = anchor.nextElementSibling;
  if (next?.classList.contains('richcontent')) {
    next.firstChild.src = anchor.href;
  } else {
    insertPreview(anchor, createLazyImageEl(anchor.href));
  }
}

const albums = [];
const unknownHashes = [];

for (const a of links) {
  const media = classifyMediaUrl(a.href);
  if (media?.kind === 'imgur-album') {
    albums.push([a, media.hash]);
  } else if (media?.kind === 'image') {
    fixBrokenPreview(a);
  } else if (media?.kind === 'imgur-unknown') {
    unknownHashes.push([a, media.hash]);
  }
}

albums.forEach(async ([a, hash]) => {
  const links = await resolveAlbum(hash);
  for (const link of links.reverse()) {
    insertPreview(a, createLazyImageEl(link));
  }
});

unknownHashes.forEach(async ([a, hash]) => {
  const { type, link } = await resolveUnknown(hash);
  let el = null;
  if (type.startsWith('video/')) {
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
  insertPreview(a, createLazyImageEl(media.src));
}

for (const a of document.querySelectorAll('a[href^="https://clips.twitch.tv"]')) {
  const media = classifyMediaUrl(a.href);
  if (media?.kind !== 'twitch') {
    continue;
  }
  const iframe = document.createElement('iframe');
  iframe.classList.add('youtube-player');
  iframe.type = 'text/html';
  iframe.src = `https://clips.twitch.tv/embed?clip=${media.id}&parent=www.ptt.cc`;
  iframe.allowFullscreen = true;
  iframe.style.border = 'none';
  const contentDiv = createDiv('resize-content');
  contentDiv.appendChild(iframe);
  const container = createDiv('resize-container');
  container.appendChild(contentDiv);
  insertPreview(a, container);
}

for (const a of document.querySelectorAll('a[href^="https://pbs.twimg.com/media/"][href*="?format="]')) {
  const media = classifyMediaUrl(a.href);
  if (media?.kind === 'image') {
    insertPreview(a, createLazyImageEl(media.src));
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
    iframe.src += `?start=${media.start}`;
  }
}
