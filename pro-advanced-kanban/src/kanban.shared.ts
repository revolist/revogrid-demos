import type { ColumnRegular, DataType } from '@revolist/revogrid';
import type { KanbanConfig } from '@revolist/revogrid-enterprise';
import { avatarTemplate } from '@revolist/revogrid-pro';

export type KanbanShowcaseCard = DataType & {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'progress' | 'review' | 'done';
  team: 'Product' | 'Platform';
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
  points: number;
  order: number;
};

export const KANBAN_SHOWCASE_ROWS: KanbanShowcaseCard[] = [
  { id: 'KAN-101', title: 'Customer interview synthesis', description: 'Turn research notes into opportunity themes.', status: 'backlog', team: 'Product', owner: 'Maya', priority: 'High', points: 5, order: 1000 },
  { id: 'KAN-102', title: 'Define activation metric', description: 'Agree on the first-value milestone and reporting.', status: 'backlog', team: 'Product', owner: 'Jon', priority: 'Medium', points: 3, order: 2000 },
  { id: 'KAN-103', title: 'Responsive board shell', description: 'Polish column sizing and compact breakpoints.', status: 'progress', team: 'Product', owner: 'Ari', priority: 'High', points: 8, order: 1000 },
  { id: 'KAN-104', title: 'Empty-state copy', description: 'Create helpful guidance for empty workflow stages.', status: 'review', team: 'Product', owner: 'Maya', priority: 'Low', points: 2, order: 1000 },
  { id: 'KAN-105', title: 'Release notes', description: 'Document keyboard movement and WIP behavior.', status: 'done', team: 'Product', owner: 'Jon', priority: 'Medium', points: 3, order: 1000 },
  { id: 'KAN-201', title: 'Persist fractional ranks', description: 'Store stable card order after cross-column moves.', status: 'backlog', team: 'Platform', owner: 'Nora', priority: 'High', points: 5, order: 1000 },
  { id: 'KAN-202', title: 'Drag telemetry', description: 'Measure successful, blocked, and canceled moves.', status: 'progress', team: 'Platform', owner: 'Theo', priority: 'Medium', points: 5, order: 1000 },
  { id: 'KAN-203', title: 'Touch interaction QA', description: 'Validate pointer capture and edge auto-scroll.', status: 'progress', team: 'Platform', owner: 'Nora', priority: 'High', points: 8, order: 2000 },
  { id: 'KAN-204', title: 'Provider cleanup audit', description: 'Verify view teardown preserves host-owned plugins.', status: 'review', team: 'Platform', owner: 'Iris', priority: 'High', points: 3, order: 1000 },
  { id: 'KAN-205', title: '5k-card benchmark', description: 'Track bounded DOM and virtual-stack performance.', status: 'done', team: 'Platform', owner: 'Theo', priority: 'Low', points: 5, order: 1000 },
];

export const KANBAN_SHOWCASE_COLUMNS: ColumnRegular[] = [
  { prop: 'id', name: 'ID', size: 100 },
  { prop: 'title', name: 'Title', size: 260 },
  { prop: 'status', name: 'Status', size: 120 },
  { prop: 'team', name: 'Team', size: 120 },
  { prop: 'owner', name: 'Owner', size: 110 },
  { prop: 'priority', name: 'Priority', size: 100 },
  { prop: 'points', name: 'Points', size: 90 },
];

export function resolveKanbanRows(rows?: KanbanShowcaseCard[]): KanbanShowcaseCard[] {
  return Array.isArray(rows) && rows.length ? rows : KANBAN_SHOWCASE_ROWS;
}

const PRIORITY_TONE: Record<KanbanShowcaseCard['priority'], string> = {
  High: 'critical',
  Medium: 'attention',
  Low: 'calm',
};

const OWNER_AVATAR_INDEX: Record<string, number> = {
  Maya: 2,
  Jon: 3,
  Ari: 0,
  Nora: 6,
  Theo: 4,
  Iris: 7,
};

export function createKanbanShowcaseConfig(): KanbanConfig<KanbanShowcaseCard> {
  return {
    columns: [
      { id: 'backlog', title: 'Backlog', width: 270 },
      { id: 'progress', title: 'In progress', width: 270, wipLimit: 4 },
      { id: 'review', title: 'Review', width: 270, wipLimit: 2 },
      { id: 'done', title: 'Done', width: 270 },
    ],
    swimlaneField: 'team',
    swimlanes: [
      { id: 'Product', title: 'Product team', collapsible: true },
      { id: 'Platform', title: 'Platform team', collapsible: true, wipLimits: { review: 1 } },
    ],
    swimlaneColumn: { collapsible: true, width: 210, collapsedWidth: 52 },
    contextMenu: {
      hidden: { open: true, edit: true, create: true, delete: true },
    },
    card: { titleField: 'title', descriptionField: 'description' },
    cardRules: [{
      id: 'high-priority',
      when: ({ card }) => card.priority === 'High',
      result: {
        className: 'kanban-showcase-card--high',
        style: { 'border-left': '3px solid #ef4444' },
        badges: [{ label: 'High priority', className: 'kanban-showcase-priority' }],
      },
    }],
    customization: {
      columnHeader: (h, { column }) => h('div', { class: 'kanban-showcase-column-heading' }, [
        h('span', { class: `kanban-showcase-column-dot kanban-showcase-column-dot--${column.id}` }),
        h('span', { class: 'kanban-showcase-column-title' }, column.title),
      ]),
      swimlaneHeader: (h, { swimlane }) => h('div', { class: 'kanban-showcase-lane-heading' }, [
        h('span', { class: 'kanban-showcase-lane-kicker' }, 'TEAM'),
        h('strong', { class: 'kanban-showcase-lane-title' }, swimlane.title),
      ]),
      cardContent: (h, { card }) => h('div', { class: 'kanban-showcase-card-content' }, [
        h('div', { class: 'kanban-showcase-card-topline' }, [
          h('span', { class: 'kanban-showcase-card-id' }, card.id),
          h('span', { class: `kanban-showcase-priority kanban-showcase-priority--${PRIORITY_TONE[card.priority]}` }, [
            h('span', { class: 'kanban-showcase-priority__dot' }),
            card.priority,
          ]),
        ]),
        h('strong', { class: 'kanban-showcase-card-title' }, card.title),
        h('p', {}, card.description),
        h('div', { class: 'kanban-showcase-card-meta' }, [
          h('span', { class: 'kanban-showcase-owner' }, [
            avatarTemplate(h, {
              ariaLabel: card.owner,
              className: 'kanban-showcase-owner__avatar',
              index: OWNER_AVATAR_INDEX[card.owner] ?? 0,
              label: card.owner,
              size: 20,
              value: card.owner,
            }),
            h('span', {}, card.owner),
          ]),
          h('span', { class: 'kanban-showcase-points', title: 'Story points' }, `${card.points} pts`),
        ]),
      ]),
    },
    labels: { emptyColumn: 'Drop a card here' },
    cardRowHeight: 176,
    wipBehavior: 'warn',
  };
}
