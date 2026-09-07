import type { PlanningTask } from './types';

export type PlanningPerson = { readonly id: string; readonly name: string; readonly role: string; readonly avatarUrl?: string; readonly color?: string };
export const planningPeople: readonly PlanningPerson[] = [
  { id: 'Ava', name: 'Ava', role: 'Design', color: '#4f46e5' },
  { id: 'Noah', name: 'Noah', role: 'Engineering', color: '#0891b2' },
  { id: 'Leo', name: 'Leo', role: 'QA', color: '#16a34a' },
  { id: 'Maya', name: 'Maya', role: 'Product', color: '#008b55' },
  { id: 'Nina', name: 'Nina', role: 'Security', color: '#7c3aed' },
];

function createAvatarDataUrl(name: string, color: string): string {
  const initial = name.trim().slice(0, 1).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="32" y="34" fill="white" font-family="Arial,sans-serif" font-size="26" font-weight="600" text-anchor="middle" dominant-baseline="middle">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getOwnerAvatar(owner: string): string {
  const person = planningPeople.find(({ id }) => id === owner);
  if (!person) return owner;
  return person.avatarUrl ?? createAvatarDataUrl(person.name, person.color ?? '#64748b');
}

/** A stable native-avatar color index for grid cells and selection filters. */
export function getOwnerAvatarIndex(owner: string): number {
  const index = planningPeople.findIndex(({ id }) => id === owner);
  return index >= 0 ? index + 1 : 1;
}

export function createTasks(): PlanningTask[] {
  const names = [
    'Define requirements', 'Design system', 'API integration', 'Authentication', 'Invoice templates',
    'Payment settings', 'Historical data import', 'Role permissions', 'Analytics dashboard', 'Export reports',
    'Notification center', 'Subscription management', 'Data synchronization', 'Accessibility review', 'Account preferences',
    'Search indexing', 'Usage reporting', 'Audit trail', 'Customer onboarding', 'Workspace settings',
    'Webhook delivery', 'Bulk actions', 'Error monitoring', 'Session management', 'Performance audit',
    'Team invitations', 'Account recovery', 'Email templates', 'Tax settings', 'Invoice history',
    'Payment methods', 'Billing address', 'Plan upgrade', 'Renewal reminders', 'Refund workflow',
    'Credit notes', 'Revenue metrics', 'Usage limits', 'User directory', 'Activity feed',
    'Backup policy', 'Data retention', 'Approval workflow', 'Document storage', 'Release checklist',
    'QA automation', 'API documentation', 'Staging rollout', 'Security review', 'Launch readiness',
    'Customer research', 'Journey mapping', 'Design QA', 'Component library', 'Mobile navigation',
    'Search relevance', 'Account provisioning', 'Permissions audit', 'SSO configuration', 'Data migration',
    'Invoice reconciliation', 'Payment retries', 'Tax calculation', 'Revenue recognition', 'Subscription pause',
    'Usage alerts', 'Cost allocation', 'Forecast model', 'Monthly close', 'Finance dashboard',
    'Incident runbook', 'Load testing', 'Observability setup', 'Database indexing', 'Cache strategy',
    'Accessibility testing', 'Localization review', 'Content migration', 'Legal review', 'Privacy controls',
    'Release notes', 'Feature flags', 'Beta program', 'Support training', 'Launch communications',
    'Post-launch review', 'Customer feedback', 'Roadmap planning', 'Operations handoff', 'Quarterly planning',
    'Design retrospective', 'Architecture review', 'Data quality audit', 'Workflow automation', 'Partner integration',
    'Mobile performance', 'Knowledge base', 'Customer success review', 'Platform hardening', 'Release readiness',
  ];
  const owners = ['Maya', 'Ava', 'Noah', 'Nina', 'Leo'] as const;
  const projects = ['customer-portal', 'billing-platform', 'internal-tools'] as const;
  const statuses = ['done', 'done', 'in-progress', 'blocked', 'not-started'] as const;
  const startPattern = [0, 0, 1, 0, 2, 2, 3, 1, 4, 3] as const;
  return names.map((name, index) => {
    const owner = owners[index % owners.length];
    const projectIndex = index % projects.length;
    const startOffset = Math.floor(index / startPattern.length) + startPattern[index % startPattern.length];
    const durationDays = [4, 3, 6, 2, 5][(index + projectIndex) % 5];
    const start = new Date(Date.UTC(2026, 8, 7 + startOffset, 8 + projectIndex));
    const end = new Date(Date.UTC(2026, 8, 7 + startOffset + durationDays - 1, 17));
    // Spread activity across the fixture weeks, weekdays, and working hours so
    // the Time Matrix has meaningful, deterministic groups to filter.
    const activityAt = new Date(Date.UTC(
      2026,
      8,
      7 + ((index * 3) % 21),
      [8, 9, 10, 11, 13, 14, 15, 16, 17][index % 9],
      [0, 15, 30, 45][index % 4],
    )).toISOString();
    const startDate = start.toISOString();
    const endDate = end.toISOString();
    // Cycle independently of ownership so each owner has a representative mix.
    const workflowStatus = statuses[(index + Math.floor(index / owners.length)) % statuses.length];
    const percentDone = workflowStatus === 'done' ? 100 : workflowStatus === 'not-started' ? 0 : 20 + ((index * 15) % 75);
    return { id: `task-${String(index + 1).padStart(3, '0')}`, name, owner, ownerAvatar: getOwnerAvatar(owner), ownerAvatarIndex: getOwnerAvatarIndex(owner), owners: [owner], ownerAvatars: [getOwnerAvatar(owner)], startDate, endDate, activityAt, duration: `${durationDays}d`, percentDone, order: (index + 1) * 1000, workflowStatus, priority: [500, 700, 900][index % 3], projectId: projects[projectIndex], budget: 1800 + index * 200 } as PlanningTask;
  });
}
