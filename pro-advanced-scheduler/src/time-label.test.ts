import { describe, expect, it } from 'vitest';
import { renderShiftWeekTimeLabel } from './time-label';

describe('shift-week time labels', () => {
  it.each([
    [1020, '17:00'],
    [1030, '17:10'],
    [1035, '17:15'],
    [1050, '17:30'],
  ])('keeps the %s-minute label visible after zoom', (startMinutes, timeLabel) => {
    const rendered = renderShiftWeekTimeLabel(
      ((_tag: string, _props: unknown, children: unknown) => ({ children })) as never,
      { startMinutes, timeLabel } as never,
    ) as unknown as { children: string };

    expect(rendered.children).toBe(timeLabel);
  });
});
