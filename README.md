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
node --run build
```

Run `node --run build:package` to create the shared Chrome and Firefox release archive.

Store releases are submitted through GitHub Actions. See [Publishing releases](docs/releasing.md) for the
required GitHub environment, credentials, and release steps.

## [Changelog](CHANGELOG.md)
