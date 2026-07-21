import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const schedulerStyles = readFileSync('src/styles.scss', 'utf8');
const schedulerSources = [
  'src/scheduler.ts',
  'src/scheduler.react.tsx',
  'src/scheduler.vue',
  'src/scheduler.angular.ts',
].map((path) => readFileSync(path, 'utf8'));

describe('scheduler segmented view styles', () => {
  it('resets native button styling inside the Day, Week, and Month control', () => {
    const viewRule = schedulerStyles.match(/&__view\s*\{([\s\S]*?)&--active/);

    expect(viewRule?.[1]).toContain('border: 0;');
    expect(viewRule?.[1]).toContain('font: inherit;');
  });

  it('uses consistent shadcn-style sizing and focus treatment for toolbar actions', () => {
    const actionRule = schedulerStyles.match(/&__icon,\s*&__today\s*\{([\s\S]*?)(?=\n\n\s*&__icon\s*\{)/);

    expect(actionRule?.[1]).toContain('appearance: none;');
    expect(actionRule?.[1]).toContain('height: 36px;');
    expect(actionRule?.[1]).toContain('border-radius: 8px;');
    expect(actionRule?.[1]).toContain('&:focus-visible');
  });

  it('keeps the removed top app bar out of every scheduler demo variant', () => {
    for (const source of [...schedulerSources, schedulerStyles]) {
      expect(source).not.toContain('event-scheduler-shift-week-appbar');
    }
  });
});
