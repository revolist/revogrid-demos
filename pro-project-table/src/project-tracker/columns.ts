import type { ColumnData, ColumnProp, ColumnRegular, HyperFunc, VNode } from '@revolist/revogrid';
import { circularProgressRenderer, editorSlider, editorTimeline, type ColumnAddPopupConfig, type ColumnAddPopupItem } from '@revolist/revogrid-pro';
import chevronDownIcon from '@fortawesome/fontawesome-free/svgs/solid/chevron-down.svg?raw';
import plusIcon from '@fortawesome/fontawesome-free/svgs/solid/plus.svg?raw';
import type { ProjectContextMenuController, ProjectRow } from './types';
import { formatProjectBudget } from './summary';
import { createProjectColumnAddPopupSections, projectColumnTypeVisual, projectDepartmentOptions, projectHideableColumns, projectOwnerProfiles, projectPriorityOptions, projectRiskOptions, projectSkillOptions, projectStatusOptions, type ProjectHideableColumnOption } from './options';
import { createBlockColumn, departmentTone, getTaskProgress, normalizeVNodeChildren, projectProgressThresholds, renderProjectAvatar, renderProjectRating, renderProjectSkillBadge, sectionTone, tone } from './renderers';
import { renderBlockFilterHeader, renderDepartmentFilterHeader, renderOwnerFilterHeader, renderSkillFilterHeader } from './filters';
import { ProjectLeftTextEditor } from './editors';

export const PROJECT_COLUMN_ADD_PROP = '__rv_project_column_add__';
const PROJECT_COLUMN_ADD_TRIGGER_CLASS = 'rv-column-add-trigger';

