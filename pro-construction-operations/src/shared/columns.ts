import folderIcon from '@fortawesome/fontawesome-free/svgs/solid/folder.svg?raw';
import folderOpenIcon from '@fortawesome/fontawesome-free/svgs/solid/folder-open.svg?raw';
import { createDefaultTaskTableColumn } from '@revolist/gantt';
import { FIlTER_SELECTION, FIlTER_SLIDER } from '@revolist/revogrid-pro';
import { resolveConstructionHierarchyRole } from './services/presentation';
import type { ConstructionTask, ConstructionView } from './types';

interface ConstructionColumnOptions {
  view: ConstructionView;
  expandedRowIds: ReadonlySet<string>;
  openProject: (projectRef: string) => void;
}

const DATE_COLUMN_SIZE = 130;

function workingDurationDays(model: { formattedDuration?: unknown; duration?: unknown }): number {
  const formatted = String(model.formattedDuration ?? '');
  const value = Number(formatted.match(/^([0-9]+(?:\.[0-9]+)?)/)?.[1]);
  return Number.isFinite(value) ? value : Number(model.duration ?? 0);
}

function statusTone(status: unknown): string {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('complete') || value === 'done') return 'complete';
  if (value.includes('progress')) return 'progress';
  if (value.includes('remaining')) return 'remaining';
  return 'planned';
}

function departmentTone(department: unknown): string {
  const value = String(department ?? '').toLowerCase();
  if (value.includes('fabrication')) return 'fabrication';
  if (value.includes('installation')) return 'installation';
  if (value.includes('procurement')) return 'procurement';
  if (value.includes('external')) return 'external';
  return 'project';
}

function departmentLabel(department: unknown): string {
  const value = String(department ?? '').trim();
  const labels: Record<string, string> = {
    project: 'Project',
    projects: 'Project',
    fabrication: 'Fabrication',
    installation: 'Installation',
    procurement: 'Procurement',
    external: 'External',
  };
  return labels[value.toLowerCase()] ?? value;
}

export function createConstructionColumns(
  source: ConstructionTask[],
  { view, expandedRowIds, openProject }: ConstructionColumnOptions,
): any[] {
  const rowsById = new Map(source.map((row) => [row.id, row]));

  const projectNameTemplate = (h: any, model: ConstructionTask) => {
    if (!model.id?.startsWith('project:')) {
      return h('span', { class: 'construction-fabrication__activity-name' }, model.name);
    }

    const folderState = expandedRowIds.has(model.id) ? 'open' : 'closed';
    const content = [
      h('span', {
        class: 'construction-fabrication__project-icon',
        'aria-hidden': 'true',
        'data-folder-state': folderState,
        innerHTML: folderState === 'open' ? folderOpenIcon : folderIcon,
      }),
      h('span', { class: 'construction-fabrication__project-name' }, model.name),
    ];

    if (view !== 'master') {
      return h('span', { class: 'construction-fabrication__project-root' }, content);
    }

    return h('button', {
      class: 'construction-fabrication__project-link',
      title: `Open ${model.name} schedule`,
      onClick: (event: Event) => {
        event.stopPropagation();
        openProject(model.projectRef);
      },
    }, content);
  };

  const withHierarchyStyle = (column: any) => {
    const authoredCellProperties = column.cellProperties;
    return {
      ...column,
      cellProperties: (props: any) => {
        const authored = authoredCellProperties?.(props) ?? {};
        const authoredClass = typeof authored.class === 'string'
          ? authored.class
          : Object.entries(authored.class ?? {})
              .filter(([, enabled]) => enabled)
              .map(([name]) => name)
              .join(' ');
        const role = resolveConstructionHierarchyRole(props.model, rowsById);
        return {
          ...authored,
          class: `${authoredClass} construction-fabrication__task-cell construction-fabrication__task-cell--${role}`.trim(),
        };
      },
    };
  };

  const nameColumn = {
    ...createDefaultTaskTableColumn('name'),
    name: view === 'master' ? 'Project / schedule' : 'Activity',
    size: view === 'lookahead' ? 280 : view === 'project' ? 255 : 245,
    rowDrag: false,
    columnProperties: () => ({ class: 'construction-fabrication__activity-header' }),
    cellTemplate: (h: any, { model }: { model: ConstructionTask }) => {
      const role = resolveConstructionHierarchyRole(model, rowsById);
      return h(
        'span',
        { class: `construction-fabrication__activity construction-fabrication__activity--${role}` },
        [projectNameTemplate(h, model)],
      );
    },
  };
  const departmentColumn = {
    prop: 'departmentLabel',
    name: 'Department',
    size: 136,
    readonly: true,
    filter: [FIlTER_SELECTION],
    cellTemplate: (h: any, { value, model }: any) => {
      const label = departmentLabel(value ?? model?.departmentLabel);
      return h('span', {
        class: `construction-fabrication__department construction-fabrication__department--${departmentTone(label)}`,
      }, [
        h('span', { class: 'construction-fabrication__department-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'construction-fabrication__department-label' }, label),
      ]);
    },
  };
  const resourceColumn = {
    prop: 'resourceName',
    name: 'Resource',
    size: 135,
    readonly: true,
    filter: [FIlTER_SELECTION],
  };
  const durationColumn = {
    prop: 'duration',
    name: 'Duration',
    size: 116,
    filter: [FIlTER_SLIDER],
    min: 0,
    max: 365,
    step: 1,
    cellParser: (model: ConstructionTask) => workingDurationDays(model),
  };
  const progressColumn = {
    prop: 'percentDone',
    name: 'Progress',
    size: 116,
    filter: ['number', FIlTER_SLIDER],
    min: 0,
    max: 100,
    step: 1,
  };
  const statusColumn = {
    prop: 'statusLabel',
    name: 'Status',
    size: 108,
    readonly: true,
    filter: [FIlTER_SELECTION],
    cellTemplate: (h: any, { value, model }: any) => {
      const label = String(value ?? model?.statusLabel ?? '');
      return h('span', {
        class: `construction-fabrication__status construction-fabrication__status--${statusTone(label)}`,
      }, label);
    },
  };
  const startColumn = { prop: 'startDate', name: 'Start', size: DATE_COLUMN_SIZE };
  const finishColumn = { prop: 'endDate', name: 'Finish', size: DATE_COLUMN_SIZE };

  if (view === 'master') {
    return [nameColumn, departmentColumn, startColumn, finishColumn, progressColumn, statusColumn]
      .map(withHierarchyStyle);
  }
  if (view === 'lookahead') {
    return [
      nameColumn,
      departmentColumn,
      { prop: 'workArea', name: 'Work area', size: 126, readonly: true, filter: [FIlTER_SELECTION] },
      resourceColumn,
      startColumn,
      finishColumn,
      durationColumn,
      progressColumn,
      statusColumn,
    ].map(withHierarchyStyle);
  }
  return [
    { prop: 'wbs', name: 'WBS', size: 90, readonly: true },
    nameColumn,
    durationColumn,
    startColumn,
    finishColumn,
    resourceColumn,
    progressColumn,
  ].map(withHierarchyStyle);
}
