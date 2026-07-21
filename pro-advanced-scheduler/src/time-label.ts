import type {
  EventSchedulerTemplateH,
  EventSchedulerTimeCellContext,
} from '@revolist/revogrid-enterprise';

export function formatShiftWeekTimeLabel(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minute = normalized % 60;

  return `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function renderShiftWeekTimeLabel(
  h: EventSchedulerTemplateH,
  context: EventSchedulerTimeCellContext,
) {
  const isMinorSlot = context.startMinutes % 60 !== 0;

  return h('span', {
    class: [
      'shift-week-time-label',
      isMinorSlot ? 'shift-week-time-label--minor' : '',
    ].filter(Boolean).join(' '),
    title: context.timeLabel,
  }, isMinorSlot ? '' : context.timeLabel);
}
