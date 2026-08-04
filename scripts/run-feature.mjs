import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { featureDirectory, featureSlugs, root } from './catalog.mjs';

const script = process.argv[2];
const args = process.argv.slice(3);
const featureIndex = args.indexOf('--feature');
const featureFromPair = featureIndex >= 0 ? args[featureIndex + 1] : undefined;
const featureFromEquals = args.find((value) => value.startsWith('--feature='))?.split('=')[1];
const feature = featureFromPair ?? featureFromEquals;

if (!featureSlugs.includes(feature)) {
  console.error(`Choose one feature with --feature <${featureSlugs.join('|')}>.`);
  process.exit(2);
}

const result = spawnSync('pnpm', [script], {
  cwd: join(root, featureDirectory(feature)),
  env: process.env,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
