# Ptt Imgur fix

Imgur blocked requests from Ptt web. For fixing this issue, this extension removes referer header from requests.

## Installation

### Chromium

You can install the latest version from the [Chrome Web Store](https://chromewebstore.google.com/detail/ptt-media-preview/khanhghjfcpmgkomfomadomnckjakglm).

## Firefox

You can install the latest version from the [Add-ons for Firefox](https://addons.mozilla.org/zh-TW/firefox/addon/ptt-imgur-fix/).

## Development

Source files live in `src/`. Build the `dist/web.js` and `dist/term.js` content-script bundles with:

```sh
npm run build
```

Run `npm run build:chrome` or `npm run build:firefox` to build a release archive.

## [Changelog](CHANGELOG.md)