export function createProjectColumns(): ColumnRegular[] {
  return [
    {
      name: '',
      prop: '_selected',
      size: 48,
      pin: 'colPinStart',
      filter: false,
      rowSelect: true,
      readonly: true,
      cellProperties: ({ model }) => ({
        class: `cell-checkbox project-section-rail project-section-rail--${sectionTone(model.section)}`,
      }),
    },
    {
      name: 'Project name',
      prop: 'task',
      size: 260,
      pin: 'colPinStart',
      filter: ['string'],
      filterPlaceholder: 'Search...',
      sortable: true,
      readonly: true,
      columnProperties: () => ({
        class: 'project-header-left project-header-project-name',
      }),
      cellProperties: () => ({
        class: 'project-cell-left',
      }),
      progress: ({ model }) => getTaskProgress(model as ProjectRow),
      showValue: true,
      thresholds: projectProgressThresholds,
      cellTemplate: (h, props) => {
        const progress = getTaskProgress(props.model as ProjectRow);

        return h('div', { class: `project-task-cell project-task-cell--${sectionTone(props.model.section)}` }, [
          h('span', { class: 'project-task-main' }, [
            h('span', { class: 'project-task-name', title: props.value }, props.value),
            props.model.status === 'New'
              ? h('span', { class: 'project-new-badge' }, 'NEW')
              : undefined,
          ]),
          h('span', { class: 'project-task-progress' }, [
            circularProgressRenderer(h, { ...props, value: progress } as any),
          ]),
        ]);
      },
    },
    {
      name: 'Owner',
      prop: 'owner',
      size: 98,
      filter: ['selection'],
      filterPlaceholder: 'All',
      filterHeaderTemplate: renderOwnerFilterHeader,
      columnType: 'dropdown',
      sortable: true,
      readonly: true,
      dropdown: {
        source: projectOwnerProfiles,
        renderSelectedValue: (h, selectedOptions, children) => {
          const value = String(selectedOptions[0]?.value || '');
          const index = projectOwnerProfiles.findIndex((owner) => owner.value === value);
          return h('span', { class: 'project-owner-select' }, [
            renderProjectAvatar(h, {
              index,
              label: selectedOptions[0]?.label,
              value,
            }),
            ...normalizeVNodeChildren(children),
          ]);
        },
        renderOption: (h, option) => {
          const index = projectOwnerProfiles.findIndex((owner) => owner.value === option.value);
          return h('span', { class: 'project-owner-option' }, [
            renderProjectAvatar(h, {
              index,
              label: option.label,
              value: option.value,
            }),
            h('span', {}, option.label),
          ]);
        },
      },
    },
    {
      name: 'AI Executive Summary',
      prop: 'summary',
      size: 250,
      filter: ['string'],
      filterPlaceholder: 'Search...',
      sortable: true,
      columnProperties: () => ({
        class: 'project-header-left project-header-summary',
      }),
      cellProperties: () => ({
        class: 'project-cell-left',
      }),
      editor: ProjectLeftTextEditor,
      cellTemplate: (h, props) =>
        h('span', { class: 'project-summary-text', title: props.value }, props.value),
    },
    createBlockColumn('Status', 'status', 120, projectStatusOptions, renderBlockFilterHeader),
    createBlockColumn('Priority', 'priority', 112, projectPriorityOptions, renderBlockFilterHeader),
    createBlockColumn('Risk', 'risk', 104, projectRiskOptions, renderBlockFilterHeader),
    {
      name: 'Department',
      prop: 'department',
      size: 148,
      filter: ['selection'],
      filterPlaceholder: 'All',
      filterHeaderTemplate: renderDepartmentFilterHeader,
      columnType: 'dropdown',
      sortable: true,
      dropdown: {
        source: projectDepartmentOptions,
        renderSelectedValue: (h, selectedOptions, children) =>
          h('span', { class: `project-department project-department--${departmentTone(selectedOptions[0]?.label)}` }, [
            h('span', { class: 'project-department__label' }, selectedOptions[0]?.label),
            ...normalizeVNodeChildren(children),
          ]),
        renderOption: (h, option) =>
          h('span', { class: `project-dropdown-option project-department project-department--${departmentTone(option.label)}` }, [
            h('span', { class: 'project-department__label' }, option.label),
          ]),
      },
    },
    {
      name: 'Skills',
      prop: 'skills',
      size: 250,
      filter: ['selection'],
      filterPlaceholder: 'All',
      filterHeaderTemplate: renderSkillFilterHeader,
      columnType: 'dropdown',
      dropdown: {
        config: {
          multiSelect: true,
          popupClassName: 'dropdown-menu-color',
        },
        source: projectSkillOptions,
        renderSelectedValue: (h, selectedOptions, children) => {
          const visibleSkills = selectedOptions.slice(0, 3);
          const hiddenCount = selectedOptions.length - visibleSkills.length;
          return h('span', { class: 'project-skills' }, [
            ...visibleSkills.map((option) =>
              h('span', { class: `project-skill project-skill--${departmentTone(option.label)}` }, option.label),
            ),
            hiddenCount > 0
              ? h('span', { class: 'project-skill project-skill--gray' }, `+${hiddenCount}`)
              : undefined,
            ...normalizeVNodeChildren(children),
          ]);
        },
        renderOption: (h, option, isSelected) =>
          h('span', { class: `project-dropdown-option project-skill-option project-skill project-skill--${departmentTone(option.label)}` }, [
            h('input', { type: 'checkbox', checked: isSelected }),
            h('span', null, option.label),
          ]),
      },
    },
    {
      name: 'Timeline',
      prop: 'timeline',
      size: 190,
      columnType: 'date',
      filter: ['date'],
      filterPlaceholder: 'Date',
      readonly: true,
      format: 'YYYY-MM-DD',
      cellParser: (model) => (model as ProjectRow).timelineStart,
      cellProperties: () => ({
        class: 'project-timeline-cell',
      }),
      progress: ({ model }) => getTaskProgress(model as ProjectRow),
      cellTemplate: (h, props) => editorTimeline(h, {
        ...props,
        value: {
          ...(props.model as ProjectRow).timeline,
          progress: getTaskProgress(props.model as ProjectRow),
        },
      } as any),
      thresholds: projectProgressThresholds,
    },
    {
      name: 'Progress',
      prop: 'progress',
      size: 150,
      filter: ['slider'],
      filterPlaceholder: 'Range',
      sortable: true,
      readonly: true,
      min: 0,
      max: 100,
      step: 5,
      formatValue: (value: number) => `${getTaskProgress({ progress: value } as ProjectRow)}%`,
      thresholds: projectProgressThresholds,
      cellProperties: ({ model }) => ({
        class: 'project-progress-editor',
      }),
      cellTemplate: editorSlider,
    },
    {
      name: 'Budget',
      prop: 'budget',
      size: 120,
      columnType: 'currency',
      filter: ['number'],
      filterPlaceholder: 'Min - Max',
      sortable: true,
      cellTemplate: (h, props) => h('span', { class: 'project-money' }, formatProjectBudget(Number(props.value || 0))),
    },
    {
      name: 'Rating',
      prop: 'rating',
      size: 126,
      columnType: 'integer',
      filter: ['number'],
      filterPlaceholder: 'Min - Max',
      sortable: true,
      cellProperties: () => ({
        class: {
          'align-center': true,
          'project-rating-cell': true,
        },
      }),
      cellTemplate: (h, props) => renderProjectRating(h, props.value),
    },
    createProjectColumnAddColumn({ ariaLabel: 'Add project column' }),
  ];
}

