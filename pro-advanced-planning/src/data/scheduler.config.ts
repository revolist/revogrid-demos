import { addDays, createDateTime, parseIsoDate } from '@revolist/revogrid-pro'
import type { EventSchedulerConfig } from '@revolist/scheduler'
import { planningFields } from './fields'

export const schedulerConfig: EventSchedulerConfig = {
    fields: planningFields,
    view: 'resourceTimeline',
    weekStartDate: '2026-09-07',
    dateRange: { start: '2026-09-07', end: '2026-09-30' },
    locale: 'en-US',
    timeZone: 'UTC',
    slotMinutes: 60,
    timeAnnotations: Array.from({ length: 24 }, (_, offset) => addDays('2026-09-07', offset))
        .filter((date) => ![0, 6].includes(parseIsoDate(date).getUTCDay()))
        .flatMap((date) => [
            { id: `shift-start-${date}`, startDateTime: createDateTime(date, 8 * 60), icon: '⚑', label: 'Shift start', color: '#d97706' },
            { id: `lunch-${date}`, startDateTime: createDateTime(date, 12 * 60), endDateTime: createDateTime(date, 13 * 60), icon: '☕', label: 'Lunch', color: '#60a5fa' },
            { id: `staff-training-${date}`, startDateTime: createDateTime(date, 15 * 60), endDateTime: createDateTime(date, 17 * 60), icon: '🎓', label: 'Staff training', color: '#38bdf8' },
        ]),
    timeRange: { start: '08:00', end: '18:00' },
    rowSize: 50,
    resourceTimelineRowSizing: true,
    resourceColumnSize: 150,
    timelineColumnSize: 80,
    editable: true,
    allowCreate: false,
    allowMove: true,
    allowResize: true,
    allowDelete: false,
    allowMultiResourceAssignment: false,
    conflicts: { enabled: false },
    eventEditorStatusOptions: ['not-started', 'in-progress', 'blocked', 'done'],
    keyboardShortcuts: false,
    currentTimeMarker: false,
    contextMenu: true,
}

export const calendarConfig: EventSchedulerConfig = {
    ...schedulerConfig,
    view: 'month',
    dateRange: { start: '2026-09-01', end: '2026-09-30' },
    dayColumnSize: 160,
    timeColumnSize: 72,
    editable: false,
    beforeSlotSelect: () => false,
}
