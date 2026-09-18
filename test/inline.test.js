import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, settle } from './dom.js';
import { createInlinePreviewer } from '../src/term/inline.js';
import { INLINE_OWNER_ATTRIBUTE } from '../src/term/inline-ownership.js';

function row(urls, native = '') {
  return `<span type="termrow"><div><span data-type="termline">${urls.map((url) => `<a href="${url}">${url}</a>`).join('')}</span><div>${native}</div></div></span>`;
}
function fixture(html, options = {}) {
  const dom = setup(`<div id="easyReadingContent">${html}</div>`);
  const content = document.querySelector('#easyReadingContent');
  const previewer = createInlinePreviewer(content, { isEnabled: () => true, ...options });
  return {
    content,
    close() {
      previewer.destroy();
      dom.window.close();
    },
    previewer,
  };
}

test('same-row links get separate previews without removing native images', async () => {
  const f = fixture(
    row(
      ['https://i.imgur.com/kept.jpg', 'https://meee.com.tw/missing', 'https://youtu.be/abc'],
      '<div class="easyReadingImgContainer"><img src="https://i.imgur.com/kept.jpg"></div>',
    ),
  );
  const native = f.content.querySelector('img');
  Object.defineProperty(native, 'naturalWidth', { value: 100 });
  await settle();
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview]').length, 1);
  assert.equal(f.content.querySelectorAll('iframe').length, 1);
  assert.ok(native.isConnected);
  assert.notEqual(native.style.display, 'none');
  f.close();
});

test('verb images use the extension renderer and preserve the document referrer', async () => {
  const f = fixture(row(['https://i.verb.tw/7pXQLxfu.jpg']));
  await settle();
  const image = f.content.querySelector('[data-ptt-inline-preview] img');
  assert.equal(image.src, 'https://i.verb.tw/7pXQLxfu.jpg');
  assert.equal(image.hasAttribute('referrerpolicy'), false);
  f.close();
});

test('album previews leave existing images untouched', async () => {
  const f = fixture(
    row(
      ['https://imgur.com/a/album', 'https://i.imgur.com/kept.jpg'],
      '<img src="https://i.imgur.com/kept.jpg">',
    ),
    {
      getAlbum: async () => ['https://i.imgur.com/first.jpg', 'https://i.imgur.com/second.jpg'],
    },
  );
  const kept = f.content.querySelector('img');
  Object.defineProperty(kept, 'naturalWidth', { value: 100 });
  await settle();
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview] img').length, 2);
  const placeholder = document.createElement('img');
  placeholder.src = 'https://i.imgur.com/album.jpg';
  kept.parentElement.append(placeholder);
  await settle();
  assert.equal(placeholder.style.display, '');
  assert.notEqual(kept.style.display, 'none');
  f.previewer.destroy();
  assert.equal(placeholder.style.display, '');
  f.close();
});

test('removed articles and reused anchors cannot receive stale album results', async () => {
  let finish;
  const f = fixture(row(['https://imgur.com/a/old']), {
    getAlbum: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  await settle();
  const anchor = f.content.querySelector('a');
  anchor.href = 'https://i.imgur.com/new.jpg';
  finish(['https://i.imgur.com/stale.jpg']);
  await settle();
  assert.equal(f.content.querySelectorAll('img').length, 0);
  f.content.innerHTML = row(['https://imgur.com/a/another']);
  await settle();
  f.content.replaceChildren();
  finish(['https://i.imgur.com/stale.jpg']);
  await settle();
  assert.equal(f.content.querySelector('img'), null);
  f.close();
});

test('failed native images remain owned by native preview', async () => {
  let enabled = true;
  const f = fixture(
    row(['https://i.imgur.com/fail.jpg'], '<img src="https://i.imgur.com/fail.jpg">'),
    { isEnabled: () => enabled },
  );
  const native = f.content.querySelector('img');
  Object.defineProperties(native, { complete: { value: true }, naturalWidth: { value: 0 } });
  native.dispatchEvent(new window.Event('error'));
  await settle();
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview]').length, 0);
  assert.equal(native.style.display, '');
  enabled = false;
  f.previewer.refresh();
  await settle();
  assert.equal(f.content.querySelector('[data-ptt-inline-preview]'), null);
  assert.equal(native.style.display, '');
  f.close();
});

test('late native images are not duplicated or hidden', async () => {
  const f = fixture(row(['https://i.imgur.com/photo.jpg']));
  await settle();
  const native = document.createElement('img');
  native.src = 'https://i.imgur.com/photo.jpg';
  f.content.querySelector('[data-type="termline"]').nextElementSibling.append(native);
  await settle();
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview]').length, 0);
  assert.equal(native.style.display, '');
  f.close();
});

