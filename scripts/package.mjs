import { zipSync } from 'fflate';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const iconFiles = (await readdir('icon'))
  .filter((file) => file.endsWith('.png'))
  .sort()
  .map((file) => `icon/${file}`);
const files = [
  'manifest.json',
  'rules.json',
  'dist/web.js',
  'dist/term.js',
  'dist/term-native.js',
  ...iconFiles,
];
const entries = Object.fromEntries(
  await Promise.all(files.map(async (file) => [file, await readFile(file)])),
);
const output = `ptt-imgur.${manifest.version}.zip`;

await writeFile(output, zipSync(entries, { level: 9 }));
console.log(`Created ${output}`);