export function createProjectColumnAddPopupConfig(controller: ProjectContextMenuController): ColumnAddPopupConfig {
  return {
    title: 'Choose column type',
    sections: createProjectColumnAddPopupSections(),
    isSelected: ({ item }) => hasProjectDynamicColumn(controller.getColumns(), item.id),
    onSelect: ({ item, selected }) => {
      if (selected) {
        controller.setColumns(removeProjectDynamicColumn(controller.getColumns(), item.id));
        controller.setHiddenColumns(controller.getHiddenColumns().filter((prop) => !isProjectDynamicColumnProp(prop, item.id)));
        return;
      }

      const spec = createProjectDynamicColumn(item);
      const rows = controller.getRows();
      controller.setRows(rows.map((row) => ({
        ...row,
        [spec.column.prop]: spec.defaultValue(row),
      })));
      controller.setColumns(insertProjectColumnBeforeAdd(controller.getColumns(), spec.column));
    },
  };
}

type ProjectColumnAddColumnOptions = {
  prop?: ColumnProp;
  size?: number;
  title?: string;
  ariaLabel?: string;
};

function createProjectColumnAddColumn(options: ProjectColumnAddColumnOptions = {}): ColumnRegular {
  const prop = options.prop ?? PROJECT_COLUMN_ADD_PROP;
  const label = options.ariaLabel ?? 'Add column';

  return {
    prop,
    name: '',
    size: options.size ?? 56,
    pin: 'colPinEnd',
    readonly: true,
    filter: false,
    sortable: false,
    columnProperties: () => ({ class: 'rv-column-add-header' }),
    cellProperties: () => ({ class: 'rv-column-add-cell-host' }),
    columnTemplate: (h: HyperFunc<VNode>) =>
      h('button', {
        class: PROJECT_COLUMN_ADD_TRIGGER_CLASS,
        type: 'button',
        title: options.title ?? label,
        'aria-label': label,
        'aria-haspopup': 'dialog',
      }, [h('span', { class: `${PROJECT_COLUMN_ADD_TRIGGER_CLASS}__icon`, innerHTML: plusIcon })]),
    cellTemplate: (h: HyperFunc<VNode>) => h('span', { class: 'rv-column-add-cell' }),
  };
}

type ProjectDynamicColumnSpec = {
  column: ColumnRegular;
  defaultValue: (row: ProjectRow) => unknown;
};

