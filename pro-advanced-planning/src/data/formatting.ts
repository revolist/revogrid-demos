import type { CellTemplate } from '@revolist/revogrid';
import type {
  DataGridCellFormat,
  DataGridAdvancedFormatDefinition,
  DataGridContextMenuConfig,
  DataGridFormattingPresetState,
} from '@revolist/revogrid-pro';
import { badgeRenderer, markDataGridFormatRenderer } from '@revolist/revogrid-pro';
import { workflowBadges } from './planning.structured';

const workflowLabels: Record<string, string> = {
  'not-started': 'Planned',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

const priorityPresentation = (value: unknown) => {
  const priority = Number(value);
  if (priority >= 900) return { label: 'Critical', color: '#e5484d' };
  if (priority >= 700) return { label: 'High', color: '#f59e0b' };
  return { label: 'Normal', color: '#10b981' };
};

/** Reuse the filter badge palette for the status format in every grid view. */
export const workflowStatusBadgeStyles = Object.fromEntries(
  Object.values(workflowBadges).map(({ label, color }) => [
    label,
    { backgroundColor: color, color: '#ffffff' },
  ]),
);

/**
 * Keep workflow values canonical for filtering and planning engines while the
 * native badge presentation renders the label a person expects to read.
 */
export const workflowStatusBadgeRenderer = markDataGridFormatRenderer(
  ((h, props) => badgeRenderer!(h, {
    ...props,
    value: workflowLabels[String(props.value)] ?? String(props.value ?? ''),
  })) as CellTemplate,
  'workflow-status-badge',
);

const workflowStatusBadgeFormat = {
  id: 'workflow-status-badge',
  label: 'Workflow status badge',
  group: 'Planning',
  valueKind: 'text',
  cellTemplate: workflowStatusBadgeRenderer,
  replaceAuthoredTemplate: true,
} as const satisfies DataGridAdvancedFormatDefinition;

export const priorityIndicatorRenderer = markDataGridFormatRenderer(
  ((h, props) => {
    const { label, color } = priorityPresentation(props.value);
    return h('span', {
      style: {
        alignItems: 'center',
        color: 'var(--planning-priority-label-color, var(--rg-theme-text, var(--revo-grid-text, #475569)))',
        display: 'inline-flex',
        fontWeight: '600',
        gap: '8px',
      },
    }, [
      h('span', {
        'aria-hidden': 'true',
        style: { backgroundColor: `var(--planning-priority-color, ${color})`, borderRadius: '50%', height: '8px', width: '8px' },
      }),
      label,
    ]);
  }) as CellTemplate,
  'planning-priority-indicator',
);

const priorityIndicatorFormat = {
  id: 'planning-priority-indicator',
  label: 'Priority indicator',
  group: 'Planning',
  valueKind: 'number',
  cellTemplate: priorityIndicatorRenderer,
  replaceAuthoredTemplate: true,
  appearanceSections: {
    colors: true,
    colorVariables: {
      fill: '--planning-priority-color',
      text: '--planning-priority-label-color',
    },
  },
} as const satisfies DataGridAdvancedFormatDefinition;

const text = {
  value: {
    kind: 'preset',
    preset: 'text',
  },
  appearance: {
    horizontal: 'left',
  },
} as const satisfies DataGridCellFormat;

export const planningGridFormats = {
  name: text,
  owner: {
    presentation: {
      id: 'avatar-with-text',
      options: { avatarSize: 16, rectangular: false },
    },
  },
  workflowStatus: {
    presentation: {
      id: 'workflow-status-badge',
    },
  },
  priority: {
    presentation: {
      id: 'planning-priority-indicator',
    },
  },
  endDate: {
    value: {
      kind: 'preset',
      preset: 'date',
      locale: 'en-US',
      dateStyle: 'medium',
      timeZone: 'UTC',
    },
  },
  percentDone: {
    value: {
      kind: 'preset',
      preset: 'number',
      locale: 'en-US',
    },
    presentation: {
      id: 'progress-line',
      options: { minValue: 0, maxValue: 100 },
    },
  },
  budget: {
    value: {
      kind: 'preset',
      preset: 'currency',
      locale: 'en-US',
      currency: 'USD',
      decimalPlaces: 0,
    },
  },
  activityAt: {
    value: {
      kind: 'preset',
      preset: 'datetime',
      locale: 'en-US',
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'UTC',
    },
  },
} as const satisfies Record<string, DataGridCellFormat>;

/** Application-owned formatting state; column formats remain the stable defaults. */
export const planningDataGridFormatting = {} as const satisfies DataGridFormattingPresetState;

/** One declarative registration shared by every framework implementation. */
export const planningDataGridContextMenu = {
  formatting: {
    advancedFormats: {
      customFormats: [workflowStatusBadgeFormat, priorityIndicatorFormat],
    },
  },
} as const satisfies DataGridContextMenuConfig;
