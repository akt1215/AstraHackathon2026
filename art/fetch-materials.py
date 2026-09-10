"""Download the pinned CC0 surface maps used by the cinematic loft."""

import hashlib
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'client/public/life-assets/materials'
ASSETS = ['wood_floor', 'rough_linen', 'plastered_wall', 'brick_wall_001']
MAPS = {'albedo': 'Diffuse', 'normal': 'nor_gl', 'arm': 'arm'}


def read_json(url):
    return json.loads(subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--location', url]))


def download(item):
    relative, remote = item
    path = OUT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or hashlib.md5(path.read_bytes()).hexdigest() != remote['md5']:
        subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', remote['url'], '--output', str(path)], check=True)
    data = path.read_bytes()
    if hashlib.md5(data).hexdigest() != remote['md5']:
        raise RuntimeError(f'Download checksum mismatch: {relative}')
    return {'path': relative, 'url': remote['url'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def main():
    metadata = read_json('https://api.polyhaven.com/assets?t=textures')
    jobs = []
    entries = []
    for asset in ASSETS:
        files = read_json(f'https://api.polyhaven.com/files/{asset}')
        for name, map_key in MAPS.items():
            jobs.append((f'{asset}/{name}.jpg', files[map_key]['1k']['jpg']))
        info = metadata[asset]
        entries.append({'id': asset, 'source': f'https://polyhaven.com/a/{asset}', 'authors': info['authors'], 'dimensionsMillimeters': info['dimensions'], 'resolution': '1k'})
    environment = read_json('https://api.polyhaven.com/files/rooftop_night')['hdri']['1k']['hdr']
    jobs.append(('environment.hdr', environment))
    with ThreadPoolExecutor(max_workers=4) as pool:
        downloaded = list(pool.map(download, jobs))
    manifest = {'license': 'CC0-1.0', 'licenseSource': 'https://polyhaven.com/license', 'retrieved': '2026-09-10', 'maps': {'normal': 'OpenGL tangent-space', 'arm': 'R=ambient occlusion, G=roughness, B=metallic'}, 'assets': entries, 'environmentSource': 'https://polyhaven.com/a/rooftop_night', 'files': downloaded}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Verified {len(downloaded)} files, {sum(item["bytes"] for item in downloaded):,} bytes.')


if __name__ == '__main__':
    main()
