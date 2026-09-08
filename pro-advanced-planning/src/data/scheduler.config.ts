import type { EventSchedulerConfig } from '@revolist/scheduler'

export const schedulerConfig: EventSchedulerConfig = {
    view: 'resourceTimeline',
    weekStartDate: '2026-09-07',
    dateRange: { start: '2026-09-07', end: '2026-09-30' },
    locale: 'en-US',
    timeZone: 'UTC',
    slotMinutes: 60,
    timeRange: { start: '08:00', end: '18:00' },
    rowSize: 50,
    resourceColumnSize: 150,
    timelineColumnSize: 80,
    editable: true,
    allowCreate: false,
    allowMove: true,
    allowResize: true,
    allowDelete: false,
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
}
