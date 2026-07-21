export * from './scheduler-dialog/scheduler-dialog';
export * from './scheduler-header/scheduler-header';
export * from './scheduler-sidebar/scheduler-sidebar';

import { defineSchedulerDialog } from './scheduler-dialog/scheduler-dialog';
import { defineSchedulerHeader } from './scheduler-header/scheduler-header';
import { defineSchedulerSidebar } from './scheduler-sidebar/scheduler-sidebar';

/** Idempotently registers every framework-neutral scheduler shell element. */
export function defineSchedulerShellElements(): void {
  defineSchedulerDialog();
  defineSchedulerHeader();
  defineSchedulerSidebar();
}
