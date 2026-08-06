import { dispatchByEvent, type ColumnRegular, type DataType } from '@revolist/revogrid';
import { ROW_MASTER, type RowMasterConfig, type TreeConfig } from '@revolist/revogrid-pro';

export type MasterProjectRow = DataType & {
  id: string;
  parentId: string | null;
  name: string;
  type: 'Portfolio' | 'Program' | 'Project';
  owner: string;
  status: 'On Track' | 'At Risk' | 'Planning';
  budget: string;
  timeline: string;
  progress: number;
  summary: string;
  milestones: string[];
  team: string[];
};

type ProjectDetail = {
  risk: string;
  nextReview: string;
  notes: string;
};

const MASTER_ROWS: MasterProjectRow[] = [
  {
    id: 'north-star', parentId: null, name: 'North Star Operations', type: 'Portfolio', owner: 'Avery Brooks', status: 'On Track', budget: '$4.8M', timeline: 'Q1–Q4', progress: 72,
    summary: 'Executive portfolio for service reliability, fulfillment speed, and customer experience programs.',
    milestones: ['Quarterly roadmap locked', 'Regional launch teams staffed', 'Portfolio steering cadence active'],
    team: ['Avery Brooks', 'Mina Chen', 'Owen Park'],
  },
  {
    id: 'fulfillment', parentId: 'north-star', name: 'Fulfillment Modernization', type: 'Program', owner: 'Mina Chen', status: 'On Track', budget: '$1.9M', timeline: 'Feb–Oct', progress: 68,
    summary: 'Coordinates warehouse routing, inventory visibility, and shipment exception workstreams.',
    milestones: ['Slotting model deployed', 'Carrier exception feed live', 'Pilot warehouses trained'],
    team: ['Mina Chen', 'Sam Rivera', 'Priya Shah'],
  },
  {
    id: 'warehouse-routing', parentId: 'fulfillment', name: 'Warehouse Routing Console', type: 'Project', owner: 'Sam Rivera', status: 'On Track', budget: '$620K', timeline: 'Mar–Jul', progress: 82,
    summary: 'A live console that lets operations redirect orders before pick-pack handoff.',
    milestones: ['Route simulation approved', 'Supervisor workflow shipped', 'Live pilot at Lisbon hub'],
    team: ['Sam Rivera', 'Nora Ellis', 'Kai Novak'],
  },
  {
    id: 'inventory-pulse', parentId: 'fulfillment', name: 'Inventory Pulse', type: 'Project', owner: 'Priya Shah', status: 'At Risk', budget: '$480K', timeline: 'Apr–Sep', progress: 49,
    summary: 'Near-real-time stock confidence scoring for store and warehouse planners.',
    milestones: ['Signal contract finalized', 'Backfill quality review pending', 'Planner preview scheduled'],
    team: ['Priya Shah', 'Diego Costa', 'Lena Ortiz'],
  },
  {
    id: 'customer-care', parentId: 'north-star', name: 'Customer Care Intelligence', type: 'Program', owner: 'Owen Park', status: 'Planning', budget: '$1.3M', timeline: 'May–Dec', progress: 34,
    summary: 'Improves support triage with account context, sentiment, and escalation recommendations.',
    milestones: ['Conversation taxonomy drafted', 'Escalation model in review', 'Agent pilot candidates selected'],
    team: ['Owen Park', 'Iris Morgan', 'Theo Grant'],
  },
  {
    id: 'case-prioritization', parentId: 'customer-care', name: 'Case Prioritization', type: 'Project', owner: 'Iris Morgan', status: 'Planning', budget: '$390K', timeline: 'Jun–Oct', progress: 28,
    summary: 'Ranks inbound cases by customer impact, service-level risk, and account history.',
    milestones: ['Priority rubric approved', 'Historical labels sampled', 'Agent feedback loop designed'],
    team: ['Iris Morgan', 'Marco Silva', 'Rhea Patel'],
  },
  {
    id: 'service-recovery', parentId: 'customer-care', name: 'Service Recovery Studio', type: 'Project', owner: 'Theo Grant', status: 'On Track', budget: '$510K', timeline: 'May–Nov', progress: 57,
    summary: 'Guided recovery actions for refunds, replacements, and proactive follow-ups.',
    milestones: ['Policy matrix mapped', 'Offer composer prototype ready', 'Compliance review started'],
    team: ['Theo Grant', 'Hana Lee', 'Marta Nowak'],
  },
  {
    id: 'revenue-engine', parentId: null, name: 'Revenue Enablement', type: 'Portfolio', owner: 'Leah Stone', status: 'On Track', budget: '$3.2M', timeline: 'Q2–Q4', progress: 61,
    summary: 'Portfolio for pricing operations, partner channels, and contract-to-cash improvements.',
    milestones: ['Commercial council launched', 'Field enablement calendar approved', 'Revenue metrics baseline published'],
    team: ['Leah Stone', 'Jon Bell', 'Alina Petrova'],
  },
  {
    id: 'pricing-ops', parentId: 'revenue-engine', name: 'Pricing Operations', type: 'Program', owner: 'Jon Bell', status: 'At Risk', budget: '$940K', timeline: 'Apr–Nov', progress: 46,
    summary: 'Standardizes discount governance, approval routing, and margin guardrails.',
    milestones: ['Discount policy drafted', 'Exception queue prototype live', 'Finance approval rules pending'],
    team: ['Jon Bell', 'Fatima Noor', 'Chris Allen'],
  },
  {
    id: 'quote-health', parentId: 'pricing-ops', name: 'Quote Health Monitor', type: 'Project', owner: 'Fatima Noor', status: 'On Track', budget: '$310K', timeline: 'May–Aug', progress: 66,
    summary: 'Detects stalled quotes, missing approvals, and risky commercial terms before close.',
    milestones: ['SLA alerts shipped', 'Margin rule pack tested', 'Sales pilot in progress'],
    team: ['Fatima Noor', 'Nico Ward', 'Beth Kim'],
  },
  {
    id: 'partner-portal', parentId: 'revenue-engine', name: 'Partner Portal Refresh', type: 'Program', owner: 'Alina Petrova', status: 'Planning', budget: '$780K', timeline: 'Jun–Dec', progress: 22,
    summary: 'Modernizes partner onboarding, deal registration, and enablement asset discovery.',
    milestones: ['Partner interviews completed', 'Content audit underway', 'Identity model selected'],
    team: ['Alina Petrova', 'Mateo Ruiz', 'Sarah Klein'],
  },
  {
    id: 'deal-registration', parentId: 'partner-portal', name: 'Deal Registration Flow', type: 'Project', owner: 'Mateo Ruiz', status: 'Planning', budget: '$260K', timeline: 'Jul–Oct', progress: 18,
    summary: 'Guided partner submission flow with duplicate detection and channel conflict checks.',
    milestones: ['Workflow map approved', 'Duplicate matching design ready', 'Sandbox integration planned'],
    team: ['Mateo Ruiz', 'Eli Foster', 'Nina White'],
  },
  {
    id: 'platform-resilience', parentId: null, name: 'Platform Resilience', type: 'Portfolio', owner: 'Nadia Singh', status: 'On Track', budget: '$2.6M', timeline: 'Q1–Q3', progress: 77,
    summary: 'Reliability work across incident response, capacity planning, and dependency visibility.',
    milestones: ['Reliability review operating', 'Critical service tiers published', 'Capacity forecast cadence active'],
    team: ['Nadia Singh', 'Victor Chen', 'Julia Adams'],
  },
  {
    id: 'incident-command', parentId: 'platform-resilience', name: 'Incident Command Center', type: 'Program', owner: 'Victor Chen', status: 'On Track', budget: '$860K', timeline: 'Feb–Sep', progress: 74,
    summary: 'Centralizes incident intake, escalation paths, and executive communications.',
    milestones: ['Severity model revised', 'War-room automation live', 'Postmortem templates adopted'],
    team: ['Victor Chen', 'Amara Okafor', 'Luis Garcia'],
  },
];

