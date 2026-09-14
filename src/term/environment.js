const STORAGE_KEY = 'pttchrome.pref.v1';

export function readTermConfig(storage = localStorage) {
  try {
    const values = JSON.parse(storage.getItem(STORAGE_KEY))?.values ?? {};
    return {
      mediaEnabled: Boolean(values.enableMediaPreviewer ?? values.enablePicPreview ?? true),
      easyReadingEnabled: Boolean(values.enableEasyReading ?? false),
    };
  } catch {
    return { mediaEnabled: true, easyReadingEnabled: false };
  }
}

export function observeTermEnvironment(onChange) {
  let previous;
  function refresh() {
    const config = readTermConfig();
    const main = document.getElementById('mainContainer');
    const content = document.getElementById('easyReadingContent');
    const overlay = document.getElementById('easyReadingOverlay');
    const reading = Boolean(
      overlay && !overlay.hidden && getComputedStyle(overlay).display !== 'none',
    );
    const state = { main, content, reading, ...config };
    if (!previous || Object.keys(state).some((key) => state[key] !== previous[key])) {
      previous = state;
      onChange(state);
    }
  }
  // Native dialogs can close in place or be removed with an enclosing portal.
  // Screen and overlay nodes can also be replaced when settings are applied.
  const observer = new MutationObserver(refresh);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open', 'style', 'hidden'],
  });
  document.addEventListener('close', refresh, true);
  window.addEventListener('storage', refresh);
  refresh();
  return () => {
    observer.disconnect();
    document.removeEventListener('close', refresh, true);
    window.removeEventListener('storage', refresh);
  };
}
