import type { ColumnProp } from '@revolist/revogrid';
import type { ColumnAddPopupSection, ColumnAddPopupTone } from '@revolist/revogrid-pro';
import banIcon from '@fortawesome/fontawesome-free/svgs/solid/ban.svg?raw';
import checkboxIcon from '@fortawesome/fontawesome-free/svgs/solid/square-check.svg?raw';
import checkIcon from '@fortawesome/fontawesome-free/svgs/solid/circle-check.svg?raw';
import collapseIcon from '@fortawesome/fontawesome-free/svgs/solid/compress.svg?raw';
import dateIcon from '@fortawesome/fontawesome-free/svgs/solid/calendar-days.svg?raw';
import eyeSlashIcon from '@fortawesome/fontawesome-free/svgs/solid/eye-slash.svg?raw';
import expandIcon from '@fortawesome/fontawesome-free/svgs/solid/expand.svg?raw';
import dropdownIcon from '@fortawesome/fontawesome-free/svgs/solid/list-ul.svg?raw';
import filesIcon from '@fortawesome/fontawesome-free/svgs/solid/paperclip.svg?raw';
import filterIcon from '@fortawesome/fontawesome-free/svgs/solid/filter.svg?raw';
import formulaIcon from '@fortawesome/fontawesome-free/svgs/solid/calculator.svg?raw';
import labelIcon from '@fortawesome/fontawesome-free/svgs/solid/tag.svg?raw';
import layerGroupIcon from '@fortawesome/fontawesome-free/svgs/solid/layer-group.svg?raw';
import linkIcon from '@fortawesome/fontawesome-free/svgs/solid/link.svg?raw';
import numberIcon from '@fortawesome/fontawesome-free/svgs/solid/hashtag.svg?raw';
import peopleIcon from '@fortawesome/fontawesome-free/svgs/solid/user-group.svg?raw';
import plusIcon from '@fortawesome/fontawesome-free/svgs/solid/plus.svg?raw';
import rocketIcon from '@fortawesome/fontawesome-free/svgs/solid/rocket.svg?raw';
import sortIcon from '@fortawesome/fontawesome-free/svgs/solid/sort.svg?raw';
import statusIcon from '@fortawesome/fontawesome-free/svgs/solid/circle-half-stroke.svg?raw';
import textIcon from '@fortawesome/fontawesome-free/svgs/solid/font.svg?raw';
import timelineIcon from '@fortawesome/fontawesome-free/svgs/solid/timeline.svg?raw';
import trashIcon from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw';
import type { ProjectBulkAction, ProjectGroupProp, ProjectPriority, ProjectRisk, ProjectSection, ProjectSortValue, ProjectStatus } from './types';

export type ProjectToolbarOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: string;
  tone?: ColumnAddPopupTone;
};

export type ProjectHideableColumnOption = {
  prop: ColumnProp;
  label: string;
  icon?: string;
  tone?: ColumnAddPopupTone;
};

export function createProjectColumnAddPopupSections(): ColumnAddPopupSection[] {
  return [
    {
      title: 'Essentials',
      items: [
        { id: 'status', label: 'Status', description: 'Color blocks for workflow state', icon: statusIcon, tone: 'green' },
        { id: 'dropdown', label: 'Dropdown', description: 'Single or multi choice values', icon: dropdownIcon, tone: 'red' },
        { id: 'text', label: 'Text', description: 'Flexible notes and names', icon: textIcon, tone: 'blue' },
        { id: 'date', label: 'Date', description: 'Deadlines and milestones', icon: dateIcon, tone: 'green' },
        { id: 'people', label: 'People', description: 'Owners, reviewers, teams', icon: peopleIcon, tone: 'cyan' },
        { id: 'numbers', label: 'Numbers', description: 'Budgets, scores, quantities', icon: numberIcon, tone: 'yellow' },
      ],
    },
    {
      title: 'Super useful',
      items: [
        { id: 'files', label: 'Files', description: 'Attachments and assets', icon: filesIcon, tone: 'cyan' },
        { id: 'formula', label: 'Formula', description: 'Calculated values', icon: formulaIcon, tone: 'blue' },
        { id: 'connect', label: 'Connect boards', description: 'Linked records and boards', icon: linkIcon, tone: 'red' },
        { id: 'checkbox', label: 'Checkbox', description: 'Simple yes or no states', icon: checkboxIcon, tone: 'yellow' },
        { id: 'timeline', label: 'Timeline', description: 'Date ranges with progress', icon: timelineIcon, tone: 'violet' },
        { id: 'label', label: 'Label', description: 'Bright categorical tags', icon: labelIcon, tone: 'violet' },
      ],
    },
  ];
}