export function createMasterRows(): MasterProjectRow[] {
  return MASTER_ROWS.map(row => ({ ...row, milestones: [...row.milestones], team: [...row.team] }));
}

export function createMasterTreeConfig(): TreeConfig {
  return { idField: 'id', parentIdField: 'parentId', rootParentId: null, expandAll: true };
}

function hasProjectChildren(rows: MasterProjectRow[], row: MasterProjectRow) {
  return rows.some(item => item.parentId === row.id);
}

export function createMasterColumns(rows: MasterProjectRow[]): ColumnRegular[] {
  const initiativeCellTemplate: Required<ColumnRegular>['cellTemplate'] = (h, data) => {
    const row = data.model as MasterProjectRow;
    const children = [h('span', { class: 'row-master-initiative__name' }, row.name)];

    if (!hasProjectChildren(rows, row)) {
      children.unshift(h('button', {
        class: { 'expand-button': true, 'row-master-initiative__expand': true },
        title: `Open details for ${row.name}`,
        'aria-label': `Open details for ${row.name}`,
        onMouseDown(event: MouseEvent) { event.preventDefault(); },
        onClick(event: MouseEvent) { dispatchByEvent(event, ROW_MASTER, data); },
      }));
    }

    return h('span', { class: 'row-master-initiative' }, children);
  };

  return [
    { name: 'Initiative', prop: 'name', size: 340, tree: true, cellTemplate: initiativeCellTemplate },
    { name: 'Type', prop: 'type', size: 110 },
    { name: 'Owner', prop: 'owner', size: 150 },
    { name: 'Status', prop: 'status', size: 110 },
    { name: 'Progress', prop: 'progress', size: 100 },
    { name: 'Budget', prop: 'budget', size: 100 },
    { name: 'Timeline', prop: 'timeline', size: 120 },
    { name: 'Summary', prop: 'summary', size: 320 },
  ];
}

