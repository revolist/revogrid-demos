import type { ColumnRegular, HyperFunc, VNode } from '@revolist/revogrid';

export interface ProjectRow { id: number; department: string; status: string; project: string; owner: string; progress: number; budget: number; target: string; risk: string; }

const projects = [
  ['Product','On track','Mobile onboarding','Priya Shah',82,180000,'Sep 18','Low'], ['Product','At risk','Pricing experiments','Owen Reed',54,120000,'Oct 04','High'], ['Product','Planning','Insights workspace','Maya Chen',18,220000,'Dec 12','Medium'],
  ['Engineering','On track','Grid rendering v5','Noah Williams',76,340000,'Sep 30','Medium'], ['Engineering','On track','Plugin SDK','Ava Martin',68,210000,'Oct 21','Low'], ['Engineering','At risk','Identity migration','Liam Jones',47,260000,'Nov 08','High'], ['Engineering','Planning','Offline cache','Ethan Brown',12,150000,'Jan 16','Low'],
  ['Design','On track','Design system refresh','Sofia Rossi',91,95000,'Aug 29','Low'], ['Design','Planning','Accessibility audit','Lucas Silva',24,80000,'Oct 11','Medium'], ['Design','At risk','Charting language','Emma Wilson',43,110000,'Nov 15','Medium'],
  ['Marketing','On track','Developer campaign','Amelia Davis',71,175000,'Sep 26','Low'], ['Marketing','At risk','Partner launch','Leo Garcia',58,140000,'Oct 18','High'], ['Marketing','Planning','Customer stories','Mia Taylor',21,90000,'Dec 06','Low'],
  ['Operations','On track','Support automation','James Miller',86,125000,'Sep 06','Low'], ['Operations','On track','Vendor consolidation','Isla Anderson',64,200000,'Oct 25','Medium'], ['Operations','Planning','Security readiness','Henry Thomas',30,185000,'Nov 29','Medium'],
  ['Data','On track','Usage scorecards','Grace Lee',79,165000,'Sep 20','Low'], ['Data','At risk','Warehouse migration','Jack White',51,310000,'Nov 01','High'], ['Data','Planning','Forecasting model','Chloe Harris',16,195000,'Jan 09','Medium'],
] as const;

export const PROJECTS: ProjectRow[] = projects.map((project, index) => ({ id: index + 1, department: project[0], status: project[1], project: project[2], owner: project[3], progress: project[4], budget: project[5], target: project[6], risk: project[7] }));

function statusTemplate(h: HyperFunc<VNode>, { value }: { value: string }) { return h('span', { class: `portfolio-pill portfolio-${value.toLowerCase().replace(' ', '-')}` }, value); }
function progressTemplate(h: HyperFunc<VNode>, { value }: { value: number }) { return h('div', { class: 'portfolio-progress' }, [h('span', { class: 'portfolio-progress-track' }, h('i', { style: { width: `${value}%` } })), h('strong', {}, `${value}%`)]); }
function budgetTemplate(_h: HyperFunc<VNode>, { value }: { value: number }) { return `$${Math.round(value / 1000)}k`; }
function riskTemplate(h: HyperFunc<VNode>, { value }: { value: string }) { return h('span', { class: `portfolio-risk portfolio-risk-${value.toLowerCase()}` }, [h('i'), value]); }

export const PROJECT_COLUMNS: ColumnRegular[] = [
  { name: 'Project', prop: 'project', size: 250, sortable: true },
  { name: 'Owner', prop: 'owner', size: 170, sortable: true },
  { name: 'Progress', prop: 'progress', size: 190, sortable: true, cellTemplate: progressTemplate },
  { name: 'Status', prop: 'status', size: 135, sortable: true, cellTemplate: statusTemplate },
  { name: 'Budget', prop: 'budget', size: 110, sortable: true, cellTemplate: budgetTemplate },
  { name: 'Target', prop: 'target', size: 110, sortable: true },
  { name: 'Risk', prop: 'risk', size: 105, sortable: true, cellTemplate: riskTemplate },
];

export function createGrouping(expandedAll: boolean) { return { props: ['department', 'status'], prevExpanded: {}, expandedAll }; }
export const TOTAL_BUDGET = PROJECTS.reduce((total, project) => total + project.budget, 0);