function createProjectDynamicColumn(item: ColumnAddPopupItem): ProjectDynamicColumnSpec {
  const prop = projectDynamicColumnProp(item.id);
  const base: ColumnRegular = {
    name: item.label,
    prop,
    size: 150,
    sortable: true,
    filter: ['string'],
    filterPlaceholder: 'Search...',
  };

  if (item.id === 'status') {
    return {
      column: {
        ...base,
        size: 128,
        columnType: 'dropdown',
        filter: ['selection'],
        filterPlaceholder: 'All',
        dropdown: { source: projectStatusOptions },
        cellTemplate: (h, props) =>
          h('span', { class: `project-block project-block--${tone(props.value)}` }, props.value),
      },
      defaultValue: row => row.status,
    };
  }

  if (item.id === 'dropdown') {
    return {
      column: {
        ...base,
        size: 220,
        columnType: 'select',
        filter: ['selection'],
        filterPlaceholder: 'All',
        filterHeaderTemplate: renderSkillFilterHeader,
        source: projectSkillOptions,
        valueKey: 'value',
        labelKey: 'label',
        template: (h, item) =>
          h('span', { class: 'project-dropdown-option' }, [
            renderProjectSkillBadge(h, item?.label ?? item),
          ]),
        cellTemplate: (h, props) => {
          const label = resolveProjectSkillLabel(props.value);
          return h('span', { class: 'project-select-cell' }, [
            renderProjectSkillBadge(h, label, 'project-select-cell__badge'),
            h('span', {
              class: 'project-select-cell__arrow',
              innerHTML: chevronDownIcon,
              onClick: (event: MouseEvent) => {
                event.stopPropagation();
                (event.currentTarget as HTMLElement).dispatchEvent(new MouseEvent('dblclick', {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                }));
              },
            }),
          ]);
        },
      },
      defaultValue: row => row.skills[0] ?? projectSkillOptions[0].value,
    };
  }

  if (item.id === 'label') {
    return {
      column: {
        ...base,
        size: 150,
        columnType: 'dropdown',
        filter: ['selection'],
        filterPlaceholder: 'All',
        dropdown: { source: projectDepartmentOptions },
        cellTemplate: (h, props) =>
          h('span', { class: `project-department project-department--${departmentTone(props.value)}` }, [
            h('span', { class: 'project-department__label' }, props.value),
          ]),
      },
      defaultValue: row => row.department,
    };
  }

  if (item.id === 'date') {
    return {
      column: {
        ...base,
        size: 140,
        columnType: 'date',
        filter: ['date'],
        filterPlaceholder: 'Date',
        format: 'YYYY-MM-DD',
        cellParser: (model) => String(model[prop] || ''),
      },
      defaultValue: row => row.timelineStart,
    };
  }

  if (item.id === 'people') {
    return {
      column: {
        ...base,
        size: 110,
        columnType: 'dropdown',
        filter: ['selection'],
        filterPlaceholder: 'All',
        filterHeaderTemplate: renderOwnerFilterHeader,
        dropdown: {
          source: projectOwnerProfiles,
          renderSelectedValue: (h, selectedOptions, children) => {
            const value = String(selectedOptions[0]?.value || '');
            const index = projectOwnerProfiles.findIndex((owner) => owner.value === value);
            return h('span', { class: 'project-owner-select' }, [
              renderProjectAvatar(h, { index, label: selectedOptions[0]?.label, value }),
              ...normalizeVNodeChildren(children),
            ]);
          },
          renderOption: (h, option) => {
            const index = projectOwnerProfiles.findIndex((owner) => owner.value === option.value);
            return h('span', { class: 'project-owner-option' }, [
              renderProjectAvatar(h, {
                index,
                label: option.label,
                value: option.value,
              }),
              h('span', {}, option.label),
            ]);
          },
        },
      },
      defaultValue: row => row.owner,
    };
  }

  if (item.id === 'numbers') {
    return {
      column: {
        ...base,
        size: 126,
        columnType: 'integer',
        filter: ['number'],
        filterPlaceholder: 'Min - Max',
        cellTemplate: (h, props) => h('span', { class: 'project-money' }, Number(props.value || 0).toLocaleString('en-US')),
      },
      defaultValue: row => row.budget,
    };
  }

  if (item.id === 'checkbox') {
    return {
      column: {
        ...base,
        size: 116,
        filter: ['selection'],
        filterPlaceholder: 'All',
        cellTemplate: (h, props) =>
          h('span', { class: 'project-checkbox-preview' },
            h('input', { type: 'checkbox', checked: !!props.value, disabled: true }),
          ),
      },
      defaultValue: row => row.status === 'Ready',
    };
  }

  if (item.id === 'timeline') {
    return {
      column: {
        ...base,
        size: 190,
        columnType: 'date',
        filter: ['date'],
        filterPlaceholder: 'Date',
        readonly: true,
        format: 'YYYY-MM-DD',
        columnProperties: () => ({ class: 'project-header-left' }),
        cellProperties: () => ({ class: 'project-timeline-cell project-cell-left' }),
        cellParser: (model) => model[prop]?.from ?? '',
        progress: ({ model }) => getTaskProgress(model as ProjectRow),
        cellTemplate: (h, props) => editorTimeline(h, {
          ...props,
          value: {
            ...((props.model as Record<string, any>)[String(prop)] ?? {}),
            progress: getTaskProgress(props.model as ProjectRow),
          },
        } as any),
        thresholds: projectProgressThresholds,
      },
      defaultValue: row => ({ ...row.timeline }),
    };
  }

  if (item.id === 'formula') {
    return {
      column: {
        ...base,
        name: 'Formula',
        size: 132,
        filter: ['number'],
        filterPlaceholder: 'Min - Max',
        readonly: true,
        cellTemplate: (h, props) => h('span', { class: 'project-money' }, `${props.value}%`),
      },
      defaultValue: row => Math.round((row.progress + (row.status === 'Ready' ? 20 : 0)) / 1.2),
    };
  }

  if (item.id === 'files' || item.id === 'connect') {
    return {
      column: {
        ...base,
        size: item.id === 'files' ? 190 : 210,
        readonly: true,
        columnProperties: () => ({ class: 'project-header-left' }),
        cellProperties: () => ({ class: 'project-cell-left project-linked-cell' }),
        cellParser: (model) => renderProjectArrayValue(model[prop]),
        cellTemplate: (h, props) => {
          const values = normalizeProjectArrayValue(props.value);
          return h('span', { class: 'project-linked-items', title: values.join(', ') }, [
            ...values.slice(0, 2).map((value) =>
              h('span', { class: `project-linked-item project-linked-item--${departmentTone(value)}` }, value),
            ),
            values.length > 2 ? h('span', { class: 'project-linked-item project-linked-item--gray' }, `+${values.length - 2}`) : undefined,
          ]);
        },
      },
      defaultValue: row => item.id === 'files'
        ? [`${row.department} brief`, `${row.task.split(' ').slice(0, 2).join(' ')} spec`]
        : [row.section, row.department],
    };
  }

  return {
    column: {
      ...base,
      size: 170,
      editor: ProjectLeftTextEditor,
      cellProperties: () => ({ class: 'project-cell-left' }),
      columnProperties: () => ({ class: 'project-header-left' }),
    },
    defaultValue: row => row.summary,
  };
}

