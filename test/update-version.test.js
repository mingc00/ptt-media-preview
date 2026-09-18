import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { updateVersion } from '../scripts/update-version.mjs';

test('updates the manifest and pins the Surge web module to the release tag', async () => {
  const root = await mkdtemp(join(tmpdir(), 'update-version-'));
  try {
    await mkdir(join(root, 'surge'));
    await writeFile(join(root, 'manifest.json'), '{"version":"1.0.0"}\n');
    await writeFile(
      join(root, 'surge/ptt_media_preview.js'),
      'src="https://cdn.jsdelivr.net/gh/mingc00/ptt-media-preview@main/src/web.js"\n',
    );

    await updateVersion('2.3.4-beta.1', { root });

    const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
    const surgeScript = await readFile(join(root, 'surge/ptt_media_preview.js'), 'utf8');
    assert.equal(manifest.version, '2.3.4-beta.1');
    assert.match(surgeScript, /ptt-media-preview@v2\.3\.4-beta\.1\/src\/web\.js/);
  } finally {
    await rm(root, { recursive: true });
  }
});
