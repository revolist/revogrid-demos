import { type CellTemplate, type CellTemplateProp, type ColumnRegular } from '@revolist/revogrid';
import {
  DEFAULT_CALENDAR,
  addDays,
  addMonths,
  createDateTime,
  createDateTimeFromTimeOfDay,
  formatTimeOfDay,
  getIsoWeekNumber,
  getLocalDateTimeAsUtcIsoDateTime,
  getMonthStartIsoDate,
  getWeekStartIsoDate,
  parseIsoDate,
  parseTimeOfDay,
  shiftDateTime,
  toIsoDate,
  type CalendarEntity,
  type CalendarId,
  type EventSchedulerConfig,
  type EventSchedulerEntityId,
  type EventSchedulerEventEntity,
  type EventSchedulerEventSectionContext,
  type EventSchedulerOpenShiftAssignRequestDetail,
  type EventSchedulerResourceCellContext,
  type EventSchedulerResourceEntity,
  type EventSchedulerResourceReassignRequestDetail,
  type EventSchedulerTemplateH,
} from '@revolist/revogrid-enterprise';
import {
  getShiftWeekResourceDateRange,
  isShiftWeekResourceWorkspace,
} from './resource-range';
import {
  formatShiftWeekTimeLabel,
  renderShiftWeekTimeLabel,
} from './time-label';

export type ShiftWeekDemoView = 'day' | 'week' | 'month' | 'resource';
export type ShiftWeekDemoCalendar = 'weekday' | 'open' | 'training';
export type ShiftWeekWorkspaceView = 'calendar' | 'resource' | 'table';

export interface ShiftWeekCalendarOption {
  readonly id: ShiftWeekDemoCalendar;
  readonly label: string;
  readonly description: string;
  readonly calendarId: CalendarId;
}

export interface ShiftWeekTeamMember {
  readonly id: EventSchedulerEntityId;
  readonly initials: string;
  readonly name: string;
  readonly count: number;
  readonly color: string;
}

export interface ShiftWeekTableRow {
  readonly id: EventSchedulerEntityId;
  readonly title: string;
  readonly date: string;
  readonly dateLabel: string;
  readonly time: string;
  readonly assignee: string;
  readonly initials: string;
  readonly color: string;
  readonly badge: string;
  readonly status: string;
}

export interface ShiftWeekNewEventForm {
  readonly title: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly resourceId: EventSchedulerEntityId;
  readonly status: 'confirmed' | 'pending' | 'training';
  readonly type: 'scheduled' | 'training' | 'review' | 'release';
}

let createdEventSequence = 1;

const currentDemoDate = new Date();
const currentDemoDateTime = getLocalDateTimeAsUtcIsoDateTime(currentDemoDate);

export const shiftWeekViewLabels: Record<ShiftWeekDemoView, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  resource: 'Resource',
};

export const shiftWeekDemoViews: readonly ShiftWeekDemoView[] = ['day', 'week', 'month'];
export const initialShiftWeekDemoView: ShiftWeekDemoView = 'week';
export const initialShiftWeekWorkspaceView: ShiftWeekWorkspaceView = 'calendar';
export const initialShiftWeekAnchorDate = getTodayAnchorDate(initialShiftWeekDemoView);
export const initialShiftWeekCalendar: ShiftWeekDemoCalendar = 'weekday';

export const shiftWeekCalendarOptions: readonly ShiftWeekCalendarOption[] = [
  {
    id: 'weekday',
    label: 'Weekday',
    description: 'Mon-Fri, 8:00-19:00',
    calendarId: 1001,
  },
  {
    id: 'open',
    label: 'Open',
    description: 'Every day, 6:00-22:00',
    calendarId: 1002,
  },
  {
    id: 'training',
    label: 'Training',
    description: 'Mon-Sat, 10:00-16:00, Wed holiday',
    calendarId: 1003,
  },
];

