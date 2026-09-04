import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { resolvePnpmCommand } from '../scripts/package-manager.mjs';

test('reuses the pnpm lifecycle entrypoint without resolving a bare executable', () => {
  assert.deepEqual(
    resolvePnpmCommand(['build'], {
      npm_execpath: '/opt/pnpm/bin/pnpm.cjs',
      npm_node_execpath: '/opt/node/bin/node',
    }),
    {
      command: '/opt/node/bin/node',
      args: ['/opt/pnpm/bin/pnpm.cjs', 'build'],
    },
  );
});

test('falls back to PATH lookup outside a package-manager lifecycle', () => {
  assert.deepEqual(resolvePnpmCommand(['test'], { PATH: '' }), {
    command: 'pnpm',
    args: ['test'],
  });
});

test('anchors relative PATH entries to the orchestrator working directory', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'revogrid-demos-pnpm-'));
  const binDirectory = join(cwd, 'node_modules', '.bin');
  const pnpmPath = join(binDirectory, 'pnpm');

  try {
    await mkdir(binDirectory, { recursive: true });
    await writeFile(pnpmPath, '#!/bin/sh\nexit 0\n');
    await chmod(pnpmPath, 0o755);

    assert.deepEqual(resolvePnpmCommand(['build'], { PATH: './node_modules/.bin' }, cwd), {
      command: pnpmPath,
      args: ['build'],
    });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
