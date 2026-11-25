import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const MiB = 1024 * 1024;
// Keep these directory exclusions aligned with the root .assetsignore.
const ignoredDirectories = new Set(['.git', 'node_modules', '.wrangler']);
function* files(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) yield* files(filename);
    } else if (entry.isFile() && entry.name !== '.DS_Store') {
      yield filename;
    }
  }
}

test('every deployable asset stays below the Workers 25 MiB limit', () => {
  const oversized = [...files(root)]
    .map(filename => ({file: path.relative(root, filename), bytes: fs.statSync(filename).size}))
    .filter(asset => asset.bytes >= 25 * MiB);
  assert.deepEqual(oversized, [], JSON.stringify(oversized));
});

test('Neymar and Ronaldo GLB and gzip retain the 24 MiB safety margin', () => {
  for (const name of ['neymar-game-v2.glb', 'ronaldo-anatomy-v8.glb']) {
    for (const suffix of ['', '.gz']) {
      const file = `play-v3/assets/${name}${suffix}`;
      assert.ok(fs.statSync(path.join(root, file)).size <= 24 * MiB, file);
    }
  }
});
