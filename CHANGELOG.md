# CHANGELOG

## 7.1.0 (2026-09-14)

### Breaking changes

- Require a newer ptt-term with the native media plugin resolver API; older Term clients are no longer supported
- Use native hover and Easy Reading UI for single images, removing extension fallback previews for older clients and failed native image loads
- Bypass the native trusted-domain whitelist for extension-supported images while respecting the media preview enabled setting; links handled only by the original native resolver retain its whitelist behavior
- Reload open Term tabs after updating to activate the native integration

### Preview changes

- Pass direct image URLs and Twitter/X image links to native previews without creating duplicate extension images
- Resolve extensionless meee links by trying `.jpg`, `.png`, `.gif`, and `.jpeg` in order before passing the successful image to native previews
- Resolve extensionless Imgur single-image links through the Imgur API and pass their actual image URLs to native previews
- Share extensionless Imgur resolution between native previews and extension animation handling; reuse successful results for five minutes (up to 100 entries) and evict failures so subsequent requests can retry
- Keep i.verb.tw images in the extension renderer so requests preserve the Term Referer without additional host access
- Retain extension handling for Imgur albums and animations, plus YouTube and Twitch Clips embeds in Easy Reading
- Render Imgur `.gif` and `.gifv` links as MP4 videos; Easy Reading also handles supported MP4 URLs returned by the Imgur API
- Preserve unrelated native images when expanding albums, prevent duplicate hover previews, and discard stale results when links or articles change
- Keep PTT Web preview behavior unchanged

## 7.0.0 (2026-09-14)

- Support the redesigned Term client with Canvas rendering and a separate Easy Reading overlay
- Read the new media preview setting and detect changes to dialogs, reading mode, and screen containers
- Add per-link Easy Reading previews while preserving native images and handling albums without clearing other previews
- Prevent duplicate hover previews and discard stale results when links or articles change
- Render Imgur GIF previews as videos when handled by the extension
- Add DOM regression tests and separate formatting, lint, test, and build steps in CI and releases

## 6.2.1 (2026-09-04)

- Try common image extensions when previewing extensionless meee.com.tw links

## 6.2.0 (2026-08-20)

- Add floating image previews when Easy Reading is disabled and Picture Preview is enabled
- Hide PttChrome's native image preview to prevent duplicate images
- Keep previews within the viewport without intercepting pointer events
- Remove stale previews when navigating between articles

## 6.1.0 (2026-08-09)

- Improve terminal preview performance with batched and incremental DOM updates
- Lazy-load embedded iframes
- Add the Firefox extension ID and data collection consent declaration
- Load the Surge module script from the document head
- Migrate linting and formatting to Oxlint and Oxfmt

## 6.0.0 (2026-08-08)

- Share preview and media handling between web and terminal content scripts
- Bundle content scripts with Vite
- Use one Manifest V3 package for Chrome and Firefox
- Replace the Python packer with a Node.js build task
- Add GitHub Actions validation

## 5.5.6 (2026-04-01)

- Update heuristic for meee.com.tw

## 5.5.5 (2026-03-28)

- Fix verb.tw preview in term

## 5.5.4 (2025-12-06)

- Support webp link

## 5.5.3 (2025-12-06)

- Disable image preview in mailbox

## 5.5.2 (2025-07-14)

- Fix config checking

## 5.5.1 (2025-07-12)

- Fix ptt web match pattern

## 5.5.0 (2025-06-10)

- Support meee.com.tw

## 5.4.1 (2025-03-26)

- Fix youtube start time code

## 5.4.0 (2025-03-12)

- Support i.imgur.com/a/
- Fix imgur album link resolver
- Fix imgur preview in web

## 5.3.0 (2024-12-20)

- Enhance twimg detection

## 5.2.1 (2024-09-22)

- Fix cache.ptt.cc hang

## 5.2.0 (2024-09-19)

- Fix broken cache.ptt.cc in web
- Support http imgur link in web

## 5.1.0 (2024-03-07)

- Support twitch clip

## 5.0.5 (2024-01-11)

- Resolve unknown type of image link

## 5.0.4 (2023-12-18)

- Remove referer form request to imgur

## 5.0.3 (2023-12-17)

- Preview imgur image with extension name

## 5.0.1 (2022-12-16)

- Display all images in term

## 5.0.0 (2022-07-31)

- Migrate to manifest v3

## 4.2.0 (2022-06-28)

- Support i.pixiv.cat in term

## 4.1.0 (2022-05-21)

- Remove redirection to webp

## 4.0.1 (2022-02-23)

- Fix some broken Youtube embed

## 4.0.0 (2022-02-23)

- Add youtube player in term
- Replace gif with video (imgur album)
- Replace jpg and png with webp (imgur album)
- Support pic.pimg.tw in term

## 3.4.3 (2022-02-23)

- Fix mp4 preview style

## 3.4.1 (2022-02-12)

- Fix gallery processing

## 3.4.0 (2022-02-03)

- Add mp4 support
- Add imgur gallery support

## 3.3.0 (2022-01-19)

- remove referer from all imgur requests

## 3.2.0 (2021-11-23)

- compatible with http

## 3.1.0 (2021-11-12)

- support m.imgur.com/a

## 3.0.0 (2021-10-09)

- Preview following images in term.ptt.cc
  - https://imgur.com/a
  - https://live.staticflickr.com
  - https://pbs.twimg.com

## 2.0.0 (2021-10-02)

- Support imgur link and album

### 1.1.1 (2021-08-14)

- Update icon

### 1.1.0 (2021-08-12)

- Add icon

### 1.0.0 (2021-08-12)

- Remove referer header from imgur requests
