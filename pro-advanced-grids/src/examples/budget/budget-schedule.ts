/** Sample timeline offsets in days from 1 August 2026. */
export const projectToday = 88;
export const timelineEnd = 243;
export const monthStarts = [0, 31, 61, 92, 122, 153, 184, 212] as const;
export const monthNames = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'] as const;
export const monthForDay = (day: number) => monthStarts.reduce<number>((index, start, current) => day >= start ? current : index, 0);

export function projectedFinish(row: { start: number; plannedEnd: number; unit: string; units: number; rate: number; actual: number; remaining: number }) {
  if (row.actual > 0 && row.remaining === 0) return row.plannedEnd;
  const duration = Math.max(0, row.plannedEnd - row.start);
  const planned = row.units * row.rate;
  const projection = row.unit === 'Hours' && planned > 0
    ? row.start + Math.round(duration * (row.actual + row.remaining) / planned)
    : row.plannedEnd;
  return Math.max(projectToday, projection);
}
export function scheduleGeometry(row: { start: number; plannedEnd: number; finish: number }, completed: boolean) {
  const clamp = (day: number) => Math.max(0, Math.min(timelineEnd, day));
  const start = clamp(row.start), end = clamp(row.plannedEnd), finish = clamp(row.finish);
  const elapsed = completed ? end : Math.max(start, Math.min(projectToday, end));
  const pct = (days: number) => days / timelineEnd * 100;
  return { left: pct(start), plannedWidth: pct(Math.max(0, end - start)), elapsedWidth: pct(Math.max(0, elapsed - start)), extensionLeft: pct(end), extensionWidth: pct(Math.max(0, finish - end)), today: pct(projectToday) };
}
export function budgetHealth(row: { start: number; plannedEnd: number; budget: number; actual: number; forecast: number }) {
  if (row.forecast > row.budget) return 'over';
  if (row.actual > 0 && row.actual >= row.forecast) return 'done';
  if (row.actual <= 0) return 'idle';
  const elapsed = Math.max(0, Math.min(1, (projectToday - row.start) / Math.max(1, row.plannedEnd - row.start)));
  return row.budget > 0 && row.actual / row.budget > elapsed + 0.1 ? 'ahead' : 'ok';
}
