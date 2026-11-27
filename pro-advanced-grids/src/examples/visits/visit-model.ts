export const services = {
  air: { label: 'Air Handling', short: 'Air', high: 14, moderate: 14 },
  water: { label: 'Water Quality', short: 'Water', high: 30, moderate: 30 },
  electrical: { label: 'Electrical Safety', short: 'Electrical', high: 60, moderate: 60 },
  lift: { label: 'Lift Inspection', short: 'Lift', high: 90, moderate: 180 },
  fire: { label: 'Fire Systems', short: 'Fire', high: 180, moderate: 180 },
  climate: { label: 'Heating and Cooling', short: 'Climate', high: 90, moderate: 90 },
} as const;
export type Service = keyof typeof services;
export type Status = 'Booked' | 'Awaiting' | 'Completed' | 'Missed' | 'Due';
export interface Kitchen {
  id: number; label: string; manager: string; address?: string; volume: 'high' | 'moderate';
  services: Service[]; priorDone: Partial<Record<Service, number>>;
}
export type VisitWindow = 'opening' | 'afternoon' | 'close';
export interface Technician { name: string; service: Service }
export interface Visit {
  kitchen: number; day: number; service: Service; status: Status; crew: string; report: string; window?: VisitWindow; notes?: string;
}
export interface ServiceState { service: Service; due: number; state: 'ok' | 'late' | 'missed' | 'gap' | 'clear'; priority: number }
export const today = 4;
export function effectiveStatus(visit: Visit): Status {
  return visit.status !== 'Completed' && visit.status !== 'Due' && visit.day < today ? 'Missed' : visit.status;
}
/** Latest completion can come from the contract or a subsequently logged visit. */
function latestCompletion(kitchen: Kitchen, service: Service, visits: readonly Visit[]): number | undefined {
  const dates = visits.filter(visit => visit.status === 'Completed').map(visit => visit.day);
  const prior = kitchen.priorDone[service];
  if (prior !== undefined) dates.push(prior);
  return dates.length ? Math.max(...dates) : undefined;
}
export function serviceStates(kitchen: Kitchen, visits: readonly Visit[]): ServiceState[] {
  return kitchen.services.map(service => {
    const matching = visits.filter(v => v.kitchen === kitchen.id && v.service === service);
    const lastDone = latestCompletion(kitchen, service, matching);
    const next = matching.filter(v => !['Completed', 'Due', 'Missed'].includes(v.status) && v.day >= today).sort((a,b) => a.day - b.day)[0];
    const missed = matching.filter(v => !['Completed', 'Due'].includes(v.status) && (v.day < today || v.status === 'Missed')).sort((a,b) => b.day - a.day)[0];
    const due = lastDone == null ? today : lastDone + services[service][kitchen.volume];
    const state = next ? (next.day <= due ? 'ok' : 'late') : missed && (lastDone == null || missed.day > lastDone) ? 'missed' : due <= today + 28 ? 'gap' : 'clear';
    const priority = state === 'missed' ? 4 : state === 'gap' ? (due < today ? 3 : 2) : state === 'late' ? 1 : 0;
    return { service, due, state, priority };
  });
}
export function coverage(states: readonly ServiceState[]) {
  const onTrack = states.filter(s => s.state === 'ok' || s.state === 'clear').length;
  const important = states.slice().sort((a,b) => b.priority - a.priority || a.due - b.due)[0];
  const priority = important?.priority ?? 0;
  return { onTrack, total: states.length, important, priority, rank: states.length ? onTrack / states.length - priority / 100 : 1 };
}
export function dueVisits(kitchen: Kitchen, visits: readonly Visit[], states: readonly ServiceState[]): Visit[] {
  const occupied = new Set(visits.filter(v => v.kitchen === kitchen.id).map(v => v.day));
  const result: Visit[] = [];
  for (const state of states.filter(s => s.state === 'gap').sort((a,b) => a.due - b.due)) {
    const candidate = Math.max(today, state.due);
    const weekday = (day: number) => { const d = new Date(Date.UTC(2026, 9, 12 + day)).getUTCDay(); return d !== 0 && d !== 6; };
    let day = candidate;
    while (day >= today && (occupied.has(day) || !weekday(day))) day--;
    if (day < today) { day = candidate + 1; while (occupied.has(day) || !weekday(day)) day++; }
    occupied.add(day);
    result.push({ kitchen: kitchen.id, day, service: state.service, status: 'Due', crew: '', report: '' });
  }
  return result;
}

