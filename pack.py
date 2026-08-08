#!/usr/bin/env python3

import json
import glob
import zipfile


manifest = 'manifest.json'
with open(manifest, 'r') as f:
    version=json.load(f)['version']

files = [
    'dist/web.js',
    'dist/term.js',
] + glob.glob('icon/*.png') + ['rules.json']

with zipfile.ZipFile(f'ptt-imgur.{version}.zip', 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for file in files:
        zf.write(file)
    zf.write(manifest, 'manifest.json')
