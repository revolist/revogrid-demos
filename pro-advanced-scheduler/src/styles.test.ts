import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readSource = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const schedulerStyles = readSource('./styles.scss');
const sharedUiStyles = readSource('../../../../packages/pro/plugins/_ui.scss');
const schedulerSources = [
  './scheduler.ts',
  './scheduler.react.tsx',
  './scheduler.vue',
  './scheduler.angular.ts',
].map(readSource);
const schedulerHeaderSource = readSource('./components/scheduler-header/scheduler-header.ts');

describe('scheduler segmented view styles', () => {
  it('provides one achromatic dark surface palette for Pro UI consumers', () => {
    expect(sharedUiStyles).toContain('--rv-ui-surface:');
    expect(sharedUiStyles).toContain('--rv-ui-surface-elevated:');
    expect(sharedUiStyles).toContain('--rv-ui-surface-sunken:');
    expect(sharedUiStyles).toContain('--rv-ui-border:');
    expect(sharedUiStyles).toContain('--rv-ui-text-muted:');
    expect(sharedUiStyles).toContain('--rv-ui-surface:             #1f1f1f;');
    expect(sharedUiStyles).toContain('--rv-ui-surface-elevated:    #262626;');
    expect(sharedUiStyles).toContain('--rv-ui-surface-sunken:      #111111;');
  });

  it('shares one reset and interaction style across both segmented controls', () => {
    const segmentedButtonRule = sharedUiStyles.match(/\.rv-segmented-switch-item\s*\{([\s\S]*?)(?=\n\})/);

    expect(segmentedButtonRule?.[1]).toContain('appearance: none;');
    expect(segmentedButtonRule?.[1]).toContain('border: 0;');
    expect(segmentedButtonRule?.[1]).toContain('font: inherit;');
    expect(sharedUiStyles).toContain('.rv-segmented-switch-item:focus-visible');
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

  it('keeps the workspace switch in the shared header and the sidebar out of every framework variant', () => {
    expect(schedulerHeaderSource).toContain("setAttribute('aria-label', 'Scheduler workspace')");
    expect(schedulerHeaderSource).toContain("setAttribute('aria-selected', String(active))");
    expect(schedulerHeaderSource).toContain('event-scheduler-shift-week-toolbar__workspace rv-segmented-switch');
    expect(schedulerHeaderSource).toContain('event-scheduler-shift-week-toolbar__views rv-segmented-switch');
    expect(schedulerHeaderSource).toContain('rv-segmented-switch-item');
    expect(schedulerStyles).not.toContain('.event-scheduler-shift-week-segmented__button');
    for (const source of schedulerSources) {
      expect(source).not.toContain('revogr-scheduler-sidebar');
      expect(source).not.toContain('SCHEDULER_SIDEBAR_TAG');
    }
  });

  it('keeps the range navigation left-aligned after the workspace switch', () => {
    expect(schedulerHeaderSource).toContain("range.className = 'event-scheduler-shift-week-toolbar__range'");
    expect(schedulerHeaderSource).toContain('this.append(this.workspace, range, end)');
    const rangeRule = schedulerStyles.match(/&__range\s*\{([\s\S]*?)\n\s*\}/);
    expect(rangeRule?.[1]).toContain('justify-self: start;');
  });
});