export const visitWindows: Record<VisitWindow, string> = { opening: 'Morning', afternoon: 'Afternoon', close: 'Evening' };
/** Find the visit occupying a technician's date and time, excluding an edited visit. */
export function technicianConflict(crew: string, day: number, window: VisitWindow | undefined, visits: readonly Visit[], exclude?: Visit): Visit | undefined {
  return visits.find(item => item !== exclude && item.crew === crew && item.day === day && item.window === window);
}
const preferredWindow: Record<Service, VisitWindow> = { air: 'close', water: 'opening', electrical: 'opening', lift: 'close', climate: 'afternoon', fire: 'afternoon' };
/** Select an available qualified technician, preferring the least-used crew that week. */
export function suggestCrew(service: Service, day: number, visits: readonly Visit[], technicians: readonly Technician[]) {
  const choices = technicians.filter(person => person.service === service);
  const monday = day - ((day % 7 + 7) % 7);
  const workload = (person: Technician) => visits.filter(visit => visit.crew === person.name && visit.day >= monday && visit.day < monday + 7).length;
  const windows: VisitWindow[] = ['opening', 'afternoon', 'close'];
  const preferred = preferredWindow[service];
  for (const window of [preferred, ...windows.filter(value => value !== preferred)]) {
    const available = choices.filter(person => !visits.some(visit => visit.crew === person.name && visit.day === day && visit.window === window));
    if (available.length) return { crew: available.slice().sort((a,b) => workload(a) - workload(b))[0].name, window };
  }
  return { crew: choices.slice().sort((a,b) => workload(a) - workload(b))[0]?.name ?? '', window: preferred };
}
/** Check contract, duplicate booking, calendar and technician conflicts before saving. */
export function bookingError(draft: Visit, kitchens: readonly Kitchen[], visits: readonly Visit[], technicians: readonly Technician[], exclude?: Visit): string | null {
  const kitchen = kitchens.find(item => item.id === draft.kitchen);
  if (!kitchen) return 'Pick the site to visit.';
  if (!kitchen.services.includes(draft.service)) return 'Pick a service for this site.';
  const existing = visits.find(item => item !== exclude && item.kitchen === kitchen.id && item.service === draft.service && item.status !== 'Completed');
  if (existing) return 'This service already has an open visit. Move that visit instead.';
  if (!Number.isFinite(draft.day) || draft.day < today) return 'Pick today or a later day.';
  if (visits.some(item => item !== exclude && item.kitchen === kitchen.id && item.day === draft.day)) return `${kitchen.label} already has a visit that day.`;
  if (!technicians.some(person => person.name === draft.crew && person.service === draft.service)) return 'Pick a technician certified for this service.';
  const clash = technicianConflict(draft.crew, draft.day, draft.window, visits, exclude);
  if (clash) return `${draft.crew} is at ${kitchens.find(item => item.id === clash.kitchen)?.label ?? 'another site'} then. Pick another time or technician.`;
  return null;
}

/** Plan bulk bookings without mutating the schedule, checking each accepted
 * booking against both the existing visits and the rest of this batch. */
export function planDueBookings(due: readonly Visit[], kitchens: readonly Kitchen[], visits: readonly Visit[], technicians: readonly Technician[]) {
  const bookings: Visit[] = [];
  const skipped: { visit: Visit; reason: string }[] = [];
  const scheduled = [...visits];
  for (const visit of due) {
    const suggestion = suggestCrew(visit.service, visit.day, scheduled, technicians);
    const booking: Visit = { ...visit, ...suggestion, status: 'Awaiting', notes: '' };
    const reason = bookingError(booking, kitchens, scheduled, technicians);
    if (reason) skipped.push({ visit, reason });
    else {
      bookings.push(booking);
      scheduled.push(booking);
    }
  }
  return { bookings, skipped };
}

/** Validate a kitchen contract before adding it to the schedule. */
export function kitchenError(draft: Kitchen, kitchens: readonly Kitchen[], managers: readonly string[]): string | null {
  const name = draft.label.trim();
  if (!name) return "Add the site's name.";
  if (name.length > 40) return 'Keep the name under 40 characters.';
  if (kitchens.some(item => item.id !== draft.id && item.label.trim().toLowerCase() === name.toLowerCase())) return 'Another site already has this name.';
  if (!draft.address?.trim()) return 'Add the street address the crews drive to.';
  if (!managers.includes(draft.manager)) return 'Pick the area manager who hosts visits.';
  if (!draft.services.length) return 'Keep at least one service in the plan.';
  if (Object.values(draft.priorDone).some(day => day != null && day > today)) return 'Last-done dates cannot be in the future.';
  return null;
}

/** Derived plan details use the same full history as the coverage calculation. */
export function kitchenPlan(kitchen: Kitchen, visits: readonly Visit[]) {
  return serviceStates(kitchen, visits).map(state => {
    const matching = visits.filter(visit => visit.kitchen === kitchen.id && visit.service === state.service);
    const lastDone = latestCompletion(kitchen, state.service, matching);
    const booked = matching.filter(visit => !['Completed', 'Due', 'Missed'].includes(visit.status) && visit.day >= today).sort((a,b) => a.day - b.day)[0];
    const missed = matching.filter(visit => !['Completed', 'Due'].includes(visit.status) && (visit.day < today || visit.status === 'Missed')).sort((a,b) => b.day - a.day)[0];
    return { ...state, lastDone, next: booked ?? (missed && (lastDone == null || missed.day > lastDone) ? missed : undefined) };
  });
}
