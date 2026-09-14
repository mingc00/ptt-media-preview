async function get(path) {
  const clientIDs = [
    // 'be82c350cb8d1c6',
    'a023b4e4a5324bc',
    'ca7108e04622b7a',
    'e83ef0f75467fbf',
    '8683d4c3edf9f8f',
    '88f07b92270c5f2',
  ];
  const clientID = clientIDs[Math.floor(Math.random() * clientIDs.length)];
  const response = await fetch(`https://api.imgur.com/3/${path}?client_id=${clientID}`, {
    method: 'GET',
    mode: 'cors',
    referrerPolicy: 'no-referrer',
  });
  if (response.ok === false) throw new Error(`Imgur request failed: ${response.status}`);
  return await response.json();
}

export async function resolveAlbum(hash) {
  const {
    data: { images },
  } = await get(`album/${hash}`);
  return images.map((img) => img.link);
}

async function fetchUnknown(hash) {
  const {
    data: { type, link },
  } = await get(`image/${hash}`);
  if (typeof type !== 'string' || typeof link !== 'string')
    throw new Error('Invalid Imgur media response');
  return { type, link };
}

// Shared by the isolated Term resolver service and extension previews.
const unknownCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_LIMIT = 100;

export function resolveUnknown(hash) {
  const cached = unknownCache.get(hash);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const entry = { expires: Date.now() + CACHE_TTL };
  entry.promise = fetchUnknown(hash).catch((error) => {
    if (unknownCache.get(hash) === entry) unknownCache.delete(hash);
    throw error;
  });
  unknownCache.delete(hash);
  unknownCache.set(hash, entry);
  if (unknownCache.size > CACHE_LIMIT) unknownCache.delete(unknownCache.keys().next().value);
  return entry.promise;
}
