const links = [
  ...document.querySelectorAll('a[href*="//imgur.com"]'),
  ...document.querySelectorAll('a[href*="//i.imgur.com/"]'),
  ...document.querySelectorAll('a[href*=".webp"]'),
];

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
  const url = new URL(a.href);
  const { pathname } = url;
  let match = null;
  if ((match = pathname.match(/^\/(?:a|gallery)\/(\w+)/))) {
    albums.push([a, match[1]]);
  } else if (/(png|jpeg|jpg|gif|webp)$/i.test(pathname)) {
    fixBrokenPreview(a);
  } else if ((match = pathname.match(/^\/(\w+)$/))) {
    unknownHashes.push([a, match[1]]);
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
  const url = new URL(a.href);
  if (!url.pathname.match(/^\/\w+$/)) {
    continue;
  }
  url.host = `i.${url.host}`;
  url.pathname += '.jpg';
  insertPreview(a, createLazyImageEl(url.toString()));
}

for (const a of document.querySelectorAll('a[href^="https://clips.twitch.tv"]')) {
  const url = new URL(a.href);
  const iframe = document.createElement('iframe');
  iframe.classList.add('youtube-player');
  iframe.type = 'text/html';
  iframe.src = `https://clips.twitch.tv/embed?clip=${url.pathname.slice(1)}&parent=www.ptt.cc`;
  iframe.allowFullscreen = true;
  iframe.style.border = 'none';
  const contentDiv = createDiv('resize-content');
  contentDiv.appendChild(iframe);
  const container = createDiv('resize-container');
  container.appendChild(contentDiv);
  insertPreview(a, container);
}

for (const a of document.querySelectorAll('a[href^="https://pbs.twimg.com/media/"][href*="?format="]')) {
  insertPreview(a, createLazyImageEl(a.href));
}

// fix youtube links with start time
for (const a of document.querySelectorAll('a[href^="https://youtu.be/"]')) {
  const url = new URL(a.href);
  const start = url.searchParams.get('t');
  if (!start) {
    continue;
  }
  const iframe = document.querySelector(`iframe.youtube-player[src*="${url.pathname}"]`);
  if (iframe) {
    iframe.src += `?start=${start}`;
  }
}
