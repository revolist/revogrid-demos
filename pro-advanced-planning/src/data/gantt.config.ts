import {
    DEFAULT_TIMELINE_ZOOM_LEVELS,
    type GanttPluginConfig,
    type GanttTaskEditorDialogOptions,
    type TimelineZoomLevel,
} from '@revolist/gantt'
import { avatarTemplate } from '@revolist/revogrid-pro'
import { planningCalendarId } from './source'
import { planningFields } from './fields'

// The shared workspace stores one owner, so its multi-resource picker is read-only.
export const ganttTaskEditorDialog = {
    resources: false,
} satisfies GanttTaskEditorDialogOptions

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
    fields: planningFields,
    zoom: {
        levels: planningTimelineZoomLevels,
        defaultLevelId: dayWeekMediumZoomLevel.id,
    },
    weekStartsOn: 1,
    timelineRange: { startDate: '2026-09-07', endDate: '2026-10-09' },
    allowTaskCreate: false,
    contextMenu: { row: false },
    scheduling: {
        taskModeDefault: 'auto',
    },
    visuals: {
        taskBarColorHook: () => ({ borderColor: 'transparent' }),
        showTaskLabels: false,
        taskBarContentHook: ({ h, row, defaultContent }) => [
            ...defaultContent,
            row.assigneeDetails?.length
                ? h('span', {
                      class: 'planning-demo__bar-avatars',
                      title: row.assigneeDetails.map(({ name }) => name).join(', '),
                  }, row.assigneeDetails.map((assignee) => avatarTemplate(h, {
                      value: assignee.avatarUrl || assignee.name,
                      label: assignee.name,
                      size: 20,
                  })))
                : null,
        ],
    },
    dateFormats: {
        locale: 'en-US',
        timeZone: 'UTC',
        table: { dateStyle: 'medium' },
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
