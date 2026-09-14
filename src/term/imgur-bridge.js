import { resolveUnknown } from '../shared/imgur.js';

const REQUEST = 'ptt-media-imgur-request';
const RESPONSE = 'ptt-media-imgur-response';
const READY = 'data-ptt-imgur-resolver';
let nextId = 0;

// JSON strings also work across Firefox's isolated/page-world boundary.
export function installImgurBridge(doc = document) {
  const emit = (detail) =>
    doc.dispatchEvent(
      new doc.defaultView.CustomEvent(RESPONSE, { detail: JSON.stringify(detail) }),
    );
  const onRequest = async (event) => {
    let request;
    try {
      request = JSON.parse(event.detail);
    } catch {
      return;
    }
    if (
      !request ||
      typeof request.id !== 'string' ||
      typeof request.hash !== 'string' ||
      !/^[a-zA-Z0-9]+$/.test(request.hash)
    )
      return;
    const { id, hash } = request;
    try {
      emit({ id, result: await resolveUnknown(hash) });
    } catch {
      emit({ id, error: 'Unable to resolve Imgur image' });
    }
  };
  doc.addEventListener(REQUEST, onRequest);
  doc.documentElement.setAttribute(READY, '');
  return () => {
    doc.removeEventListener(REQUEST, onRequest);
    doc.documentElement.removeAttribute(READY);
  };
}

export function requestUnknown(hash, doc = document) {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${++nextId}`;
    let sent = false;
    const finish = (error, result) => {
      clearTimeout(timer);
      observer.disconnect();
      doc.removeEventListener(RESPONSE, onResponse);
      if (error) reject(error);
      else resolve(result);
    };
    const onResponse = (event) => {
      let response;
      try {
        response = JSON.parse(event.detail);
      } catch {
        return;
      }
      if (response?.id !== id) return;
      if (response.error) finish(new Error(response.error));
      else if (
        typeof response.result?.type === 'string' &&
        typeof response.result?.link === 'string'
      )
        finish(null, response.result);
    };
    const send = () => {
      if (sent || !doc.documentElement.hasAttribute(READY)) return;
      sent = true;
      doc.dispatchEvent(
        new doc.defaultView.CustomEvent(REQUEST, {
          detail: JSON.stringify({ id, hash }),
        }),
      );
    };
    const observer = new doc.defaultView.MutationObserver(send);
    const timer = setTimeout(() => finish(new Error('Imgur resolution timed out')), 15000);
    doc.addEventListener(RESPONSE, onResponse);
    observer.observe(doc.documentElement, { attributes: true, attributeFilter: [READY] });
    send();
  });
}
