import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const schedulerStyles = readFileSync('src/styles.scss', 'utf8');

describe('scheduler segmented view styles', () => {
  it('resets native button styling inside the Day, Week, and Month control', () => {
    const viewRule = schedulerStyles.match(/&__view\s*\{([\s\S]*?)&--active/);

    expect(viewRule?.[1]).toContain('border: 0;');
    expect(viewRule?.[1]).toContain('font: inherit;');
  });
});
