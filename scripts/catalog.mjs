import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const featureSlugs = ['pivot', 'gantt', 'kanban', 'scheduler'];

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function loadCatalog() {
  const retained = await readJson(join(root, 'gallery/showcases.json'));
  const features = await Promise.all(featureSlugs.map(async (slug) => ({
    ...await readJson(join(root, 'features', slug, 'feature.json')),
    sourceDir: `features/${slug}`,
  })));
  return [...features, ...retained];
}
