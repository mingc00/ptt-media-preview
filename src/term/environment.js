const STORAGE_KEY = 'pttchrome.pref.v1';

export function readTermConfig(storage = localStorage) {
  try {
    const values = JSON.parse(storage.getItem(STORAGE_KEY))?.values ?? {};
    return {
      mediaEnabled: Boolean(values.enableMediaPreviewer ?? values.enablePicPreview ?? true),
    };
  } catch {
    return { mediaEnabled: true };
  }
}

export function observeTermEnvironment(onChange) {
  let previous;
  let timer;
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
  function schedule() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      refresh();
    }, 0);
  }
  const relevantNodes = '#mainContainer, #easyReadingContent, #easyReadingOverlay, dialog';
  function containsEnvironment(node) {
    return (
      node.nodeType === 1 && (node.matches(relevantNodes) || node.querySelector(relevantNodes))
    );
  }
  const observer = new MutationObserver((records) => {
    if (
      records.some((record) => {
        if (record.type === 'childList') {
          return [...record.addedNodes, ...record.removedNodes].some(containsEnvironment);
        }
        return record.target.id === 'easyReadingOverlay' || record.target.matches('dialog');
      })
    )
      schedule();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open', 'style', 'hidden'],
  });
  function onStorage(event) {
    if (event.key === null || event.key === STORAGE_KEY) schedule();
  }
  document.addEventListener('close', schedule, true);
  window.addEventListener('storage', onStorage);
  refresh();
  return () => {
    clearTimeout(timer);
    observer.disconnect();
    document.removeEventListener('close', schedule, true);
    window.removeEventListener('storage', onStorage);
  };
}