const shiftWeekBaseConfig: Omit<EventSchedulerConfig, 'view' | 'weekStartDate'> = {
  slotMinutes: 30,
  snapMinutes: 10,
  timeRange: { start: '06:00', end: '18:00' },
  currentTimeMarker: { enabled: true, dateTime: currentDemoDateTime },
  timeLabelFormatter: (minutes) => formatShiftWeekTimeLabel(minutes),
  timeLabelTemplate: renderShiftWeekTimeLabel,
  hoverTimeFormatter: (minutes) => formatShiftWeekMinutes(minutes),
  dayHeaderShiftCount: {
    enabled: true,
    formatter: (count) => `${count} ${count === 1 ? 'event' : 'events'}`,
  },
  todayHighlight: true,
  weekendHighlight: { enabled: true, days: [0, 6] },
  contextMenu: true,
  keyboardShortcuts: true,
  continuationLabels: true,
  editable: true,
  allowCreate: true,
  allowMove: true,
  allowResize: true,
  allowDelete: true,
  rowSize: 28,
  timeColumnSize: 64,
  dayColumnSize: 154,
  columnGrouping: false,
  eventLayout: 'stack',
  maxStackedEvents: 4,
  conflicts: {
    enabled: true,
    policy: 'mark',
    scope: 'same-resource',
    rules: { 'outside-availability': 'ignore' },
  },
  dayHeaderProperties: ({ today, weekend, holiday }) => ({
    class: [
      'shift-week-day-header',
      today ? 'shift-week-day-header--today' : '',
      weekend ? 'shift-week-day-header--weekend' : '',
      holiday ? 'shift-week-day-header--holiday' : '',
    ].filter(Boolean).join(' '),
    'data-shift-week-day-header': 'true',
  }),
  timeRowProperties: ({ startMinutes }) => ({
    class: startMinutes % 60 === 0 ? 'shift-week-time-row shift-week-time-row--major' : 'shift-week-time-row',
    'data-shift-week-start-minutes': String(startMinutes),
  }),
  currentTimeMarkerProperties: ({ orientation, position }) => ({
    class: `shift-week-current-time-marker shift-week-current-time-marker--${orientation}`,
    style: {
      '--shift-week-current-time-position': `${Math.round(position * 100)}%`,
    },
  }),
  slotProperties: ({ today, weekend, disabled, selectable, segmentCount }) => ({
    class: [
      'shift-week-slot',
      today ? 'shift-week-slot--today' : '',
      weekend ? 'shift-week-slot--weekend' : '',
      disabled ? 'shift-week-slot--disabled' : '',
      selectable === false ? 'shift-week-slot--readonly' : '',
      segmentCount > 0 ? 'shift-week-slot--busy' : 'shift-week-slot--open',
    ].filter(Boolean).join(' '),
    'data-shift-week-slot-state': segmentCount > 0 ? 'busy' : 'open',
  }),
  closedSlotProperties: ({ reason }) => ({
    class: [
      'shift-week-closed-slot',
      reason ? 'shift-week-closed-slot--reason' : '',
    ].filter(Boolean).join(' '),
    'data-shift-week-closed': reason ?? 'closed',
  }),
  eventProperties: ({ event, isSelected, hasConflict, isLocked }) => ({
    class: [
      'shift-week-event',
      `shift-week-event--${event.status ?? 'scheduled'}`,
      isSelected ? 'shift-week-event--selected' : '',
      hasConflict ? 'shift-week-event--conflict' : '',
      isLocked ? 'shift-week-event--locked' : '',
    ].filter(Boolean).join(' '),
    style: event.color
      ? {
        '--shift-week-event-accent': event.color,
        '--event-scheduler-event-color': event.color,
        '--event-scheduler-event-bg': event.color,
        '--event-scheduler-event-text': '#ffffff',
        '--event-scheduler-text': '#ffffff',
        '--event-scheduler-confirmed-color': event.color,
        '--event-scheduler-confirmed-bg': event.color,
        '--event-scheduler-tentative-color': event.color,
        '--event-scheduler-tentative-bg': event.color,
        '--event-scheduler-info-color': event.color,
        '--event-scheduler-info-bg': event.color,
        '--event-scheduler-locked-color': event.color,
        '--event-scheduler-locked-bg': event.color,
      }
      : undefined,
    'data-shift-week-event-status': event.status ?? 'scheduled',
  }),
  customization: {
    cells: {
      resourceTemplate: renderShiftWeekResourceCell,
      resourceProperties: () => ({
        class: 'shift-week-resource-cell',
      }),
    },
    events: {
      content: renderShiftWeekEventContent,
      continuationLabels: (_h, context) => context.mode === 'timeline' ? '' : undefined,
    },
  },
  createRangeFormatter: (context) => `${context.title}\n${formatShiftWeekMinutes(context.startMinutes)}-${formatShiftWeekMinutes(context.endMinutes)} · ${context.durationLabel}`,
  createEventDraft: (context) => ({
    id: `created-event-${createdEventSequence++}`,
    resourceId: context.resourceId ?? 'alex',
    title: 'New event',
    startDateTime: context.startDateTime,
    endDateTime: context.endDateTime,
    status: 'pending',
    color: '#d97706',
  }),
  statusColorResolver: (event) => {
    switch (event.status) {
      case 'confirmed': return 'oklch(0.58 0.17 264)';
      case 'pending': return 'oklch(0.58 0.17 62)';
      case 'training': return 'oklch(0.58 0.17 158)';
      case 'locked': return 'oklch(0.58 0.17 215)';
      default: return undefined;
    }
  },
};

