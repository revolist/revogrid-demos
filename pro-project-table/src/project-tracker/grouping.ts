import {
  GROUP_EXPANDED,
  PSEUDO_GROUP_ITEM_VALUE,
  h as gridH,
  type GroupingOptions,
} from '@revolist/revogrid';
import chevronDownIcon from '@fortawesome/fontawesome-free/svgs/solid/chevron-down.svg?raw';
import type { ProjectGroupProp, ProjectRow } from './types';
import { formatProjectBudget } from './summary';
import { formatGroupLabel, groupValueTone } from './renderers';
const groupH = gridH as any;

export function createProjectGrouping(
  getRows: () => ProjectRow[],
  groupProp: ProjectGroupProp = 'section',
  expandedAll = true,
  collapsedGroups: ReadonlySet<string> = new Set(),
): GroupingOptions {
  const prevExpanded = collapsedGroups.size
    ? Object.fromEntries(
      getProjectGroupKeys(getRows(), groupProp)
        .filter((key) => !collapsedGroups.has(key))
        .map((key) => [key, true]),
    )
    : expandedAll
      ? undefined
      : {};

  return {
    props: groupProp ? [groupProp] : [],
    expandedAll: expandedAll && !collapsedGroups.size,
    ...(prevExpanded ? { prevExpanded } : {}),
    groupLabelTemplate: (_h, props) => {
      if (!groupProp) return '';

      const groupRows = getRows().filter((row) => getGroupValue(row, groupProp) === props.name);
      const inProgress = groupRows.filter((row) => row.status === 'New' || row.status === 'In Review').length;
      const ready = groupRows.filter((row) => row.status === 'Ready').length;
      const blocked = groupRows.filter((row) => row.status === 'Blocked').length;
      const budget = groupRows.reduce((sum, row) => sum + Number(row.budget || 0), 0);
      const avg = groupRows.length
        ? Math.round(groupRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / groupRows.length)
        : 0;
      const label = formatGroupLabel(groupProp, props.name);
      const groupTone = groupValueTone(groupProp, props.name);

      if (props.colType === 'rgCol') {
        return groupH('div', { class: 'project-group-metrics' }, [
          groupH('span', null, [`${inProgress} in progress`]),
          groupH('span', null, [`${ready} ready`]),
          blocked ? groupH('span', null, [`${blocked} blocked`]) : undefined,
          groupH('span', { class: 'project-group-budget' }, [`${formatProjectBudget(budget)} sum`]),
          groupH('span', null, [`${avg}% avg`]),
        ]);
      }

      if (props.colType !== 'colPinStart') {
        return '';
      }

      return groupH('div', { class: `project-group-label project-group-label--${groupTone}` }, [
        groupH('span', {
          class: `project-group-chevron project-group-chevron--${props.expanded ? 'expanded' : 'collapsed'}`,
          innerHTML: chevronDownIcon,
        }),
        groupH('span', { class: `project-group-dot project-group-dot--${groupTone}` }),
        groupH('span', { class: 'project-group-title' }, [label]),
        groupH('span', { class: 'project-group-count' }, [`${groupRows.length} projects`]),
      ]);
    },
  };
}

function getGroupValue(row: ProjectRow, groupProp: Exclude<ProjectGroupProp, ''>) {
  return String(row[groupProp] ?? '');
}

export function updateProjectCollapsedGroups(
  event: CustomEvent<{ model?: Record<string, unknown> }>,
  current: ReadonlySet<string>,
) {
  const model = event.detail?.model;
  const groupKey = String(model?.[PSEUDO_GROUP_ITEM_VALUE] ?? '');
  if (!groupKey) {
    return current;
  }

  const isExpanded = model?.[GROUP_EXPANDED] !== false;
  const next = new Set(current);
  if (isExpanded) {
    next.delete(groupKey);
  } else {
    next.add(groupKey);
  }
  return next;
}

function getProjectGroupKeys(rows: ProjectRow[], groupProp: ProjectGroupProp) {
  if (!groupProp) return [];
  return Array.from(new Set(rows.map((row) => getGroupValue(row, groupProp))));
}
