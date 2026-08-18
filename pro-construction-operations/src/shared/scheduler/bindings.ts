import { EventSchedulerPlugin } from '@revolist/scheduler';
import { createBaseGridBindings } from '../base-grid';
import { schedulerEventsFor, schedulerResourcesFor } from './projection';
import type { ConstructionGridBindings, ConstructionGridOptions } from '../grid';
import type { ConstructionTask } from '../types';

export function createSchedulerBindings(source: ConstructionTask[], options: ConstructionGridOptions): ConstructionGridBindings {
  return {
    ...createBaseGridBindings(), plugins: [EventSchedulerPlugin], columns: [],
    eventScheduler: { view: 'resourceTimeline', weekStartDate: options.period.start, dateRange: { start: options.period.start, end: options.period.end }, locale: 'en-AU', timeZone: 'Australia/Sydney', slotMinutes: 1440, timeRange: { start: '00:00', end: '24:00' }, rowSize: 44, resourceTimelineRowSizing: { enabled: true, minEventHeight: 24 }, resourceColumnSize: 176, timelineColumnSize: 88, editable: true, allowCreate: false, allowMove: true, allowResize: true, allowDelete: false, keyboardShortcuts: false, currentTimeMarker: false, contextMenu: true, customization: { conflicts: { appearance: 'fill', className: 'construction-fabrication__scheduler-conflict-fill' } } },
    eventSchedulerResources: schedulerResourcesFor(source), eventSchedulerEvents: schedulerEventsFor(source), source: [],
  };
}
