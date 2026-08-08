#!/usr/bin/env python3

import sys
import json
import glob
import zipfile


manifest = 'manifest.json'
manifest_v2 = len(sys.argv) >= 2 and sys.argv[1] == 'v2'
if manifest_v2:
    manifest = 'manifest.v2.json'

with open(manifest, 'r') as f:
    version=json.load(f)['version']

files = [
    'dist/web.js',
    'dist/term.js',
] + glob.glob('icon/*.png')

if manifest_v2:
    files += ['background.js']
else:
    files += ['rules.json']

with zipfile.ZipFile(f'ptt-imgur.{version}.zip', 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for file in files:
        zf.write(file)
    zf.write(manifest, 'manifest.json')
