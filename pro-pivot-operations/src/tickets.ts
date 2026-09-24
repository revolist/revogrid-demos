export type TicketPriority = 'Critical' | 'High' | 'Normal' | 'Low';
export type TicketTeam = 'Platform' | 'Payments' | 'Accounts' | 'Integrations';
export type SlaStatus = 'Met' | 'Breached' | 'Open';

export interface Ticket {
  'Ticket ID': string;
  Team: TicketTeam;
  Priority: TicketPriority;
  Category: string;
  'Opened At': string;
  'Resolved At': string | null;
  'Resolution Hours': number | null;
  'SLA Status': SlaStatus;
  'Ticket Count': number;
  'SLA Breach Count': number;
}

export const TEAMS: TicketTeam[] = ['Platform', 'Payments', 'Accounts', 'Integrations'];
export const PRIORITIES: TicketPriority[] = ['Critical', 'High', 'Normal', 'Low'];
const CATEGORIES = ['Incident', 'Configuration', 'Billing', 'API', 'Access', 'Performance'];
const SLA_HOURS: Record<TicketPriority, number> = { Critical: 8, High: 24, Normal: 72, Low: 120 };

/** Fixed UTC dates and arithmetic make the fixture repeatable across browsers and time zones. */
export function createTickets(count = 480): Ticket[] {
  return Array.from({ length: count }, (_, index) => {
    const priority = PRIORITIES[Math.floor(index / 3) % PRIORITIES.length];
    const opened = new Date(Date.UTC(2025, 0, 1 + (index % 365), 8 + (index % 9)));
    const open = index % 11 === 0;
    const hours = open ? null : 2 + ((index * 17) % 146);
    return {
      'Ticket ID': `SUP-${String(index + 1).padStart(5, '0')}`,
      Team: TEAMS[index % TEAMS.length],
      Priority: priority,
      Category: CATEGORIES[(index * 7) % CATEGORIES.length],
      'Opened At': opened.toISOString(),
      'Resolved At': hours === null ? null : new Date(opened.getTime() + hours * 3_600_000).toISOString(),
      'Resolution Hours': hours,
      'SLA Status': hours === null ? 'Open' : hours > SLA_HOURS[priority] ? 'Breached' : 'Met',
      'Ticket Count': 1,
      'SLA Breach Count': hours !== null && hours > SLA_HOURS[priority] ? 1 : 0,
    };
  });
}

export interface TicketScope {
  team: TicketTeam | 'All';
  priority: TicketPriority | 'All';
}

export function ticketsInScope(tickets: Ticket[], scope: TicketScope): Ticket[] {
  return tickets.filter(ticket =>
    (scope.team === 'All' || ticket.Team === scope.team) &&
    (scope.priority === 'All' || ticket.Priority === scope.priority),
  );
}

/** Resolve the public Pivot row/column axis paths for this fixed Team × Priority report. */
export function ticketsForPivotCell(
  source: Ticket[],
  cell: { rowPath: readonly unknown[]; columnPath: readonly unknown[] },
): Ticket[] {
  const { rowPath, columnPath } = cell;
  if (rowPath.length > 1 || columnPath.length > 1) return [];
  const team = rowPath[0];
  const priority = columnPath[0];
  if (team !== undefined && !TEAMS.includes(team as TicketTeam)) return [];
  if (priority !== undefined && !PRIORITIES.includes(priority as TicketPriority)) return [];
  return source.filter(ticket =>
    (team === undefined || ticket.Team === team) &&
    (priority === undefined || ticket.Priority === priority),
  );
}

export function pageTickets(tickets: Ticket[], page: number, pageSize: number): Ticket[] {
  return tickets.slice(page * pageSize, (page + 1) * pageSize);
}

/** Open tickets have no resolution time and must not lower the resolved-ticket average. */
export function averageResolvedHours(values: Array<number | null | undefined>): number | undefined {
  const resolved = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return resolved.length ? resolved.reduce((sum, value) => sum + value, 0) / resolved.length : undefined;
}

export function summarizeTickets(tickets: Ticket[]) {
  const resolved = tickets.filter(ticket => ticket['Resolution Hours'] !== null);
  return {
    count: tickets.length,
    open: tickets.length - resolved.length,
    breached: tickets.reduce((sum, ticket) => sum + ticket['SLA Breach Count'], 0),
    averageResolutionHours: averageResolvedHours(resolved.map(ticket => ticket['Resolution Hours'])) ?? null,
  };
}

export const TICKETS = createTickets();