const columnAddVisuals = new Map(
  createProjectColumnAddPopupSections()
    .flatMap(section => section.items)
    .map(item => [item.id, { icon: item.icon, tone: item.tone }] as const),
);

export function projectColumnTypeVisual(type: string) {
  return columnAddVisuals.get(type) ?? {};
}

export const projectSections: ProjectSection[] = [
  'New requests',
  'Under review',
  'Launch ready',
  'Blocked',
];

export const projectOwnerProfiles = [
  { value: 'JM', label: 'Jordan Miles' },
  { value: 'RK', label: 'Riley Kumar' },
  { value: 'EH', label: 'Elena Hart' },
  { value: 'SP', label: 'Sam Patel' },
  { value: 'AT', label: 'Avery Tan' },
  { value: 'NR', label: 'Nora Reed' },
  { value: 'LV', label: 'Luca Vega' },
  { value: 'YL', label: 'Yara Lin' },
  { value: 'CW', label: 'Casey Wong' },
  { value: 'PG', label: 'Priya Grant' },
];

export const projectStatusOptions = [
  { value: 'New', label: 'New', tone: 'blue' },
  { value: 'In Review', label: 'In Review', tone: 'orange' },
  { value: 'Ready', label: 'Ready', tone: 'green' },
  { value: 'Blocked', label: 'Blocked', tone: 'red' },
] satisfies Array<{ value: ProjectStatus; label: ProjectStatus; tone: string }>;

export const projectPriorityOptions = [
  { value: 'High', label: 'High', tone: 'red' },
  { value: 'Medium', label: 'Medium', tone: 'orange' },
  { value: 'Low', label: 'Low', tone: 'violet' },
] satisfies Array<{ value: ProjectPriority; label: ProjectPriority; tone: string }>;

export const projectRiskOptions = [
  { value: 'High', label: 'High', tone: 'red' },
  { value: 'Medium', label: 'Medium', tone: 'orange' },
  { value: 'Low', label: 'Low', tone: 'green' },
] satisfies Array<{ value: ProjectRisk; label: ProjectRisk; tone: string }>;

export const projectDepartmentOptions = [
  { value: 'Product', label: 'Product', tone: 'blue' },
  { value: 'Engineering', label: 'Engineering', tone: 'violet' },
  { value: 'Design', label: 'Design', tone: 'pink' },
  { value: 'Customer Success', label: 'Customer Success', tone: 'cyan' },
  { value: 'Marketing', label: 'Marketing', tone: 'green' },
  { value: 'Security', label: 'Security', tone: 'red' },
  { value: 'Legal', label: 'Legal', tone: 'gray' },
  { value: 'Support', label: 'Support', tone: 'yellow' },
  { value: 'Data', label: 'Data', tone: 'cyan' },
];

export const projectSkillOptions = [
  { value: 'React', label: 'React', tone: 'cyan' },
  { value: 'Vue', label: 'Vue', tone: 'green' },
  { value: 'Angular', label: 'Angular', tone: 'red' },
  { value: 'TypeScript', label: 'TypeScript', tone: 'blue' },
  { value: 'Node', label: 'Node', tone: 'green' },
  { value: 'Design', label: 'Design', tone: 'pink' },
  { value: 'Security', label: 'Security', tone: 'red' },
  { value: 'Data', label: 'Data', tone: 'violet' },
] satisfies Array<{ value: string; label: string; tone: string }>;

