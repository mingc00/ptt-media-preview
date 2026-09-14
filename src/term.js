import { installImgurBridge } from './term/imgur-bridge.js';
import { usesNativeImage } from './term/native.js';
import { resolveAlbum, resolveUnknown } from './shared/imgur.js';
import {
  classifyMediaUrl,
  classifyResolvedMedia,
  requiresDocumentReferrer,
} from './shared/media.js';
import { createMediaLinkPreviewer } from './shared/previewer.js';
import { observeTermEnvironment } from './term/environment.js';
import { createInlinePreviewer } from './term/inline.js';

installImgurBridge();

let state;
let main;
let content;
let hoverPreviewer;
let inlinePreviewer;

observeTermEnvironment((next) => {
  state = next;
  if (main !== state.main) {
    hoverPreviewer?.destroy();
    main = state.main;
    hoverPreviewer = main
      ? createMediaLinkPreviewer(main, {
          isEnabled: () => state.mediaEnabled && !state.reading,
          isEligible: (anchor) => !usesNativeImage(anchor.href),
          async resolveMedia(anchor) {
            const media = classifyMediaUrl(anchor.href);
            if (media?.kind === 'image' && requiresDocumentReferrer(anchor.href)) return media;
            if (media?.kind === 'imgur-gif') return media;
            if (media?.kind === 'imgur-album') {
              return classifyResolvedMedia((await resolveAlbum(media.hash))[0]);
            }
            if (media?.kind === 'imgur-unknown') {
              const { type, link } = await resolveUnknown(media.hash);
              const resolved = classifyResolvedMedia(link);
              return (type?.startsWith('image/') || type?.startsWith('video/')) &&
                resolved?.kind === 'imgur-gif'
                ? resolved
                : null;
            }
            return null;
          },
        })
      : null;
  }
  if (content !== state.content) {
    inlinePreviewer?.destroy();
    content = state.content;
    inlinePreviewer = content
      ? createInlinePreviewer(content, {
          isEnabled: () => state.mediaEnabled && state.reading,
        })
      : null;
  }
  hoverPreviewer?.refresh();
  inlinePreviewer?.refresh();
});
