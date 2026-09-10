import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/index.js';

const directory = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../client/public/life-assets/cinematic');
const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
const engine = new NullEngine();
for (const asset of manifest.assets) {
  const scene = new Scene(engine);
  const bytes = await readFile(resolve(directory, asset.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `${asset.file}: hash differs from manifest`);
  const container = await LoadAssetContainerAsync(new Uint8Array(bytes), scene, { pluginExtension: '.glb' });
  container.addAllToScene();
  const geometry = container.meshes.filter(mesh => mesh.getTotalVertices() > 0);
  assert.equal(geometry.length, asset.meshCount);
  assert.ok(geometry.every(mesh => mesh.getVerticesData('uv')?.every(Number.isFinite)), `${asset.file}: missing or nonfinite UVs`);
  assert.ok(geometry.every(mesh => mesh.getVerticesData('normal')?.every(Number.isFinite)), `${asset.file}: missing or nonfinite normals`);
  assert.ok(geometry.every(mesh => mesh.getVerticesData('position')?.every(Number.isFinite)), `${asset.file}: invalid positions`);
  assert.ok(geometry.every(mesh => mesh.material), `${asset.file}: missing material`);
  const bounds = container.meshes[0].getHierarchyBoundingVectors();
  const source = asset.bounds;
  for (const axis of ['y', 'z']) {
    const index = axis === 'y' ? 1 : 2;
    assert.ok(Math.abs(bounds.min[axis] - source.min[index]) < .001);
    assert.ok(Math.abs(bounds.max[axis] - source.max[index]) < .001);
  }
  // The Babylon conversion root mirrors X but preserves local front/back Z.
  assert.ok(Math.abs(bounds.min.x + source.max[0]) < .001);
  assert.ok(Math.abs(bounds.max.x + source.min[0]) < .001);
  assert.ok(bounds.min.y >= -.015, `${asset.file}: geometry below floor tolerance`);
  console.log(`${asset.file}: ${geometry.length} batches; UVs, normals, materials and exact imported bounds verified`);
  scene.dispose();
}
engine.dispose();
