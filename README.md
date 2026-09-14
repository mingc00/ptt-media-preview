# Ptt Media Preview

Enhance media previews on PTT Web and Term, including Imgur albums and animations, meee images, and embedded media. The extension also removes the Referer header from Imgur requests to fix blocked previews and preserves the Term Referer for i.verb.tw images.

## Installation

### Chromium

You can install the latest version from the [Chrome Web Store](https://chromewebstore.google.com/detail/ptt-media-preview/khanhghjfcpmgkomfomadomnckjakglm).

### Firefox

You can install the latest version from the [Add-ons for Firefox](https://addons.mozilla.org/zh-TW/firefox/addon/ptt-imgur-fix/).

## Term support

Term integration requires a newer ptt-term that exposes the native media plugin resolver API. Older clients are not supported. Reload open Term tabs after updating the extension to activate the integration.

Single images generally use ptt-term's native hover and Easy Reading UI. The extension resolves supported links and passes the image URL to that UI. i.verb.tw remains in the extension renderer so its image requests keep the Term Referer without additional host access.

The extension handles:

- Direct images and Twitter/X images through native previews.
- Extensionless meee links by trying `.jpg`, `.png`, `.gif`, then `.jpeg` (10 seconds per candidate).
- Extensionless Imgur links through the Imgur API; images use native previews, while albums and animations use extension previews.
- YouTube and Twitch Clips embeds in Easy Reading.

Native and extension previews share extensionless Imgur API results for five minutes (up to 100 entries). Failed resolutions are not cached.

Supported images respect the media preview setting and bypass the native trusted-domain whitelist. Other links use Term's original resolver. Failed native images do not receive a separate extension fallback.

PTT Web preview behavior is unchanged.

## Development

Source files live in `src/`. Build the `dist/web.js`, `dist/term.js`, and `dist/term-native.js` content-script bundles with:

```sh
node --run build
```

Run `node --run build:package` to create the shared Chrome and Firefox release archive.

Store releases are submitted through GitHub Actions. See [Publishing releases](docs/releasing.md) for the
required GitHub environment, credentials, and release steps.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes.
