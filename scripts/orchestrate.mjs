import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { featureDirectory, featureSlugs, loadCatalog, root } from './catalog.mjs';

const action = process.argv[2];
const noLockfile = process.argv.includes('--no-lockfile');

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runChildren(script) {
  for (const slug of featureSlugs) run('pnpm', [script], join(root, featureDirectory(slug)));
}

async function runBuild() {
  runChildren('build');
  const retained = (await loadCatalog()).filter((showcase) => !featureSlugs.includes(showcase.slug));
  for (const showcase of retained) run('pnpm', ['build'], join(root, showcase.sourceDir));
  run('node', ['scripts/build-gallery.mjs']);
}

if (action === 'setup') {
  const installMode = noLockfile ? '--no-lockfile' : '--frozen-lockfile';
  run('git', ['submodule', 'update', '--init', '--remote', '--recursive']);
  run('pnpm', ['install', installMode]);
  for (const slug of featureSlugs) {
    run('pnpm', ['install', '--ignore-workspace', installMode], join(root, featureDirectory(slug)));
  }
} else if (action === 'build') {
  await runBuild();
} else if (action === 'test') {
  runChildren('test');
  await runBuild();
  run('node', ['--test', 'tests/gallery.test.mjs']);
} else if (action === 'test:e2e') {
  await runBuild();
  runChildren('test:e2e');
  run('pnpm', ['exec', 'playwright', 'test']);
} else {
  console.error(`Unknown orchestration action: ${action ?? '(missing)'}`);
  process.exit(2);
}