function renderShiftWeekEventContent(h: EventSchedulerTemplateH, context: EventSchedulerEventSectionContext) {
  const resourceName = context.resource?.name ?? 'Open shift';
  const teamMember = getShiftWeekTeamMember(context.resource?.id);
  const initials = teamMember?.initials ?? getShiftWeekInitials(resourceName);
  const avatarColor = teamMember?.color ?? context.resource?.color ?? 'oklch(0.55 0.2 274)';
  const timeLabel = context.duration < shiftWeekBaseConfig.slotMinutes
    ? context.start.slice(11, 16)
    : formatShiftWeekEventTime(context);

  return h('span', {
    class: [
      'shift-week-event-content',
      context.mode === 'timeline' ? 'shift-week-event-content--timeline' : '',
    ].filter(Boolean).join(' '),
  }, [
    context.mode === 'timeline'
      ? h('span', { class: 'shift-week-event-content__title-block' }, [
          h('span', { class: 'shift-week-event-content__title' }, context.event.title),
          h('span', { class: 'shift-week-event-content__time-subtitle' }, timeLabel),
        ])
      : h('span', { class: 'shift-week-event-content__title' }, context.event.title),
    context.mode !== 'timeline'
      ? h('span', { class: 'shift-week-event-content__details' }, [
          h('span', { class: 'shift-week-event-content__time' }, timeLabel),
        ])
      : null,
    context.mode !== 'timeline'
      ? h('span', { class: 'shift-week-event-content__resource' }, [
          h('span', {
            class: 'shift-week-event-content__avatar',
            style: { '--shift-week-avatar-color': avatarColor },
            title: resourceName,
          }, initials),
          h('span', { class: 'shift-week-event-content__resource-name' }, resourceName),
        ])
      : null,
  ]);
}

export function getShiftWeekEventBadge(event: EventSchedulerEventEntity) {
  if (event.locked || event.status === 'locked') return 'Release';
  if (event.title.includes('Deploy')) return 'Deploy';
  if (event.title.includes('Research')) return 'Fieldwork';
  if (event.title.includes('Standby')) return 'On-call';
  if (event.title.includes('Review')) return 'Review';
  if (event.title.includes('Workshop')) return 'Workshop';
  if (event.title.includes('Onboarding')) return 'Training';
  return event.status === 'pending' ? 'Tentative' : 'Scheduled';
}

function formatShiftWeekEventTime(context: EventSchedulerEventSectionContext) {
  return `${context.start.slice(11, 16)}-${context.end.slice(11, 16)}`;
}

function formatShiftWeekMinutes(minutes: number) {
  return formatShiftWeekTimeLabel(minutes);
}

function getShiftWeekInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'OS';
}

export const shiftWeekConfig: EventSchedulerConfig = createShiftWeekConfig(
  initialShiftWeekDemoView,
  initialShiftWeekAnchorDate,
  initialShiftWeekCalendar,
);

export const shiftResources: EventSchedulerResourceEntity[] = [
  { id: 'alex', name: 'Alex Kim', role: 'RN', group: 'Ward A', color: 'oklch(0.58 0.17 300)' },
  { id: 'mina', name: 'Mina Patel', role: 'RN', group: 'Ward A', color: 'oklch(0.58 0.17 158)' },
  { id: 'sam', name: 'Sam Rivera', role: 'Charge Nurse', group: 'Ward B', color: 'oklch(0.58 0.17 215)' },
  { id: 'jamie', name: 'Jamie Chen', role: 'Float', group: 'Ward B', color: 'oklch(0.58 0.17 264)' },
];

export const shiftWeekTeamMembers: readonly ShiftWeekTeamMember[] = [
  { id: 'jamie', initials: 'JC', name: 'Jamie Chen', count: 2, color: 'oklch(0.58 0.17 264)' },
  { id: 'alex', initials: 'AK', name: 'Alex Kim', count: 2, color: 'oklch(0.58 0.17 300)' },
  { id: 'mina', initials: 'MP', name: 'Mina Patel', count: 3, color: 'oklch(0.58 0.17 158)' },
  { id: 'sam', initials: 'SR', name: 'Sam Rivera', count: 3, color: 'oklch(0.58 0.17 215)' },
];

export const shiftWeekNewEventStatusOptions: readonly { readonly id: ShiftWeekNewEventForm['status']; readonly label: string }[] = [
  { id: 'confirmed', label: 'Scheduled' },
  { id: 'pending', label: 'Tentative' },
  { id: 'training', label: 'Training' },
];

