import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, settle } from './dom.js';

test('entry point observes separate reading content and rebinds Canvas screens', async () => {
  const dom = setup(
    '<div id="TermWindow"><div id="mainContainer"><canvas></canvas></div><div id="easyReadingOverlay" style="display:block"><div id="easyReadingContent"><span type="termrow"><div><span data-type="termline"><a href="https://meee.com.tw/example">image</a></span><div></div></div></span></div></div></div>',
  );
  await import('../src/term.js');
  await settle();
  assert.ok(document.querySelector('#easyReadingContent [data-ptt-inline-preview] img'));
  const old = document.querySelector('#mainContainer');
  old.outerHTML =
    '<div id="mainContainer"><canvas></canvas><a href="https://i.imgur.com/new.jpg"></a></div>';
  document.querySelector('#easyReadingOverlay').style.display = 'none';
  await settle();
  assert.equal(old.hasAttribute('data-ptt-media-preview-container'), false);
  const current = document.querySelector('#mainContainer');
  assert.ok(current.hasAttribute('data-ptt-media-preview-container'));
  current.querySelector('a').dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
  await settle();
  assert.ok(current.querySelector('[data-ptt-media-preview-fallback]'));
  assert.equal(document.querySelector('#easyReadingContent [data-ptt-inline-preview]'), null);
  dom.window.close();
});
