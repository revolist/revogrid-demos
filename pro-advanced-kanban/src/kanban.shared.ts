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
  assignees: string[];
  priority: 'High' | 'Medium' | 'Low';
  label: string;
  progress: number;
  dueDate: string;
  comments: number;
  attachments: number;
  points: number;
  order: number;
};

export const KANBAN_SHOWCASE_ROWS: KanbanShowcaseCard[] = [
  { id: 'KAN-101', title: 'Customer interview synthesis', description: 'Turn research notes into opportunity themes.', status: 'backlog', team: 'Product', owner: 'Maya', assignees: ['Maya', 'Ari'], priority: 'High', label: 'Research', progress: 20, dueDate: 'Aug 12', comments: 8, attachments: 3, points: 5, order: 1000 },
  { id: 'KAN-102', title: 'Define activation metric', description: 'Agree on the first-value milestone and reporting.', status: 'backlog', team: 'Product', owner: 'Jon', assignees: ['Jon', 'Maya'], priority: 'Medium', label: 'Growth', progress: 35, dueDate: 'Aug 15', comments: 5, attachments: 1, points: 3, order: 2000 },
  { id: 'KAN-103', title: 'Responsive board shell', description: 'Polish column sizing and compact breakpoints.', status: 'progress', team: 'Product', owner: 'Ari', assignees: ['Ari', 'Nora', 'Maya'], priority: 'High', label: 'Design system', progress: 72, dueDate: 'Aug 8', comments: 12, attachments: 4, points: 8, order: 1000 },
  { id: 'KAN-104', title: 'Empty-state copy', description: 'Create helpful guidance for empty workflow stages.', status: 'review', team: 'Product', owner: 'Maya', assignees: ['Maya', 'Jon'], priority: 'Low', label: 'Content', progress: 90, dueDate: 'Aug 6', comments: 3, attachments: 2, points: 2, order: 1000 },
  { id: 'KAN-105', title: 'Release notes', description: 'Document keyboard movement and WIP behavior.', status: 'done', team: 'Product', owner: 'Jon', assignees: ['Jon', 'Iris'], priority: 'Medium', label: 'Launch', progress: 100, dueDate: 'Aug 4', comments: 6, attachments: 2, points: 3, order: 1000 },
  { id: 'KAN-201', title: 'Persist fractional ranks', description: 'Store stable card order after cross-column moves.', status: 'backlog', team: 'Platform', owner: 'Nora', assignees: ['Nora', 'Theo'], priority: 'High', label: 'Infrastructure', progress: 15, dueDate: 'Aug 18', comments: 9, attachments: 1, points: 5, order: 1000 },
  { id: 'KAN-202', title: 'Drag telemetry', description: 'Measure successful, blocked, and canceled moves.', status: 'progress', team: 'Platform', owner: 'Theo', assignees: ['Theo', 'Iris'], priority: 'Medium', label: 'Analytics', progress: 64, dueDate: 'Aug 11', comments: 7, attachments: 3, points: 5, order: 1000 },
  { id: 'KAN-203', title: 'Touch interaction QA', description: 'Validate pointer capture and edge auto-scroll.', status: 'progress', team: 'Platform', owner: 'Nora', assignees: ['Nora', 'Ari', 'Theo'], priority: 'High', label: 'Mobile', progress: 48, dueDate: 'Aug 14', comments: 14, attachments: 5, points: 8, order: 2000 },
  { id: 'KAN-204', title: 'Provider cleanup audit', description: 'Verify view teardown preserves host-owned plugins.', status: 'review', team: 'Platform', owner: 'Iris', assignees: ['Iris', 'Nora'], priority: 'High', label: 'Reliability', progress: 88, dueDate: 'Aug 7', comments: 11, attachments: 2, points: 3, order: 1000 },
  { id: 'KAN-205', title: '5k-card benchmark', description: 'Track bounded DOM and virtual-stack performance.', status: 'done', team: 'Platform', owner: 'Theo', assignees: ['Theo', 'Nora'], priority: 'Low', label: 'Performance', progress: 100, dueDate: 'Aug 3', comments: 4, attachments: 4, points: 5, order: 1000 },
];

export const KANBAN_SHOWCASE_COLUMNS: ColumnRegular[] = [
  { prop: 'id', name: 'ID', size: 100 },
  { prop: 'title', name: 'Title', size: 260 },
  { prop: 'status', name: 'Status', size: 120 },
  { prop: 'team', name: 'Team', size: 120 },
  { prop: 'owner', name: 'Owner', size: 110 },
  { prop: 'priority', name: 'Priority', size: 100 },
  { prop: 'progress', name: 'Progress', size: 100 },
  { prop: 'dueDate', name: 'Due', size: 100 },
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
    idField: 'id',
    columnField: 'status',
    orderField: 'order',
    columns: [
      { prop: 'backlog', name: 'Backlog', size: 270 },
      { prop: 'progress', name: 'In progress', size: 270, wipLimit: 4 },
      { prop: 'review', name: 'Review', size: 270, wipLimit: 2 },
      { prop: 'done', name: 'Done', size: 270 },
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
        h('span', { class: `kanban-showcase-column-dot kanban-showcase-column-dot--${column.prop}` }),
        h('span', { class: 'kanban-showcase-column-title' }, column.name),
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
        h('div', { class: 'kanban-showcase-card-context' }, [
          h('span', { class: 'kanban-showcase-label' }, card.label),
          h('span', { class: 'kanban-showcase-due', title: `Due ${card.dueDate}` }, ['◷', card.dueDate]),
        ]),
        h('strong', { class: 'kanban-showcase-card-title' }, card.title),
        h('p', {}, card.description),
        h('div', { class: 'kanban-showcase-progress', title: `${card.progress}% complete` }, [
          h('span', { class: 'kanban-showcase-progress__copy' }, [
            h('span', {}, 'Progress'),
            h('strong', {}, `${card.progress}%`),
          ]),
          h('span', { class: 'kanban-showcase-progress__track' }, [
            h('span', { class: 'kanban-showcase-progress__bar', style: { width: `${card.progress}%` } }),
          ]),
        ]),
        h('div', { class: 'kanban-showcase-card-meta' }, [
          h('span', { class: 'kanban-showcase-avatar-stack', title: card.assignees.join(', ') }, card.assignees.map((assignee) => avatarTemplate(h, {
            ariaLabel: assignee,
            className: 'kanban-showcase-owner__avatar',
            index: OWNER_AVATAR_INDEX[assignee] ?? 0,
            label: assignee,
            size: 18,
            value: assignee,
          }))),
          h('span', { class: 'kanban-showcase-activity' }, [
            h('span', { title: `${card.comments} comments` }, ['◌', String(card.comments)]),
            h('span', { title: `${card.attachments} attachments` }, ['⌁', String(card.attachments)]),
            h('span', { class: 'kanban-showcase-points', title: 'Story points' }, `${card.points} pts`),
          ]),
        ]),
      ]),
    },
    labels: { emptyColumn: 'Drop a card here' },
    cardRowHeight: 228,
    wipBehavior: 'warn',
  };
}