export const shiftWeekNewEventTypeOptions: readonly { readonly id: ShiftWeekNewEventForm['type']; readonly label: string }[] = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'training', label: 'Training' },
  { id: 'review', label: 'Review' },
  { id: 'release', label: 'Release' },
];

export function getShiftWeekTeamMember(id: EventSchedulerEntityId | undefined) {
  return shiftWeekTeamMembers.find((member) => String(member.id) === String(id));
}

export function getShiftWeekNewEventDefaults(
  view: ShiftWeekDemoView,
  anchorDate: string,
): ShiftWeekNewEventForm {
  const normalizedAnchor = normalizeShiftWeekAnchorDate(view, anchorDate);
  const date = getDefaultNewEventDate(view, normalizedAnchor);
  const currentMinutes = currentDemoDate.getHours() * 60 + currentDemoDate.getMinutes();
  const roundedCurrentMinutes = Math.ceil(currentMinutes / 30) * 30;
  const startMinutes = date === toIsoDate(currentDemoDate)
    ? Math.min(Math.max(roundedCurrentMinutes, 8 * 60), 16 * 60)
    : 9 * 60;
  return {
    title: 'New event',
    date,
    startTime: formatTimeOfDay(startMinutes),
    endTime: formatTimeOfDay(startMinutes + 60),
    resourceId: shiftWeekTeamMembers[0]?.id ?? shiftResources[0]?.id ?? 'jamie',
    status: 'confirmed',
    type: 'scheduled',
  };
}

export function createShiftWeekManualEvent(form: ShiftWeekNewEventForm): EventSchedulerEventEntity {
  const startMinutes = parseTimeOfDay(form.startTime);
  const rawEndMinutes = parseTimeOfDay(form.endTime);
  const endMinutes = Math.min(rawEndMinutes > startMinutes ? rawEndMinutes : startMinutes + 30, 23 * 60 + 59);
  const resource = shiftResources.find((item) => String(item.id) === String(form.resourceId));
  const member = getShiftWeekTeamMember(resource?.id ?? form.resourceId);
  const typeLabel = shiftWeekNewEventTypeOptions.find((option) => option.id === form.type)?.label ?? 'Scheduled';
  return {
    id: `manual-event-${createdEventSequence++}`,
    resourceId: form.resourceId,
    title: form.title.trim() || 'New event',
    startDateTime: createDateTime(form.date, startMinutes),
    endDateTime: createDateTime(form.date, endMinutes),
    status: form.status,
    color: member?.color ?? resource?.color ?? 'oklch(0.58 0.17 264)',
    notes: `${typeLabel} created from the New event popup.`,
  };
}

export function getShiftWeekTableRows(
  events: readonly EventSchedulerEventEntity[],
): ShiftWeekTableRow[] {
  return [...events]
    .filter((event) => {
      if (!event.startDateTime || !event.endDateTime) {
        return false;
      }
      return true;
    })
    .sort((a, b) => String(a.startDateTime).localeCompare(String(b.startDateTime)))
    .map((event) => {
      const resource = shiftResources.find((item) => String(item.id) === String(event.resourceId));
      const member = getShiftWeekTeamMember(resource?.id);
      const assignee = resource?.name ?? 'Open shift';
      const startDate = toIsoDate(parseIsoDate(event.startDateTime));
      return {
        id: event.id,
        title: event.title ?? 'Untitled',
        date: startDate,
        dateLabel: toTableDateLabel(event.startDateTime),
        time: `${event.startDateTime.slice(11, 16)}-${event.endDateTime.slice(11, 16)}`,
        assignee,
        initials: member?.initials ?? getShiftWeekInitials(assignee),
        color: member?.color ?? resource?.color ?? 'oklch(0.55 0.2 274)',
        badge: getShiftWeekEventBadge(event),
        status: formatShiftWeekStatus(event),
      };
    });
}

export const shiftEvents: EventSchedulerEventEntity[] = createShiftWeekEvents(
  initialShiftWeekDemoView,
  initialShiftWeekAnchorDate,
);

