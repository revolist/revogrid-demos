import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { featureDirectory, featureSlugs, loadCatalog, root } from './catalog.mjs';
import { resolvePnpmCommand } from './package-manager.mjs';

const action = process.argv[2];
const noLockfile = process.argv.includes('--no-lockfile');

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runPnpm(args, cwd = root) {
  const invocation = resolvePnpmCommand(args);
  run(invocation.command, invocation.args, cwd);
}

function runChildren(script) {
  for (const slug of featureSlugs) runPnpm([script], join(root, featureDirectory(slug)));
}

async function runBuild() {
  runChildren('build');
  const retained = (await loadCatalog()).filter((showcase) => !featureSlugs.includes(showcase.slug));
  for (const showcase of retained) runPnpm(['build'], join(root, showcase.sourceDir));
  run(process.execPath, ['scripts/build-gallery.mjs']);
}

if (action === 'setup') {
  const installMode = noLockfile ? '--no-lockfile' : '--frozen-lockfile';
  run('git', ['submodule', 'update', '--init', '--remote', '--recursive']);
  runPnpm(['install', installMode]);
  for (const slug of featureSlugs) {
    runPnpm(['install', '--ignore-workspace', installMode], join(root, featureDirectory(slug)));
  }
} else if (action === 'build') {
  await runBuild();
} else if (action === 'test') {
  runChildren('test');
  await runBuild();
  run(process.execPath, ['--test', 'tests/gallery.test.mjs', 'tests/package-manager.test.mjs']);
} else if (action === 'test:e2e') {
  await runBuild();
  runChildren('test:e2e');
  runPnpm(['exec', 'playwright', 'test']);
} else {
  console.error(`Unknown orchestration action: ${action ?? '(missing)'}`);
  process.exit(2);
}
