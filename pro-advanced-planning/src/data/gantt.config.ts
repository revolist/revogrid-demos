import type { GanttPluginConfig } from '@revolist/gantt'
import { planningCalendarId } from './source'

export const ganttConfig: GanttPluginConfig = {
    id: 'launch',
    name: 'Launch day',
    version: '1',
    currency: 'USD',
    timeZone: 'UTC',
    primaryCalendarId: planningCalendarId,
    updatedAt: '2026-09-07T00:00:00Z',
    statusDate: '2026-09-07',
    zoomPreset: 'day-week',
    timelinePrecision: 'day',
    weekStartsOn: 1,
    timelineRange: { startDate: '2026-09-07', endDate: '2026-10-09' },
    allowTaskCreate: false,
    contextMenu: {},
    dateFormats: {
        locale: 'en-US',
        timeZone: 'UTC',
        table: { dateStyle: 'medium', timeStyle: 'short' },
    },
    calendars: [
        {
            id: planningCalendarId,
            name: 'Launch day',
            timeZone: 'UTC',
            workingDays: [1, 2, 3, 4, 5],
            workingHours: { start: '08:00', end: '18:00' },
            holidays: [],
            hoursPerDay: 10,
        },
    ],
}
