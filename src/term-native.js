import { installNativeImages } from './term/native.js';

let bridge;
function attach() {
  if (!window.app) return false;
  bridge = installNativeImages(window.app);
  return Boolean(bridge);
}

let timer;
function stopWaiting() {
  clearInterval(timer);
  timer = null;
}

function start() {
  if (bridge || timer || attach()) return;
  timer = setInterval(() => {
    if (attach() || document.readyState === 'complete') stopWaiting();
  }, 100);
}

start();
window.addEventListener('pageshow', start);
window.addEventListener('pagehide', () => {
  stopWaiting();
  bridge?.destroy();
  bridge = null;
});
