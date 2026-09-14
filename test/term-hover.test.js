import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, settle } from './dom.js';

test('MP4 hover works and reuses resolved media', async () => {
  const dom = setup(
    '<div id="mainContainer"><a href="https://imgur.com/a/movie">album</a><a href="https://imgur.com/movie">unknown</a></div>',
  );
  const oldFetch = globalThis.fetch;
  window.HTMLMediaElement.prototype.play = async () => {};
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    return {
      ok: true,
      json: async () => ({
        data: url.includes('/album/')
          ? { images: [{ link: 'https://i.imgur.com/movie.mp4' }] }
          : { type: 'video/mp4', link: 'https://i.imgur.com/movie.mp4' },
      }),
    };
  };
  try {
    await import('../src/term.js?hover-regression');
    await settle();
    for (const anchor of document.querySelectorAll('a')) {
      anchor.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
      await settle();
      assert.equal(document.querySelector('video').src, 'https://i.imgur.com/movie.mp4');
    }
    const anchor = document.querySelectorAll('a')[1];
    anchor.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true }));
    anchor.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
    await settle();
    assert.equal(calls, 2);
    assert.equal(document.querySelector('video').src, 'https://i.imgur.com/movie.mp4');
  } finally {
    globalThis.fetch = oldFetch;
    dom.window.close();
  }
});