export function projectDynamicColumnProp(itemId: string) {
  return `custom_${itemId}`;
}

export function getProjectHideableColumns(columns: ColumnData): ProjectHideableColumnOption[] {
  const staticProps = new Set(projectHideableColumns.map(column => String(column.prop)));
  const dynamicColumns = flattenProjectColumns(columns)
    .filter((column) => {
      const prop = String(column.prop);
      return prop.startsWith('custom_') && !staticProps.has(prop);
    })
    .map((column) => ({
      prop: column.prop,
      label: String(column.name || column.prop),
      ...projectColumnTypeVisual(projectDynamicColumnType(column)),
    }));

  return [...projectHideableColumns, ...dynamicColumns];
}

function flattenProjectColumns(columns: ColumnData): ColumnRegular[] {
  return columns.flatMap((column) => {
    if ('children' in column && Array.isArray(column.children)) {
      return flattenProjectColumns(column.children);
    }
    return 'prop' in column ? [column as ColumnRegular] : [];
  });
}

function projectDynamicColumnType(column: ColumnRegular) {
  const prop = String(column.prop);
  const dynamicType = prop.startsWith('custom_') ? prop.replace(/^custom_/, '').split('_')[0] : '';
  if (dynamicType) {
    return dynamicType;
  }
  if (column.columnType === 'dropdown' || column.columnType === 'select') return 'dropdown';
  if (column.columnType === 'date') return 'date';
  if (column.columnType === 'currency' || column.columnType === 'integer') return 'numbers';
  if (Array.isArray(column.filter) && column.filter.includes('number')) return 'numbers';
  return 'text';
}

function isProjectDynamicColumnProp(prop: ColumnProp, itemId: string) {
  const value = String(prop);
  const stableProp = projectDynamicColumnProp(itemId);
  return value === stableProp || value.startsWith(`${stableProp}_`);
}

function hasProjectDynamicColumn(columns: ColumnData, itemId: string): boolean {
  return columns.some((column) => {
    if ('children' in column && Array.isArray(column.children)) {
      return hasProjectDynamicColumn(column.children, itemId);
    }

    return 'prop' in column && isProjectDynamicColumnProp(column.prop, itemId);
  });
}

function removeProjectDynamicColumn(columns: ColumnData, itemId: string): ColumnData {
  return columns.flatMap((column) => {
    if ('children' in column && Array.isArray(column.children)) {
      return [{
        ...column,
        children: removeProjectDynamicColumn(column.children, itemId),
      }];
    }

    if ('prop' in column && isProjectDynamicColumnProp(column.prop, itemId)) {
      return [];
    }

    return [column];
  }) as ColumnData;
}

function normalizeProjectArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item)).filter(Boolean);
  }
  if (value === undefined || value === null || value === '') {
    return [];
  }
  return [String(value)];
}

function renderProjectArrayValue(value: unknown) {
  return normalizeProjectArrayValue(value).join(', ');
}

function resolveProjectSkillLabel(value: unknown) {
  const normalized = String(value ?? '');
  return projectSkillOptions.find((option) => option.value === normalized || option.label === normalized)?.label ?? normalized;
}

function insertProjectColumnBeforeAdd(columns: ColumnData, column: ColumnRegular): ColumnData {
  let inserted = false;
  const next = columns.map((item) => {
    if ('children' in item && Array.isArray(item.children)) {
      return {
        ...item,
        children: insertProjectColumnBeforeAdd(item.children, column),
      };
    }

    if ('prop' in item && item.prop === PROJECT_COLUMN_ADD_PROP && !inserted) {
      inserted = true;
      return [column, item];
    }

    return item;
  }).flat() as ColumnData;

  return inserted ? next : [...next, column];
}
