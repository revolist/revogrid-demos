export type ShiftWeekResourceRangeView = 'day' | 'week' | 'month' | 'resource';
export type ShiftWeekResourceWorkspaceView = 'calendar' | 'resource' | 'table';

export function isShiftWeekResourceWorkspace(
  view: ShiftWeekResourceRangeView,
  workspaceView: ShiftWeekResourceWorkspaceView,
): boolean {
  return workspaceView === 'resource' || view === 'resource';
}

export function getShiftWeekResourceDateRange(view: ShiftWeekResourceRangeView, normalizedAnchor: string) {
  if (view === 'day') {
    return { start: normalizedAnchor, end: normalizedAnchor };
  }
  if (view === 'month') {
    const parsed = parseIsoDate(normalizedAnchor);
    const start = toIsoDate(new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1)));
    const end = toIsoDate(new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0)));
    return { start, end };
  }
  return { start: normalizedAnchor, end: addDays(normalizedAnchor, 6) };
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return toIsoDate(new Date(Date.UTC(year, month - 1, day + days)));
}

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
