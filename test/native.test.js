import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, settle } from './dom.js';
import { installNativeImages, usesNativeImage } from '../src/term/native.js';
import { createInlinePreviewer } from '../src/term/inline.js';
import { createMediaLinkPreviewer } from '../src/shared/previewer.js';
import { classifyMediaUrl } from '../src/shared/media.js';

function fixture(options) {
  const dom = setup(
    '<div id="mainContainer"><a href="https://i.imgur.com/photo.jpg">photo</a><div class="image-preview-popup">native</div></div>',
  );
  let redraws = 0;
  const original = () => 'native-result';
  const plugin = {
    enabled: true,
    view: { redraw: () => redraws++ },
    whitelistOnly: true,
    trustedDomains: ['imgur.com', 'meee.com.tw'],
    isTrustedDomain: (host) => host.endsWith('imgur.com') || host.endsWith('meee.com.tw'),
    resolveImageUrl: original,
  };
  const app = { pluginManager: { getPlugin: () => plugin } };
  const bridge = installNativeImages(app, options);
  return {
    dom,
    plugin,
    bridge,
    original,
    get redraws() {
      return redraws;
    },
    close() {
      bridge.destroy();
      dom.window.close();
    },
  };
}

test('supported images bypass the whitelist while preserving the enabled setting and other media handling', () => {
  const f = fixture();
  for (const href of [
    'https://i.imgur.com/photo.jpg',
    'https://pbs.twimg.com/media/photo?format=png',
    'https://i.meee.com.tw/photo.png',
    'https://untrusted.example/photo.jpg',
  ]) {
    assert.deepEqual(f.plugin.resolveImageUrl(href, true, []), { src: href });
    assert.equal(usesNativeImage(href), true);
  }
  assert.equal(usesNativeImage('https://i.imgur.com/photo.jpg'), true);
  assert.equal(usesNativeImage('https://i.verb.tw/photo.jpg'), false);
  assert.equal(f.plugin.resolveImageUrl('https://i.verb.tw/photo.jpg'), null);
  for (const href of ['https://imgur.com/a/album', 'https://i.imgur.com/clip.gif']) {
    assert.equal(f.plugin.resolveImageUrl(href), null);
    assert.equal(usesNativeImage(href), false);
  }
  assert.equal(f.plugin.resolveImageUrl('https://untrusted.example/page'), 'native-result');
  f.plugin.enabled = false;
  assert.equal(f.plugin.resolveImageUrl('https://i.imgur.com/photo.jpg'), 'native-result');
  assert.equal(f.redraws, 1);
  f.close();
  assert.equal(f.plugin.resolveImageUrl, f.original);
});

test('ambiguous single image sources resolve asynchronously with fallback and no request cache', async () => {
  const tried = [];
  const f = fixture({
    loadImage: async (src) => {
      tried.push(src);
      if (src.endsWith('.jpg')) throw new Error('missing');
      return { src, width: 10, height: 20 };
    },
  });
  f.plugin.isTrustedDomain = () => false;
  f.plugin.trustedDomains = [];
  const hover = f.plugin.resolveImageUrl('https://meee.com.tw/photo', true, []);
  const inline = f.plugin.resolveImageUrl('https://meee.com.tw/photo');
  assert.notEqual(hover, inline);
  await hover;
  assert.equal((await inline).src, 'https://i.meee.com.tw/photo.png');
  assert.equal(tried.length, 4);
  f.close();
});

test('single images remain native before and after hook installation', async () => {
  const f = fixture();
  f.bridge.destroy();
  const content = document.createElement('div');
  content.innerHTML =
    '<div><span data-type="termline"><a href="https://i.imgur.com/photo.jpg">photo</a></span><div><img src="https://i.imgur.com/photo.jpg"></div></div>';
  document.body.append(content);
  const native = content.querySelector('img');
  Object.defineProperties(native, { complete: { value: true }, naturalWidth: { value: 0 } });
  const preview = createInlinePreviewer(content, {
    isEnabled: () => true,
  });
  await settle();
  assert.equal(content.querySelector('[data-ptt-inline-preview]'), null);
  const bridge = installNativeImages({ pluginManager: { getPlugin: () => f.plugin } });
  preview.refresh();
  await settle();
  assert.equal(content.querySelector('[data-ptt-inline-preview]'), null);
  assert.equal(native.style.display, '');
  preview.destroy();
  bridge.destroy();
  f.dom.window.close();
});

test('single image hover remains native before and after hook installation', async () => {
  const f = fixture();
  f.bridge.destroy();
  const container = document.querySelector('#mainContainer');
  const anchor = container.querySelector('a');
  const preview = createMediaLinkPreviewer(container, {
    isEnabled: () => true,
    isEligible: (anchor) => !usesNativeImage(anchor.href),
    resolveMedia: (anchor) => classifyMediaUrl(anchor.href),
  });
  anchor.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
  await settle();
  assert.equal(container.querySelector('[data-ptt-media-preview-fallback]'), null);
  const bridge = installNativeImages({ pluginManager: { getPlugin: () => f.plugin } });
  preview.refresh();
  anchor.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
  await settle();
  assert.equal(container.querySelector('[data-ptt-media-preview-fallback]'), null);
  assert.notEqual(
    getComputedStyle(container.querySelector('.image-preview-popup')).display,
    'none',
  );
  preview.destroy();
  bridge.destroy();
  f.dom.window.close();
});

test('extensionless Imgur images resolve natively without publishing ownership state', async () => {
  let finish;
  const f = fixture({
    getUnknown: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const href = 'https://imgur.com/unknown';
  f.plugin.isTrustedDomain = () => false;
  f.plugin.trustedDomains = [];
  const request = f.plugin.resolveImageUrl(href, true, []);
  assert.equal(usesNativeImage(href), false);
  finish({ type: 'image/png', link: 'https://i.imgur.com/unknown.png' });
  assert.deepEqual(await request, { src: 'https://i.imgur.com/unknown.png' });
  assert.equal(usesNativeImage(href), false);
  assert.equal(document.documentElement.hasAttribute('data-ptt-native-resolved-images'), false);
  f.close();
});

test('resolved Imgur videos do not become native single images', async () => {
  const f = fixture({
    getUnknown: async () => ({ type: 'video/mp4', link: 'https://i.imgur.com/movie.mp4' }),
  });
  const href = 'https://imgur.com/movie';
  await assert.rejects(f.plugin.resolveImageUrl(href), /extension preview/);
  assert.equal(usesNativeImage(href), false);
  f.close();
});

test('native Imgur calls delegate to the supplied resolver without shared ownership state', async () => {
  let calls = 0;
  const f = fixture({
    getUnknown: async () => {
      calls++;
      return { type: 'image/png', link: 'https://i.imgur.com/photo.png' };
    },
  });
  const href = 'https://imgur.com/photo';
  await Promise.all([f.plugin.resolveImageUrl(href), f.plugin.resolveImageUrl(href)]);
  await f.plugin.resolveImageUrl(href);
  assert.equal(calls, 3);
  assert.equal(usesNativeImage(href), false);
  f.close();
});
