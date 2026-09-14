import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, settle } from './dom.js';
import { readTermConfig, observeTermEnvironment } from '../src/term/environment.js';

test('preference migration preserves false and supplies defaults', () => {
  const read = (values) => readTermConfig({ getItem: () => JSON.stringify({ values }) });
  assert.equal(read({}).mediaEnabled, true);
  assert.equal(read({ enablePicPreview: false }).mediaEnabled, false);
  assert.equal(read({ enablePicPreview: true, enableMediaPreviewer: false }).mediaEnabled, false);
  assert.equal(readTermConfig({ getItem: () => '{' }).mediaEnabled, true);
});

test('detects active overlay, native dialog save and screen replacement', async () => {
  const dom = setup(
    '<div id="TermWindow"><div id="mainContainer"></div><div id="easyReadingOverlay" style="display:block"><div id="easyReadingContent"></div></div></div><section><dialog open></dialog></section>',
  );
  const states = [];
  const stop = observeTermEnvironment((state) => states.push(state));
  assert.equal(states.at(-1).reading, true);
  document.querySelector('#easyReadingOverlay').style.display = 'none';
  await settle();
  assert.equal(states.at(-1).reading, false);
  localStorage.setItem(
    'pttchrome.pref.v1',
    JSON.stringify({ values: { enableMediaPreviewer: false } }),
  );
  document.querySelector('dialog').removeAttribute('open');
  await settle();
  assert.equal(states.at(-1).mediaEnabled, false);
  const old = states.at(-1).main;
  old.outerHTML = '<div id="mainContainer"><canvas></canvas></div>';
  await settle();
  assert.notEqual(states.at(-1).main, old);
  stop();
  dom.window.close();
});

test('preview position and article mutations do not reread environment layout', async () => {
  const dom = setup(
    '<div id="mainContainer"></div><div id="easyReadingOverlay"><div id="easyReadingContent"></div></div>',
  );
  const original = globalThis.getComputedStyle;
  let reads = 0;
  globalThis.getComputedStyle = (...args) => {
    reads++;
    return original(...args);
  };
  const stop = observeTermEnvironment(() => {});
  try {
    const preview = document.createElement('img');
    document.querySelector('#mainContainer').append(preview);
    preview.style.left = '20px';
    document.querySelector('#easyReadingContent').append(document.createElement('span'));
    await settle();
    assert.equal(reads, 1);
    document.querySelector('#easyReadingOverlay').hidden = true;
    await settle();
    assert.equal(reads, 1);
    document.querySelector('#easyReadingOverlay').hidden = false;
    await settle();
    assert.equal(reads, 2);
  } finally {
    stop();
    globalThis.getComputedStyle = original;
    dom.window.close();
  }
});