test('extensionless single images stay native while album MP4s retain extension previews', async () => {
  let calls = 0;
  const f = fixture(row(['https://imgur.com/unknown', 'https://imgur.com/a/videos']), {
    getUnknown: async () => {
      calls++;
      return { type: 'image/png', link: 'https://i.imgur.com/actual.png' };
    },
    getAlbum: async () => ['https://i.imgur.com/clip.mp4'],
  });
  await settle();
  assert.equal(f.content.querySelector('[data-ptt-inline-preview] img'), null);
  assert.equal(f.content.querySelector('video').src, 'https://i.imgur.com/clip.mp4');
  f.previewer.refresh();
  await settle();
  assert.equal(calls, 1);
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview]').length, 1);
  f.close();
});

test('extension-owned inline images rely only on native lazy loading', async () => {
  const dom = setup(
    `<div id="easyReadingContent">${row([
      'https://i.imgur.com/photo.jpg',
      'https://pbs.twimg.com/media/photo?format=png&name=orig',
      'https://untrusted.example/photo.bmp',
    ])}</div>`,
  );
  document.documentElement.setAttribute(INLINE_OWNER_ATTRIBUTE, '');
  const content = document.querySelector('#easyReadingContent');
  const previewer = createInlinePreviewer(content, { isEnabled: () => true });

  await settle();
  const images = [...content.querySelectorAll('[data-ptt-inline-preview] img')];
  assert.equal(images.length, 3);
  assert.deepEqual(
    images.map((image) => image.loading),
    ['lazy', 'lazy', 'lazy'],
  );
  assert.equal(content.querySelector('.easyReadingImgContainer'), null);

  previewer.destroy();
  dom.window.close();
});

test('extension-owned inline mode renders extensionless Imgur single images', async () => {
  const dom = setup(`<div id="easyReadingContent">${row(['https://imgur.com/unknown'])}</div>`);
  document.documentElement.setAttribute(INLINE_OWNER_ATTRIBUTE, '');
  const content = document.querySelector('#easyReadingContent');
  const previewer = createInlinePreviewer(content, {
    isEnabled: () => true,
    getUnknown: async () => ({
      type: 'image/png',
      link: 'https://i.imgur.com/actual.png',
    }),
  });

  await settle();
  const image = content.querySelector('[data-ptt-inline-preview] img');
  assert.equal(image.src, 'https://i.imgur.com/actual.png');
  assert.equal(image.loading, 'lazy');

  previewer.destroy();
  dom.window.close();
});

test('temporary resolution failures retry and recover without a DOM change', async () => {
  let calls = 0;
  const f = fixture(row(['https://imgur.com/a/retry']), {
    getAlbum: async () => {
      if (++calls === 1) throw new Error('temporary');
      return ['https://i.imgur.com/recovered.jpg'];
    },
  });
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(calls, 2);
  assert.equal(f.content.querySelector('img').src, 'https://i.imgur.com/recovered.jpg');
  f.close();
});

test('resolution retries stop after three attempts and unsupported results do not retry', async () => {
  let calls = 0;
  const originalError = console.error;
  console.error = () => {};
  const f = fixture(row(['https://imgur.com/a/fail']), {
    getAlbum: async () => {
      calls++;
      throw new Error('offline');
    },
  });
  try {
    await settle();
    f.previewer.refresh();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 3100));
    assert.equal(calls, 3);
  } finally {
    f.close();
    console.error = originalError;
  }
  let emptyCalls = 0;
  const empty = fixture(row(['https://imgur.com/a/empty']), {
    getAlbum: async () => {
      emptyCalls++;
      return [];
    },
  });
  await settle();
  empty.previewer.refresh();
  await settle();
  assert.equal(emptyCalls, 1);
  empty.close();
});
