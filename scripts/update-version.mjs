import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const webModulePattern =
  /(https:\/\/cdn\.jsdelivr\.net\/gh\/mingc00\/ptt-media-preview@)(?:main|v[^/"']+)(\/src\/web\.js)/g;

export async function updateVersion(version, { root = process.cwd() } = {}) {
  if (!versionPattern.test(version)) {
    throw new Error(`Invalid package version: ${version}`);
  }

  const manifestPath = resolve(root, 'manifest.json');
  const surgeScriptPath = resolve(root, 'surge/ptt_media_preview.js');
  const manifestSource = await readFile(manifestPath, 'utf8');
  JSON.parse(manifestSource);
  const surgeScript = await readFile(surgeScriptPath, 'utf8');
  const matches = [...surgeScript.matchAll(webModulePattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected one Surge web module URL, found ${matches.length}`);
  }

  const updatedManifest = manifestSource.replace(
    /("version"\s*:\s*")[^"]+("\s*[,}])/,
    `$1${version}$2`,
  );
  if (updatedManifest === manifestSource) {
    throw new Error('Manifest version was not updated');
  }
  const updatedSurgeScript = surgeScript.replace(webModulePattern, `$1v${version}$2`);
  await Promise.all([
    writeFile(manifestPath, updatedManifest),
    writeFile(surgeScriptPath, updatedSurgeScript),
  ]);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await updateVersion(process.env.npm_new_version);
}
