export const INLINE_OWNER_ATTRIBUTE = 'data-ptt-media-extension-inline';

export function ownsAllInlineImages(doc = document) {
  return doc.documentElement.hasAttribute(INLINE_OWNER_ATTRIBUTE);
}
