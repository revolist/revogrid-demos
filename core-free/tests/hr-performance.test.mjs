import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { transformWithEsbuild } from 'vite';

const source = await readFile(new URL('../src/hr-performance.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'hr-performance.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const {
  calculateFrameRate,
  createHRPerformanceMonitor,
  formatDuration,
  formatFrameRate,
  formatMemory,
  getHRMetricTooltipId,
  HR_PERFORMANCE_METRICS,
} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('calculates frame rate from animation frame timestamps', () => {
  const fps = calculateFrameRate([0, 16.67, 33.34, 50.01]);
  assert.ok(Math.abs(fps - 60) < 0.1);
  assert.equal(calculateFrameRate([]), null);
});

test('normalizes high-refresh animation frames to the 60 FPS comparison ceiling', () => {
  const fps = calculateFrameRate([0, 8.33, 16.66, 24.99, 33.32]);
  assert.equal(fps, 60);
});

test('formats unsupported and measured values without overstating precision', () => {
  assert.equal(formatDuration(null), 'N/A');
  assert.equal(formatDuration(12.345), '12.3 ms');
  assert.equal(formatFrameRate(null), 'Scroll to measure');
  assert.equal(formatFrameRate(59.6), '60 FPS');
  assert.equal(formatMemory(undefined), 'N/A');
  assert.equal(formatMemory(10 * 1024 * 1024), '10.0 MB');
});

test('defines calculation and meaning help for every displayed metric', () => {
  assert.deepEqual(Object.keys(HR_PERFORMANCE_METRICS), [
    'preparation',
    'grid',
    'scroll',
    'memory',
    'dataset',
  ]);
  for (const [key, metric] of Object.entries(HR_PERFORMANCE_METRICS)) {
    assert.ok(metric.label.length > 0);
    assert.ok(metric.description.length > 80);
    assert.equal(getHRMetricTooltipId(key), `hr-metric-${key}-tooltip`);
  }
  assert.match(HR_PERFORMANCE_METRICS.scroll.description, /60 FPS ceiling/);
  assert.match(HR_PERFORMANCE_METRICS.memory.description, /entire page/);
  assert.match(HR_PERFORMANCE_METRICS.dataset.description, /virtualizes/);
});

test('polls heap while visible, pauses while hidden, and cleans up', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalMemory = Object.getOwnPropertyDescriptor(globalThis.performance, 'memory');
  const callbacks = new Map();
  const cleared = [];
  let nextTimer = 1;
  const visibility = new EventTarget();
  Object.defineProperty(visibility, 'visibilityState', { configurable: true, value: 'visible', writable: true });
  globalThis.document = visibility;
  globalThis.window = {
    setInterval(callback) {
      const id = nextTimer++;
      callbacks.set(id, callback);
      return id;
    },
    clearInterval(id) {
      cleared.push(id);
      callbacks.delete(id);
    },
  };
  Object.defineProperty(globalThis.performance, 'memory', {
    configurable: true,
    value: { usedJSHeapSize: 10, totalJSHeapSize: 20 },
  });

  try {
    const states = [];
    const monitor = createHRPerformanceMonitor(new EventTarget(), state => states.push(state));
    assert.equal(callbacks.size, 1);

    Object.defineProperty(globalThis.performance, 'memory', {
      configurable: true,
      value: { usedJSHeapSize: 15, totalJSHeapSize: 25 },
    });
    callbacks.values().next().value();
    assert.equal(states.at(-1).memoryUsage.usedJSHeapSize, 15);

    visibility.visibilityState = 'hidden';
    visibility.dispatchEvent(new Event('visibilitychange'));
    assert.equal(callbacks.size, 0);

    visibility.visibilityState = 'visible';
    visibility.dispatchEvent(new Event('visibilitychange'));
    assert.equal(callbacks.size, 1);
    assert.equal(states.at(-1).memoryUsage.usedJSHeapSize, 15);

    monitor.destroy();
    assert.equal(callbacks.size, 0);
    visibility.dispatchEvent(new Event('visibilitychange'));
    assert.equal(callbacks.size, 0);
    assert.ok(cleared.length >= 2);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    if (originalMemory) {
      Object.defineProperty(globalThis.performance, 'memory', originalMemory);
    } else {
      delete globalThis.performance.memory;
    }
  }
});
