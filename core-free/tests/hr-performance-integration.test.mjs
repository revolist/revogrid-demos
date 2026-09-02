import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const variants = ['hr.ts', 'hr.react.tsx', 'hr.vue', 'hr.angular.ts'];

test('all framework variants use the shared performance monitor and metrics surface', () => {
  for (const variant of variants) {
    const source = readFileSync(new URL(`../src/${variant}`, import.meta.url), 'utf8');
    assert.match(source, /createHRPerformanceMonitor/);
    assert.match(source, /hr-performance/);
    assert.match(source, /HR_PERFORMANCE_METRICS/);
    assert.match(source, /hr-metric-help-trigger/);
  }
});

test('all framework variants expose browser-local workspace controls', () => {
  for (const variant of variants) {
    const source = readFileSync(new URL(`../src/${variant}`, import.meta.url), 'utf8');
    assert.match(source, /createHRWorkspaceController/);
    assert.match(source, /Save view/);
    assert.match(source, /Reset view/);
  }
});