export function createShiftWeekConfig(
  view: ShiftWeekDemoView,
  anchorDate: string,
  calendar: ShiftWeekDemoCalendar = initialShiftWeekCalendar,
  selectedEventIds: readonly EventSchedulerEntityId[] = [],
  highlightedEventIds: readonly EventSchedulerEntityId[] = [],
  workspaceView: ShiftWeekWorkspaceView = view === 'resource' ? 'resource' : 'calendar',
): EventSchedulerConfig {
  const normalizedAnchor = normalizeShiftWeekAnchorDate(view, anchorDate);
  const highlightedEventIdSet = new Set(highlightedEventIds.map((id) => String(id)));
  const resourceWorkspace = isShiftWeekResourceWorkspace(view, workspaceView);
  const resourceDateRange = resourceWorkspace
    ? getShiftWeekResourceDateRange(view, normalizedAnchor)
    : undefined;
  const schedulerView: EventSchedulerConfig['view'] = resourceWorkspace
    ? 'resourceTimeline'
    : view === 'resource'
      ? 'week'
      : view;
  return {
    ...shiftWeekBaseConfig,
    view: schedulerView,
    weekStartDate: normalizedAnchor,
    ...(resourceDateRange ? { dateRange: resourceDateRange } : {}),
    calendars: createShiftWeekCalendarsConfig(calendar, normalizedAnchor),
    selectionMode: 'multiple',
    selection: {
      selectedEventIds,
      clipboard: true,
      copyOffsetDays: 7,
    },
    eventProperties: (context) => {
      const baseProperties = shiftWeekBaseConfig.eventProperties?.(context);
      const searchMatchClass = highlightedEventIdSet.has(String(context.event.id))
        ? 'shift-week-event--search-match'
        : '';
      const compactResourceClass = context.duration <= 60
        ? 'shift-week-event--compact-resource'
        : '';
      return {
        ...baseProperties,
        class: [
          typeof baseProperties?.class === 'string' ? baseProperties.class : '',
          searchMatchClass,
          compactResourceClass,
        ].filter(Boolean).join(' '),
      };
    },
    ...(resourceWorkspace ? { resourceColumnSize: 212, timelineColumnSize: 92, rowSize: 58, columnGrouping: true } : {}),
  };
}

export function getShiftWeekSearchMatchIds(
  events: readonly EventSchedulerEventEntity[],
  query: string,
): readonly EventSchedulerEntityId[] {
  const normalizedQuery = normalizeShiftWeekSearchText(query);
  if (!normalizedQuery) return [];
  return events
    .filter((event) => normalizeShiftWeekSearchText(getShiftWeekEventSearchText(event)).includes(normalizedQuery))
    .map((event) => event.id);
}

export function createShiftWeekEvents(view: ShiftWeekDemoView, anchorDate: string): EventSchedulerEventEntity[] {
  const startDate = getEventStartDate(view, anchorDate);
  const rotation = getShiftWeekEventRotation(startDate);
  return [
    {
      id: 'shift-alex-mon-morning',
      resourceId: 'jamie',
      title: rotation.morningTitle,
      startDateTime: createDateTimeFromTimeOfDay(startDate, rotation.morningStart, rotation.morningDay),
      endDateTime: createDateTimeFromTimeOfDay(startDate, rotation.morningEnd, rotation.morningDay),
      status: 'confirmed',
      color: 'oklch(0.58 0.17 264)',
    },
    {
      id: 'shift-alex-mon-conflict',
      resourceId: 'alex',
      title: rotation.coverTitle,
      startDateTime: createDateTimeFromTimeOfDay(startDate, rotation.coverStart, rotation.coverDay),
      endDateTime: createDateTimeFromTimeOfDay(startDate, rotation.coverEnd, rotation.coverDay),
      status: 'pending',
      color: 'oklch(0.58 0.17 300)',
      notes: 'Intentional overlap to show conflict styling.',
    },
    {
      id: 'shift-mina-tue',
      resourceId: 'alex',
      title: rotation.recoveryTitle,
      startDateTime: createDateTimeFromTimeOfDay(startDate, rotation.recoveryStart, rotation.recoveryDay),
      endDateTime: createDateTimeFromTimeOfDay(startDate, rotation.recoveryEnd, rotation.recoveryDay),
      status: 'pending',
      color: 'oklch(0.58 0.17 14)',
    },
    {
      id: 'shift-sam-locked',
      resourceId: 'sam',
      title: rotation.chargeTitle,
      startDateTime: createDateTimeFromTimeOfDay(startDate, rotation.chargeStart, rotation.chargeDay),
      endDateTime: createDateTimeFromTimeOfDay(startDate, rotation.chargeEnd, rotation.chargeDay),
      status: 'locked',
      locked: true,
      color: 'oklch(0.58 0.17 215)',
    },
    {
      id: 'shift-jamie-training',
      resourceId: 'mina',
      title: rotation.trainingTitle,
      startDateTime: createDateTimeFromTimeOfDay(startDate, rotation.trainingStart, rotation.trainingDay),
      endDateTime: createDateTimeFromTimeOfDay(startDate, rotation.trainingEnd, rotation.trainingDay),
      status: 'training',
      color: 'oklch(0.58 0.17 158)',
    },
  ];
}

