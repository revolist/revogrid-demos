import { describe, expect, it } from 'vitest';
import { createShiftWeekEvents } from './data';

describe('scheduler demo seed events', () => {
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