function statusToken(status: MasterProjectRow['status']) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function fetchProjectDetail(row: MasterProjectRow, delayMs: number): Promise<ProjectDetail> {
  return new Promise(resolve => {
    window.setTimeout(() => resolve({
      risk: row.status === 'At Risk'
        ? 'Delivery quality gates need executive attention.'
        : row.status === 'Planning'
          ? 'Scope and staffing are still being finalized.'
          : 'No blocking risks reported this week.',
      nextReview: row.type === 'Portfolio' ? 'Friday steering review' : 'Tuesday delivery sync',
      notes: `${row.progress}% complete with ${row.team.length} accountable leads assigned.`,
    }), delayMs);
  });
}

export function createMasterRowConfig(delayMs = 500): RowMasterConfig {
  return {
    rowHeight: 340,
    template: (h, data) => {
      const row = data.model as MasterProjectRow;
      let panelElement: HTMLElement | undefined;
      let resolvedDetail: ProjectDetail | undefined;

      const applyDetail = (detail: ProjectDetail) => {
        resolvedDetail = detail;
        if (!panelElement) return;
        panelElement.querySelector('[data-master-loading]')?.remove();
        const detailElement = panelElement.querySelector<HTMLElement>('[data-master-remote]');
        if (!detailElement) return;
        detailElement.innerHTML = `
          <div class="row-master-remote__content">
            <div class="row-master-insight row-master-insight--risk"><span>Risk</span><strong>${detail.risk}</strong></div>
            <div class="row-master-insight"><span>Next review</span><strong>${detail.nextReview}</strong></div>
            <div class="row-master-insight"><span>Notes</span><strong>${detail.notes}</strong></div>
          </div>`;
      };

      void fetchProjectDetail(row, delayMs).then(applyDetail);

      return h('div', {
        class: 'row-master-panel',
        ref: (element?: HTMLElement) => {
          panelElement = element;
          if (resolvedDetail) applyDetail(resolvedDetail);
        },
      }, [
        h('section', { class: 'row-master-hero' }, [
          h('div', { class: 'row-master-kicker' }, 'Master detail'),
          h('div', { class: 'row-master-title-row' }, [
            h('strong', { class: 'row-master-title' }, row.name),
            h('span', { class: `row-master-badge row-master-badge--${statusToken(row.status)}` }, row.status),
          ]),
          h('p', { class: 'row-master-summary' }, row.summary),
          h('div', { class: 'row-master-progress' }, [
            h('div', { class: 'row-master-progress__header' }, [h('span', {}, 'Progress'), h('strong', {}, `${row.progress}%`)]),
            h('div', { class: 'row-master-progress__track' }, [h('span', { class: 'row-master-progress__bar', style: { width: `${row.progress}%` } })]),
          ]),
          h('div', { class: 'row-master-badges' }, [
            h('span', { class: 'row-master-badge row-master-badge--type' }, row.type),
            h('span', { class: 'row-master-badge' }, `Owner: ${row.owner}`),
            h('span', { class: 'row-master-badge' }, `Timeline: ${row.timeline}`),
            h('span', { class: 'row-master-badge' }, `Budget: ${row.budget}`),
          ]),
        ]),
        h('section', { class: 'row-master-side' }, [
          h('div', { class: 'row-master-section' }, [
            h('div', { class: 'row-master-kicker' }, 'Milestones'),
            h('ul', { class: 'row-master-milestones' }, row.milestones.map(item => h('li', {}, item))),
            h('div', { 'data-master-remote': true, class: 'row-master-remote' }),
          ]),
          h('div', { class: 'row-master-section' }, [
            h('div', { class: 'row-master-kicker' }, 'Team'),
            h('div', { class: 'row-master-team' }, row.team.map(member => h('span', { class: 'row-master-team__member' }, member))),
          ]),
        ]),
        h('div', { 'data-master-loading': true, class: 'row-master-loader' }, [
          h('span', { class: 'row-master-loader__spinner' }),
          h('span', {}, 'Loading project details…'),
        ]),
      ]);
    },
  };
}
