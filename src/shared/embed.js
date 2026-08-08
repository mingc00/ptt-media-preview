export function getYoutubeEmbedUrl({ id, start }) {
  const url = new URL(`https://www.youtube.com/embed/${id}`);
  if (start) {
    url.searchParams.set('start', start);
  }
  return url.href;
}

export function getTwitchEmbedUrl(id, parent) {
  const url = new URL('https://clips.twitch.tv/embed');
  url.searchParams.set('clip', id);
  url.searchParams.set('parent', parent);
  return url.href;
}
