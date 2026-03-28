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
  const response = await fetch(
    `https://api.imgur.com/3/${path}?client_id=${clientID}`,
    {
      method: 'GET',
      mode: 'cors',
      referrerPolicy: 'no-referrer',
    },
  );
  return await response.json();
}

function createVideoEl(src) {
  const videoEl = document.createElement('video');
  videoEl.src = src;
  videoEl.controls = true;
  return videoEl;
}

function createImageEl(src) {
  const imgEl = document.createElement('img');
  if (!src.startsWith('https://i.verb.tw/')) {
    imgEl.referrerPolicy = 'no-referrer';
  }
  imgEl.src = src;
  return imgEl;
}

async function resolveAlbum(hash) {
  try {
    const {
      data: { images },
    } = await get(`album/${hash}`);

    return images.map((img) => img.link);
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function resolveUnknown(hash) {
  try {
    const {
      data: { type, link },
    } = await get(`image/${hash}`);
    return { type, link };
  } catch (e) {
    console.error(e);
    return { type: 'unknown' };
  }
}
