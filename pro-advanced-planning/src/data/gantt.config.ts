import {
    DEFAULT_TIMELINE_ZOOM_LEVELS,
    type GanttPluginConfig,
    type TimelineZoomLevel,
} from '@revolist/gantt'
import { planningCalendarId } from './source'

const dayWeekMediumZoomLevel: TimelineZoomLevel = {
    id: 'day-week-medium',
    label: 'Day / Week (Medium)',
    tickUnit: 'day',
    tickCount: 1,
    tickWidth: 100,
    highlightVisibility: { weekends: true, holidays: true },
    headerRows: [
        { id: 'week', unit: 'week' },
        { id: 'day', unit: 'day' },
    ],
}

const planningTimelineZoomLevels = DEFAULT_TIMELINE_ZOOM_LEVELS.some(
    ({ id }) => id === dayWeekMediumZoomLevel.id
)
    ? DEFAULT_TIMELINE_ZOOM_LEVELS
    : DEFAULT_TIMELINE_ZOOM_LEVELS.flatMap((level) =>
          level.id === 'day-week' ? [dayWeekMediumZoomLevel, level] : [level]
      )

export const ganttConfig: GanttPluginConfig = {
    id: 'launch',
    name: 'Launch day',
    version: '1',
    currency: 'USD',
    timeZone: 'UTC',
    primaryCalendarId: planningCalendarId,
    updatedAt: '2026-09-07T00:00:00Z',
    statusDate: '2026-09-07',
    zoom: {
        levels: planningTimelineZoomLevels,
        defaultLevelId: dayWeekMediumZoomLevel.id,
    },
    timelinePrecision: 'day',
    weekStartsOn: 1,
    timelineRange: { startDate: '2026-09-07', endDate: '2026-10-09' },
    allowTaskCreate: false,
    contextMenu: {},
    scheduling: {
        taskModeDefault: 'auto',
    },
    visuals: {
        showTaskLabels: false,
    },
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
