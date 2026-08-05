import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { mountGridFilterBadges } from './filter-badges.ts';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('advanced filtering showcase exposes every requested behavior', async () => {
  const source = await readSource('filtering.shared.ts');

  assert.equal((source.match(/columnTemplate: columnTypeRenderer/g) ?? []).length, 8);
  assert.match(source, /name: 'Order date',[\s\S]*?size: 180/);
  assert.match(source, /case 'high-value-europe'/);
  assert.match(source, /case 'recent-expedited'/);
  assert.match(source, /case 'review-queue'/);
  assert.match(source, /cascadeOptions:\s*{\s*enabled: true,\s*showDependencyNumbers: true/);
  assert.match(source, /mountGridFilterBadges\(\{/);
});

test('all framework examples use direct grid properties', async () => {
  const files = [
    'filter-badges.ts',
    'filtering.shared.ts',
    'filtering.ts',
    'filtering.react.tsx',
    'filtering.vue',
    'filtering.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) assert.doesNotMatch(source, /additionalData/);
  for (const source of sources.slice(2)) {
    assert.match(source, /columns/);
    assert.match(source, /source/);
    assert.match(source, /plugins/);
    assert.match(source, /columnTypes/);
    assert.match(source, /filter/);
  }
});

test('standalone badge adapter stays customizable and DOM-safe', async () => {
  const source = await readSource('filter-badges.ts');

  assert.match(source, /renderBadge\?:/);
  assert.match(source, /render\?:/);
  assert.match(source, /value instanceof Node/);
  assert.match(source, /document\.createTextNode/);
  assert.doesNotMatch(source, /innerHTML/);
  assert.match(source, /grid\.filter = \{ \.\.\.current, multiFilterItems:/);
});

test('badge adapter follows plugin-originated models and preserves host attributes', async () => {
  const dom = new JSDOM('<div id="grid"></div><div id="badges" role="region"></div>');
  const previousNode = globalThis.Node;
  const previousDocument = globalThis.document;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.Node = dom.window.Node;
  globalThis.document = dom.window.document;
  globalThis.CustomEvent = dom.window.CustomEvent;

  try {
    const grid = dom.window.document.querySelector('#grid');
    const root = dom.window.document.querySelector('#badges');
    grid.componentOnReady = async () => grid;
    grid.filter = { multiFilterItems: {} };
    const controller = await mountGridFilterBadges({ grid, root });
    const items = {
      status: [{ id: 1, type: 'eq', value: 'Pending Review', relation: 'and' }],
    };

    grid.dispatchEvent(new dom.window.CustomEvent('beforefilterapply', {
      detail: { filterItems: items },
    }));
    grid.dispatchEvent(new dom.window.CustomEvent('afterfilterapply', {
      detail: { multiFilterItems: items },
    }));
    await new Promise(resolve => queueMicrotask(resolve));
    assert.match(root.textContent, /status: eq/);
    assert.equal(root.getAttribute('role'), 'list');

    root.setAttribute('aria-label', 'Application label');
    controller.destroy();
    assert.equal(root.getAttribute('role'), 'region');
    assert.equal(root.getAttribute('aria-label'), 'Application label');

    const customRoot = dom.window.document.createElement('div');
    customRoot.setAttribute('role', 'region');
    const customController = await mountGridFilterBadges({
      grid,
      root: customRoot,
      render: () => 'Custom badges',
    });
    customRoot.setAttribute('role', 'navigation');
    customController.refresh(items);
    assert.equal(customRoot.getAttribute('role'), 'navigation');
    customController.destroy();
    assert.equal(customRoot.getAttribute('role'), 'navigation');
  } finally {
    globalThis.Node = previousNode;
    globalThis.document = previousDocument;
    globalThis.CustomEvent = previousCustomEvent;
    dom.window.close();
  }
});

test('framework examples follow their lifecycle conventions', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('filtering.ts'),
    readSource('filtering.react.tsx'),
    readSource('filtering.vue'),
    readSource('filtering.angular.ts'),
  ]);

  assert.ok(typescript.indexOf('parent.appendChild(container)') < typescript.indexOf('grid.source = source'));
  assert.match(react, /const plugins = useMemo/);
  assert.match(react, /const columnTypes = useMemo/);
  assert.match(vue, /const source = ref/);
  assert.match(vue, /const plugins = \[\.\.\.orderExplorerPlugins\]/);
  assert.match(vue, /const isDark = ref\(currentTheme\(\)\.isDark\(\)\)/);
  assert.match(vue, /disconnectTheme\?\.\(\)/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
});

test('showcase UI uses medium font weight only', async () => {
  const styles = await readSource('filtering.scss');

  assert.match(styles, /font-weight:\s*500/);
  assert.match(styles, /--revo-grid-header-font-weight:\s*500/);
  assert.doesNotMatch(styles, /font-weight:\s*(?:bold|[6-9]00)/);
});