export const projectGroupOptions: ProjectToolbarOption<ProjectGroupProp>[] = [
  { value: '', label: 'None' },
  { value: 'section', label: 'Section', ...projectColumnTypeVisual('label') },
  { value: 'status', label: 'Status', ...projectColumnTypeVisual('status') },
  { value: 'priority', label: 'Priority', ...projectColumnTypeVisual('label') },
  { value: 'risk', label: 'Risk', ...projectColumnTypeVisual('label') },
  { value: 'department', label: 'Department', ...projectColumnTypeVisual('label') },
  { value: 'owner', label: 'Owner', ...projectColumnTypeVisual('people') },
];

export const projectSortOptions: ProjectToolbarOption<ProjectSortValue>[] = [
  { value: '', label: 'No sort' },
  { value: 'task:asc', label: 'Project A-Z', ...projectColumnTypeVisual('text') },
  { value: 'task:desc', label: 'Project Z-A', ...projectColumnTypeVisual('text') },
  { value: 'status:asc', label: 'Status', ...projectColumnTypeVisual('status') },
  { value: 'priority:asc', label: 'Priority', ...projectColumnTypeVisual('label') },
  { value: 'risk:asc', label: 'Risk', ...projectColumnTypeVisual('label') },
  { value: 'department:asc', label: 'Department', ...projectColumnTypeVisual('label') },
  { value: 'progress:desc', label: 'Progress high', ...projectColumnTypeVisual('formula') },
  { value: 'budget:desc', label: 'Budget high', ...projectColumnTypeVisual('numbers') },
  { value: 'budget:asc', label: 'Budget low', ...projectColumnTypeVisual('numbers') },
  { value: 'rating:desc', label: 'Rating high', ...projectColumnTypeVisual('numbers') },
  { value: 'rating:asc', label: 'Rating low', ...projectColumnTypeVisual('numbers') },
];

export const projectHideableColumns: ProjectHideableColumnOption[] = [
  { prop: 'owner', label: 'Owner', ...projectColumnTypeVisual('people') },
  { prop: 'summary', label: 'AI summary', ...projectColumnTypeVisual('text') },
  { prop: 'status', label: 'Status', ...projectColumnTypeVisual('status') },
  { prop: 'priority', label: 'Priority', ...projectColumnTypeVisual('label') },
  { prop: 'risk', label: 'Risk', ...projectColumnTypeVisual('label') },
  { prop: 'department', label: 'Department', ...projectColumnTypeVisual('label') },
  { prop: 'skills', label: 'Skills', ...projectColumnTypeVisual('dropdown') },
  { prop: 'timeline', label: 'Timeline', ...projectColumnTypeVisual('timeline') },
  { prop: 'progress', label: 'Progress', ...projectColumnTypeVisual('formula') },
  { prop: 'budget', label: 'Budget', ...projectColumnTypeVisual('numbers') },
  { prop: 'rating', label: 'Rating', ...projectColumnTypeVisual('numbers') },
];

export const projectBulkActions = [
  { value: 'markReady', label: 'Mark ready', icon: checkIcon },
  { value: 'markBlocked', label: 'Block selected', icon: banIcon },
  { value: 'moveLaunch', label: 'Move to launch', icon: rocketIcon },
  { value: 'delete', label: 'Delete', icon: trashIcon },
] satisfies Array<{ value: ProjectBulkAction; label: string; icon: string }>;

export const projectToolbarIcons = {
  add: plusIcon,
  group: layerGroupIcon,
  sort: sortIcon,
  filter: filterIcon,
  hide: eyeSlashIcon,
  collapse: collapseIcon,
  expand: expandIcon,
} as const;
