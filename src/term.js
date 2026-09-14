import { resolveAlbum, resolveUnknown } from './shared/imgur.js';
import { classifyMediaUrl } from './shared/media.js';
import { createMediaLinkPreviewer } from './shared/previewer.js';
import { observeTermEnvironment } from './term/environment.js';
import { createInlinePreviewer } from './term/inline.js';

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
          async resolveMedia(anchor) {
            const media = classifyMediaUrl(anchor.href);
            if (media?.kind === 'image' || media?.kind === 'imgur-gif') return media;
            if (media?.kind === 'imgur-album') {
              return classifyMediaUrl((await resolveAlbum(media.hash))[0]);
            }
            if (media?.kind === 'imgur-unknown') {
              const { type, link } = await resolveUnknown(media.hash);
              return type?.startsWith('image/') ? classifyMediaUrl(link) : null;
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
