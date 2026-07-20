import { describe, expect, it } from 'vitest';
import {
  addDays,
  toIsoDate,
} from '@revolist/revogrid-enterprise';
import {
  getShiftWeekResourceDateRange,
  isShiftWeekResourceWorkspace,
} from './resource-range';
import {
  formatShiftWeekTimeLabel,
  renderShiftWeekTimeLabel,
} from './time-label';
import {
  createShiftWeekEvents,
  createShiftWeekConfig,
  getShiftWeekTableRows,
} from './data';

describe('shift week demo scheduler config', () => {
  it('keeps day, week, and month range controls in resource timeline when resource workspace is active', () => {
    const day = getShiftWeekResourceDateRange('day', '2026-06-18');
    const week = getShiftWeekResourceDateRange('week', '2026-06-15');
    const month = getShiftWeekResourceDateRange('month', '2026-06-01');

    expect(isShiftWeekResourceWorkspace('day', 'resource')).toBe(true);
    expect(isShiftWeekResourceWorkspace('week', 'resource')).toBe(true);
    expect(isShiftWeekResourceWorkspace('month', 'resource')).toBe(true);
    expect(day).toEqual({ start: '2026-06-18', end: '2026-06-18' });
    expect(week).toEqual({ start: '2026-06-15', end: '2026-06-21' });
    expect(month).toEqual({ start: '2026-06-01', end: '2026-06-30' });
  });

  it('keeps calendar workspace using calendar scheduler views', () => {
    expect(isShiftWeekResourceWorkspace('week', 'calendar')).toBe(false);
  });

  it('keeps thirty-minute rows while pointer mutations snap every ten minutes', () => {
    const config = createShiftWeekConfig('week', '2026-06-15', 'weekday', [], [], 'calendar');

    expect(config.slotMinutes).toBe(30);
    expect(config.snapMinutes).toBe(10);
  });

  it('keeps create interactions from rendering outside-availability warnings as blocked events', () => {
    const config = createShiftWeekConfig('week', '2026-06-15', 'weekday', [], [], 'resource');

    expect(config.conflicts).toMatchObject({
      enabled: true,
      policy: 'mark',
      scope: 'same-resource',
      rules: { 'outside-availability': 'ignore' },
    });
  });

  it('keeps mid-slot time values available while the row header can hide them visually', () => {
    expect(formatShiftWeekTimeLabel(10 * 60 + 30)).toBe('10:30');
    expect(renderShiftWeekTimeLabel(createElement as never, {
      view: 'week',
      row: {
        __eventSchedulerSlot: true,
        slotIndex: 9,
        startMinutes: 10 * 60 + 30,
        endMinutes: 11 * 60,
        timeLabel: '10:30',
      },
      slotIndex: 9,
      startMinutes: 10 * 60 + 30,
      endMinutes: 11 * 60,
      timeLabel: '10:30',
    })).toMatchObject({
      children: '',
      props: {
        class: 'shift-week-time-label shift-week-time-label--minor',
        title: '10:30',
      },
    });
  });

  it('maps shift events into table rows sorted by start time', () => {
    const baseDate = toIsoDate(new Date());
    const events = [
      {
        id: 'event-today',
        resourceId: 'alex',
        title: 'Alpha review',
        startDateTime: `${baseDate}T08:00:00Z`,
        endDateTime: `${baseDate}T09:00:00Z`,
        status: 'confirmed',
      },
      {
        id: 'event-tomorrow',
        resourceId: 'alex',
        title: 'Beta planning',
        startDateTime: `${addDays(baseDate, 1)}T10:00:00Z`,
        endDateTime: `${addDays(baseDate, 1)}T11:00:00Z`,
        status: 'pending',
      },
      {
        id: 'event-far',
        resourceId: 'alex',
        title: 'Gamma follow up',
        startDateTime: `${addDays(baseDate, 20)}T10:00:00Z`,
        endDateTime: `${addDays(baseDate, 20)}T11:00:00Z`,
        status: 'locked',
      },
    ];
    const [first, second, third] = getShiftWeekTableRows(events);

    expect(first.id).toBe('event-today');
    expect(first.title).toBe('Alpha review');
    expect(first.date).toBe(baseDate);
    expect(first.time).toBe('08:00-09:00');
    expect(first.badge).toBe('Scheduled');

    expect(second.id).toBe('event-tomorrow');
    expect(third.id).toBe('event-far');
  });

  it('keeps Weekend Deploy visible on the previous day before the Sunday carry-in', () => {
    const events = createShiftWeekEvents('week', '2026-06-15');
    const weekendDeploy = events.find((event) => event.title === 'Weekend Deploy');

    expect(weekendDeploy).toMatchObject({
      id: 'shift-mina-overnight',
      startDateTime: '2026-06-20T17:00:00.000Z',
      endDateTime: '2026-06-21T08:30:00.000Z',
    });
  });
});
function createElement(tag: string, props: Record<string, unknown>, children?: unknown) {
  return { tag, props, children };
}