export function createShiftWeekAssignedOpenShift(
  slot: EventSchedulerOpenShiftAssignRequestDetail,
): EventSchedulerEventEntity {
  return {
    id: `assigned-open-shift-${createdEventSequence++}`,
    resourceId: slot.resourceId ?? 'jamie',
    title: 'Assigned open shift',
    startDateTime: slot.startDateTime,
    endDateTime: shiftDateTime(slot.startDateTime, 240),
    status: 'pending',
    color: 'oklch(0.58 0.17 62)',
    notes: 'Created from the Assign open shift context action.',
  };
}

export function reassignShiftWeekEvent(
  events: readonly EventSchedulerEventEntity[],
  detail: EventSchedulerResourceReassignRequestDetail,
): readonly EventSchedulerEventEntity[] {
  const nextResourceId = getNextShiftResourceId(detail.event.resourceId);
  if (nextResourceId === undefined) {
    return events;
  }
  return events.map((event) => String(event.id) === String(detail.eventId)
    ? {
      ...event,
      resourceId: nextResourceId,
      resourceIds: undefined,
    }
    : event);
}

export function getTodayAnchorDate(view: ShiftWeekDemoView): string {
  return normalizeShiftWeekAnchorDate(view, toIsoDate(currentDemoDate));
}

export function normalizeShiftWeekAnchorDate(view: ShiftWeekDemoView, date: string): string {
  const parsed = parseIsoDate(date);
  if (view === 'week' || view === 'resource') {
    return getWeekStartIsoDate(parsed);
  }
  if (view === 'month') {
    return getMonthStartIsoDate(parsed);
  }
  return toIsoDate(parsed);
}

export function navigateShiftWeekAnchorDate(view: ShiftWeekDemoView, anchorDate: string, direction: -1 | 1): string {
  const normalized = normalizeShiftWeekAnchorDate(view, anchorDate);
  if (view === 'day') {
    return addDays(normalized, direction);
  }
  if (view === 'month') {
    return addMonths(normalized, direction);
  }
  return addDays(normalized, direction * 7);
}

export function getShiftWeekRangeTitle(view: ShiftWeekDemoView, anchorDate: string): string {
  const normalized = normalizeShiftWeekAnchorDate(view, anchorDate);
  if (view === 'month') {
    return formatMonthTitle(normalized);
  }
  if (view === 'day') {
    return formatDateTitle(normalized);
  }
  return formatDateRangeTitle(normalized, addDays(normalized, 6));
}

export function getShiftWeekSubtitle(anchorDate: string): string {
  return `Week ${getIsoWeekNumber(parseIsoDate(anchorDate))}`;
}

export function getShiftWeekCalendarDescription(calendar: ShiftWeekDemoCalendar): string {
  return shiftWeekCalendarOptions.find((option) => option.id === calendar)?.description ?? '';
}

function createShiftWeekCalendarsConfig(
  calendar: ShiftWeekDemoCalendar,
  anchorDate: string,
): NonNullable<EventSchedulerConfig['calendars']> {
  const calendars = createShiftWeekCalendarEntities(anchorDate);
  const selected = shiftWeekCalendarOptions.find((option) => option.id === calendar) ?? shiftWeekCalendarOptions[0];
  return {
    primaryCalendarId: selected.calendarId,
    className: 'hospital-calendar-closed',
    calendars,
  };
}

function createShiftWeekCalendarEntities(anchorDate: string): readonly CalendarEntity[] {
  return [
    {
      ...DEFAULT_CALENDAR,
      id: 1001,
      name: 'Hospital Weekday Calendar',
      workingHours: { start: '08:00', end: '19:00' },
    },
    {
      ...DEFAULT_CALENDAR,
      id: 1002,
      name: 'Open Coverage Calendar',
      workingDays: [1, 2, 3, 4, 5, 6, 7],
      workingHours: { start: '06:00', end: '22:00' },
    },
    {
      ...DEFAULT_CALENDAR,
      id: 1003,
      name: 'Training Calendar',
      workingDays: [1, 2, 3, 4, 5, 6],
      holidays: [addDays(getWeekStartIsoDate(parseIsoDate(anchorDate)), 2) as CalendarEntity['holidays'][number]],
      workingHours: { start: '10:00', end: '16:00' },
    },
  ];
}

function getEventStartDate(view: ShiftWeekDemoView, anchorDate: string): string {
  if (view === 'day') {
    return normalizeShiftWeekAnchorDate(view, anchorDate);
  }
  if (view === 'month') {
    return normalizeShiftWeekAnchorDate(view, anchorDate);
  }
  return getWeekStartIsoDate(parseIsoDate(anchorDate));
}

