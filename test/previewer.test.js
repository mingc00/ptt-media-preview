import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, settle } from './dom.js';
import { createMediaLinkPreviewer } from '../src/shared/previewer.js';

test('hover previews ignore changed hrefs and clean up replaced screens', async () => {
  const dom = setup(
    '<div id="mainContainer"><canvas></canvas><a href="https://i.imgur.com/old.jpg"></a><div class="image-preview-popup"></div></div>',
  );
  const container = document.querySelector('#mainContainer');
  const anchor = container.querySelector('a');
  let complete;
  let calls = 0;
  const previewer = createMediaLinkPreviewer(container, {
    isEnabled: () => true,
    resolveMedia: () => {
      calls++;
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
  });
  anchor.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
  anchor.href = 'https://i.imgur.com/new.jpg';
  complete({ kind: 'image', sources: 'https://i.imgur.com/old.jpg' });
  await settle();
  assert.equal(container.querySelector('img'), null);
  anchor.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
  complete({ kind: 'image', sources: anchor.href });
  await settle();
  assert.equal(container.querySelector('img').src, anchor.href);
  previewer.destroy();
  assert.equal(container.querySelector('img'), null);
  anchor.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
  assert.equal(calls, 2);
  dom.window.close();
});
