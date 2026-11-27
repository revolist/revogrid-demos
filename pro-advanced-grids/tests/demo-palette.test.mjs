import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('advanced demo styles use defined shared palette colors', () => {
  const palette = readFileSync(new URL('../../composables/demo-palette.css', import.meta.url), 'utf8');
  const defined = new Set(palette.match(/--demo-palette-[\w-]+(?=\s*:)/g));
  for (const directory of ['../src/', '../../pro-category-forecast/src/']) {
    const folder = new URL(directory, import.meta.url);
    for (const name of readdirSync(fileURLToPath(folder)).filter(file => file.endsWith('.css'))) {
      const css = readFileSync(new URL(name, folder), 'utf8');
      // Attribute selectors match literal SVG attributes, not CSS color values.
      const declarations = css.replace(/\[[^\]]*\]/g, '');
      assert.doesNotMatch(declarations, /#[0-9a-f]{3,8}\b|rgba?\(\s*\d/gi, name);
      for (const token of css.match(/--demo-palette-[\w-]+/g) ?? []) {
        assert.ok(defined.has(token), `${name} references undefined ${token}`);
      }
    }
  }
});
