const imagePathRe = /\.(?:png|jpe?g|gif|webp)$/i;
const imgurHostRe = /^(?:[mi]\.)?imgur\.com$/i;

export function classifyMediaUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }

  if (imgurHostRe.test(url.hostname)) {
    const albumMatch = url.pathname.match(/^\/(?:a|gallery)\/(\w+)/);
    if (albumMatch) {
      return { kind: 'imgur-album', hash: albumMatch[1] };
    }

    if (imagePathRe.test(url.pathname)) {
      return { kind: 'image', sources: url.href };
    }

    const hashMatch = url.pathname.match(/^\/(\w+)$/);
    if (hashMatch) {
      return { kind: 'imgur-unknown', hash: hashMatch[1] };
    }
  }

  if (imagePathRe.test(url.pathname)) {
    return { kind: 'image', sources: url.href };
  }

  if (url.hostname === 'pbs.twimg.com' && url.pathname.startsWith('/media/')) {
    return { kind: 'image', sources: url.href };
  }

  if (url.protocol === 'https:' && url.hostname === 'meee.com.tw' && /^\/\w+$/.test(url.pathname)) {
    url.hostname = `i.${url.hostname}`;
    const basePath = url.pathname;
    const sources = ['jpg', 'png', 'gif', 'jpeg'].map((extension) => {
      url.pathname = `${basePath}.${extension}`;
      return url.href;
    });
    return { kind: 'image', sources };
  }

  if (url.protocol === 'https:' && url.hostname === 'youtu.be') {
    const id = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1];
    return id ? { kind: 'youtube', id, start: url.searchParams.get('t') } : null;
  }

  if (
    url.protocol === 'https:' &&
    url.hostname === 'www.youtube.com' &&
    url.pathname === '/watch'
  ) {
    const id = url.searchParams.get('v')?.match(/^[\w-]+$/)?.[0];
    return id ? { kind: 'youtube', id, start: url.searchParams.get('t') } : null;
  }

  if (url.protocol === 'https:' && url.hostname === 'clips.twitch.tv') {
    const id = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1];
    return id ? { kind: 'twitch', id } : null;
  }

  return null;
}
