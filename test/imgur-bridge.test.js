import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, settle } from './dom.js';
import { installImgurBridge, requestUnknown } from '../src/term/imgur-bridge.js';
import { installNativeImages } from '../src/term/native.js';
import { createInlinePreviewer } from '../src/term/inline.js';
import { resolveUnknown } from '../src/shared/imgur.js';

test('native and extension animation resolution share one request and reuse successful results', async () => {
  const dom = setup(
    '<div id="content"><div><span data-type="termline"><a href="https://imgur.com/sharedMovie">movie</a></span><div></div></div></div>',
  );
  const oldFetch = globalThis.fetch;
  let calls = 0;
  let complete;
  globalThis.fetch = () => {
    calls++;
    return new Promise((resolve) => {
      complete = resolve;
    });
  };
  const stop = installImgurBridge();
  const plugin = { enabled: true, resolveImageUrl: () => null };
  const native = installNativeImages({ pluginManager: { getPlugin: () => plugin } });
  const inline = createInlinePreviewer(document.querySelector('#content'), {
    isEnabled: () => true,
  });
  try {
    const request = plugin.resolveImageUrl('https://imgur.com/sharedMovie');
    const rejection = assert.rejects(request, /extension preview/);
    await settle();
    assert.equal(calls, 1);
    complete({
      ok: true,
      json: async () => ({
        data: { type: 'video/mp4', link: 'https://i.imgur.com/sharedMovie.mp4' },
      }),
    });
    await rejection;
    await settle();
    assert.equal(document.querySelector('video').src, 'https://i.imgur.com/sharedMovie.mp4');
    await assert.rejects(
      plugin.resolveImageUrl('https://imgur.com/sharedMovie'),
      /extension preview/,
    );
    assert.equal((await resolveUnknown('sharedMovie')).type, 'video/mp4');
    assert.equal(calls, 1);
  } finally {
    inline.destroy();
    native.destroy();
    stop();
    dom.window.close();
    globalThis.fetch = oldFetch;
  }
});

test('page requests wait for isolated service startup and failed requests can retry', async () => {
  const dom = setup();
  const oldFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    if (++calls === 1) throw new Error('offline');
    return {
      ok: true,
      json: async () => ({
        data: { type: 'image/png', link: 'https://i.imgur.com/retryBridge.png' },
      }),
    };
  };
  const pending = requestUnknown('retryBridge');
  const rejection = assert.rejects(pending, /Unable to resolve/);
  const stop = installImgurBridge();
  try {
    await rejection;
    assert.equal((await requestUnknown('retryBridge')).type, 'image/png');
    assert.equal(calls, 2);
  } finally {
    stop();
    dom.window.close();
    globalThis.fetch = oldFetch;
  }
});

test('successful Imgur results expire and the cache is bounded', async () => {
  const oldFetch = globalThis.fetch;
  const oldNow = Date.now;
  let now = oldNow();
  let calls = 0;
  Date.now = () => now;
  globalThis.fetch = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({ data: { type: 'image/jpeg', link: 'https://i.imgur.com/cache.jpg' } }),
    };
  };
  try {
    await Promise.all([resolveUnknown('expiring'), resolveUnknown('expiring')]);
    assert.equal(calls, 1);
    now += 5 * 60 * 1000 + 1;
    await resolveUnknown('expiring');
    assert.equal(calls, 2);
    for (let i = 0; i < 100; i++) await resolveUnknown(`bounded${i}`);
    await resolveUnknown('expiring');
    assert.equal(calls, 103);
  } finally {
    globalThis.fetch = oldFetch;
    Date.now = oldNow;
  }
});