function renderShiftWeekResourceCell(h: EventSchedulerTemplateH, context: EventSchedulerResourceCellContext) {
  const resourceName = context.resource?.name ?? 'Open shift';
  const member = getShiftWeekTeamMember(context.resource?.id ?? context.resourceId);
  const initials = member?.initials ?? getShiftWeekInitials(resourceName);
  const color = member?.color ?? context.resource?.color ?? 'oklch(0.55 0.2 274)';
  const role = context.resource?.role ?? (context.unassigned ? 'Unassigned' : 'Resource');
  return h('span', { class: 'shift-week-resource-cell__content' }, [
    h('span', {
      class: 'shift-week-resource-cell__avatar',
      style: { '--shift-week-avatar-color': color },
      title: resourceName,
    }, initials),
    h('span', { class: 'shift-week-resource-cell__copy' }, [
      h('span', { class: 'shift-week-resource-cell__name' }, resourceName),
      h('span', { class: 'shift-week-resource-cell__meta' }, role),
    ]),
    member?.count !== undefined
      ? h('span', { class: 'shift-week-resource-cell__count' }, String(member.count))
      : null,
  ]);
}

function getDefaultNewEventDate(view: ShiftWeekDemoView, normalizedAnchor: string): string {
  const today = toIsoDate(currentDemoDate);
  if (view === 'day') {
    return normalizedAnchor;
  }
  if (view === 'month') {
    return today.startsWith(normalizedAnchor.slice(0, 8)) ? today : normalizedAnchor;
  }
  const endDate = addDays(normalizedAnchor, 6);
  return today >= normalizedAnchor && today <= endDate ? today : normalizedAnchor;
}

function getShiftWeekEventRotation(startDate: string) {
  const week = getIsoWeekNumber(parseIsoDate(startDate));
  const rotation = week % 3;
  if (rotation === 1) {
    return {
      morningTitle: 'Onboarding Session',
      morningDay: 0,
      morningStart: '08:00',
      morningEnd: '12:00',
      coverTitle: 'Design Workshop',
      coverDay: 1,
      coverStart: '07:30',
      coverEnd: '11:30',
      recoveryTitle: 'Client Strategy Call',
      recoveryDay: 1,
      recoveryStart: '10:30',
      recoveryEnd: '12:30',
      chargeTitle: 'Release Prep',
      chargeDay: 4,
      chargeStart: '07:00',
      chargeEnd: '17:00',
      trainingTitle: 'Field Research',
      trainingDay: 3,
      trainingStart: '09:30',
      trainingEnd: '15:00',
    };
  }
  if (rotation === 2) {
    return {
      morningTitle: 'Ward A Morning',
      morningDay: 2,
      morningStart: '08:00',
      morningEnd: '12:00',
      coverTitle: 'Discharge Cover',
      coverDay: 2,
      coverStart: '11:00',
      coverEnd: '14:30',
      recoveryTitle: 'Triage Desk',
      recoveryDay: 0,
      recoveryStart: '09:00',
      recoveryEnd: '15:30',
      chargeTitle: 'Charge Nurse',
      chargeDay: 3,
      chargeStart: '07:00',
      chargeEnd: '17:00',
      trainingTitle: 'Training Block',
      trainingDay: 4,
      trainingStart: '12:00',
      trainingEnd: '17:00',
    };
  }
  return {
    morningTitle: 'Ward A Morning',
    morningDay: 0,
    morningStart: '08:00',
    morningEnd: '12:00',
    coverTitle: 'Medication Cover',
    coverDay: 0,
    coverStart: '11:00',
    coverEnd: '14:00',
    recoveryTitle: 'Recovery Bay',
    recoveryDay: 1,
    recoveryStart: '09:00',
    recoveryEnd: '15:30',
    chargeTitle: 'Charge Nurse',
    chargeDay: 2,
    chargeStart: '07:00',
    chargeEnd: '17:00',
    trainingTitle: 'Training Block',
    trainingDay: 3,
    trainingStart: '13:00',
    trainingEnd: '18:00',
  };
}

function getNextShiftResourceId(currentResourceId: EventSchedulerEventEntity['resourceId']) {
  if (!shiftResources.length) return undefined;
  const currentIndex = shiftResources.findIndex((resource) => String(resource.id) === String(currentResourceId));
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1) % shiftResources.length
    : 0;
  return shiftResources[nextIndex]?.id;
}

