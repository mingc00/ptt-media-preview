import { JSDOM } from 'jsdom';

export function setup(html = '') {
  const dom = new JSDOM(html, { url: 'https://term.ptt.cc/', pretendToBeVisual: true });
  for (const name of [
    'window',
    'document',
    'localStorage',
    'location',
    'MutationObserver',
    'Element',
    'Node',
    'HTMLImageElement',
    'HTMLVideoElement',
    'AbortController',
  ]) {
    globalThis[name] = name === 'window' ? dom.window : dom.window[name];
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  return dom;
}

export const settle = () => new Promise((resolve) => setTimeout(resolve, 80));
