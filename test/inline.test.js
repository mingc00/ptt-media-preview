import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, settle } from './dom.js';
import { createInlinePreviewer } from '../src/term/inline.js';

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
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview]').length, 2);
  assert.equal(f.content.querySelectorAll('iframe').length, 1);
  assert.ok(native.isConnected);
  assert.notEqual(native.style.display, 'none');
  f.close();
});

test('album only hides its own native placeholder, including late native renders', async () => {
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
  assert.equal(placeholder.style.display, 'none');
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
  assert.equal(f.content.querySelectorAll('img').length, 1);
  assert.equal(f.content.querySelector('img').src, anchor.href);
  f.content.innerHTML = row(['https://imgur.com/a/another']);
  await settle();
  f.content.replaceChildren();
  finish(['https://i.imgur.com/stale.jpg']);
  await settle();
  assert.equal(f.content.querySelector('img'), null);
  f.close();
});

test('failed native images get a fallback, and disabling removes owned previews', async () => {
  let enabled = true;
  const f = fixture(
    row(['https://i.imgur.com/fail.jpg'], '<img src="https://i.imgur.com/fail.jpg">'),
    { isEnabled: () => enabled },
  );
  const native = f.content.querySelector('img');
  Object.defineProperties(native, { complete: { value: true }, naturalWidth: { value: 0 } });
  native.dispatchEvent(new window.Event('error'));
  await settle();
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview]').length, 1);
  assert.equal(native.style.display, 'none');
  enabled = false;
  f.previewer.refresh();
  await settle();
  assert.equal(f.content.querySelector('[data-ptt-inline-preview]'), null);
  assert.equal(native.style.display, '');
  f.close();
});

test('late successful native images are not duplicated by an existing fallback', async () => {
  const f = fixture(row(['https://i.imgur.com/photo.jpg']));
  await settle();
  const native = document.createElement('img');
  native.src = 'https://i.imgur.com/photo.jpg';
  f.content.querySelector('[data-type="termline"]').nextElementSibling.append(native);
  await settle();
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview]').length, 1);
  assert.equal(native.style.display, 'none');
  f.close();
});

test('extensionless images and album MP4s resolve into owned media once', async () => {
  let calls = 0;
  const f = fixture(row(['https://imgur.com/unknown', 'https://imgur.com/a/videos']), {
    getUnknown: async () => {
      calls++;
      return { type: 'image/png', link: 'https://i.imgur.com/actual.png' };
    },
    getAlbum: async () => ['https://i.imgur.com/clip.mp4'],
  });
  await settle();
  assert.equal(
    f.content.querySelector('[data-ptt-inline-preview] img').src,
    'https://i.imgur.com/actual.png',
  );
  assert.equal(f.content.querySelector('video').src, 'https://i.imgur.com/clip.mp4');
  f.previewer.refresh();
  await settle();
  assert.equal(calls, 1);
  assert.equal(f.content.querySelectorAll('[data-ptt-inline-preview]').length, 2);
  f.close();
});
