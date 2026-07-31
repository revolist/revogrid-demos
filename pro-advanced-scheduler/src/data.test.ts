import { describe, expect, it } from 'vitest';
import { createShiftWeekConfig, createShiftWeekEvents } from './data';

describe('scheduler demo seed events', () => {
  it('uses hourly rows at twice the previous row height', () => {
    const config = createShiftWeekConfig('week', '2026-07-20');

    expect(config.slotMinutes).toBe(60);
    expect(config.rowSize).toBe(56);
    expect(config.snapMinutes).toBe(10);
  });

  it('contains only the retained event bars', () => {
    const eventIds = createShiftWeekEvents('week', '2026-07-20').map(({ id }) => id);

    expect(eventIds).toEqual([
      'shift-alex-mon-morning',
      'shift-alex-mon-conflict',
      'shift-mina-tue',
      'shift-sam-locked',
      'shift-jamie-training',
    ]);
  });
});