function formatDateRangeTitle(startDate: string, endDate: string): string {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const sameMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  if (sameMonth) {
    const month = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${month} ${start.getUTCDate()} – ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }
  const startOptions: Intl.DateTimeFormatOptions = sameMonth
    ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
    : sameYear
      ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
      : { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  const endOptions: Intl.DateTimeFormatOptions = sameMonth
    ? { day: 'numeric', year: 'numeric', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  return `${start.toLocaleDateString('en-US', startOptions)} - ${end.toLocaleDateString('en-US', endOptions)}`;
}

function formatDateTitle(date: string): string {
  return parseIsoDate(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTableDate(dateTime: string): string {
  return new Date(dateTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const renderShiftWeekTableEventCell: CellTemplate = (h, { model }: CellTemplateProp) => {
  const row = model as ShiftWeekTableRow;
  return h('span', { class: 'event-scheduler-shift-week-table__event' }, [
    h('span', { class: 'event-scheduler-shift-week-table__swatch', style: { '--shift-week-avatar-color': row.color } }),
    h('span', { class: 'event-scheduler-shift-week-table__text' }, row.title),
  ]);
};

const renderShiftWeekTableDateCell: CellTemplate = (h, { model }: CellTemplateProp) => {
  const row = model as ShiftWeekTableRow;
  return h('span', { class: 'event-scheduler-shift-week-table__text' }, row.dateLabel);
};

const renderShiftWeekTableAssigneeCell: CellTemplate = (h, { model }: CellTemplateProp) => {
  const row = model as ShiftWeekTableRow;
  return h('span', { class: 'event-scheduler-shift-week-table__person' }, [
    h('span', { class: 'event-scheduler-shift-week-table__avatar', style: { '--shift-week-avatar-color': row.color } }, row.initials),
    h('span', { class: 'event-scheduler-shift-week-table__text' }, row.assignee),
  ]);
};

const renderShiftWeekTableBadgeCell: CellTemplate = (h, { model, value }: CellTemplateProp) => {
  const row = model as ShiftWeekTableRow;
  return h('span', { class: 'event-scheduler-shift-week-table__badge', style: { '--shift-week-avatar-color': row.color } }, String(value ?? ''));
};

const renderShiftWeekTableStatusCell: CellTemplate = (h, { model }: CellTemplateProp) => {
  const row = model as ShiftWeekTableRow;
  return h('span', { class: 'event-scheduler-shift-week-table__status', style: { '--shift-week-avatar-color': row.color } }, row.status);
};

export function getShiftWeekTableColumns(): ColumnRegular[] {
  return [
    {
      name: 'Event',
      prop: 'title',
      filter: ['selection', 'string'],
      rowSelect: true,
      cellTemplate: renderShiftWeekTableEventCell,
    },
    {
      name: 'Date',
      prop: 'date',
      filter: ['date'],
      cellTemplate: renderShiftWeekTableDateCell,
    },
    {
      name: 'Time',
      prop: 'time',
      filter: ['string'],
      cellTemplate: (h, { value }) => h('span', { class: 'event-scheduler-shift-week-table__time' }, String(value ?? '')),
    },
    {
      name: 'Assignee',
      prop: 'assignee',
      filter: ['selection', 'string'],
      cellTemplate: renderShiftWeekTableAssigneeCell,
    },
    {
      name: 'Type',
      prop: 'badge',
      filter: ['selection', 'string'],
      cellTemplate: renderShiftWeekTableBadgeCell,
    },
    {
      name: 'Status',
      prop: 'status',
      filter: ['selection', 'string'],
      cellTemplate: renderShiftWeekTableStatusCell,
    },
  ];
}

function toTableDateLabel(dateTime: string): string {
  return formatTableDate(dateTime);
}

function formatShiftWeekStatus(event: EventSchedulerEventEntity): string {
  if (event.locked || event.status === 'locked') return 'Locked';
  if (event.status === 'pending') return 'Tentative';
  if (event.status === 'training') return 'Training';
  return 'Scheduled';
}

function getShiftWeekEventSearchText(event: EventSchedulerEventEntity): string {
  const resource = shiftResources.find((item) => String(item.id) === String(event.resourceId));
  const member = getShiftWeekTeamMember(resource?.id);
  const title = event.title ?? '';
  return [
    title,
    event.startDateTime,
    event.endDateTime,
    event.startDateTime.slice(11, 16),
    event.endDateTime.slice(11, 16),
    resource?.name,
    resource?.role,
    resource?.group,
    member?.initials,
    getShiftWeekEventBadge(event),
    formatShiftWeekStatus(event),
    event.status,
    event.notes,
  ].filter(Boolean).join(' ');
}

function normalizeShiftWeekSearchText(value: string) {
  return value.trim().toLocaleLowerCase();
}

function formatMonthTitle(date: string): string {
  return parseIsoDate(date).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
