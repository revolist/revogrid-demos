import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import { transformWithEsbuild } from 'vite';

globalThis.window = {
  setTimeout: globalThis.setTimeout.bind(globalThis),
};

const source = await readFile(new URL('./hr.data.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'hr.data.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const { getHRData, resetHRDataCache } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

afterEach(() => resetHRDataCache());

test('reuses rows that were already prepared', async () => {
  let timerCalls = 0;
  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
  window.setTimeout = (callback, delay) => {
    timerCalls += 1;
    return nativeSetTimeout(callback, delay);
  };

  const first = await getHRData(1_000);
  const yieldsAfterFirstLoad = timerCalls;
  const second = await getHRData(1_000);

  assert.deepEqual(first, second);
  assert.equal(timerCalls, yieldsAfterFirstLoad);
});

test('reports completion and returns stable cached row identities', async () => {
  const progress = [];
  const first = await getHRData(100, { onProgress: value => progress.push(value) });
  const larger = await getHRData(200, { onProgress: value => progress.push(value) });

  assert.equal(larger[0], first[0]);
  assert.deepEqual(progress.at(-1), { loaded: 200, total: 200 });
});

test('rejects an aborted preparation request without extending the cache', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(getHRData(100, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal((await getHRData(1)).length, 1);
});
